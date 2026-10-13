import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Clock, Heart, Library, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFavorites, useGames, useLibraryAction, repository } from '@/hooks/useLibrary';
import { GameImage } from '@/components/library/GameImage';
import { CopyList } from '@/components/library/CopyList';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/library/PageState';
import { useBorrowDialogs } from '@/components/library/useBorrowDialogs';
import type { GameWithCopies } from '@/domain/types';

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const playersLabel = (game: GameWithCopies) => {
  if (game.minPlayers && game.maxPlayers) return game.minPlayers === game.maxPlayers ? `${game.minPlayers} joueurs` : `${game.minPlayers} à ${game.maxPlayers} joueurs`;
  return 'Joueurs : non renseigné';
};

const Games = () => {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const players = params.get('joueurs') ?? '';
  const maxDuration = params.get('duree') ?? '';
  const category = params.get('categorie') ?? '';
  const onlyAvailable = params.get('dispo') === '1';
  const onlyFavorites = params.get('favoris') === '1';

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const games = useGames();
  const favorites = useFavorites();
  const favoriteSet = useMemo(() => new Set(favorites.data ?? []), [favorites.data]);
  const toggleFavorite = useLibraryAction((actorId, gameId: string) => repository.toggleFavorite(actorId, gameId), {
    success: (gameId) => (favoriteSet.has(gameId) ? 'Retiré des favoris.' : 'Ajouté aux favoris.'),
  });
  const borrow = useBorrowDialogs();

  const categories = useMemo(() => Array.from(new Set((games.data ?? []).flatMap((g) => g.categories))).sort((a, b) => a.localeCompare(b, 'fr')), [games.data]);

  const filtered = useMemo(() => (games.data ?? []).filter((game) => {
    if (search && !normalize(`${game.name} ${game.originalName ?? ''}`).includes(normalize(search))) return false;
    const n = Number(players);
    if (players && Number.isFinite(n) && n > 0 && (!game.minPlayers || !game.maxPlayers || n < game.minPlayers || n > game.maxPlayers)) return false;
    const d = Number(maxDuration);
    if (maxDuration && Number.isFinite(d) && d > 0 && (!game.playingTime || game.playingTime > d)) return false;
    if (category && !game.categories.includes(category)) return false;
    if (onlyAvailable && !game.copies.some((copy) => copy.status === 'available')) return false;
    if (onlyFavorites && !favoriteSet.has(game.id)) return false;
    return true;
  }), [games.data, search, players, maxDuration, category, onlyAvailable, onlyFavorites, favoriteSet]);

  const hasFilters = Boolean(search || players || maxDuration || category || onlyAvailable || onlyFavorites);

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Ludothèque"
        title="Les jeux du groupe"
        lead="Tous les jeux possédés par les membres, avec leurs propriétaires et leur disponibilité réelle."
        actions={<Button asChild variant="outline"><Link to="/my-collection">Ajouter un de mes jeux</Link></Button>}
      />

      <section aria-label="Filtres" className="surface mb-8 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label htmlFor="search" className="field-label">Rechercher</label>
            <Input id="search" value={search} onChange={(e) => setParam('search', e.target.value || null)} placeholder="Nom du jeu…" startContent={<Search className="h-4 w-4 text-muted-foreground" />} />
          </div>
          <div>
            <label htmlFor="players" className="field-label">Nombre de joueurs</label>
            <Input id="players" type="number" inputMode="numeric" min={1} max={20} value={players} onChange={(e) => setParam('joueurs', e.target.value || null)} startContent={<Users className="h-4 w-4 text-muted-foreground" />} />
          </div>
          <div>
            <label htmlFor="duration" className="field-label">Durée maximale (min)</label>
            <Input id="duration" type="number" inputMode="numeric" min={5} step={5} value={maxDuration} onChange={(e) => setParam('duree', e.target.value || null)} startContent={<Clock className="h-4 w-4 text-muted-foreground" />} />
          </div>
          {categories.length > 0 && (
            <div className="sm:col-span-2">
              <label htmlFor="category" className="field-label">Catégorie</label>
              <select id="category" className="native-select" value={category} onChange={(e) => setParam('categorie', e.target.value || null)}>
                <option value="">Toutes les catégories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-wrap items-end gap-3 sm:col-span-2">
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-gris-pierre-chaude bg-creme-de-lait px-4 text-sm font-semibold text-brun-cafe-doux">
              <input type="checkbox" className="h-5 w-5 accent-terre-cuite-chaleureuse" checked={onlyAvailable} onChange={(e) => setParam('dispo', e.target.checked ? '1' : null)} />
              Disponibles maintenant
            </label>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-gris-pierre-chaude bg-creme-de-lait px-4 text-sm font-semibold text-brun-cafe-doux">
              <input type="checkbox" className="h-5 w-5 accent-terre-cuite-chaleureuse" checked={onlyFavorites} onChange={(e) => setParam('favoris', e.target.checked ? '1' : null)} />
              Mes favoris
            </label>
            {hasFilters && <Button variant="ghost" onClick={() => setParams({}, { replace: true })}>Effacer les filtres</Button>}
          </div>
        </div>
      </section>

      {games.isLoading ? <LoadingState label="Chargement des jeux…" /> : games.isError ? <ErrorState error={games.error} onRetry={() => void games.refetch()} /> : (
        <>
          <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
            {filtered.length} jeu{filtered.length > 1 ? 'x' : ''}{hasFilters ? ' correspondant aux filtres' : ' dans la ludothèque'}
          </p>
          {filtered.length === 0 ? (
            hasFilters
              ? <EmptyState icon={<Search className="h-6 w-6" />} title="Aucun jeu ne correspond">Essayez d’élargir vos critères.</EmptyState>
              : <EmptyState icon={<Library className="h-6 w-6" />} title="La ludothèque est encore vide" action={<Button asChild><Link to="/my-collection">Ajouter le premier jeu</Link></Button>}>
                  Chaque membre ajoute ses propres jeux depuis « Ma collection ».
                </EmptyState>
          ) : (
            <ul className="grid gap-6 lg:grid-cols-2">
              {filtered.map((game) => {
                const available = game.copies.filter((c) => c.status === 'available').length;
                const favorite = favoriteSet.has(game.id);
                return (
                  <li key={game.id} className="surface flex flex-col overflow-hidden">
                    <div className="flex gap-4 p-4 sm:gap-6 sm:p-6">
                      <Link to={`/game/${encodeURIComponent(game.id)}`} className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre-cuite-chaleureuse" tabIndex={-1} aria-hidden="true">
                        <GameImage src={game.thumbnailUrl ?? game.imageUrl} name={game.name} className="h-32 w-24 rounded-lg sm:h-40 sm:w-32" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {game.categories[0] && <p className="page-eyebrow">{game.categories[0]}</p>}
                            <h2 className="mt-1 font-display text-xl font-bold text-brun-cafe-doux">
                              <Link to={`/game/${encodeURIComponent(game.id)}`} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre-cuite-chaleureuse">{game.name}</Link>
                            </h2>
                            {game.isExpansion && <p className="text-xs font-semibold text-bleu-canard-profond">Extension</p>}
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleFavorite.mutate(game.id)}
                            aria-pressed={favorite}
                            aria-label={favorite ? `Retirer ${game.name} des favoris` : `Ajouter ${game.name} aux favoris`}
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg hover:bg-gris-perle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre-cuite-chaleureuse"
                          >
                            <Heart className={favorite ? 'h-5 w-5 fill-terre-cuite-chaleureuse text-terre-cuite-chaleureuse' : 'h-5 w-5 text-brun-cafe-doux'} />
                          </button>
                        </div>
                        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <li>{playersLabel(game)}</li>
                          <li>{game.playingTime ? `${game.playingTime} min` : 'Durée : non renseignée'}</li>
                          {game.minAge ? <li>Dès {game.minAge} ans</li> : null}
                          {game.year ? <li>{game.year}</li> : null}
                        </ul>
                        <p className="mt-3 text-sm font-semibold text-brun-cafe-doux">
                          {available > 0
                            ? `${available} exemplaire${available > 1 ? 's' : ''} disponible${available > 1 ? 's' : ''} sur ${game.copies.length}`
                            : `Aucun exemplaire disponible (${game.copies.length} au total)`}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto border-t border-gris-pierre-chaude p-4 sm:p-6">
                      <CopyList compact copies={game.copies} myPendingCopyIds={borrow.myPendingCopyIds} onRequest={borrow.openRequest(game.name)} onExchange={borrow.openExchange?.(game.name)} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
      {borrow.dialogs}
    </div>
  );
};

export default Games;
