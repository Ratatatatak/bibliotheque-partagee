-- Règles métier atomiques du MVP.
ALTER TABLE public.game_copies
  ADD CONSTRAINT game_copies_status_check
  CHECK (status IN ('available', 'lent', 'unavailable'));

ALTER TABLE public.loan_requests
  ADD CONSTRAINT loan_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'refused', 'cancelled'));

ALTER TABLE public.loans
  ADD CONSTRAINT loans_status_check
  CHECK (status IN ('active', 'returned'));

CREATE UNIQUE INDEX loans_one_active_copy
  ON public.loans (game_copy_id)
  WHERE status = 'active';

CREATE OR REPLACE FUNCTION public.validate_loan_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.loan_requests
    WHERE game_copy_id = NEW.game_copy_id
      AND requester_id = NEW.borrower_id
      AND owner_id = NEW.owner_id
      AND status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'Un prêt doit provenir d''une demande acceptée';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_loan_insert ON public.loans;
CREATE TRIGGER validate_loan_insert
  BEFORE INSERT ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.validate_loan_insert();

CREATE OR REPLACE FUNCTION public.create_loan_request(
  requested_copy_id UUID,
  requested_return_date DATE,
  request_message TEXT DEFAULT NULL
)
RETURNS public.loan_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  copy_row public.game_copies;
  request_row public.loan_requests;
BEGIN
  SELECT * INTO copy_row
  FROM public.game_copies
  WHERE id = requested_copy_id
  FOR SHARE;

  IF copy_row.id IS NULL OR copy_row.status <> 'available' THEN
    RAISE EXCEPTION 'Cette copie n''est pas disponible';
  END IF;
  IF copy_row.owner_id = auth.uid() THEN
    RAISE EXCEPTION 'Vous ne pouvez pas demander votre propre jeu';
  END IF;

  INSERT INTO public.loan_requests (game_copy_id, requester_id, owner_id, requested_return_date, message)
  VALUES (copy_row.id, auth.uid(), copy_row.owner_id, requested_return_date, request_message)
  RETURNING * INTO request_row;
  RETURN request_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_loan_request(request_id UUID)
RETURNS public.loans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.loan_requests;
  loan_row public.loans;
BEGIN
  SELECT * INTO request_row
  FROM public.loan_requests
  WHERE id = request_id AND owner_id = auth.uid() AND status = 'pending'
  FOR UPDATE;
  IF request_row.id IS NULL THEN
    RAISE EXCEPTION 'Demande introuvable ou déjà traitée';
  END IF;

  UPDATE public.game_copies SET status = 'lent'
  WHERE id = request_row.game_copy_id AND status = 'available';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cette copie est déjà prêtée ou indisponible';
  END IF;

  UPDATE public.loan_requests
  SET status = 'accepted', responded_at = NOW()
  WHERE id = request_row.id;

  UPDATE public.loan_requests
  SET status = 'refused', responded_at = NOW()
  WHERE game_copy_id = request_row.game_copy_id AND status = 'pending' AND id <> request_row.id;

  INSERT INTO public.loans (game_copy_id, owner_id, borrower_id, expected_return_date)
  VALUES (request_row.game_copy_id, request_row.owner_id, request_row.requester_id, request_row.requested_return_date)
  RETURNING * INTO loan_row;
  RETURN loan_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.return_loan(loan_id UUID)
RETURNS public.loans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  loan_row public.loans;
BEGIN
  UPDATE public.loans
  SET status = 'returned', actual_return_date = NOW()
  WHERE id = loan_id AND status = 'active' AND (owner_id = auth.uid() OR borrower_id = auth.uid())
  RETURNING * INTO loan_row;
  IF loan_row.id IS NULL THEN RAISE EXCEPTION 'Prêt introuvable ou déjà rendu'; END IF;
  UPDATE public.game_copies SET status = 'available' WHERE id = loan_row.game_copy_id;
  RETURN loan_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_loan_request(UUID, DATE, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_loan_request(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.return_loan(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_loan_request(UUID, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_loan_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_loan(UUID) TO authenticated;