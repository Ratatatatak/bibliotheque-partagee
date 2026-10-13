-- =============================================================================
-- 010 — Intégrité des prêts, historique fiable et confidentialité
-- =============================================================================
-- Cette migration est NON DESTRUCTIVE : elle n'efface aucune donnée existante.
-- Elle peut être exécutée plusieurs fois sans effet de bord (idempotente).
--
-- Ce qu'elle change :
--  1. Fiches de jeux : colonnes de traçabilité (titre original, identifiant BGG,
--     extension, catégories, miniature, origine des données).
--  2. Exemplaires : remarques du groupe + « archivage » au lieu de suppression,
--     pour que l'historique des prêts reste consultable.
--  3. Confidentialité : le catalogue et les exemplaires ne sont plus lisibles
--     sans être connecté (application privée).
--  4. Sécurité : les demandes, prêts, retours et changements de disponibilité ne
--     peuvent plus être modifiés directement depuis le navigateur. Ils passent
--     obligatoirement par des fonctions SQL qui vérifient QUI agit.
--  5. Nouvelles fonctions : refuser / annuler une demande, prolonger un prêt,
--     changer la disponibilité, retirer un exemplaire, voir les prêts actifs du
--     groupe, refuser / annuler un échange.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Colonnes (rejouées en IF NOT EXISTS au cas où 004, 007 ou 009 manqueraient)
-- ---------------------------------------------------------------------------
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS publisher TEXT,
  ADD COLUMN IF NOT EXISTS designers TEXT[],
  ADD COLUMN IF NOT EXISTS illustrators TEXT[],
  ADD COLUMN IF NOT EXISTS published_year INTEGER,
  ADD COLUMN IF NOT EXISTS mechanics TEXT[],
  ADD COLUMN IF NOT EXISTS average_rating NUMERIC(4, 2),
  ADD COLUMN IF NOT EXISTS ratings_count INTEGER,
  ADD COLUMN IF NOT EXISTS original_name TEXT,
  ADD COLUMN IF NOT EXISTS bgg_id TEXT,
  ADD COLUMN IF NOT EXISTS is_expansion BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS data_origin TEXT;

-- Une information absente de la source doit pouvoir rester vide plutôt que
-- d'être remplacée par une valeur inventée (ex. « 1 joueur », « 0 an »).
ALTER TABLE public.games ALTER COLUMN min_players DROP NOT NULL;
ALTER TABLE public.games ALTER COLUMN max_players DROP NOT NULL;
ALTER TABLE public.games ALTER COLUMN min_age DROP NOT NULL;

-- Les fiches dont l'identifiant est numérique proviennent de BoardGameGeek.
UPDATE public.games SET bgg_id = id WHERE bgg_id IS NULL AND id ~ '^[0-9]+$';
UPDATE public.games SET data_origin = CASE WHEN bgg_id IS NOT NULL THEN 'bgg' ELSE 'legacy-catalog' END
WHERE data_origin IS NULL;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;

ALTER TABLE public.game_copies
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES public.loan_requests(id) ON DELETE SET NULL;

