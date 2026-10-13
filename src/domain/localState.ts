// État complet du mode local et règles métier appliquées dessus.
//
// Toutes les fonctions de ce fichier sont « pures » : elles reçoivent un état,
// l'identité de la personne qui agit, et renvoient un NOUVEL état (ou lèvent une
// DomainError). Cela permet de les tester sans navigateur et de garantir que le
// mode local applique exactement les mêmes règles que les fonctions SQL Supabase
// (voir supabase/migrations/010_loan_integrity_and_privacy.sql).

import {
  DomainError,
  type Game,
  type GameCopy,
  type GameInput,
  type GameSession,
  type Loan,
  type LoanRequest,
  type Member,
  type MemberId,
} from './types';
import { isValidIsoDate, todayIso } from './dates';

export const LOCAL_STATE_VERSION = 2;

export type LocalState = {
  version: typeof LOCAL_STATE_VERSION;
  members: Member[];
  games: Game[];
  copies: GameCopy[];
  requests: LoanRequest[];
  loans: Loan[];
  favorites: { memberId: MemberId; gameId: string }[];
  sessions: GameSession[];
};

export const emptyLocalState = (): LocalState => ({
  version: LOCAL_STATE_VERSION,
  members: [],
  games: [],
  copies: [],
  requests: [],
  loans: [],
  favorites: [],
  sessions: [],
});

export type Clock = { now: () => Date; newId: (prefix: string) => string };

export const defaultClock: Clock = {
  now: () => new Date(),
  newId: (prefix) => {
    const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return `${prefix}-${random}`;
  },
};

const requireMember = (state: LocalState, memberId: MemberId) => {
  const member = state.members.find((item) => item.id === memberId);
  if (!member) throw new DomainError('Membre inconnu. Reconnectez-vous.');
  return member;
};

const requireCopy = (state: LocalState, copyId: string) => {
  const copy = state.copies.find((item) => item.id === copyId);
  if (!copy || copy.archivedAt) throw new DomainError('Cet exemplaire n’existe plus.');
  return copy;
};

export const activeLoanForCopy = (state: LocalState, copyId: string) =>
  state.loans.find((loan) => loan.copyId === copyId && loan.status === 'active') ?? null;

// ---------------------------------------------------------------------------
// Membres
// ---------------------------------------------------------------------------

export const addMember = (state: LocalState, displayName: string, username: string | null, clock: Clock = defaultClock) => {
  const name = displayName.trim();
  if (name.length < 2 || name.length > 40) throw new DomainError('Le nom doit contenir entre 2 et 40 caractères.');
  const handle = username?.trim() || null;
  if (handle && !/^[\p{L}\p{N}_.-]{3,24}$/u.test(handle)) {
    throw new DomainError('Le pseudo doit contenir 3 à 24 lettres, chiffres, points, tirets ou soulignés.');
  }
  if (handle && state.members.some((m) => m.username?.toLowerCase() === handle.toLowerCase())) {
    throw new DomainError('Ce pseudo est déjà utilisé.');
  }
  const member: Member = { id: clock.newId('member'), displayName: name, username: handle };
  return { state: { ...state, members: [...state.members, member] }, member };
};

// ---------------------------------------------------------------------------
// Fiches de jeux et exemplaires
// ---------------------------------------------------------------------------

/**
 * Ajoute (ou met à jour) une fiche de jeu. Lors d'une resynchronisation, seules
 * les données descriptives externes sont remplacées : les exemplaires, prêts et
 * notes du groupe ne sont jamais touchés.
 */
export const upsertGame = (state: LocalState, input: GameInput, clock: Clock = defaultClock) => {
  if (!input.name.trim()) throw new DomainError('Le nom du jeu est obligatoire.');
  const id = input.id ?? (input.bggId ? input.bggId : clock.newId('game'));
  const existing = state.games.find((game) => game.id === id);
  const game: Game = { ...input, id };
  const games = existing ? state.games.map((item) => (item.id === id ? game : item)) : [...state.games, game];
  return { state: { ...state, games }, game };
};

