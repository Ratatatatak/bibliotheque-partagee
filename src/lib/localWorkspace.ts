export type LocalRequest = {
  id: string;
  gameCopyId: string;
  gameName: string;
  ownerName: string;
  requesterName: string;
  requestedReturnDate: string;
  message: string;
  status: 'pending' | 'accepted' | 'refused' | 'cancelled';
  createdAt: string;
};

export type LocalLoan = {
  id: string;
  requestId: string;
  gameName: string;
  ownerName: string;
  borrowerName: string;
  expectedReturnDate: string;
  actualReturnDate: string | null;
  status: 'active' | 'returned';
  createdAt: string;
};

const REQUESTS_KEY = 'bibliotheque-local-requests';
const LOANS_KEY = 'bibliotheque-local-loans';
const FAVORITES_KEY = 'bibliotheque-local-favorites';
const SESSIONS_KEY = 'bibliotheque-local-sessions';

export type LocalSession = { id: string; gameId: string; gameName: string; date: string; time: string; place: string; players: string[]; status: 'planned' | 'played'; winner?: string };

export const readLocalRequests = (): LocalRequest[] => {
  try { return JSON.parse(localStorage.getItem(REQUESTS_KEY) || '[]'); } catch { return []; }
};

export const writeLocalRequests = (requests: LocalRequest[]) => {
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
};

export const readLocalLoans = (): LocalLoan[] => {
  try { return JSON.parse(localStorage.getItem(LOANS_KEY) || '[]'); } catch { return []; }
};

export const writeLocalLoans = (loans: LocalLoan[]) => {
  localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
};

export const readLocalFavorites = (): string[] => {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch { return []; }
};
export const writeLocalFavorites = (favorites: string[]) => localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
export const readLocalSessions = (): LocalSession[] => {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'); } catch { return []; }
};
export const writeLocalSessions = (sessions: LocalSession[]) => localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
