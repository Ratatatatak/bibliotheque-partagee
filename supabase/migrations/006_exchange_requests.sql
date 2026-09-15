-- Propositions d'echange entre deux membres du groupe.
CREATE TABLE IF NOT EXISTS public.exchange_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offered_copy_id UUID NOT NULL REFERENCES public.game_copies(id) ON DELETE CASCADE,
  requested_copy_id UUID NOT NULL REFERENCES public.game_copies(id) ON DELETE CASCADE,
  proposer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'refused', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  CHECK (offered_copy_id <> requested_copy_id),
  CHECK (proposer_id <> recipient_id)
);

ALTER TABLE public.exchange_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view involved exchanges" ON public.exchange_requests;
CREATE POLICY "Members can view involved exchanges"
  ON public.exchange_requests FOR SELECT TO authenticated
  USING (auth.uid() = proposer_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Members can propose exchanges" ON public.exchange_requests;
CREATE POLICY "Members can propose exchanges"
  ON public.exchange_requests FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = proposer_id
    AND EXISTS (SELECT 1 FROM public.game_copies WHERE id = offered_copy_id AND owner_id = auth.uid() AND status = 'available')
    AND EXISTS (SELECT 1 FROM public.game_copies WHERE id = requested_copy_id AND owner_id = recipient_id AND status = 'available')
  );

DROP POLICY IF EXISTS "Proposers can cancel exchanges" ON public.exchange_requests;
CREATE POLICY "Proposers can cancel exchanges"
  ON public.exchange_requests FOR UPDATE TO authenticated
  USING (auth.uid() = proposer_id)
  WITH CHECK (auth.uid() = proposer_id);

CREATE OR REPLACE FUNCTION public.accept_exchange_request(request_id UUID)
RETURNS public.exchange_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.exchange_requests;
  offered_owner UUID;
  requested_owner UUID;
BEGIN
  SELECT * INTO request_row
  FROM public.exchange_requests
  WHERE id = request_id AND recipient_id = auth.uid() AND status = 'pending'
  FOR UPDATE;

  IF request_row.id IS NULL THEN
    RAISE EXCEPTION 'Proposition introuvable ou deja traitee';
  END IF;

  SELECT owner_id INTO offered_owner FROM public.game_copies WHERE id = request_row.offered_copy_id AND status = 'available' FOR UPDATE;
  SELECT owner_id INTO requested_owner FROM public.game_copies WHERE id = request_row.requested_copy_id AND status = 'available' FOR UPDATE;

  IF offered_owner IS NULL OR requested_owner IS NULL THEN
    RAISE EXCEPTION 'Une des copies n''est plus disponible';
  END IF;
  IF offered_owner <> request_row.proposer_id OR requested_owner <> request_row.recipient_id THEN
    RAISE EXCEPTION 'Les proprietaires des copies ont change';
  END IF;

  UPDATE public.game_copies SET owner_id = request_row.recipient_id WHERE id = request_row.offered_copy_id;
  UPDATE public.game_copies SET owner_id = request_row.proposer_id WHERE id = request_row.requested_copy_id;

  UPDATE public.exchange_requests
  SET status = 'accepted', responded_at = NOW()
  WHERE id = request_row.id
  RETURNING * INTO request_row;

  RETURN request_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_exchange_request(UUID) TO authenticated;
