import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const FORCE_LOCAL = import.meta.env.VITE_LOCAL_DEMO_MODE === 'true';

/** Vrai si l'URL et la clé publique (« anon ») Supabase sont fournies. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Mode de fonctionnement de l'application :
 *  - 'supabase' : données partagées entre tous les membres, comptes réels ;
 *  - 'local'    : démonstration dans CE navigateur uniquement (localStorage), aucune synchronisation.
 */
export const appMode: 'supabase' | 'local' = isSupabaseConfigured && !FORCE_LOCAL ? 'supabase' : 'local';
export const isLocalMode = appMode === 'local';

/**
 * Client Supabase, ou null en mode local. Seule la clé publique « anon » est
 * utilisée côté navigateur : la sécurité repose sur les règles RLS de la base.
 * Ne jamais mettre de clé « service_role » dans une variable VITE_*.
 */
export const supabase: SupabaseClient | null = appMode === 'supabase'
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export const requireSupabase = (): SupabaseClient => {
  if (!supabase) throw new Error('Supabase n’est pas configuré : l’application fonctionne en mode local.');
  return supabase;
};