export const addCopy = (state: LocalState, actorId: MemberId, gameId: string, clock: Clock = defaultClock) => {
  requireMember(state, actorId);
  if (!state.games.some((game) => game.id === gameId)) throw new DomainError('Fiche de jeu introuvable.');
  if (state.copies.some((copy) => copy.ownerId === actorId && copy.gameId === gameId && !copy.archivedAt)) {
    throw new DomainError('Ce jeu est déjà dans votre collection.');
  }
  const copy: GameCopy = {
    archivedAt: null,
    id: clock.newId('copy'),
    gameId,
    ownerId: actorId,
    status: 'available',
    notes: null,
    createdAt: clock.now().toISOString(),
  };
  return { state: { ...state, copies: [...state.copies, copy] }, copy };
};

/** Le propriétaire peut rendre son exemplaire indisponible / disponible, sauf s'il est prêté. */
export const setCopyAvailability = (state: LocalState, actorId: MemberId, copyId: string, available: boolean, clock: Clock = defaultClock) => {
  const copy = requireCopy(state, copyId);
  if (copy.ownerId !== actorId) throw new DomainError('Seul le propriétaire peut modifier cet exemplaire.');
  if (copy.status === 'lent' || activeLoanForCopy(state, copyId)) {
    throw new DomainError('Cet exemplaire est actuellement prêté : enregistrez d’abord son retour.');
  }
  const status = available ? 'available' : 'unavailable';
  let requests = state.requests;
  if (!available) {
    // Les demandes en attente deviennent caduques si le propriétaire retire le jeu du prêt.
    const now = clock.now().toISOString();
    requests = requests.map((request) =>
      request.copyId === copyId && request.status === 'pending' ? { ...request, status: 'refused', respondedAt: now } : request);
  }
  return { ...state, requests, copies: state.copies.map((item) => (item.id === copyId ? { ...item, status } : item)) };
};

export const updateCopyNotes = (state: LocalState, actorId: MemberId, copyId: string, notes: string) => {
  const copy = requireCopy(state, copyId);
  if (copy.ownerId !== actorId) throw new DomainError('Seul le propriétaire peut modifier cet exemplaire.');
  const value = notes.trim().slice(0, 500) || null;
  return { ...state, copies: state.copies.map((item) => (item.id === copyId ? { ...item, notes: value } : item)) };
};

/**
 * Retire un exemplaire de la collection. Refusé s'il est prêté. L'exemplaire est
 * archivé (et non effacé) pour que l'historique des prêts reste lisible.
 */
export const removeCopy = (state: LocalState, actorId: MemberId, copyId: string, clock: Clock = defaultClock) => {
  const copy = requireCopy(state, copyId);
  if (copy.ownerId !== actorId) throw new DomainError('Seul le propriétaire peut retirer cet exemplaire.');
  if (activeLoanForCopy(state, copyId)) throw new DomainError('Impossible de retirer un jeu actuellement prêté.');
  const now = clock.now().toISOString();
  return {
    ...state,
    copies: state.copies.map((item) => (item.id === copyId ? { ...item, status: 'unavailable' as const, archivedAt: now } : item)),
    requests: state.requests.map((request) =>
      request.copyId === copyId && request.status === 'pending' ? { ...request, status: 'cancelled' as const, respondedAt: now } : request),
  };
};

// ---------------------------------------------------------------------------
// Demandes et prêts
// ---------------------------------------------------------------------------

