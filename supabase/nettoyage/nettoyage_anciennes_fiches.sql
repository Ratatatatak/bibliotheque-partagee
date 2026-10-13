-- Nettoyage : suppression de toutes les anciennes fiches (hors BoardGameGeek)
-- et de tout ce qui y est rattaché (exemplaires, demandes, prêts, échanges,
-- favoris, avis, parties, liste d'attente).
-- Les comptes, les profils et les fiches BoardGameGeek (identifiant numérique)
-- ne sont PAS touchés. Opération définitive.

BEGIN;

CREATE TEMP TABLE old_games ON COMMIT DROP AS
  SELECT id FROM public.games WHERE id !~ '^[0-9]+$';

CREATE TEMP TABLE old_copies ON COMMIT DROP AS
  SELECT id FROM public.game_copies WHERE game_id IN (SELECT id FROM old_games);

DO $$
BEGIN
  IF to_regclass('public.exchange_requests') IS NOT NULL THEN
    DELETE FROM public.exchange_requests
    WHERE offered_copy_id IN (SELECT id FROM old_copies) OR requested_copy_id IN (SELECT id FROM old_copies);
  END IF;

  DELETE FROM public.loans WHERE game_copy_id IN (SELECT id FROM old_copies);
  DELETE FROM public.loan_requests WHERE game_copy_id IN (SELECT id FROM old_copies);
  DELETE FROM public.game_copies WHERE id IN (SELECT id FROM old_copies);

  IF to_regclass('public.game_sessions') IS NOT NULL THEN
    DELETE FROM public.game_sessions WHERE game_id IN (SELECT id FROM old_games);
  END IF;
  IF to_regclass('public.favorites') IS NOT NULL THEN
    DELETE FROM public.favorites WHERE game_id IN (SELECT id FROM old_games);
  END IF;
  IF to_regclass('public.game_reviews') IS NOT NULL THEN
    DELETE FROM public.game_reviews WHERE game_id IN (SELECT id FROM old_games);
  END IF;
  IF to_regclass('public.game_sources') IS NOT NULL THEN
    DELETE FROM public.game_sources WHERE game_id IN (SELECT id FROM old_games);
  END IF;
  IF to_regclass('public.game_waitlist') IS NOT NULL THEN
    DELETE FROM public.game_waitlist WHERE game_id IN (SELECT id FROM old_games);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'games' AND column_name = 'merged_into') THEN
    UPDATE public.games SET merged_into = NULL WHERE merged_into IN (SELECT id FROM old_games);
  END IF;

  DELETE FROM public.games WHERE id IN (SELECT id FROM old_games);
END $$;

-- Résultat : nombre de fiches restantes (toutes BoardGameGeek) et d'anciennes fiches (doit être 0).
SELECT
  (SELECT count(*) FROM public.games) AS fiches_bgg_restantes,
  (SELECT count(*) FROM public.games WHERE id !~ '^[0-9]+$') AS anciennes_fiches_restantes;

COMMIT;
