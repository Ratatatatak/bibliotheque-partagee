-- 013 : coordonnées facultatives pour se prévenir sur WhatsApp / Messenger.
-- Non destructive et rejouable. Les profils restent lisibles uniquement par
-- les membres connectés (règle de la migration 003) ; chacun ne modifie que
-- son propre profil.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS messenger_handle TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_whatsapp_phone_format') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_whatsapp_phone_format
      CHECK (whatsapp_phone IS NULL OR whatsapp_phone ~ '^[1-9][0-9]{7,14}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_messenger_handle_format') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_messenger_handle_format
      CHECK (messenger_handle IS NULL OR messenger_handle ~ '^[A-Za-z0-9.]{3,50}$');
  END IF;
END $$;
