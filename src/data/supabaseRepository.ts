// Implémentation Supabase du contrat de données.
//
// Toutes les opérations sensibles (demandes, décisions, retours, disponibilité,
// retrait d'un exemplaire) passent par des fonctions SQL « SECURITY DEFINER »
// qui vérifient l'identité de l'appelant côté serveur. Masquer un bouton dans
// l'interface n'est jamais considéré comme une protection suffisante.

import type { PostgrestError } from '@supabase/supabase-js';
import { requireSupabase } from '@/integrations/supabase/client';
import {
  DomainError,
  unknownMember,
  type Game,
  type GameCopy,
  type GameInput,
  type GameSession,
  type GameSource,
  type Loan,
  type LoanRequest,
  type Member,
  type WaitlistEntry,
} from '@/domain/types';
import { buildGamesWithCopies, buildLoanViews, buildRequestViews, buildSessionViews, type Snapshot } from '@/domain/views';
import type { ExchangeRequestView, LibraryRepository } from './repository';

type Row = Record<string, unknown>;

const str = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);
const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const arr = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);

/** Code d'erreur PostgreSQL / PostgREST indiquant qu'une fonction ou colonne n'existe pas encore. */
const isMissingSchema = (error: PostgrestError | null) =>
  Boolean(error && ['42883', '42703', 'PGRST202', 'PGRST204', 'PGRST205', '42P01'].includes(error.code));

const fail = (error: PostgrestError | null, context: string): never => {
  if (isMissingSchema(error)) {
    throw new DomainError(`${context} : la base Supabase n’est pas à jour (migration manquante dans supabase/migrations).`);
  }
  // Les fonctions SQL renvoient des messages en français destinés à l'utilisateur.
  throw new DomainError(error?.message ? `${context} : ${error.message}` : context);
};

const mapMember = (row: Row): Member => ({
  id: String(row.id),
  displayName: str(row.full_name) ?? str(row.username) ?? 'Membre du groupe',
  username: str(row.username),
});

const mapGame = (row: Row, sources: GameSource[] = []): Game => {
  const legacyCategory = str(row.category);
  const categories = arr(row.categories);
  const bggId = str(row.bgg_id) ?? (/^\d+$/.test(String(row.id)) ? String(row.id) : null);
  return {
    id: String(row.id),
    name: str(row.name) ?? 'Jeu sans nom',
    originalName: str(row.original_name),
    year: num(row.published_year),
    publishers: row.publisher ? String(row.publisher).split(' · ').filter(Boolean) : [],
    designers: arr(row.designers),
    illustrators: arr(row.illustrators),
    minPlayers: num(row.min_players),
    maxPlayers: num(row.max_players),
    playingTime: num(row.duration),
    minAge: num(row.min_age),
    description: str(row.description),
    categories: categories.length ? categories : legacyCategory && legacyCategory !== 'Jeu de société' ? [legacyCategory] : [],
    mechanics: arr(row.mechanics),
    imageUrl: str(row.image_url),
    thumbnailUrl: str(row.thumbnail_url),
    bggId,
    isExpansion: row.is_expansion === true,
    rating: num(row.average_rating),
    ratingsCount: num(row.ratings_count),
    origin: (str(row.data_origin) as Game['origin']) ?? (bggId ? 'bgg' : 'legacy-catalog'),
    sources,
    mergedInto: str(row.merged_into),
  };
};

const mapCopy = (row: Row): GameCopy => ({
  id: String(row.id),
  gameId: String(row.game_id),
  ownerId: String(row.owner_id),
  status: (['available', 'lent', 'unavailable'].includes(String(row.status)) ? row.status : 'unavailable') as GameCopy['status'],
  notes: str(row.notes),
  createdAt: String(row.created_at ?? ''),
  archivedAt: str(row.archived_at),
});

const mapRequest = (row: Row): LoanRequest => ({
  id: String(row.id),
  copyId: String(row.game_copy_id),
  requesterId: String(row.requester_id),
  ownerId: String(row.owner_id),
  requestedReturnDate: String(row.requested_return_date ?? '').slice(0, 10),
  message: str(row.message),
  status: row.status as LoanRequest['status'],
  createdAt: String(row.created_at ?? ''),
  respondedAt: str(row.responded_at),
});

