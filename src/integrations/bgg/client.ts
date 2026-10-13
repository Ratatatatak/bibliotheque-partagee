// Client de l'API XML2 de BoardGameGeek (https://boardgamegeek.com/wiki/page/BGG_XML_API2).
//
// Les appels passent par /api/bgg :
//  - en développement : le proxy défini dans vite.config.ts ;
//  - en production (Vercel) : la fonction serveur api/bgg/[...path].ts.
// Dans les deux cas, le jeton BGG (BGG_API_TOKEN) reste côté serveur et n'est
// jamais envoyé au navigateur.

import type { GameInput } from '@/domain/types';
import { supabase } from '@/integrations/supabase/client';

export type BGGSearchResult = {
  id: string;
  type: string; // « boardgame » ou « boardgameexpansion »
  name: string;
  year: string | null;
};

export type BGGGameDetails = {
  id: string;
  type: string;
  name: string;
  alternateNames: string[];
  description: string | null;
  year: string | null;
  image: string | null;
  thumbnail: string | null;
  minPlayers: string | null;
  maxPlayers: string | null;
  playingTime: string | null;
  minAge: string | null;
  designers: string[];
  artists: string[];
  publishers: string[];
  categories: string[];
  mechanics: string[];
  rating: { average: string | null; bayesAverage: string | null; usersRated: string | null };
};

export class BGGUnavailableError extends Error {
  constructor(message: string, public readonly status: number | null) {
    super(message);
    this.name = 'BGGUnavailableError';
  }
}

const BGG_BASE_URL = '/api/bgg';

/** Le relais BGG n'accepte que les membres connectés : on lui transmet la session. */
const authHeaders = async (): Promise<Record<string, string>> => {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

async function fetchBGG(endpoint: string, params: Record<string, string>): Promise<string> {
  const url = `${BGG_BASE_URL}/${endpoint}?${new URLSearchParams(params).toString()}`;

  const headers = await authHeaders();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, { headers });
    } catch {
      throw new BGGUnavailableError('Connexion à BoardGameGeek impossible. Vérifiez votre connexion internet.', null);
    }

    // 202 = BGG prépare la réponse ; 429 = trop de requêtes : on patiente puis on réessaie.
    if ((response.status === 202 || response.status === 429) && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      continue;
    }
    if (response.status === 503 && (response.headers.get('content-type') || '').includes('json')) {
      throw new BGGUnavailableError('La recherche BoardGameGeek n’est pas configurée sur le serveur (jeton BGG_API_TOKEN manquant).', 503);
    }
    if (response.status === 401 && (response.headers.get('content-type') || '').includes('json')) {
      throw new BGGUnavailableError('Votre session a expiré : reconnectez-vous pour rechercher un jeu.', 401);
    }
    if (response.status === 401 || response.status === 403) {
      throw new BGGUnavailableError('BoardGameGeek a refusé l’accès : le jeton BGG_API_TOKEN est absent, invalide ou révoqué.', response.status);
    }
    if (!response.ok) {
      throw new BGGUnavailableError(`BoardGameGeek est momentanément indisponible (erreur ${response.status}).`, response.status);
    }
    return response.text();
  }
  throw new BGGUnavailableError('BoardGameGeek met trop de temps à répondre. Réessayez dans un instant.', 202);
}

const parseXml = (xml: string) => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new BGGUnavailableError('Réponse BoardGameGeek illisible.', null);
  return doc;
};

const attr = (el: Element | null | undefined, name: string) => el?.getAttribute(name) || null;

/**
 * Les descriptions BGG contiennent des entités HTML doublement encodées
 * (« &amp;#10; » pour un retour à la ligne). On les décode en texte brut.
 */
export const decodeBggText = (raw: string | null): string | null => {
  if (!raw) return null;
  const textarea = typeof document !== 'undefined' ? document.createElement('textarea') : null;
  let text = raw;
  for (let i = 0; i < 2 && textarea; i += 1) {
    textarea.innerHTML = text;
    text = textarea.value;
  }
  return text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim() || null;
};

function parseSearch(xml: string): BGGSearchResult[] {
  const results: BGGSearchResult[] = [];
  parseXml(xml).querySelectorAll('items > item').forEach((item) => {
    const id = attr(item, 'id');
    const name = attr(item.querySelector("name[type='primary']") ?? item.querySelector('name'), 'value');
    if (id && name) {
      results.push({ id, type: attr(item, 'type') ?? 'boardgame', name, year: attr(item.querySelector('yearpublished'), 'value') });
    }
  });
  // Un même jeu peut apparaître deux fois (nom principal + nom alternatif).
  return results.filter((result, index) => results.findIndex((r) => r.id === result.id) === index);
}