export const createLoanRequest = (
  state: LocalState,
  actorId: MemberId,
  input: { copyId: string; requestedReturnDate: string; message?: string | null },
  clock: Clock = defaultClock,
) => {
  requireMember(state, actorId);
  const copy = requireCopy(state, input.copyId);
  if (copy.ownerId === actorId) throw new DomainError('Vous ne pouvez pas emprunter votre propre jeu.');
  if (copy.status !== 'available' || activeLoanForCopy(state, copy.id)) {
    throw new DomainError('Cet exemplaire n’est pas disponible pour le moment.');
  }
  if (!isValidIsoDate(input.requestedReturnDate)) throw new DomainError('Date de retour invalide.');
  if (input.requestedReturnDate < todayIso(clock.now())) {
    throw new DomainError('La date de retour ne peut pas être dans le passé.');
  }
  if (state.requests.some((r) => r.copyId === copy.id && r.requesterId === actorId && r.status === 'pending')) {
    throw new DomainError('Vous avez déjà une demande en attente pour cet exemplaire.');
  }
  const request: LoanRequest = {
    id: clock.newId('request'),
    copyId: copy.id,
    requesterId: actorId,
    ownerId: copy.ownerId,
    requestedReturnDate: input.requestedReturnDate,
    message: input.message?.trim() ? input.message.trim().slice(0, 1000) : null,
    status: 'pending',
    createdAt: clock.now().toISOString(),
    respondedAt: null,
  };
  return { state: { ...state, requests: [...state.requests, request] }, request };
};

const requirePendingRequest = (state: LocalState, requestId: string) => {
  const request = state.requests.find((item) => item.id === requestId);
  if (!request) throw new DomainError('Demande introuvable.');
  if (request.status !== 'pending') throw new DomainError('Cette demande a déjà été traitée.');
  return request;
};

export const cancelLoanRequest = (state: LocalState, actorId: MemberId, requestId: string, clock: Clock = defaultClock) => {
  const request = requirePendingRequest(state, requestId);
  if (request.requesterId !== actorId) throw new DomainError('Seule la personne qui a fait la demande peut l’annuler.');
  const now = clock.now().toISOString();
  return { ...state, requests: state.requests.map((item) => (item.id === requestId ? { ...item, status: 'cancelled' as const, respondedAt: now } : item)) };
};

export const refuseLoanRequest = (state: LocalState, actorId: MemberId, requestId: string, clock: Clock = defaultClock) => {
  const request = requirePendingRequest(state, requestId);
  if (request.ownerId !== actorId) throw new DomainError('Seul le propriétaire peut refuser cette demande.');
  const now = clock.now().toISOString();
  return { ...state, requests: state.requests.map((item) => (item.id === requestId ? { ...item, status: 'refused' as const, respondedAt: now } : item)) };
};

/**
 * Accepte une demande : crée le prêt, marque l'exemplaire comme prêté et refuse
 * automatiquement les autres demandes en attente pour CE MÊME exemplaire.
 */
export const acceptLoanRequest = (state: LocalState, actorId: MemberId, requestId: string, clock: Clock = defaultClock) => {
  const request = requirePendingRequest(state, requestId);
  if (request.ownerId !== actorId) throw new DomainError('Seul le propriétaire peut accepter cette demande.');
  const copy = requireCopy(state, request.copyId);
  if (copy.ownerId !== request.ownerId) throw new DomainError('Le propriétaire de cet exemplaire a changé.');
  if (copy.status !== 'available' || activeLoanForCopy(state, copy.id)) {
    throw new DomainError('Cet exemplaire est déjà prêté ou indisponible.');
  }
  const now = clock.now();
  const nowIso = now.toISOString();
  const loan: Loan = {
    id: clock.newId('loan'),
    copyId: copy.id,
    requestId: request.id,
    ownerId: copy.ownerId,
    borrowerId: request.requesterId,
    startDate: todayIso(now),
    expectedReturnDate: request.requestedReturnDate,
    actualReturnDate: null,
    status: 'active',
    createdAt: nowIso,
  };
  const requests = state.requests.map((item) => {
    if (item.id === request.id) return { ...item, status: 'accepted' as const, respondedAt: nowIso };
    if (item.copyId === copy.id && item.status === 'pending') return { ...item, status: 'refused' as const, respondedAt: nowIso };
    return item;
  });
  return {
    state: {
      ...state,
      requests,
      loans: [...state.loans, loan],
      copies: state.copies.map((item) => (item.id === copy.id ? { ...item, status: 'lent' as const } : item)),
    },
    loan,
  };
};

