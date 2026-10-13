// Point d'accès unique aux données. Les pages ne parlent jamais directement au
// localStorage ou à Supabase : elles passent par ce contrat, implémenté deux fois
// (localRepository.ts et supabaseRepository.ts) avec les mêmes règles métier.

import type {
  GameInput,
  GameSessionView,
  GameSource,
  GameWithCopies,
  LoanRequestView,
  LoanView,
  Member,
  MemberId,
} from '@/domain/types';

export type ExchangeRequestView = {
  id: string;
  proposer: Member;
  recipient: Member;
  offeredGameName: string;
  requestedGameName: string;
  status: 'pending' | 'accepted' | 'refused' | 'cancelled';
  message: string | null;
  createdAt: string;
};

export type MyActivity = {
  requests: LoanRequestView[];
  loans: LoanView[];
};

export interface LibraryRepository {
  readonly mode: 'local' | 'supabase';

  listMembers(): Promise<Member[]>;
  /** Jeux ayant au moins un exemplaire dans le groupe, avec propriétaires, détenteurs et prêts actifs. */
  listGames(): Promise<GameWithCopies[]>;
  /** Fiche d'un jeu (même sans exemplaire), ou null. */
  getGame(gameId: string): Promise<(GameWithCopies & { sources: GameSource[] }) | null>;
  /** Tous les exemplaires (y compris retirés) d'un membre pour sa page collection. */
  listCollection(memberId: MemberId): Promise<GameWithCopies[]>;

  /** Crée la fiche si elle n'existe pas (sans écraser une fiche existante) puis ajoute un exemplaire. */
  addGameToCollection(actorId: MemberId, input: GameInput): Promise<void>;
  setCopyAvailability(actorId: MemberId, copyId: string, available: boolean): Promise<void>;
  updateCopyNotes(actorId: MemberId, copyId: string, notes: string): Promise<void>;
  removeCopy(actorId: MemberId, copyId: string): Promise<void>;

  createLoanRequest(actorId: MemberId, input: { copyId: string; requestedReturnDate: string; message?: string | null }): Promise<void>;
  cancelLoanRequest(actorId: MemberId, requestId: string): Promise<void>;
  refuseLoanRequest(actorId: MemberId, requestId: string): Promise<void>;
  acceptLoanRequest(actorId: MemberId, requestId: string): Promise<void>;
  returnLoan(actorId: MemberId, loanId: string): Promise<void>;
  extendLoan(actorId: MemberId, loanId: string, newReturnDate: string): Promise<void>;
  listMyActivity(actorId: MemberId): Promise<MyActivity>;

  listFavorites(actorId: MemberId): Promise<string[]>;
  toggleFavorite(actorId: MemberId, gameId: string): Promise<void>;

  listSessions(): Promise<GameSessionView[]>;
  createSession(actorId: MemberId, input: { gameId: string; date: string; time: string | null; location: string | null }): Promise<void>;
  toggleSessionParticipation(actorId: MemberId, sessionId: string, join: boolean): Promise<void>;
  setSessionStatus(actorId: MemberId, sessionId: string, status: 'planned' | 'played' | 'cancelled'): Promise<void>;

  /** Échanges définitifs de propriété (disponible uniquement avec Supabase). */
  readonly supportsExchanges: boolean;
  listExchanges(actorId: MemberId): Promise<ExchangeRequestView[]>;
  proposeExchange(actorId: MemberId, input: { offeredCopyId: string; requestedCopyId: string; message: string | null }): Promise<void>;
  respondToExchange(actorId: MemberId, exchangeId: string, decision: 'accept' | 'refuse' | 'cancel'): Promise<void>;
}

/** Message d'erreur compréhensible pour l'utilisateur à partir de n'importe quelle erreur. */
export const errorMessage = (error: unknown, fallback = 'Une erreur est survenue. Réessayez.'): string => {
  if (!error) return fallback;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message || fallback;
  }
  return fallback;
};