const mapLoan = (row: Row): Loan => ({
  id: String(row.id),
  copyId: String(row.game_copy_id),
  requestId: str(row.request_id),
  ownerId: String(row.owner_id),
  borrowerId: String(row.borrower_id),
  startDate: String(row.start_date ?? '').slice(0, 10),
  expectedReturnDate: String(row.expected_return_date ?? '').slice(0, 10),
  actualReturnDate: str(row.actual_return_date)?.slice(0, 10) ?? null,
  status: row.status === 'returned' ? 'returned' : 'active',
  createdAt: String(row.created_at ?? ''),
});

async function rpc(name: string, args: Record<string, unknown>, context: string) {
  const { error } = await requireSupabase().rpc(name, args);
  if (error) fail(error, context);
}

async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await requireSupabase().from('profiles').select('*');
  if (error) fail(error, 'Lecture des membres impossible');
  return (data ?? []).map((row) => mapMember(row as Row));
}

/** Prêts actifs de tout le groupe (pour savoir qui détient quel exemplaire). */
async function fetchGroupActiveLoans(): Promise<Loan[]> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('group_active_loans');
  if (!error) return (data ?? []).map((row: Row) => mapLoan(row));
  if (!isMissingSchema(error)) fail(error, 'Lecture des prêts impossible');
  // Base pas encore migrée : on se limite aux prêts visibles par l'utilisateur.
  const fallback = await client.from('loans').select('*').eq('status', 'active');
  if (fallback.error) fail(fallback.error, 'Lecture des prêts impossible');
  return (fallback.data ?? []).map((row) => mapLoan(row as Row));
}

/** Liste d'attente du groupe (vide si la migration 012 n'est pas encore appliquée). */
async function fetchWaitlist(): Promise<WaitlistEntry[]> {
  const { data, error } = await requireSupabase().from('game_waitlist').select('*');
  if (error) {
    if (isMissingSchema(error)) return [];
    fail(error, 'Lecture de la liste d’attente impossible');
  }
  return (data ?? []).map((row: Row) => ({ memberId: String(row.user_id), gameId: String(row.game_id), createdAt: String(row.created_at ?? '') }));
}

async function fetchSnapshot(): Promise<Snapshot> {
  const client = requireSupabase();
  const [members, games, copies, requests, loans, waitlist] = await Promise.all([
    fetchMembers(),
    client.from('games').select('*'),
    client.from('game_copies').select('*'),
    client.from('loan_requests').select('*'),
    fetchGroupActiveLoans(),
    fetchWaitlist(),
  ]);
  if (games.error) fail(games.error, 'Lecture du catalogue impossible');
  if (copies.error) fail(copies.error, 'Lecture des exemplaires impossible');
  if (requests.error) fail(requests.error, 'Lecture des demandes impossible');
  return {
    members,
    games: (games.data ?? []).map((row) => mapGame(row as Row)),
    copies: (copies.data ?? []).map((row) => mapCopy(row as Row)),
    requests: (requests.data ?? []).map((row) => mapRequest(row as Row)),
    loans,
    waitlist,
  };
}

const gameToRow = (input: GameInput, id: string) => ({
  id,
  name: input.name,
  original_name: input.originalName,
  published_year: input.year,
  publisher: input.publishers.length ? input.publishers.join(' · ') : null,
  designers: input.designers,
  illustrators: input.illustrators,
  min_players: input.minPlayers,
  max_players: input.maxPlayers,
  duration: input.playingTime,
  min_age: input.minAge,
  description: input.description,
  categories: input.categories,
  category: input.categories[0] ?? null,
  mechanics: input.mechanics,
  image_url: input.imageUrl,
  thumbnail_url: input.thumbnailUrl,
  bgg_id: input.bggId,
  is_expansion: input.isExpansion,
  average_rating: input.rating,
  ratings_count: input.ratingsCount,
  data_origin: input.origin,
});

/** Colonnes présentes avant la migration 010 (pour rester compatible avec une base non migrée). */
const LEGACY_GAME_COLUMNS = ['id', 'name', 'description', 'image_url', 'min_players', 'max_players', 'duration', 'min_age', 'category', 'publisher', 'designers', 'illustrators', 'published_year', 'mechanics', 'average_rating', 'ratings_count'];

