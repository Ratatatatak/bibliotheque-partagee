import * as rules from '@/domain/localState';
import { DomainError, type GameInput, type MemberId } from '@/domain/types';
import { buildGamesWithCopies, buildLoanViews, buildRequestViews, buildSessionViews } from '@/domain/views';
import { readLocalState, updateLocalState } from './localStore';
import type { LibraryRepository } from './repository';

const mutate = (change: (state: rules.LocalState) => rules.LocalState) =>
  updateLocalState((state) => ({ state: change(state), result: undefined }));

export const localRepository: LibraryRepository = {
  mode: 'local',
  supportsExchanges: false,

  async listMembers() {
    return [...readLocalState().members].sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr'));
  },

  async listGames() {
    return buildGamesWithCopies(readLocalState());
  },

  async getGame(gameId) {
    const state = readLocalState();
    const raw = state.games.find((item) => item.id === gameId);
    // Une fiche fusionnée renvoie vers la fiche conservée.
    const id = raw?.mergedInto ?? gameId;
    const game = buildGamesWithCopies(state, { includeGamesWithoutCopies: true }).find((item) => item.id === id);
    return game ? { ...game, sources: game.sources } : null;
  },

  async listCollection(memberId) {
    const state = readLocalState();
    return buildGamesWithCopies(state)
      .map((game) => ({ ...game, copies: game.copies.filter((copy) => copy.ownerId === memberId) }))
      .filter((game) => game.copies.length > 0);
  },

  async createGame(_actorId, input: GameInput) {
    mutate((state) => {
      const id = input.id ?? input.bggId ?? undefined;
      return id && state.games.some((game) => game.id === id) ? state : rules.upsertGame(state, input).state;
    });
  },

  async addGameToCollection(actorId, input: GameInput) {
    mutate((state) => {
      const id = input.id ?? input.bggId ?? undefined;
      const existing = id ? state.games.find((game) => game.id === id) : undefined;
      // Une fiche existante n'est pas écrasée : on se contente d'ajouter l'exemplaire.
      const withGame = existing ? { state, game: existing } : rules.upsertGame(state, input);
      return rules.addCopy(withGame.state, actorId, withGame.game.id).state;
    });
  },

  async setCopyAvailability(actorId, copyId, available) {
    mutate((state) => rules.setCopyAvailability(state, actorId, copyId, available));
  },
  async updateCopyNotes(actorId, copyId, notes) {
    mutate((state) => rules.updateCopyNotes(state, actorId, copyId, notes));
  },
  async removeCopy(actorId, copyId) {
    mutate((state) => rules.removeCopy(state, actorId, copyId));
  },

  async createLoanRequest(actorId, input) {
    mutate((state) => rules.createLoanRequest(state, actorId, input).state);
  },
  async cancelLoanRequest(actorId, requestId) {
    mutate((state) => rules.cancelLoanRequest(state, actorId, requestId));
  },
  async refuseLoanRequest(actorId, requestId) {
    mutate((state) => rules.refuseLoanRequest(state, actorId, requestId));
  },
  async acceptLoanRequest(actorId, requestId) {
    mutate((state) => rules.acceptLoanRequest(state, actorId, requestId).state);
  },
  async returnLoan(actorId, loanId) {
    mutate((state) => rules.returnLoan(state, actorId, loanId));
  },
  async extendLoan(actorId, loanId, date) {
    mutate((state) => rules.extendLoan(state, actorId, loanId, date));
  },

  async listMyActivity(actorId: MemberId) {
    const state = readLocalState();
    return {
      requests: buildRequestViews(state).filter((r) => r.requesterId === actorId || r.ownerId === actorId),
      loans: buildLoanViews(state).filter((l) => l.borrowerId === actorId || l.ownerId === actorId),
    };
  },

  async joinWaitlist(actorId, gameId) {
    mutate((state) => rules.joinWaitlist(state, actorId, gameId));
  },
  async leaveWaitlist(actorId, gameId) {
    mutate((state) => rules.leaveWaitlist(state, actorId, gameId));
  },

  // En mode local (démonstration), chaque profil peut administrer les fiches.
  async isAdmin() {
    return true;
  },
  async listAllGames() {
    return buildGamesWithCopies(readLocalState(), { includeGamesWithoutCopies: true });
  },
  async mergeGames(_actorId, sourceId, targetId) {
    mutate((state) => rules.mergeGames(state, sourceId, targetId));
  },
  async updateGameDetails(_actorId, gameId, input) {
    mutate((state) => rules.updateGameDetails(state, gameId, input));
  },
  async deleteGame(_actorId, gameId) {
    mutate((state) => rules.deleteGame(state, gameId));
  },

  async listFavorites(actorId) {
    return readLocalState().favorites.filter((fav) => fav.memberId === actorId).map((fav) => fav.gameId);
  },
  async toggleFavorite(actorId, gameId) {
    mutate((state) => rules.toggleFavorite(state, actorId, gameId));
  },

  async listSessions() {
    const state = readLocalState();
    return buildSessionViews(state.sessions, state.games, state.members);
  },
  async createSession(actorId, input) {
    mutate((state) => rules.createSession(state, actorId, input));
  },
  async toggleSessionParticipation(actorId, sessionId) {
    mutate((state) => rules.toggleSessionParticipation(state, actorId, sessionId));
  },
  async setSessionStatus(actorId, sessionId, status) {
    mutate((state) => rules.setSessionStatus(state, actorId, sessionId, status));
  },

  async listExchanges() {
    return [];
  },
  async proposeExchange() {
    throw new DomainError('Les échanges ne sont disponibles qu’avec la base partagée (Supabase).');
  },
  async respondToExchange() {
    throw new DomainError('Les échanges ne sont disponibles qu’avec la base partagée (Supabase).');
  },
};
