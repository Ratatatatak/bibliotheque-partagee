// Traduction française automatique des descriptions, via le relais /api/translate.
import { supabase } from '@/integrations/supabase/client';

export class TranslationUnavailableError extends Error {}

const authHeaders = async (): Promise<Record<string, string>> => {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** Traduit un texte en français. Lève TranslationUnavailableError si le service n'est pas disponible. */
export const translateToFrench = async (text: string): Promise<string> => {
  let response: Response;
  try {
    response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ text }),
    });
  } catch {
    throw new TranslationUnavailableError('Service de traduction injoignable.');
  }
  const data = await response.json().catch(() => ({})) as { translation?: string; error?: string };
  if (!response.ok || !data.translation) throw new TranslationUnavailableError(data.error || 'Traduction indisponible.');
  return data.translation;
};
