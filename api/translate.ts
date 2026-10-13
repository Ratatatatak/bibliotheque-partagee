import { isSignedInMember, sendJson, type VercelRequest, type VercelResponse } from './_lib/http.js';

// Relais de traduction : envoie une description à l'outil Google Apps Script du groupe
// (Google Traduction, gratuit) et renvoie la version française.
// Réservé aux membres connectés. Le texte n'est conservé nulle part par ce relais.

/** Adresse de l'outil de traduction (web app Apps Script « Ludothèque – traduction »). */
const SCRIPT_URL = '';

const MAX_LENGTH = 20000;
const SCRIPT_URL_PATTERN = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/;

type BodyRequest = VercelRequest & { body?: unknown; on?: (event: string, cb: (chunk?: unknown) => void) => void };

const readBody = async (request: BodyRequest): Promise<unknown> => {
  if (request.body !== undefined) return typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
  if (!request.on) return {};
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    request.on!('data', (chunk) => chunks.push(Buffer.from(chunk as Buffer)));
    request.on!('end', () => resolve());
    request.on!('error', (error) => reject(error));
  });
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
};

export default async function handler(request: BodyRequest, response: VercelResponse): Promise<void> {
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Méthode non autorisée' });
  const scriptUrl = (process.env.TRANSLATE_SCRIPT_URL || SCRIPT_URL).trim();
  if (!SCRIPT_URL_PATTERN.test(scriptUrl)) {
    return sendJson(response, 503, { error: 'Traduction non configurée', code: 'not-configured' });
  }
  if (!(await isSignedInMember(request))) {
    return sendJson(response, 401, { error: 'Connexion requise', code: 'not-signed-in' });
  }

  let text = '';
  try {
    const body = (await readBody(request)) as { text?: unknown };
    text = typeof body?.text === 'string' ? body.text : '';
  } catch {
    return sendJson(response, 400, { error: 'Requête invalide' });
  }
  if (!text.trim()) return sendJson(response, 400, { error: 'Texte manquant' });
  if (text.length > MAX_LENGTH) return sendJson(response, 413, { error: 'Texte trop long' });

  try {
    // Apps Script répond par une redirection vers le résultat : fetch la suit automatiquement.
    const upstream = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ text }),
      redirect: 'follow',
    });
    const raw = await upstream.text();
    let data: { translation?: unknown; error?: unknown } = {};
    try { data = JSON.parse(raw); } catch { /* réponse non JSON (page d'erreur Google) */ }
    if (!upstream.ok || typeof data.translation !== 'string' || !data.translation.trim()) {
      return sendJson(response, 502, { error: 'La traduction a échoué', detail: typeof data.error === 'string' ? data.error : undefined });
    }
    response.setHeader('Cache-Control', 'no-store');
    sendJson(response, 200, { translation: data.translation });
  } catch {
    sendJson(response, 502, { error: 'Impossible de joindre le service de traduction' });
  }
}
