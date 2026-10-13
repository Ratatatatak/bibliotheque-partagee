type VercelRequest = { url?: string };
type VercelResponse = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body: string): void;
};

const ALLOWED_ENDPOINTS = new Set(['search', 'thing']);

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  const token = process.env.BGG_API_TOKEN;

  if (!token) {
    response.statusCode = 503;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ error: 'BGG_API_TOKEN est absent du serveur' }));
    return;
  }

  const requestUrl = new URL(request.url || '/', 'https://localhost');
  const endpoint = requestUrl.pathname.replace(/^\/api\/bgg\/?/, '');

  // Seuls les deux points d'accès utilisés par l'application sont relayés, pour
  // que ce relais (qui utilise le jeton du groupe) ne serve pas à autre chose.
  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    response.statusCode = 404;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ error: 'Point d’accès BGG non autorisé' }));
    return;
  }
  const upstreamUrl = new URL(`https://boardgamegeek.com/xmlapi2/${endpoint}`);
  upstreamUrl.search = requestUrl.search;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'BibliothequePartagee/1.0 (Vercel server function)'
      }
    });

    response.statusCode = upstreamResponse.status;
    response.setHeader('Content-Type', upstreamResponse.headers.get('content-type') || 'application/xml');
    response.setHeader('Cache-Control', 'private, max-age=300');
    response.end(await upstreamResponse.text());
  } catch {
    response.statusCode = 502;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ error: 'Impossible de joindre BoardGameGeek' }));
  }
}