// Construction des vues d'affichage à partir d'un « instantané » des données.
// Utilisé à l'identique par le mode local et par le mode Supabase.

import {
  unknownMember,
  type CopyView,
  type Game,
  type GameCopy,
  type GameSession,
  type GameSessionView,
  type GameWithCopies,
  type Loan,
  type LoanRequest,
  type LoanRequestView,
  type LoanView,
  type Member,
  type WaitlistEntry,
} from './types';

export type Snapshot = {
  members: Member[];
  games: Game[];
  copies: GameCopy[];
  requests: LoanRequest[];
  /** Prêts visibles : au minimum les prêts actifs du groupe (pour la disponibilité). */
  loans: Loan[];
  waitlist?: WaitlistEntry[];
};

const indexBy = <T extends { id: string }>(items: T[]) => new Map(items.map((item) => [item.id, item]));

const gameSummary = (games: Map<string, Game>, gameId: string) => {
  const game = games.get(gameId);
  return { id: gameId, name: game?.name ?? 'Jeu supprimé', imageUrl: game?.imageUrl ?? null };
};

export const buildCopyViews = (snapshot: Snapshot): CopyView[] => {
  const members = indexBy(snapshot.members);
  const member = (id: string) => members.get(id) ?? unknownMember(id);
  return snapshot.copies.filter((copy) => !copy.archivedAt).map((copy) => {
    const loan = snapshot.loans.find((item) => item.copyId === copy.id && item.status === 'active') ?? null;
    const owner = member(copy.ownerId);
    const activeLoan = loan ? { ...loan, borrower: member(loan.borrowerId) } : null;
    return {
      ...copy,
      // Si un prêt actif existe, l'exemplaire est prêté quel que soit le statut enregistré.
      status: activeLoan ? 'lent' : copy.status,
      owner,
      activeLoan,
      holder: activeLoan ? activeLoan.borrower : owner,
      pendingRequestCount: snapshot.requests.filter((r) => r.copyId === copy.id && r.status === 'pending').length,
    };
  });
};

export const buildGamesWithCopies = (snapshot: Snapshot, options: { includeGamesWithoutCopies?: boolean } = {}): GameWithCopies[] => {
  const copyViews = buildCopyViews(snapshot);
  const members = indexBy(snapshot.members);
  return snapshot.games
    .filter((game) => !game.mergedInto)
    .map((game) => ({
      ...game,
      copies: copyViews
        .filter((copy) => copy.gameId === game.id)
        .sort((a, b) => a.owner.displayName.localeCompare(b.owner.displayName, 'fr')),
      waitingMembers: (snapshot.waitlist ?? [])
        .filter((entry) => entry.gameId === game.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((entry) => members.get(entry.memberId) ?? unknownMember(entry.memberId)),
    }))
    .filter((game) => options.includeGamesWithoutCopies || game.copies.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
};

export const buildRequestViews = (snapshot: Snapshot): LoanRequestView[] => {
  const members = indexBy(snapshot.members);
  const games = indexBy(snapshot.games);
  const copies = indexBy(snapshot.copies);
  return snapshot.requests
    .map((request) => ({
      ...request,
      game: gameSummary(games, copies.get(request.copyId)?.gameId ?? ''),
      requester: members.get(request.requesterId) ?? unknownMember(request.requesterId),
      owner: members.get(request.ownerId) ?? unknownMember(request.ownerId),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const buildLoanViews = (snapshot: Snapshot, gameIdByCopy?: Map<string, string>): LoanView[] => {
  const members = indexBy(snapshot.members);
  const games = indexBy(snapshot.games);
  const copies = indexBy(snapshot.copies);
  return snapshot.loans
    .map((loan) => ({
      ...loan,
      game: gameSummary(games, copies.get(loan.copyId)?.gameId ?? gameIdByCopy?.get(loan.copyId) ?? ''),
      owner: members.get(loan.ownerId) ?? unknownMember(loan.ownerId),
      borrower: members.get(loan.borrowerId) ?? unknownMember(loan.borrowerId),
    }))
    .sort((a, b) => (a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === 'active' ? -1 : 1));
};

export const buildSessionViews = (sessions: GameSession[], games: Game[], membersList: Member[]): GameSessionView[] => {
  const members = indexBy(membersList);
  const gamesById = indexBy(games);
  return sessions
    .map((session) => ({
      ...session,
      game: gameSummary(gamesById, session.gameId),
      creator: members.get(session.creatorId) ?? unknownMember(session.creatorId),
      players: session.playerIds.map((id) => members.get(id) ?? unknownMember(id)),
    }))
    .sort((a, b) => `${a.date}${a.time ?? ''}`.localeCompare(`${b.date}${b.time ?? ''}`));
};
