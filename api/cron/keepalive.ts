import { sendJson, supabaseConfig, type VercelRequest, type VercelResponse } from '../_lib/http.js';

// Tâche planifiée quotidienne (voir « crons » dans vercel.json).
// Sur l'offre gratuite, Supabase met en pause un projet sans activité pendant
// 7 jours : une petite lecture par jour suffit à l'éviter. Aucune donnée n'est
// modifiée ni renvoyée.

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.authorization;
  if (secret && authorization !== `Bearer ${secret}`) return sendJson(response, 401, { ok: false });

  const config = supabaseConfig();
  if (!config) return sendJson(response, 200, { ok: true, skipped: 'Supabase non configuré' });

  try {
    const result = await fetch(`${config.url}/rest/v1/games?select=id&limit=1`, {
      headers: { apikey: config.anonKey, Authorization: `Bearer ${config.anonKey}` },
    });
    sendJson(response, result.ok ? 200 : 502, { ok: result.ok, status: result.status, at: new Date().toISOString() });
  } catch {
    sendJson(response, 502, { ok: false });
  }
}
