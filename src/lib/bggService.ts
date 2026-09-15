import { bggApi, BGGSearchResult, BGGGameDetails } from '@/integrations/bgg/client';

// Simple cache en mémoire pour éviter de faire trop de requêtes identiques
// En production, nous voudrions probablement utiliser un système de cache plus robuste
// comme celui fourni par React Query ou un service worker
const searchCache = new Map<string, { results: BGGSearchResult[]; timestamp: number }>();
const detailsCache = new Map<string, { details: BGGGameDetails | null; timestamp: number }>();

// Durée de vie du cache en millisecondes (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Recherche des jeux sur BGG avec mise en cache
 * @param query Le terme de recherche
 * @returns Résultats de la recherche
 */
export async function searchBGGGamesCached(query: string): Promise<BGGSearchResult[]> {
  // Vérifier le cache
  const cached = searchCache.get(query);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.results;
  }

  // Effectuer la recherche
  const results = await bggApi.search(query);

  // Mettre en cache
  searchCache.set(query, {
    results,
    timestamp: Date.now()
  });

  return results;
}

/**
 * Obtient les détails d'un jeu spécifique sur BGG avec mise en cache
 * @param gameId L'identifiant du jeu sur BGG
 * @returns Détails du jeu
 */
export async function getBGGGameDetailsCached(gameId: string): Promise<BGGGameDetails | null> {
  // Vérifier le cache
  const cached = detailsCache.get(gameId);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.details;
  }

  // Récupérer les détails
  const details = await bggApi.getDetails(gameId);

  // Mettre en cache
  detailsCache.set(gameId, {
    details,
    timestamp: Date.now()
  });

  return details;
}

/**
 * Efface le cache de recherche
 */
export function clearBGGSearchCache(): void {
  searchCache.clear();
}

/**
 * Efface le cache des détails
 */
export function clearBGGGameDetailsCache(): void {
  detailsCache.clear();
}

/**
 * Efface tout le cache BGG
 */
export function clearBGGCache(): void {
  clearBGGSearchCache();
  clearBGGGameDetailsCache();
}

// Exportons l'API avec cache
export const bggService = {
  search: searchBGGGamesCached,
  getDetails: getBGGGameDetailsCached,
  clearSearchCache: clearBGGSearchCache,
  clearDetailsCache: clearBGGGameDetailsCache,
  clearCache: clearBGGCache
};