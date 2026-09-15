import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Search, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { gameCatalog } from '@/data/gameCatalog';
import { bggService } from '@/lib/bggService';
import type { BGGGameDetails, BGGSearchResult } from '@/integrations/bgg/client';
import { Link } from 'react-router-dom';

type CollectionItem = {
  id: string;
  status: string;
  game: {
    id: string;
    name: string;
    description: string | null;
    min_players: number;
    max_players: number;
    duration: number | null;
    category: string | null;
    image_url?: string | null;
    year?: number | null;
    min_age?: number | null;
    average_rating?: number | null;
    ratings_count?: number | null;
  };
};

const getPositiveNumber = (value: string | null, fallback: number) => {
  const number = Number.parseInt(value || '', 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

const loadLocalCollection = (): CollectionItem[] => {
  try {
    const saved = localStorage.getItem('bibliotheque-local-collection');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const MyCollection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localCollection, setLocalCollection] = useState<CollectionItem[]>(loadLocalCollection);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [searchResults, setSearchResults] = useState<BGGSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedBGGGame, setSelectedBGGGame] = useState<BGGSearchResult | null>(null);
  const [selectedBGGDetails, setSelectedBGGDetails] = useState<BGGGameDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(false);

  useEffect(() => {
    const normalizedTerm = searchTerm.trim();
    if (!normalizedTerm) {
      setSearchResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    let active = true;
    setSearching(true);
    setSearchError(null);
    const timeoutId = window.setTimeout(async () => {
      try {
        const results = await bggService.search(normalizedTerm);
        if (active) setSearchResults(results);
      } catch (error) {
        console.error('Erreur lors de la recherche BGG:', error);
        if (active) {
          setSearchResults([]);
          setSearchError('La recherche est momentanément indisponible. Vous pouvez réessayer.');
        }
      } finally {
        if (active) setSearching(false);
      }
    }, 450);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [searchAttempt, searchTerm]);

  // Charge la collection depuis le localStorage au démarrage
  // (utile si l'utilisateur revient plus tard et que Supabase n'est pas encore configuré)
  // Mais en mode Supabase uniquement, cette ligne sera principalement utilisée
  // pour gérer les cas où l'utilisateur n'est pas connecté
  const getOrCreateGame = async (gameData: typeof gameCatalog[number]) => {
    // Vérifie si le jeu existe déjà en base
    const { data: existingGame, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameData.id)
      .single();

    if (!fetchError && existingGame) {
      return { data: existingGame };
    }

    // Convert CatalogGame to match database schema (nullable fields)
    const gameToInsert = {
      id: gameData.id,
      name: gameData.name,
      description: gameData.description ?? null,
      image_url: gameData.image_url,
      min_players: gameData.min_players,
      max_players: gameData.max_players,
      duration: gameData.duration ?? null,
      min_age: gameData.min_age,
      category: gameData.category ?? null,
    };

    const { data: newGame, error: gameError } = await supabase
      .from('games')
      .insert(gameToInsert)
      .select()
      .single();

    if (gameError) throw gameError;
    return { data: newGame };
  };

  // NOUVELLE FONCTION : Texte du statut
  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Disponible';
      case 'lent': return 'Prêté';
      case 'unavailable': return 'Indisponible';
      default: return status;
    }
  };

  // NOUVELLE FONCTION : Variante de badge
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'available': return 'default';
      case 'lent': return 'destructive';
      case 'unavailable': return 'secondary';
      default: return 'secondary';
    }
  };

  const persistLocalCollection = (nextCollection: CollectionItem[]) => {
    setLocalCollection(nextCollection);
    localStorage.setItem('bibliotheque-local-collection', JSON.stringify(nextCollection));
  };

  const { data: gameCopies = [], isLoading, error } = useQuery<CollectionItem[]>({
    queryKey: ['myCollection', user?.id],
    queryFn: async () => {
      // Toujours utiliser Supabase - plus de fallback vers demo
      if (!user) {
        // Si l'utilisateur n'est pas connecté, retourner une collection vide
        // plutôt que de retourner des données de demo
        return [];
      }

      const { data, error: queryError } = await supabase
        .from('game_copies')
        .select('id, status, game:games(id, name, description, image_url, published_year, min_players, max_players, duration, min_age, category)')
        .eq('owner_id', user?.id);
      if (queryError) throw queryError;
      return (data || []) as CollectionItem[];
    },
  });

  // En mode Supabase uniquement, on utilise toujours les données Supabase
  // lorsqu'elles sont disponibles et qu'il n'y a pas d'erreur
  const visibleCollection = !isLoading && !error ? gameCopies : localCollection;

  const selectBGGGame = async (result: BGGSearchResult) => {
    setSelectedBGGGame(result);
    setSelectedBGGDetails(null);
    setDetailsError(false);
    setLoadingDetails(true);
    try {
      const details = await bggService.getDetails(result.id);
      setSelectedBGGDetails(details);
      setDetailsError(!details);
    } catch {
      setDetailsError(true);
    } finally {
      setLoadingDetails(false);
    }
  };

  const resetBGGSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSearchError(null);
    setSelectedBGGGame(null);
    setSelectedBGGDetails(null);
    setDetailsError(false);
  };

  const addBGGGame = async () => {
    if (!user || !selectedBGGGame || !selectedBGGDetails || saving) return;
    setSaving(true);
    try {
      const { data: existingCopy, error: existingCopyError } = await supabase
        .from('game_copies')
        .select('id')
        .eq('owner_id', user.id)
        .eq('game_id', selectedBGGDetails.id)
        .maybeSingle();
      if (existingCopyError) throw existingCopyError;
      if (existingCopy) {
        toast.info('Ce jeu est déjà dans votre collection.');
        return;
      }

      const gameData = {
        id: selectedBGGDetails.id,
        name: selectedBGGDetails.name || selectedBGGGame.name,
        description: selectedBGGDetails.description,
        image_url: selectedBGGDetails.image || selectedBGGDetails.thumbnail,
        published_year: selectedBGGDetails.year ? getPositiveNumber(selectedBGGDetails.year, 0) || null : null,
        min_players: getPositiveNumber(selectedBGGDetails.minPlayers, 1),
        max_players: getPositiveNumber(selectedBGGDetails.maxPlayers, getPositiveNumber(selectedBGGDetails.minPlayers, 1)),
        duration: selectedBGGDetails.playingTime ? getPositiveNumber(selectedBGGDetails.playingTime, 0) || null : null,
        min_age: getPositiveNumber(selectedBGGDetails.minAge, 0),
        category: 'Jeu de société',
        average_rating: selectedBGGDetails.rating.average ? Number.parseFloat(selectedBGGDetails.rating.average) : null,
        ratings_count: selectedBGGDetails.rating.usersRated ? getPositiveNumber(selectedBGGDetails.rating.usersRated, 0) || null : null,
      };

      const { error: gameError } = await supabase.from('games').upsert(gameData, { onConflict: 'id' });
      if (gameError) throw gameError;

      const { error: copyError } = await supabase.from('game_copies').insert({
        game_id: gameData.id,
        owner_id: user.id,
        status: 'available'
      });
      if (copyError) {
        if (copyError.code === '23505') {
          toast.info('Ce jeu est déjà dans votre collection.');
          return;
        }
        throw copyError;
      }

      toast.success('Jeu ajouté à votre collection.');
      await queryClient.invalidateQueries({ queryKey: ['myCollection', user.id] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      resetBGGSearch();
    } catch (err) {
      console.error('Erreur lors de l\'ajout du jeu:', err);
      toast.error('Erreur lors de l\'ajout du jeu à votre collection.');
    } finally {
      setSaving(false);
    }
  };

  const addCatalogGame = async () => {
    const selectedGame = gameCatalog.find(game => game.id === selectedGameId);
    if (!selectedGame || !user || saving) return;
    setSaving(true);
    try {
      const { data: game } = await getOrCreateGame(selectedGame);
      if (!game) throw new Error('Game data is undefined after getOrCreateGame');
      const { error: copyError } = await supabase.from('game_copies').insert({
        game_id: game.id,
        owner_id: user.id,
        status: 'available'
      });
      if (copyError) throw copyError;
      toast.success('Jeu ajouté à votre collection.');
      await queryClient.invalidateQueries({ queryKey: ['myCollection', user.id] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
    } catch (err) {
      console.error('Erreur lors de l\'ajout du jeu:', err);
      toast.error('Erreur lors de l\'ajout du jeu à votre collection.');
    } finally {
      setSaving(false);
    }
  };

  const removeGame = async (id: string) => {
    if (!user) {
      toast.error('Vous devez être connecté pour modifier votre collection.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('game_copies').delete().eq('id', id);
      if (error) throw error;

      toast.success('Jeu retiré de votre collection.');
      queryClient.invalidateQueries({ queryKey: ['myCollection'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
    } catch (err) {
      console.error('Erreur lors de la suppression du jeu:', err);
      toast.error('Erreur lors de la suppression du jeu de votre collection.');
    } finally {
      setSaving(false);
    }
  };

  const toggleLoanStatus = async (id: string, currentStatus: string) => {
    if (!user) {
      toast.error('Vous devez être connecté pour modifier le statut de prêt.');
      return;
    }

    setSaving(true);
    try {
      const newStatus = currentStatus === 'available' ? 'lent' : 'available';
      const { error } = await supabase
        .from('game_copies')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;

      toast.success(`Statut mis à jour : ${getStatusText(newStatus)}`);
      queryClient.invalidateQueries({ queryKey: ['myCollection'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
    } catch (err) {
      console.error('Erreur lors de la mise à jour du statut:', err);
      toast.error('Erreur lors de la mise à jour du statut du jeu.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center py-12">Chargement...</div>;
  }

  if (error) {
    console.error('Error fetching collection:', error);
    return <div className="min-h-screen flex items-center justify-center py-12">Erreur lors du chargement de votre collection. Veuillez vérifier votre connexion Supabase et vous assurer d'être connecté.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-foreground">Ma collection</h1>
          <Link to="/games" className="mt-4 sm:mt-0">
            <Button variant="outline"> Retour au catalogue </Button>
          </Link>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">Ajouter un jeu à votre collection</label>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="w-full sm:w-auto">
              <select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:focus-visible:outline-none file:focus-visible:ring-2 file:focus-visible:ring-ring file:focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Sélectionnez un jeu...</option>
                {gameCatalog
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(game => (
                    <option key={game.id} value={game.id}>
                      {game.name} ({game.min_players}-{game.max_players} joueurs)
                    </option>
                  ))}
              </select>
            </div>
            <Button onClick={addCatalogGame} disabled={saving || !selectedGameId || !user}>
              {saving ? 'Ajout en cours...' : 'Ajouter à la collection'}
            </Button>
          </div>
          {selectedGameId && !saving && (
            <p className="mt-2 text-sm text-muted-foreground">
              Sélectionné : {gameCatalog.find(game => game.id === selectedGameId)?.name || 'Inconnu'}
            </p>
          )}
        </div>

        <section aria-labelledby="bgg-search-title" className="mb-8 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 id="bgg-search-title" className="text-lg font-bold text-foreground">Ajouter depuis BoardGameGeek</h2>
              <p className="mt-1 text-sm text-muted-foreground">Trouvez un jeu qui ne figure pas encore dans le catalogue.</p>
            </div>
            {(searchTerm || selectedBGGGame) && (
              <Button type="button" variant="ghost" size="icon" onClick={resetBGGSearch} aria-label="Fermer la recherche">
                <X />
              </Button>
            )}
          </div>
          {!user ? (
            <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground" role="status">Connectez-vous pour ajouter un jeu à votre collection.</p>
          ) : (
            <>
              <label htmlFor="bgg-game-search" className="mb-2 block text-sm font-medium text-foreground">Rechercher un jeu à ajouter</label>
              <Input
                id="bgg-game-search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Ex. Catan, Azul..."
                autoComplete="off"
                startContent={<Search className="h-4 w-4 text-muted-foreground" />}
                aria-describedby="bgg-search-status"
              />
              <div id="bgg-search-status" className="mt-3 min-h-6 text-sm" aria-live="polite">
                {searching && <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Recherche en cours...</span>}
                {!searching && searchError && <span className="flex flex-wrap items-center gap-2 text-destructive">{searchError}<Button type="button" variant="link" size="sm" onClick={() => setSearchAttempt((attempt) => attempt + 1)}>Réessayer</Button></span>}
                {!searching && !searchError && searchTerm.trim() && searchResults.length === 0 && <span className="text-muted-foreground">Aucun jeu trouvé. Essayez un autre nom.</span>}
              </div>
              {searchResults.length > 0 && !selectedBGGGame && (
                <ul className="mt-2 max-h-80 space-y-2 overflow-y-auto" aria-label="Résultats de recherche BoardGameGeek">
                  {searchResults.map((result) => {
                    const alreadyAdded = visibleCollection.some((item) => item.game.id === result.id);
                    return (
                      <li key={`${result.id}-${result.name}`}>
                        <button type="button" className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-3 text-left transition-colors hover:border-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60" onClick={() => selectBGGGame(result)} disabled={alreadyAdded}>
                          <span className="min-w-0"><span className="block truncate font-semibold text-foreground">{result.name}</span><span className="text-xs text-muted-foreground">{result.year || 'Année inconnue'} · BGG #{result.id}</span></span>
                          {alreadyAdded ? <span className="shrink-0 text-xs font-medium text-muted-foreground">Déjà dans la collection</span> : <span className="shrink-0 text-sm text-primary">Sélectionner</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {selectedBGGGame && (
                <div className="mt-4 rounded-lg border border-primary/30 bg-background p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      {selectedBGGDetails?.thumbnail && <img src={selectedBGGDetails.thumbnail} alt="" className="h-16 w-16 rounded-md object-cover" />}
                      <div><p className="font-semibold text-foreground">{selectedBGGDetails?.name || selectedBGGGame.name}</p><p className="text-sm text-muted-foreground">{selectedBGGGame.year || 'Année inconnue'} · BGG #{selectedBGGGame.id}</p></div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => { setSelectedBGGGame(null); setSelectedBGGDetails(null); setDetailsError(false); }} disabled={saving}>Choisir un autre</Button>
                      <Button type="button" onClick={addBGGGame} disabled={saving || loadingDetails || detailsError || !selectedBGGDetails || visibleCollection.some((item) => item.game.id === selectedBGGGame.id)}>
                        {saving ? <><Loader2 className="animate-spin" />Ajout en cours...</> : loadingDetails ? <><Loader2 className="animate-spin" />Chargement...</> : visibleCollection.some((item) => item.game.id === selectedBGGGame.id) ? <><Check />Déjà ajouté</> : 'Ajouter à ma collection'}
                      </Button>
                    </div>
                  </div>
                  {detailsError && <p className="mt-3 text-sm text-destructive" role="alert">Les informations détaillées de ce jeu sont indisponibles. Choisissez un autre jeu.</p>}
                </div>
              )}
            </>
          )}
        </section>

        <div className="space-y-4">
          {visibleCollection.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Votre collection est vide. Ajoutez des jeux depuis le catalogue !
            </p>
          ) : (
            <>
              {visibleCollection
                .slice()
                .sort((a, b) => a.game.name.localeCompare(b.game.name))
                .map((item) => (
                <article key={item.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
                    <Link to={`/game/${item.game.id}`} className="block w-full">
                      <div className="space-y-3">
                        <div className="flex gap-4">
                          {item.game.image_url ? <img src={item.game.image_url} alt="" className="h-20 w-16 shrink-0 rounded-md object-cover" /> : null}
                          <div className="min-w-0 space-y-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-accent">{item.game.category || 'Jeu de société'}</p>
                            <h3 className="text-lg font-bold text-foreground group-hover:text-primary">{item.game.name}</h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-x-2">
                            <span>{item.game.min_players}-{item.game.max_players} joueurs</span>
                          </div>
                          {item.game.duration && (
                            <>
                              <span className="mx-2 h-4 w-[1px] bg-gris-pierre-chaude/40 hidden sm:block"></span>
                              <span className="flex items-center gap-x-1">
                                <span>{item.game.duration} min</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="icon" onClick={() => toggleLoanStatus(item.id, item.status)} className="p-1">
                        <Badge variant={getStatusVariant(item.status)}>{getStatusText(item.status)}</Badge>
                      </Button>
                      <Button onClick={() => removeGame(item.id)} disabled={saving} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                        Retirer
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyCollection;