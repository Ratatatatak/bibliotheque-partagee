-- 014 : premier administrateur et nettoyage des anciennes fiches inutilisées.
-- Rejouable sans effet supplémentaire.

-- 1. Comptes du créateur du site : ils deviennent administrateurs. Les adresses ne sont pas
--    écrites en clair (dépôt public) : on compare leur empreinte SHA-256 (adresse en minuscules).
--    Aucun autre compte n'est concerné.
UPDATE public.profiles
SET role = 'admin', updated_at = NOW()
WHERE role IS DISTINCT FROM 'admin'
  AND id IN (
    SELECT id FROM auth.users
    WHERE encode(sha256(convert_to(LOWER(email), 'UTF8')), 'hex') IN (
      '4e16e4ca8ac7e9b3015242bbefeb46e9d7e43f70084298c0691c9a332e0cbaaa',
      '4a40555a43ef54b9af739e886d4deff9fbd86c550338a2d7c172b97d77278d6a',
      'bd15457ef9ff867937585166826dc97e02f2c91335c45c3c6ae70274b5f85fc5'
    )
  );

-- 2. Anciennes fiches (identifiant non numérique, hors BoardGameGeek) qui ne servent à rien :
--    aucun exemplaire (même archivé), aucune partie, aucun avis. Leurs favoris, sources et
--    listes d'attente sont supprimés avec elles. Une fiche utilisée n'est jamais touchée.
DO $$
DECLARE
  unused TEXT[];
BEGIN
  SELECT COALESCE(array_agg(g.id), '{}') INTO unused
  FROM public.games g
  WHERE g.id !~ '^[0-9]+$'
    AND NOT EXISTS (SELECT 1 FROM public.game_copies c WHERE c.game_id = g.id);

  IF to_regclass('public.game_sessions') IS NOT NULL THEN
    unused := ARRAY(SELECT u FROM unnest(unused) u WHERE NOT EXISTS (SELECT 1 FROM public.game_sessions s WHERE s.game_id = u));
  END IF;
  IF to_regclass('public.game_reviews') IS NOT NULL THEN
    unused := ARRAY(SELECT u FROM unnest(unused) u WHERE NOT EXISTS (SELECT 1 FROM public.game_reviews r WHERE r.game_id = u));
  END IF;
  IF cardinality(unused) = 0 THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'games' AND column_name = 'merged_into') THEN
    UPDATE public.games SET merged_into = NULL WHERE merged_into = ANY(unused);
  END IF;
  IF to_regclass('public.favorites') IS NOT NULL THEN
    DELETE FROM public.favorites WHERE game_id = ANY(unused);
  END IF;
  IF to_regclass('public.game_sources') IS NOT NULL THEN
    DELETE FROM public.game_sources WHERE game_id = ANY(unused);
  END IF;
  IF to_regclass('public.game_waitlist') IS NOT NULL THEN
    DELETE FROM public.game_waitlist WHERE game_id = ANY(unused);
  END IF;
  DELETE FROM public.games WHERE id = ANY(unused);
END $$;
