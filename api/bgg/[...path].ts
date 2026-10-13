import { isSignedInMember, sendJson, type VercelRequest, type VercelResponse } from '../_lib/http';

// Relais vers l'API BoardGameGeek. Le jeton BGG du groupe reste sur le serveur.
// Seuls les membres connectés peuvent l'utiliser, et seulement pour les deux
// appels dont l'application a besoin (recherche et fiche d'un jeu).

const ALLOWED_ENDPOINTS = new Set(['search', 'thing']);

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  const token = process.env.BGG_API_TOKEN;
  if (!token) return sendJson(response, 503, { error: 'BGG_API_TOKEN est absent du serveur' });

  const requestUrl = new URL(request.url || '/', 'https://localhost');
  const endpoint = requestUrl.pathname.replace(/^\/api\/bgg\/?/, '');
  if (!ALLOWED_ENDPOINTS.has(endpoint)) return sendJson(response, 404, { error: 'Point d’accès BGG non autorisé' });

  if (!(await isSignedInMember(request))) {
    return sendJson(response, 401, { error: 'Connexion requise', code: 'not-signed-in' });
  }

  const upstreamUrl = new URL(`https://boardgamegeek.com/xmlapi2/${endpoint}`);
  upstreamUrl.search = requestUrl.search;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'BibliothequePartagee/1.0 (Vercel server function)' },
    });
    response.statusCode = upstreamResponse.status;
    response.setHeader('Content-Type', upstreamResponse.headers.get('content-type') || 'application/xml');
    response.setHeader('Cache-Control', 'private, max-age=300');
    response.end(await upstreamResponse.text());
  } catch {
    sendJson(response, 502, { error: 'Impossible de joindre BoardGameGeek' });
  }
}
