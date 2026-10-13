// Outils partagés des fonctions serveur Vercel (les dossiers commençant par « _ »
// ne sont pas exposés comme des adresses publiques).

export type VercelRequest = { url?: string; method?: string; headers: Record<string, string | string[] | undefined> };
export type VercelResponse = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
};

export const sendJson = (response: VercelResponse, status: number, body: unknown) => {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(body));
};

const header = (request: VercelRequest, name: string) => {
  const value = request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

/** URL et clé publique Supabase côté serveur (mêmes valeurs que celles du site). */
export const supabaseConfig = () => {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  return url && anonKey ? { url, anonKey } : null;
};

/**
 * Vérifie que la requête vient d'un membre connecté, en demandant à Supabase
 * qui correspond au jeton de session envoyé par le navigateur.
 * Renvoie true si Supabase n'est pas configuré (mode local de démonstration).
 */
export const isSignedInMember = async (request: VercelRequest): Promise<boolean> => {
  const config = supabaseConfig();
  if (!config) return true;
  const authorization = header(request, 'authorization') || '';
  if (!/^Bearer\s+\S+/.test(authorization)) return false;
  try {
    const result = await fetch(`${config.url}/auth/v1/user`, {
      headers: { apikey: config.anonKey, Authorization: authorization },
    });
    return result.ok;
  } catch {
    return false;
  }
};