function parseDetails(xml: string): BGGGameDetails | null {
  const item = parseXml(xml).querySelector('items > item');
  const id = attr(item, 'id');
  if (!item || !id) return null;
  const links = (type: string) => Array.from(item.querySelectorAll(`link[type='${type}']`))
    .map((link) => attr(link, 'value'))
    .filter((value): value is string => Boolean(value) && value !== '(Uncredited)');
  const value = (selector: string) => {
    const v = attr(item.querySelector(selector), 'value');
    return v && v !== '0' ? v : null;
  };
  return {
    id,
    type: attr(item, 'type') ?? 'boardgame',
    name: attr(item.querySelector("name[type='primary']"), 'value') ?? '',
    alternateNames: Array.from(item.querySelectorAll("name[type='alternate']")).map((n) => attr(n, 'value')).filter((v): v is string => Boolean(v)),
    description: decodeBggText(item.querySelector('description')?.textContent ?? null),
    year: value('yearpublished'),
    image: item.querySelector('image')?.textContent?.trim() || null,
    thumbnail: item.querySelector('thumbnail')?.textContent?.trim() || null,
    minPlayers: value('minplayers'),
    maxPlayers: value('maxplayers'),
    playingTime: value('playingtime'),
    minAge: value('minage'),
    designers: links('boardgamedesigner'),
    artists: links('boardgameartist'),
    publishers: links('boardgamepublisher'),
    categories: links('boardgamecategory'),
    mechanics: links('boardgamemechanic'),
    rating: {
      average: value('statistics > ratings > average'),
      bayesAverage: value('statistics > ratings > bayesaverage'),
      usersRated: value('statistics > ratings > usersrated'),
    },
  };
}

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Classe les résultats : nom exact, puis « commence par », jeux de base avant extensions, puis année. */
export function rankBGGSearchResults(results: BGGSearchResult[], query: string): BGGSearchResult[] {
  const q = normalize(query);
  return results
    .map((result, index) => {
      const name = normalize(result.name);
      const rank = name === q ? 0 : name.startsWith(q) ? 1 : 2;
      const expansion = result.type === 'boardgameexpansion' ? 1 : 0;
      const year = result.year ? Number.parseInt(result.year, 10) : Number.MAX_SAFE_INTEGER;
      return { result, index, rank, expansion, year };
    })
    .sort((a, b) => a.rank - b.rank || a.expansion - b.expansion || a.year - b.year || a.index - b.index)
    .map(({ result }) => result);
}

export async function searchBGGGames(query: string): Promise<BGGSearchResult[]> {
  const xml = await fetchBGG('search', { query, type: 'boardgame,boardgameexpansion' });
  return rankBGGSearchResults(parseSearch(xml), query).slice(0, 30);
}

export async function getBGGGameDetails(gameId: string): Promise<BGGGameDetails | null> {
  if (!/^\d+$/.test(gameId)) return null;
  return parseDetails(await fetchBGG('thing', { id: gameId, stats: '1' }));
}

const toInt = (value: string | null) => {
  const n = value ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Convertit une fiche BGG en fiche de l'application. Aucune valeur n'est
 * inventée : une information absente chez BGG reste vide (null).
 */
export const bggDetailsToGameInput = (details: BGGGameDetails, retrievedAt = new Date().toISOString()): GameInput => {
  const rating = details.rating.average ? Number.parseFloat(details.rating.average) : NaN;
  return {
    id: details.id,
    name: details.name,
    originalName: null,
    year: toInt(details.year),
    publishers: details.publishers,
    designers: details.designers,
    illustrators: details.artists,
    minPlayers: toInt(details.minPlayers),
    maxPlayers: toInt(details.maxPlayers),
    playingTime: toInt(details.playingTime),
    minAge: toInt(details.minAge),
    description: details.description,
    categories: details.categories,
    mechanics: details.mechanics,
    imageUrl: details.image,
    thumbnailUrl: details.thumbnail,
    bggId: details.id,
    isExpansion: details.type === 'boardgameexpansion',
    rating: Number.isFinite(rating) && rating > 0 ? Math.round(rating * 100) / 100 : null,
    ratingsCount: toInt(details.rating.usersRated),
    origin: 'bgg',
    sources: [{ name: 'BoardGameGeek', url: `https://boardgamegeek.com/boardgame/${details.id}`, retrievedAt }],
  };
};

export const bggApi = { search: searchBGGGames, getDetails: getBGGGameDetails };
