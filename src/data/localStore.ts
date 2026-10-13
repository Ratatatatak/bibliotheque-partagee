// Persistance du mode local dans le localStorage du navigateur.
//
// IMPORTANT : ce stockage n'est PAS partagé. Chaque navigateur a ses propres
// données ; rien n'est synchronisé entre les membres. Il sert à essayer
// l'application ou à la développer sans base de données.

import { emptyLocalState, LOCAL_STATE_VERSION, type LocalState } from '@/domain/localState';
import type { Game, GameCopy, GameSession, MemberId } from '@/domain/types';

const STATE_KEY = 'ludotheque-local-v2';
const SESSION_KEY = 'ludotheque-local-current-member';

// Anciennes clés (versions précédentes). Elles ne sont JAMAIS supprimées ni modifiées.
const LEGACY_COLLECTION_KEY = 'bibliotheque-local-collection';
const LEGACY_FAVORITES_KEY = 'bibliotheque-local-favorites';
const LEGACY_SESSIONS_KEY = 'bibliotheque-local-sessions';
const LEGACY_IMPORT_FLAG = 'ludotheque-local-legacy-imported';

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
};

const storage = (): Storage | null => {
  try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; }
};

export const readLocalState = (): LocalState => {
  const parsed = safeParse<Partial<LocalState> | null>(storage()?.getItem(STATE_KEY) ?? null, null);
  if (!parsed || parsed.version !== LOCAL_STATE_VERSION) return emptyLocalState();
  return { ...emptyLocalState(), ...parsed } as LocalState;
};

const listeners = new Set<() => void>();

export const writeLocalState = (state: LocalState) => {
  storage()?.setItem(STATE_KEY, JSON.stringify(state));
  listeners.forEach((listener) => listener());
};

/** Applique une modification en repartant TOUJOURS de l'état enregistré le plus récent (plusieurs onglets). */
export const updateLocalState = <T,>(change: (state: LocalState) => { state: LocalState; result: T }): T => {
  const { state, result } = change(readLocalState());
  writeLocalState(state);
  return result;
};

/** Prévient l'application quand les données locales changent (y compris depuis un autre onglet). */
export const subscribeLocalState = (listener: () => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STATE_KEY || event.key === SESSION_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
};

export const readCurrentLocalMemberId = (): MemberId | null => storage()?.getItem(SESSION_KEY) || null;

export const writeCurrentLocalMemberId = (memberId: MemberId | null) => {
  if (memberId) storage()?.setItem(SESSION_KEY, memberId);
  else storage()?.removeItem(SESSION_KEY);
  listeners.forEach((listener) => listener());
};

// ---------------------------------------------------------------------------
// Reprise non destructive des données des anciennes versions
// ---------------------------------------------------------------------------

type LegacyCollectionItem = {
  id: string;
  status?: string;
  game?: { id: string; name: string; description?: string | null; image_url?: string | null; min_players?: number; max_players?: number; duration?: number | null; min_age?: number | null; category?: string | null; year?: number | null };
};

type LegacySession = { id: string; gameId: string; gameName: string; date: string; time: string; place: string; players: string[]; status: 'planned' | 'played' };

export const hasLegacyData = () => {
  const s = storage();
  if (!s || s.getItem(LEGACY_IMPORT_FLAG)) return false;
  return [LEGACY_COLLECTION_KEY, LEGACY_FAVORITES_KEY, LEGACY_SESSIONS_KEY].some((key) => {
    const value = safeParse<unknown[]>(s.getItem(key), []);
    return Array.isArray(value) && value.length > 0;
  });
};

/**
 * Rattache la collection, les favoris et les parties de l'ancienne version au
 * membre indiqué. Les anciennes clés restent intactes. Les anciennes demandes et
 * prêts (enregistrés par nom, sans lien fiable vers un exemplaire) ne sont pas
 * repris pour éviter de créer des prêts incohérents.
 */
export const importLegacyData = (state: LocalState, memberId: MemberId): LocalState => {
  const s = storage();
  if (!s || s.getItem(LEGACY_IMPORT_FLAG)) return state;
  const now = new Date().toISOString();
  let next = { ...state };

  const collection = safeParse<LegacyCollectionItem[]>(s.getItem(LEGACY_COLLECTION_KEY), []);
  for (const item of Array.isArray(collection) ? collection : []) {
    const legacy = item.game;
    if (!legacy?.id || !legacy.name) continue;
    if (!next.games.some((game) => game.id === legacy.id)) {
      const isBgg = /^\d+$/.test(legacy.id);
      const game: Game = {
        id: legacy.id, name: legacy.name, originalName: null, year: legacy.year ?? null,
        publishers: [], designers: [], illustrators: [],
        minPlayers: legacy.min_players ?? null, maxPlayers: legacy.max_players ?? null,
        playingTime: legacy.duration ?? null, minAge: legacy.min_age ?? null,
        description: legacy.description ?? null, categories: legacy.category ? [legacy.category] : [], mechanics: [],
        imageUrl: legacy.image_url ?? null, thumbnailUrl: null,
        bggId: isBgg ? legacy.id : null, isExpansion: false, rating: null, ratingsCount: null,
        origin: 'legacy-catalog',
        sources: isBgg ? [{ name: 'BoardGameGeek', url: `https://boardgamegeek.com/boardgame/${legacy.id}`, retrievedAt: '' }] : [],
      };
      next = { ...next, games: [...next.games, game] };
    }
    if (!next.copies.some((copy) => copy.ownerId === memberId && copy.gameId === legacy.id)) {
      const copy: GameCopy = {
        id: `copy-legacy-${item.id}`, gameId: legacy.id, ownerId: memberId,
        // Un ancien statut « prêté » n'était lié à aucun prêt : on le conserve en « indisponible ».
        status: item.status === 'available' ? 'available' : 'unavailable',
        notes: item.status === 'lent' ? 'Marqué « prêté » dans l’ancienne version (sans prêt enregistré).' : null,
        createdAt: now,
        archivedAt: null,
      };
      next = { ...next, copies: [...next.copies, copy] };
    }
  }

  const favorites = safeParse<string[]>(s.getItem(LEGACY_FAVORITES_KEY), []);
  for (const gameId of Array.isArray(favorites) ? favorites : []) {
    if (next.games.some((g) => g.id === gameId) && !next.favorites.some((f) => f.memberId === memberId && f.gameId === gameId)) {
      next = { ...next, favorites: [...next.favorites, { memberId, gameId }] };
    }
  }

  const sessions = safeParse<LegacySession[]>(s.getItem(LEGACY_SESSIONS_KEY), []);
  for (const legacy of Array.isArray(sessions) ? sessions : []) {
    if (!legacy?.id || !next.games.some((g) => g.id === legacy.gameId) || next.sessions.some((x) => x.id === legacy.id)) continue;
    const session: GameSession = {
      id: legacy.id, gameId: legacy.gameId, creatorId: memberId, date: legacy.date, time: legacy.time || null,
      location: legacy.place || null, status: legacy.status === 'played' ? 'played' : 'planned',
      playerIds: legacy.players?.includes('Moi') ? [memberId] : [], createdAt: now,
    };
    next = { ...next, sessions: [...next.sessions, session] };
  }

  s.setItem(LEGACY_IMPORT_FLAG, now);
  return next;
};
