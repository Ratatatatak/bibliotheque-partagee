-- 015 : traduction française automatique des descriptions.
-- Rejouable. La description d'origine (BGG) n'est jamais modifiée : la traduction
-- est stockée à côté, avec sa date.

ALTER TABLE public.games ADD COLUMN IF NOT EXISTS description_fr TEXT;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS description_fr_at TIMESTAMPTZ;

-- N'importe quel membre connecté peut enregistrer la traduction d'une fiche qui n'en a
-- pas encore (elle est faite automatiquement par le site à la première consultation).
-- Une traduction existante ne peut être remplacée que par un administrateur (mise à jour
-- de la fiche).
CREATE OR REPLACE FUNCTION public.save_game_translation(target_game_id TEXT, translated TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Connectez-vous pour enregistrer une traduction.';
  END IF;
  IF translated IS NULL OR length(btrim(translated)) = 0 OR length(translated) > 30000 THEN
    RAISE EXCEPTION 'Traduction invalide.';
  END IF;
  UPDATE public.games
  SET description_fr = translated, description_fr_at = NOW()
  WHERE id = target_game_id AND description_fr IS NULL AND description IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.save_game_translation(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_game_translation(TEXT, TEXT) TO authenticated;