-- Un membre ne possède qu'un exemplaire « actif » d'un même jeu ; un exemplaire
-- archivé n'empêche pas d'en ajouter un nouveau.
DROP INDEX IF EXISTS public.game_copies_owner_game_unique;
CREATE UNIQUE INDEX IF NOT EXISTS game_copies_owner_game_active_unique
  ON public.game_copies (owner_id, game_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS loan_requests_copy_status_idx ON public.loan_requests (game_copy_id, status);
CREATE INDEX IF NOT EXISTS loans_copy_status_idx ON public.loans (game_copy_id, status);

-- ---------------------------------------------------------------------------
-- 2. Historique : supprimer un exemplaire ne doit plus effacer ses prêts.
--    ON DELETE CASCADE est remplacé par NO ACTION (suppression refusée tant
--    qu'un historique existe ; l'application archive l'exemplaire à la place).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT con.conname, rel.relname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND con.contype = 'f'
      AND con.confrelid = 'public.game_copies'::regclass
      AND rel.relname IN ('loans', 'loan_requests')
      AND con.confdeltype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', fk.relname, fk.conname);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (game_copy_id) REFERENCES public.game_copies(id) ON DELETE NO ACTION',
      fk.relname, fk.conname);
  END LOOP;
END$$;

-- ---------------------------------------------------------------------------
-- 3. Confidentialité : lecture réservée aux membres connectés
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view games" ON public.games;
DROP POLICY IF EXISTS "Members can view games" ON public.games;
CREATE POLICY "Members can view games" ON public.games FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert games" ON public.games;
DROP POLICY IF EXISTS "Members can add games" ON public.games;
CREATE POLICY "Members can add games" ON public.games FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view game copies" ON public.game_copies;
DROP POLICY IF EXISTS "Members can view game copies" ON public.game_copies;
CREATE POLICY "Members can view game copies" ON public.game_copies FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 4. Écritures directes interdites sur les données sensibles
-- ---------------------------------------------------------------------------
-- Exemplaires : création autorisée par le propriétaire ; la suppression directe
-- est retirée (archivage via archive_game_copy) ; la mise à jour directe est
-- limitée aux remarques par le trigger ci-dessous.
DROP POLICY IF EXISTS "Users can insert their own game copies" ON public.game_copies;
CREATE POLICY "Users can insert their own game copies" ON public.game_copies
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id AND status = 'available' AND archived_at IS NULL);
DROP POLICY IF EXISTS "Users can delete their own game copies" ON public.game_copies;

CREATE OR REPLACE FUNCTION public.protect_game_copy_direct_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- current_user vaut 'authenticated' ou 'anon' pour une requête venant du
  -- navigateur, et le propriétaire de la fonction pour une fonction SECURITY DEFINER.
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
       OR NEW.game_id IS DISTINCT FROM OLD.game_id
       OR NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
      RAISE EXCEPTION 'Modification refusée : utilisez les actions de l''application (prêt, retour, disponibilité).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_game_copy_direct_update ON public.game_copies;
CREATE TRIGGER protect_game_copy_direct_update
  BEFORE UPDATE ON public.game_copies
  FOR EACH ROW EXECUTE FUNCTION public.protect_game_copy_direct_update();

-- Demandes de prêt : lecture par les deux personnes concernées, écriture
-- uniquement via les fonctions ci-dessous.
DROP POLICY IF EXISTS "Users can insert loan requests" ON public.loan_requests;
DROP POLICY IF EXISTS "Owners can update loan requests" ON public.loan_requests;
DROP POLICY IF EXISTS "Users can delete their own loan requests" ON public.loan_requests;

-- Prêts : lecture par les deux personnes concernées, écriture uniquement via fonctions.
DROP POLICY IF EXISTS "Only owners can insert loans" ON public.loans;
DROP POLICY IF EXISTS "Owners and borrowers can update loans" ON public.loans;

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