/** Le propriétaire confirme qu'il a récupéré son jeu : le prêt est clôturé et l'exemplaire redevient disponible. */
export const returnLoan = (state: LocalState, actorId: MemberId, loanId: string, clock: Clock = defaultClock) => {
  const loan = state.loans.find((item) => item.id === loanId);
  if (!loan) throw new DomainError('Prêt introuvable.');
  if (loan.status !== 'active') throw new DomainError('Ce prêt est déjà clôturé.');
  if (loan.ownerId !== actorId) throw new DomainError('Seul le propriétaire peut confirmer le retour de son jeu.');
  const today = todayIso(clock.now());
  return {
    ...state,
    loans: state.loans.map((item) => (item.id === loanId ? { ...item, status: 'returned' as const, actualReturnDate: today } : item)),
    copies: state.copies.map((item) => (item.id === loan.copyId && item.status === 'lent' ? { ...item, status: 'available' as const } : item)),
  };
};

/** Le propriétaire peut modifier la date de retour prévue d'un prêt en cours. */
export const extendLoan = (state: LocalState, actorId: MemberId, loanId: string, newDate: string, clock: Clock = defaultClock) => {
  const loan = state.loans.find((item) => item.id === loanId);
  if (!loan || loan.status !== 'active') throw new DomainError('Prêt en cours introuvable.');
  if (loan.ownerId !== actorId) throw new DomainError('Seul le propriétaire peut modifier l’échéance.');
  if (!isValidIsoDate(newDate) || newDate < todayIso(clock.now())) throw new DomainError('Date de retour invalide.');
  return { ...state, loans: state.loans.map((item) => (item.id === loanId ? { ...item, expectedReturnDate: newDate } : item)) };
};

// ---------------------------------------------------------------------------
// Favoris et parties (fonctions complémentaires)
// ---------------------------------------------------------------------------

export const toggleFavorite = (state: LocalState, actorId: MemberId, gameId: string) => {
  const exists = state.favorites.some((fav) => fav.memberId === actorId && fav.gameId === gameId);
  return {
    ...state,
    favorites: exists
      ? state.favorites.filter((fav) => !(fav.memberId === actorId && fav.gameId === gameId))
      : [...state.favorites, { memberId: actorId, gameId }],
  };
};

export const createSession = (
  state: LocalState,
  actorId: MemberId,
  input: { gameId: string; date: string; time: string | null; location: string | null },
  clock: Clock = defaultClock,
) => {
  requireMember(state, actorId);
  if (!state.games.some((game) => game.id === input.gameId)) throw new DomainError('Choisissez un jeu du catalogue.');
  if (!isValidIsoDate(input.date)) throw new DomainError('Date invalide.');
  const session: GameSession = {
    id: clock.newId('session'),
    gameId: input.gameId,
    creatorId: actorId,
    date: input.date,
    time: input.time || null,
    location: input.location?.trim() || null,
    status: 'planned',
    playerIds: [actorId],
    createdAt: clock.now().toISOString(),
  };
  return { ...state, sessions: [...state.sessions, session] };
};

export const toggleSessionParticipation = (state: LocalState, actorId: MemberId, sessionId: string) => ({
  ...state,
  sessions: state.sessions.map((session) => {
    if (session.id !== sessionId) return session;
    if (session.status !== 'planned') throw new DomainError('Cette partie n’est plus ouverte aux inscriptions.');
    const playerIds = session.playerIds.includes(actorId)
      ? session.playerIds.filter((id) => id !== actorId)
      : [...session.playerIds, actorId];
    return { ...session, playerIds };
  }),
});

export const setSessionStatus = (state: LocalState, actorId: MemberId, sessionId: string, status: GameSession['status']) => {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) throw new DomainError('Partie introuvable.');
  if (session.creatorId !== actorId) throw new DomainError('Seule la personne qui a organisé la partie peut la modifier.');
  return { ...state, sessions: state.sessions.map((item) => (item.id === sessionId ? { ...item, status } : item)) };
};