/** Crée la fiche si elle n'existe pas encore (une fiche existante n'est JAMAIS écrasée). Renvoie son identifiant. */
async function ensureGame(input: GameInput): Promise<string> {
    const client = requireSupabase();
    const id = input.id ?? input.bggId;
    if (!id) throw new DomainError('Identifiant de jeu manquant.');
    // 1. Créer la fiche si elle n'existe pas encore. Une fiche existante n'est JAMAIS écrasée
    //    (un autre membre peut déjà la posséder).
    const { data: existing, error: existingError } = await client.from('games').select('id').eq('id', id).maybeSingle();
    if (existingError) fail(existingError, 'Vérification du catalogue impossible');
    if (!existing) {
      let insert = await client.from('games').insert(gameToRow(input, id));
      if (insert.error && isMissingSchema(insert.error)) {
        if (input.minPlayers === null || input.maxPlayers === null || input.minAge === null) {
          throw new DomainError('Cette fiche a des informations manquantes que l’ancienne base ne sait pas enregistrer. Appliquez la migration 010_loan_integrity_and_privacy.sql.');
        }
        const full = gameToRow(input, id) as Record<string, unknown>;
        insert = await client.from('games').insert(Object.fromEntries(Object.entries(full).filter(([key]) => LEGACY_GAME_COLUMNS.includes(key))));
      }
      // 23505 = un autre membre vient de créer la même fiche : ce n'est pas une erreur.
      if (insert.error && insert.error.code !== '23505') fail(insert.error, 'Création de la fiche impossible');
      if (!insert.error && input.sources.length) {
        const { error: sourceError } = await client.from('game_sources').insert(input.sources.map((source) => ({
          game_id: id, source_name: source.name, source_url: source.url, source_type: 'external',
          retrieved_at: source.retrievedAt || new Date().toISOString(),
        })));
        if (sourceError) console.warn('Sources non enregistrées :', sourceError.message);
      }
    }
    return id;
}