-- ---------------------------------------------------------------------------
-- 5. Fonctions métier (toutes vérifient l'identité de l'appelant)
-- ---------------------------------------------------------------------------

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
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;

  -- Verrou sur l'exemplaire : deux demandes simultanées sont traitées l'une après l'autre.
  SELECT * INTO copy_row FROM public.game_copies WHERE id = requested_copy_id FOR UPDATE;

  IF copy_row.id IS NULL OR copy_row.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cet exemplaire n''existe plus';
  END IF;
  IF copy_row.owner_id = auth.uid() THEN
    RAISE EXCEPTION 'Vous ne pouvez pas emprunter votre propre jeu';
  END IF;
  IF copy_row.status <> 'available'
     OR EXISTS (SELECT 1 FROM public.loans WHERE game_copy_id = copy_row.id AND status = 'active') THEN
    RAISE EXCEPTION 'Cet exemplaire n''est pas disponible pour le moment';
  END IF;
  IF requested_return_date IS NULL OR requested_return_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'La date de retour ne peut pas être dans le passé';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.loan_requests
    WHERE game_copy_id = copy_row.id AND requester_id = auth.uid() AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Vous avez déjà une demande en attente pour cet exemplaire';
  END IF;

  INSERT INTO public.loan_requests (game_copy_id, requester_id, owner_id, requested_return_date, message)
  VALUES (copy_row.id, auth.uid(), copy_row.owner_id, requested_return_date, NULLIF(LEFT(BTRIM(request_message), 1000), ''))
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
  copy_row public.game_copies;
  loan_row public.loans;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;

  SELECT * INTO request_row FROM public.loan_requests WHERE id = request_id FOR UPDATE;
  IF request_row.id IS NULL OR request_row.owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Demande introuvable';
  END IF;
  IF request_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Cette demande a déjà été traitée';
  END IF;

  SELECT * INTO copy_row FROM public.game_copies WHERE id = request_row.game_copy_id FOR UPDATE;
  IF copy_row.id IS NULL OR copy_row.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cet exemplaire n''existe plus';
  END IF;
  IF copy_row.owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Le propriétaire de cet exemplaire a changé';
  END IF;
  IF copy_row.status <> 'available'
     OR EXISTS (SELECT 1 FROM public.loans WHERE game_copy_id = copy_row.id AND status = 'active') THEN
    RAISE EXCEPTION 'Cet exemplaire est déjà prêté ou indisponible';
  END IF;

  UPDATE public.game_copies SET status = 'lent' WHERE id = copy_row.id;

  UPDATE public.loan_requests SET status = 'accepted', responded_at = NOW() WHERE id = request_row.id;
  UPDATE public.loan_requests SET status = 'refused', responded_at = NOW()
  WHERE game_copy_id = copy_row.id AND status = 'pending' AND id <> request_row.id;

  INSERT INTO public.loans (game_copy_id, owner_id, borrower_id, expected_return_date, request_id)
  VALUES (copy_row.id, copy_row.owner_id, request_row.requester_id, request_row.requested_return_date, request_row.id)
  RETURNING * INTO loan_row;
  RETURN loan_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.refuse_loan_request(request_id UUID)
RETURNS public.loan_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.loan_requests;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  UPDATE public.loan_requests SET status = 'refused', responded_at = NOW()
  WHERE id = request_id AND owner_id = auth.uid() AND status = 'pending'
  RETURNING * INTO request_row;
  IF request_row.id IS NULL THEN RAISE EXCEPTION 'Demande introuvable ou déjà traitée'; END IF;
  RETURN request_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_loan_request(request_id UUID)
RETURNS public.loan_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.loan_requests;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  UPDATE public.loan_requests SET status = 'cancelled', responded_at = NOW()
  WHERE id = request_id AND requester_id = auth.uid() AND status = 'pending'
  RETURNING * INTO request_row;
  IF request_row.id IS NULL THEN RAISE EXCEPTION 'Demande introuvable ou déjà traitée'; END IF;
  RETURN request_row;
END;
$$;

