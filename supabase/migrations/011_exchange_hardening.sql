-- =============================================================================
-- 011 — Échanges : règles renforcées (prérequis : 006_exchange_requests.sql)
-- =============================================================================
-- Non destructive et rejouable. À appliquer après 010, uniquement si la table
-- public.exchange_requests existe (migration 006).
-- Les propositions ne peuvent plus être modifiées directement : refus et
-- annulation passent par des fonctions qui vérifient qui agit.
-- =============================================================================

-- Échanges : plus de modification directe (refus / annulation via fonctions).
DROP POLICY IF EXISTS "Proposers can cancel exchanges" ON public.exchange_requests;
DROP POLICY IF EXISTS "Members can propose exchanges" ON public.exchange_requests;
CREATE POLICY "Members can propose exchanges"
  ON public.exchange_requests FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = proposer_id
    AND status = 'pending'
    AND EXISTS (SELECT 1 FROM public.game_copies WHERE id = offered_copy_id AND owner_id = auth.uid() AND status = 'available' AND archived_at IS NULL)
    AND EXISTS (SELECT 1 FROM public.game_copies WHERE id = requested_copy_id AND owner_id = recipient_id AND status = 'available' AND archived_at IS NULL)
  );

-- Échanges : acceptation renforcée, refus et annulation.
CREATE OR REPLACE FUNCTION public.accept_exchange_request(request_id UUID)
RETURNS public.exchange_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.exchange_requests;
  offered public.game_copies;
  requested public.game_copies;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT * INTO request_row FROM public.exchange_requests
  WHERE id = request_id AND recipient_id = auth.uid() AND status = 'pending' FOR UPDATE;
  IF request_row.id IS NULL THEN RAISE EXCEPTION 'Proposition introuvable ou déjà traitée'; END IF;

  SELECT * INTO offered FROM public.game_copies WHERE id = request_row.offered_copy_id FOR UPDATE;
  SELECT * INTO requested FROM public.game_copies WHERE id = request_row.requested_copy_id FOR UPDATE;
  IF offered.id IS NULL OR requested.id IS NULL
     OR offered.archived_at IS NOT NULL OR requested.archived_at IS NOT NULL
     OR offered.status <> 'available' OR requested.status <> 'available' THEN
    RAISE EXCEPTION 'Une des copies n''est plus disponible';
  END IF;
  IF offered.owner_id <> request_row.proposer_id OR requested.owner_id <> request_row.recipient_id THEN
    RAISE EXCEPTION 'Les propriétaires des copies ont changé';
  END IF;
  IF EXISTS (SELECT 1 FROM public.game_copies WHERE owner_id = request_row.recipient_id AND game_id = offered.game_id AND archived_at IS NULL)
     OR EXISTS (SELECT 1 FROM public.game_copies WHERE owner_id = request_row.proposer_id AND game_id = requested.game_id AND archived_at IS NULL) THEN
    RAISE EXCEPTION 'L''un de vous possède déjà ce jeu';
  END IF;

  UPDATE public.game_copies SET owner_id = request_row.recipient_id WHERE id = offered.id;
  UPDATE public.game_copies SET owner_id = request_row.proposer_id WHERE id = requested.id;

  -- Les demandes de prêt en attente adressées aux anciens propriétaires deviennent caduques.
  UPDATE public.loan_requests SET status = 'cancelled', responded_at = NOW()
  WHERE game_copy_id IN (offered.id, requested.id) AND status = 'pending';

  UPDATE public.exchange_requests SET status = 'accepted', responded_at = NOW()
  WHERE id = request_row.id RETURNING * INTO request_row;
  RETURN request_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.refuse_exchange_request(request_id UUID)
RETURNS public.exchange_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.exchange_requests;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  UPDATE public.exchange_requests SET status = 'refused', responded_at = NOW()
  WHERE id = request_id AND recipient_id = auth.uid() AND status = 'pending'
  RETURNING * INTO request_row;
  IF request_row.id IS NULL THEN RAISE EXCEPTION 'Proposition introuvable ou déjà traitée'; END IF;
  RETURN request_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_exchange_request(request_id UUID)
RETURNS public.exchange_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.exchange_requests;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  UPDATE public.exchange_requests SET status = 'cancelled', responded_at = NOW()
  WHERE id = request_id AND proposer_id = auth.uid() AND status = 'pending'
  RETURNING * INTO request_row;
  IF request_row.id IS NULL THEN RAISE EXCEPTION 'Proposition introuvable ou déjà traitée'; END IF;
  RETURN request_row;
END;
$$;

DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.accept_exchange_request(uuid)',
    'public.refuse_exchange_request(uuid)',
    'public.cancel_exchange_request(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END$$;