export const supabaseRepository: LibraryRepository = {
  mode: 'supabase',
  supportsExchanges: true,

  listMembers: async () => (await fetchMembers()).sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr')),

  async listGames() {
    return buildGamesWithCopies(await fetchSnapshot());
  },

  async getGame(requestedId) {
    const client = requireSupabase();
    const snapshot = await fetchSnapshot();
    // Une fiche fusionnée renvoie vers la fiche conservée.
    const gameId = snapshot.games.find((game) => game.id === requestedId)?.mergedInto ?? requestedId;
    const game = buildGamesWithCopies(snapshot, { includeGamesWithoutCopies: true }).find((item) => item.id === gameId);
    if (!game) return null;
    const { data: sourceRows, error } = await client.from('game_sources').select('*').eq('game_id', gameId);
    if (error && !isMissingSchema(error)) fail(error, 'Lecture des sources impossible');
    const sources: GameSource[] = (sourceRows ?? []).map((row: Row) => ({
      name: String(row.source_name ?? ''), url: String(row.source_url ?? ''), retrievedAt: String(row.retrieved_at ?? ''),
    }));
    if (!sources.length && game.bggId) {
      sources.push({ name: 'BoardGameGeek', url: `https://boardgamegeek.com/boardgame/${game.bggId}`, retrievedAt: '' });
    }
    return { ...game, sources };
  },

  async listCollection(memberId) {
    const snapshot = await fetchSnapshot();
    return buildGamesWithCopies(snapshot)
      .map((game) => ({ ...game, copies: game.copies.filter((copy) => copy.ownerId === memberId) }))
      .filter((game) => game.copies.length > 0);
  },

  async createGame(_actorId, input) {
    await ensureGame(input);
  },

  async addGameToCollection(actorId, input) {
    const client = requireSupabase();
    const id = await ensureGame(input);
    // 2. Ajouter l'exemplaire.
    const { error } = await client.from('game_copies').insert({ game_id: id, owner_id: actorId, status: 'available' });
    if (error?.code === '23505') throw new DomainError('Ce jeu est déjà dans votre collection.');
    if (error) fail(error, 'Ajout à la collection impossible');
  },

  setCopyAvailability: (_actorId, copyId, available) =>
    rpc('set_copy_availability', { target_copy_id: copyId, make_available: available }, 'Modification impossible'),

  async updateCopyNotes(_actorId, copyId, notes) {
    const { error } = await requireSupabase().from('game_copies').update({ notes: notes.trim().slice(0, 500) || null }).eq('id', copyId);
    if (error) fail(error, 'Enregistrement de la remarque impossible');
  },

  removeCopy: (_actorId, copyId) => rpc('archive_game_copy', { target_copy_id: copyId }, 'Retrait impossible'),

  async createLoanRequest(actorId, input) {
    await rpc('create_loan_request', {
      requested_copy_id: input.copyId,
      requested_return_date: input.requestedReturnDate,
      request_message: input.message?.trim() || null,
    }, 'Demande impossible');
    // La demande remplace l'inscription sur la liste d'attente de ce jeu (sans gravité si elle échoue).
    const client = requireSupabase();
    const { data: copy } = await client.from('game_copies').select('game_id').eq('id', input.copyId).maybeSingle();
    if (copy) await client.from('game_waitlist').delete().eq('user_id', actorId).eq('game_id', (copy as Row).game_id);
  },
  cancelLoanRequest: (_a, requestId) => rpc('cancel_loan_request', { request_id: requestId }, 'Annulation impossible'),
  refuseLoanRequest: (_a, requestId) => rpc('refuse_loan_request', { request_id: requestId }, 'Refus impossible'),
  acceptLoanRequest: (_a, requestId) => rpc('accept_loan_request', { request_id: requestId }, 'Acceptation impossible'),
  returnLoan: (_a, loanId) => rpc('return_loan', { loan_id: loanId }, 'Enregistrement du retour impossible'),
  extendLoan: (_a, loanId, date) => rpc('extend_loan', { target_loan_id: loanId, new_return_date: date }, 'Modification de l’échéance impossible'),

  async listMyActivity(actorId) {
    const client = requireSupabase();
    const [members, games, copies, requests, loans] = await Promise.all([
      fetchMembers(),
      client.from('games').select('id, name, image_url'),
      client.from('game_copies').select('*'),
      client.from('loan_requests').select('*').or(`requester_id.eq.${actorId},owner_id.eq.${actorId}`),
      client.from('loans').select('*').or(`owner_id.eq.${actorId},borrower_id.eq.${actorId}`),
    ]);
    for (const result of [games, copies, requests, loans]) if (result.error) fail(result.error, 'Lecture de vos prêts impossible');
    const snapshot: Snapshot = {
      members,
      games: (games.data ?? []).map((row) => mapGame(row as Row)),
      copies: (copies.data ?? []).map((row) => mapCopy(row as Row)),
      requests: (requests.data ?? []).map((row) => mapRequest(row as Row)),
      loans: (loans.data ?? []).map((row) => mapLoan(row as Row)),
    };
    return { requests: buildRequestViews(snapshot), loans: buildLoanViews(snapshot) };
  },

  async joinWaitlist(actorId, gameId) {
    const { error } = await requireSupabase().from('game_waitlist').insert({ user_id: actorId, game_id: gameId });
    if (error && error.code !== '23505') fail(error, 'Inscription sur la liste d’attente impossible');
  },
  async leaveWaitlist(actorId, gameId) {
    const { error } = await requireSupabase().from('game_waitlist').delete().eq('user_id', actorId).eq('game_id', gameId);
    if (error && !isMissingSchema(error)) fail(error, 'Désinscription impossible');
  },

  async isAdmin() {
    const { data, error } = await requireSupabase().rpc('is_admin');
    if (error) return false;
    return data === true;
  },
  async listAllGames() {
    return buildGamesWithCopies(await fetchSnapshot(), { includeGamesWithoutCopies: true });
  },
  mergeGames: (_actorId, sourceId, targetId) => rpc('merge_games', { source_game_id: sourceId, target_game_id: targetId }, 'Fusion impossible'),
  async updateGameDetails(_actorId, gameId, input) {
    const { id: _ignored, ...row } = gameToRow(input, gameId);
    const { data, error } = await requireSupabase().from('games').update(row).eq('id', gameId).select('id');
    if (error) fail(error, 'Mise à jour de la fiche impossible');
    if (!data?.length) throw new DomainError('Mise à jour refusée : seuls les administrateurs peuvent modifier une fiche.');
    if (input.origin === 'bgg' && input.sources.length) {
      await requireSupabase().from('game_sources').insert(input.sources.map((source) => ({
        game_id: gameId, source_name: source.name, source_url: source.url, source_type: 'external', retrieved_at: source.retrievedAt || new Date().toISOString(),
      })));
    }
  },
  deleteGame: (_actorId, gameId) => rpc('delete_unused_game', { target_game_id: gameId }, 'Suppression impossible'),

  async listFavorites(actorId) {
    const { data, error } = await requireSupabase().from('favorites').select('game_id').eq('user_id', actorId);
    if (error) fail(error, 'Lecture des favoris impossible');
    return (data ?? []).map((row: Row) => String(row.game_id));
  },
  async toggleFavorite(actorId, gameId) {
    const client = requireSupabase();
    const { data } = await client.from('favorites').select('game_id').eq('user_id', actorId).eq('game_id', gameId).maybeSingle();
    const { error } = data
      ? await client.from('favorites').delete().eq('user_id', actorId).eq('game_id', gameId)
      : await client.from('favorites').insert({ user_id: actorId, game_id: gameId });
    if (error) fail(error, 'Mise à jour des favoris impossible');
  },

  async listSessions() {
    const client = requireSupabase();
    const [members, games, sessions, players] = await Promise.all([
      fetchMembers(),
      client.from('games').select('id, name, image_url'),
      client.from('game_sessions').select('*'),
      client.from('session_players').select('*'),
    ]);
    for (const result of [games, sessions, players]) if (result.error) fail(result.error, 'Lecture des parties impossible');
    const list: GameSession[] = (sessions.data ?? []).map((row: Row) => ({
      id: String(row.id), gameId: String(row.game_id), creatorId: String(row.creator_id),
      date: String(row.session_date).slice(0, 10), time: str(row.session_time)?.slice(0, 5) ?? null,
      location: str(row.location), status: row.status as GameSession['status'],
      playerIds: (players.data ?? []).filter((p: Row) => p.session_id === row.id).map((p: Row) => String(p.user_id)),
      createdAt: String(row.created_at ?? ''),
    }));
    return buildSessionViews(list, (games.data ?? []).map((row) => mapGame(row as Row)), members);
  },
  async createSession(actorId, input) {
    const client = requireSupabase();
    const { data, error } = await client.from('game_sessions').insert({
      game_id: input.gameId, creator_id: actorId, session_date: input.date, session_time: input.time, location: input.location,
    }).select('id').single();
    if (error) fail(error, 'Création de la partie impossible');
    await client.from('session_players').insert({ session_id: (data as Row).id, user_id: actorId });
  },
  async toggleSessionParticipation(actorId, sessionId, join) {
    const client = requireSupabase();
    const { error } = join
      ? await client.from('session_players').insert({ session_id: sessionId, user_id: actorId })
      : await client.from('session_players').delete().eq('session_id', sessionId).eq('user_id', actorId);
    if (error && error.code !== '23505') fail(error, 'Inscription impossible');
  },
  async setSessionStatus(_actorId, sessionId, status) {
    const { error } = await requireSupabase().from('game_sessions').update({ status }).eq('id', sessionId);
    if (error) fail(error, 'Modification de la partie impossible');
  },

  async listExchanges(actorId) {
    const client = requireSupabase();
    const [members, games, copies, exchanges] = await Promise.all([
      fetchMembers(),
      client.from('games').select('id, name'),
      client.from('game_copies').select('id, game_id'),
      client.from('exchange_requests').select('*').or(`proposer_id.eq.${actorId},recipient_id.eq.${actorId}`),
    ]);
    if (exchanges.error) {
      if (isMissingSchema(exchanges.error)) return [];
      fail(exchanges.error, 'Lecture des échanges impossible');
    }
    const member = (id: unknown) => members.find((m) => m.id === id) ?? unknownMember(String(id));
    const gameName = (copyId: unknown) => {
      const copy = (copies.data ?? []).find((c: Row) => c.id === copyId) as Row | undefined;
      const game = (games.data ?? []).find((g: Row) => g.id === copy?.game_id) as Row | undefined;
      return str(game?.name) ?? 'Jeu';
    };
    return (exchanges.data ?? []).map((row: Row): ExchangeRequestView => ({
      id: String(row.id), proposer: member(row.proposer_id), recipient: member(row.recipient_id),
      offeredGameName: gameName(row.offered_copy_id), requestedGameName: gameName(row.requested_copy_id),
      status: row.status as ExchangeRequestView['status'], message: str(row.message), createdAt: String(row.created_at ?? ''),
    })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async proposeExchange(actorId, input) {
    const client = requireSupabase();
    const { data: copy } = await client.from('game_copies').select('owner_id').eq('id', input.requestedCopyId).maybeSingle();
    if (!copy) throw new DomainError('Exemplaire introuvable.');
    const { error } = await client.from('exchange_requests').insert({
      offered_copy_id: input.offeredCopyId, requested_copy_id: input.requestedCopyId,
      proposer_id: actorId, recipient_id: (copy as Row).owner_id, message: input.message,
    });
    if (error) fail(error, 'Proposition impossible');
  },
  respondToExchange: (_actorId, exchangeId, decision) => rpc(
    decision === 'accept' ? 'accept_exchange_request' : decision === 'refuse' ? 'refuse_exchange_request' : 'cancel_exchange_request',
    { request_id: exchangeId },
    'Réponse à l’échange impossible',
  ),
};
