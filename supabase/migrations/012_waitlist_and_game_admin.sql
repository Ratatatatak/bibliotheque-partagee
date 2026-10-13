-- =============================================================================
-- 012 — Liste d'attente et administration des fiches de jeux
-- =============================================================================
-- Non destructive et rejouable. Prérequis : 001 à 005 et 010.
--  1. Liste d'attente : un membre demande à être prévenu quand un exemplaire
--     d'un jeu se libère.
--  2. Fusion de fiches en double : les exemplaires, favoris, parties, avis et
--     inscriptions passent sur la fiche conservée ; la fiche fusionnée reste en
--     base (historique) et pointe vers la fiche conservée.
--  3. Suppression d'une fiche jamais utilisée.
-- Fusion et suppression sont réservées aux administrateurs (public.is_admin()).
-- =============================================================================

ALTER TABLE public.games ADD COLUMN IF NOT EXISTS merged_into TEXT REFERENCES public.games(id);

-- ---------------------------------------------------------------------------
-- 0. Correctif de 005 : nommer un administrateur depuis l'éditeur SQL de
--    Supabase était refusé (aucun membre connecté dans l'éditeur). Seules les
--    requêtes venant du site (rôles authenticated / anon) sont désormais
--    contrôlées ; un membre ne peut toujours pas s'attribuer un rôle.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND current_user IN ('authenticated', 'anon')
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Seul un administrateur peut modifier un rôle';
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. Liste d'attente
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_waitlist (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, game_id)
);
ALTER TABLE public.game_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view the waitlist" ON public.game_waitlist;
CREATE POLICY "Members can view the waitlist" ON public.game_waitlist
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Members can join the waitlist" ON public.game_waitlist;
CREATE POLICY "Members can join the waitlist" ON public.game_waitlist
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    -- On ne s'inscrit pas pour un jeu qu'on possède déjà.
    AND NOT EXISTS (SELECT 1 FROM public.game_copies c WHERE c.game_id = game_waitlist.game_id AND c.owner_id = auth.uid() AND c.archived_at IS NULL)
  );

DROP POLICY IF EXISTS "Members can leave the waitlist" ON public.game_waitlist;
CREATE POLICY "Members can leave the waitlist" ON public.game_waitlist
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.game_waitlist TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Fusion de deux fiches (administrateurs)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.merge_games(source_game_id TEXT, target_game_id TEXT)
RETURNS public.games
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_row public.games;
  target_row public.games;
  copy_row public.game_copies;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;
  IF source_game_id = target_game_id THEN RAISE EXCEPTION 'Choisissez deux fiches différentes'; END IF;

  SELECT * INTO source_row FROM public.games WHERE id = source_game_id FOR UPDATE;
  SELECT * INTO target_row FROM public.games WHERE id = target_game_id FOR UPDATE;
  IF source_row.id IS NULL OR target_row.id IS NULL THEN RAISE EXCEPTION 'Fiche introuvable'; END IF;
  IF source_row.merged_into IS NOT NULL OR target_row.merged_into IS NOT NULL THEN
    RAISE EXCEPTION 'Une de ces fiches a déjà été fusionnée';
  END IF;

  FOR copy_row IN
    SELECT * FROM public.game_copies WHERE game_id = source_game_id AND archived_at IS NULL FOR UPDATE
  LOOP
    IF EXISTS (SELECT 1 FROM public.game_copies WHERE game_id = target_game_id AND owner_id = copy_row.owner_id AND archived_at IS NULL) THEN
      -- Le membre possède déjà le jeu sur la fiche conservée : son exemplaire en double est archivé.
      IF EXISTS (SELECT 1 FROM public.loans WHERE game_copy_id = copy_row.id AND status = 'active') THEN
        RAISE EXCEPTION 'Un exemplaire en double est actuellement prêté : attendez son retour avant de fusionner';
      END IF;
      UPDATE public.game_copies
      SET archived_at = NOW(), status = 'unavailable', notes = COALESCE(notes, 'Doublon archivé lors d''une fusion de fiches.')
      WHERE id = copy_row.id;
      UPDATE public.loan_requests SET status = 'cancelled', responded_at = NOW()
      WHERE game_copy_id = copy_row.id AND status = 'pending';
    ELSE
      UPDATE public.game_copies SET game_id = target_game_id WHERE id = copy_row.id;
    END IF;
  END LOOP;

  -- Favoris, liste d'attente et avis : déplacés, sans créer de doublon.
  INSERT INTO public.favorites (user_id, game_id, created_at)
    SELECT user_id, target_game_id, created_at FROM public.favorites WHERE game_id = source_game_id
    ON CONFLICT DO NOTHING;
  DELETE FROM public.favorites WHERE game_id = source_game_id;

  INSERT INTO public.game_waitlist (user_id, game_id, created_at)
    SELECT user_id, target_game_id, created_at FROM public.game_waitlist WHERE game_id = source_game_id
    ON CONFLICT DO NOTHING;
  DELETE FROM public.game_waitlist WHERE game_id = source_game_id;

  UPDATE public.game_reviews r SET game_id = target_game_id
  WHERE r.game_id = source_game_id
    AND NOT EXISTS (SELECT 1 FROM public.game_reviews t WHERE t.game_id = target_game_id AND t.author_id = r.author_id);

  UPDATE public.game_sessions SET game_id = target_game_id WHERE game_id = source_game_id;

  UPDATE public.games SET merged_into = target_game_id WHERE id = source_game_id RETURNING * INTO source_row;
  RETURN source_row;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Suppression d'une fiche jamais utilisée (administrateurs)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_unused_game(target_game_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;
  IF EXISTS (SELECT 1 FROM public.game_copies WHERE game_id = target_game_id)
     OR EXISTS (SELECT 1 FROM public.game_sessions WHERE game_id = target_game_id)
     OR EXISTS (SELECT 1 FROM public.games WHERE merged_into = target_game_id) THEN
    RAISE EXCEPTION 'Cette fiche est utilisée (exemplaires, historique ou parties) : fusionnez-la plutôt';
  END IF;
  DELETE FROM public.games WHERE id = target_game_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fiche introuvable'; END IF;
END;
$$;

DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY['public.merge_games(text, text)', 'public.delete_unused_game(text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END$$;
