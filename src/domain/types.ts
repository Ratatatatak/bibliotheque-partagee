// Modèle métier de la ludothèque, commun au mode local et au mode Supabase.
//
// Trois notions sont volontairement séparées :
//  - Game      : la fiche descriptive d'un jeu (identique pour tout le groupe) ;
//  - GameCopy  : un exemplaire physique possédé par un membre ;
//  - Loan      : le prêt d'un exemplaire (actif ou clôturé), issu d'une demande acceptée.

export type MemberId = string;

export type Member = {
  id: MemberId;
  displayName: string;
  username: string | null;
};

export type GameSource = {
  name: string;          // ex. « BoardGameGeek »
  url: string;           // URL précise de la fiche source
  retrievedAt: string;   // date ISO de récupération
};

/** Origine des informations descriptives d'une fiche. */
export type GameDataOrigin =
  | 'bgg'             // importée depuis l'API BoardGameGeek, source et date conservées
  | 'manual'          // saisie à la main par un membre
  | 'legacy-catalog'; // ancienne liste intégrée à l'application, non vérifiée

export type Game = {
  id: string;
  name: string;
  originalName: string | null;
  year: number | null;
  publishers: string[];
  designers: string[];
  illustrators: string[];
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTime: number | null;
  minAge: number | null;
  description: string | null;
  categories: string[];
  mechanics: string[];
  imageUrl: string | null;
  thumbnailUrl: string | null;
  bggId: string | null;
  isExpansion: boolean;
  rating: number | null;
  ratingsCount: number | null;
  origin: GameDataOrigin;
  sources: GameSource[];
  /** Si cette fiche a été fusionnée dans une autre (doublon), identifiant de la fiche conservée. */
  mergedInto?: string | null;
};

export type CopyStatus = 'available' | 'lent' | 'unavailable';

export type GameCopy = {
  id: string;
  gameId: string;
  ownerId: MemberId;
  status: CopyStatus;
  notes: string | null;   // remarques propres au groupe (jamais écrasées par une synchronisation)
  createdAt: string;
  /** Date de retrait de la collection. L'exemplaire est conservé pour l'historique des prêts. */
  archivedAt: string | null;
};

export type RequestStatus = 'pending' | 'accepted' | 'refused' | 'cancelled';

export type LoanRequest = {
  id: string;
  copyId: string;
  requesterId: MemberId;
  ownerId: MemberId;
  requestedReturnDate: string; // AAAA-MM-JJ
  message: string | null;
  status: RequestStatus;
  createdAt: string;
  respondedAt: string | null;
};

export type LoanStatus = 'active' | 'returned';

export type Loan = {
  id: string;
  copyId: string;
  requestId: string | null;
  ownerId: MemberId;
  borrowerId: MemberId;
  startDate: string;          // AAAA-MM-JJ
  expectedReturnDate: string; // AAAA-MM-JJ
  actualReturnDate: string | null;
  status: LoanStatus;
  createdAt: string;
};

/** Exemplaire enrichi pour l'affichage : propriétaire, détenteur actuel, prêt actif. */
export type CopyView = GameCopy & {
  owner: Member;
  activeLoan: (Loan & { borrower: Member }) | null;
  /** Membre qui a physiquement le jeu : l'emprunteur si un prêt est actif, sinon le propriétaire. */
  holder: Member;
  pendingRequestCount: number;
};

export type WaitlistEntry = { memberId: MemberId; gameId: string; createdAt: string };

export type GameWithCopies = Game & {
  copies: CopyView[];
  /** Membres qui attendent qu'un exemplaire se libère (liste d'attente). */
  waitingMembers: Member[];
};

export type LoanRequestView = LoanRequest & {
  game: Pick<Game, 'id' | 'name' | 'imageUrl'>;
  requester: Member;
  owner: Member;
};

export type LoanView = Loan & {
  game: Pick<Game, 'id' | 'name' | 'imageUrl'>;
  owner: Member;
  borrower: Member;
};

/** Données descriptives nécessaires pour ajouter un jeu (fiche) au catalogue. */
export type GameInput = Omit<Game, 'id'> & { id?: string };

export type GameSession = {
  id: string;
  gameId: string;
  creatorId: MemberId;
  date: string;          // AAAA-MM-JJ
  time: string | null;   // HH:MM
  location: string | null;
  status: 'planned' | 'played' | 'cancelled';
  playerIds: MemberId[];
  createdAt: string;
};

export type GameSessionView = GameSession & { game: Pick<Game, 'id' | 'name' | 'imageUrl'>; creator: Member; players: Member[] };

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export const unknownMember = (id: MemberId): Member => ({ id, displayName: 'Membre inconnu', username: null });

export const memberLabel = (member: Pick<Member, 'displayName' | 'username'>) =>
  member.username ? `${member.displayName} (@${member.username})` : member.displayName;