-- Le retour est confirmé par le PROPRIÉTAIRE (c'est lui qui récupère son jeu).
CREATE OR REPLACE FUNCTION public.return_loan(loan_id UUID)
RETURNS public.loans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  loan_row public.loans;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  UPDATE public.loans
  SET status = 'returned', actual_return_date = CURRENT_DATE
  WHERE id = loan_id AND status = 'active' AND owner_id = auth.uid()
  RETURNING * INTO loan_row;
  IF loan_row.id IS NULL THEN
    RAISE EXCEPTION 'Prêt introuvable, déjà clôturé, ou vous n''êtes pas le propriétaire';
  END IF;
  UPDATE public.game_copies SET status = 'available' WHERE id = loan_row.game_copy_id AND status = 'lent';
  RETURN loan_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.extend_loan(target_loan_id UUID, new_return_date DATE)
RETURNS public.loans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  loan_row public.loans;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF new_return_date IS NULL OR new_return_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Date de retour invalide';
  END IF;
  UPDATE public.loans SET expected_return_date = new_return_date
  WHERE id = target_loan_id AND status = 'active' AND owner_id = auth.uid()
  RETURNING * INTO loan_row;
  IF loan_row.id IS NULL THEN RAISE EXCEPTION 'Prêt en cours introuvable'; END IF;
  RETURN loan_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_copy_availability(target_copy_id UUID, make_available BOOLEAN)
RETURNS public.game_copies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  copy_row public.game_copies;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT * INTO copy_row FROM public.game_copies WHERE id = target_copy_id FOR UPDATE;
  IF copy_row.id IS NULL OR copy_row.archived_at IS NOT NULL OR copy_row.owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Exemplaire introuvable';
  END IF;
  IF copy_row.status = 'lent' OR EXISTS (SELECT 1 FROM public.loans WHERE game_copy_id = copy_row.id AND status = 'active') THEN
    RAISE EXCEPTION 'Cet exemplaire est actuellement prêté : enregistrez d''abord son retour';
  END IF;
  UPDATE public.game_copies
  SET status = CASE WHEN make_available THEN 'available' ELSE 'unavailable' END
  WHERE id = copy_row.id
  RETURNING * INTO copy_row;
  IF NOT make_available THEN
    UPDATE public.loan_requests SET status = 'refused', responded_at = NOW()
    WHERE game_copy_id = copy_row.id AND status = 'pending';
  END IF;
  RETURN copy_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_game_copy(target_copy_id UUID)
RETURNS public.game_copies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  copy_row public.game_copies;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT * INTO copy_row FROM public.game_copies WHERE id = target_copy_id FOR UPDATE;
  IF copy_row.id IS NULL OR copy_row.archived_at IS NOT NULL OR copy_row.owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Exemplaire introuvable';
  END IF;
  IF EXISTS (SELECT 1 FROM public.loans WHERE game_copy_id = copy_row.id AND status = 'active') THEN
    RAISE EXCEPTION 'Impossible de retirer un jeu actuellement prêté';
  END IF;
  UPDATE public.game_copies SET archived_at = NOW(), status = 'unavailable'
  WHERE id = copy_row.id RETURNING * INTO copy_row;
  UPDATE public.loan_requests SET status = 'cancelled', responded_at = NOW()
  WHERE game_copy_id = copy_row.id AND status = 'pending';
  UPDATE public.exchange_requests SET status = 'cancelled', responded_at = NOW()
  WHERE (offered_copy_id = copy_row.id OR requested_copy_id = copy_row.id) AND status = 'pending';
  RETURN copy_row;
END;
$$;

-- Prêts actifs du groupe : nécessaires pour afficher qui détient un exemplaire.
-- Les prêts clôturés restent visibles uniquement par les personnes concernées.
CREATE OR REPLACE FUNCTION public.group_active_loans()
RETURNS SETOF public.loans
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.loans WHERE status = 'active' AND auth.uid() IS NOT NULL;
$$;

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

-- ---------------------------------------------------------------------------
-- 6. Droits d'exécution : uniquement les membres connectés
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.create_loan_request(uuid, date, text)',
    'public.accept_loan_request(uuid)',
    'public.refuse_loan_request(uuid)',
    'public.cancel_loan_request(uuid)',
    'public.return_loan(uuid)',
    'public.extend_loan(uuid, date)',
    'public.set_copy_availability(uuid, boolean)',
    'public.archive_game_copy(uuid)',
    'public.group_active_loans()',
    'public.accept_exchange_request(uuid)',
    'public.refuse_exchange_request(uuid)',
    'public.cancel_exchange_request(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END$$;
