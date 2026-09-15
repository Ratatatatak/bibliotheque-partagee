import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { gameCatalog } from '@/data/gameCatalog';
import { Link } from 'react-router-dom';
import { readLocalFavorites, readLocalLoans, readLocalRequests, writeLocalFavorites, writeLocalRequests } from '@/lib/localWorkspace';
import LoanRequestModal from '@/components/ui/LoanRequestModal';
import ExchangeRequestModal from '@/components/ui/ExchangeRequestModal';
import { ArrowUpRight, Boxes, CalendarDays, Heart, Users, Library, BookOpen, Clock } from "lucide-react";

type Game = {
  id: string;
  name: string;
  image_url: string | null;
  description: string | null;
  min_players: number;
  max_players: number;
  duration: number | null;
  min_age: number;
  category: string | null;
};

type GameCopy = {
  id: string;
  game_id: string;
  owner_id: string;
  status: 'available' | 'lent' | 'unavailable';
  created_at: string;
  game: Game;
  owner: {
    id: string;
    full_name: string | null;
    username?: string | null;
    avatar_url: string | null;
  };
};

type GameWithCopies = Game & {
  copies: GameCopy[];
};

type AvailabilityFilter = 'all' | 'available' | 'in-exchange';

const Games = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get('category'));
  const [selectedGame, setSelectedGame] = useState<GameWithCopies | null>(null);
  const [playerCount, setPlayerCount] = useState('');
  const [maxDuration, setMaxDuration] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const availabilityFilter = 'available' as AvailabilityFilter;
  const [favorites, setFavorites] = useState<string[]>(readLocalFavorites);
  const [loanRequestData, setLoanRequestData] = useState<{
    gameCopyId: string;
    gameName: string;
    ownerName: string;
  } | null>(null);
  const [exchangeRequestData, setExchangeRequestData] = useState<{
    requestedCopyId: string;
    requestedGameName: string;
    ownerName: string;
    ownerId: string;
  } | null>(null);

  const {
    data: gamesWithCopies = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['games', searchTerm, selectedCategory, playerCount, maxDuration, favoritesOnly, favorites],
    queryFn: async () => {
      const { data: copies = [], error: copiesError } = await supabase
        .from('game_copies')
        .select(`
          id,
          game_id,
          owner_id,
          status,
          created_at,
          game:games(id, name, image_url, description, min_players, max_players, duration, min_age, category)
        `)
        .eq('status', 'available');

      if (copiesError) {
        throw copiesError;
      }

      // Get owners
      const ownerIds = [...new Set(copies.map(copy => copy.owner_id))];
      const { data: owners = [] } = ownerIds.length > 0
        ? await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', ownerIds)
        : { data: [] };
      const ownersById = new Map(owners.map(owner => [owner.id, owner]));

      // Group copies by game
      const copiesByGameId: Record<string, GameCopy[]> = {};
      copies.forEach((copy) => {
        if (copy.owner_id === user?.id || !copy.game) return;
        if (!copiesByGameId[copy.game_id]) {
          copiesByGameId[copy.game_id] = [];
        }
        copiesByGameId[copy.game_id].push({
          ...copy,
          owner: ownersById.get(copy.owner_id) || { id: copy.owner_id, username: null, full_name: null, avatar_url: null },
        });
      });

      const gamesById = new Map<string, Game>();
      copies.forEach((copy) => {
        if (copy.game && copy.owner_id !== user?.id) {
          gamesById.set(copy.game.id, copy.game);
        }
      });

      const gamesWithCopies = Array.from(gamesById.values()).map((game) => ({
        ...game,
        copies: copiesByGameId[game.id] || [],
      }));

      // Apply additional filters that couldn't be done in the Supabase query
      const filteredGames = gamesWithCopies.filter((game) =>
        game.copies.length > 0 &&
        (!searchTerm || game.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (!selectedCategory || game.category === selectedCategory) &&
        (!playerCount || game.min_players <= Number(playerCount) && game.max_players >= Number(playerCount)) &&
        (!maxDuration || game.duration <= Number(maxDuration)) &&
        (!favoritesOnly || favorites.includes(game.id)) &&
        game.copies.some(copy => copy.status === 'available' && copy.owner_id !== user?.id)
      );

      return filteredGames;
    },
  });

  const handleFavoriteToggle = (gameId: string) => {
    if (favorites.includes(gameId)) {
      setFavorites(favorites.filter(id => id !== gameId));
      writeLocalFavorites(favorites.filter(id => id !== gameId));
    } else {
      setFavorites([...favorites, gameId]);
      writeLocalFavorites([...favorites, gameId]);
    }
  };

  const handleLoanRequest = (gameCopyId: string, gameName: string, ownerName: string) => {
    setLoanRequestData({ gameCopyId, gameName, ownerName });
  };

  const handleLoanRequestClose = () => {
    setLoanRequestData(null);
  };

  const ownAvailableGames = gamesWithCopies.flatMap(game => game.copies
    .filter(copy => copy.owner_id === user?.id && copy.status === 'available')
    .map(copy => ({ copyId: copy.id, gameId: game.id, name: game.name })));

  const handleLoanRequestSubmit = (borrowerName: string, borrowerContact: string, loanDate: string, returnDate: string) => {
    if (!loanRequestData) return;

    writeLocalRequests([...readLocalRequests(), {
      id: `req-${Date.now()}`,
      gameCopyId: loanRequestData.gameCopyId,
      borrowerName,
      borrowerContact,
      loanDate,
      returnDate,
      status: 'pending',
      requestedAt: new Date().toISOString()
    }]);

    setLoanRequestData(null);
    toast.success('Demande de prêt envoyée !');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-de-lait py-12">
        <div className="loading">
          <div className="point" aria-hidden="true"></div>
          <div className="point" aria-hidden="true"></div>
          <div className="point" aria-hidden="true"></div>
          <span className="ml-2 text-brun-cafe-doux">Chargement...</span>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Error fetching games:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-de-lait py-12">
        <p className="text-center text-brun-cafe-doux">
          Une erreur est survenue lors du chargement des jeux. Veuillez réessayer plus tard.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-creme-de-lait">
      <div className="mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-title text-center sm:text-left">
            Ludothèque
          </h1>
          <p className="text-subtitle text-center sm:text-left mt-2">
            Jeux disponibles
          </p>
          <div className="mt-6 sm:mt-0 flex flex-wrap gap-3">
            {/*
              <Button
                variant="outline"
                onClick={() => setSearchTerm('')}
                className="px-4"
              >
                Tous les jeux
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedCategory(null)}
                className="px-4"
              >
                Toutes catégories
              </Button>
            */ }
          </div>
        </div>

        <div className="mb-8 p-6 bg-gris-pierre-chaude/10 rounded-xl border border-gris-pierre-chaude/20">
          <p className="text-body">
            Dans cette ludothèque, vous voyez les jeux disponibles provenant des autres membres.
            Vous pouvez emprunter un jeu sans avoir à en offrir un en retour.
          </p>
        </div>

        <div className="mb-10 rounded-xl border border-border/20 bg-card/80 p-6 shadow-lg">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="w-full">
              <Input
                placeholder="Rechercher un jeu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                startContent={<Library className="h-4 w-4 text-terre-cuite-chaleureuse/60" />}
              />
            </div>
            <div className="w-full">
              <Input
                placeholder="Par catégorie..."
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="w-full"
                startContent={<BookOpen className="h-4 w-4 text-terre-cuite-chaleureuse/60" />}
              />
            </div>
            <div className="w-full">
              <Input
                placeholder="Nombre de joueurs..."
                value={playerCount}
                onChange={(e) => setPlayerCount(e.target.value)}
                className="w-full"
                startContent={<Users className="h-4 w-4 text-terre-cuite-chaleureuse/60" />}
              />
            </div>
            <div className="w-full">
              <Input
                placeholder="Durée max (min)..."
                value={maxDuration}
                onChange={(e) => setMaxDuration(e.target.value)}
                className="w-full"
                startContent={<Clock className="h-4 w-4 text-terre-cuite-chaleureuse/60" />}
              />
            </div>
            <div className="flex w-full items-center">
              <Button
                variant="outline"
                onClick={() => setFavoritesOnly(!favoritesOnly)}
                className={`px-4 ${favoritesOnly ? 'bg-terre-cuite-chaleureuse/20 text-terre-cuite-chaleureuse' : ''}`}
              >
                {favoritesOnly ? 'Voir seulement nos favoris' : 'Voir les jeux marqués comme favoris'}
              </Button>
            </div>
          </div>
        </div>

        {/* Nombre de jeux */}
        {gamesWithCopies.length > 0 && (
          <div className="mb-6 flex items-center justify-between">
            <p className="text-body">
              {gamesWithCopies.length} {gamesWithCopies.length === 1 ? 'jeu' : 'jeux'} disponible{gamesWithCopies.length > 1 ? 's' : ''}
            </p>
            <div className="flex space-x-3">
              <Button
                variant="ghost"
                onClick={() => setFavoritesOnly(true)}
                className="px-3 py-2 border border-gris-pierre-chaude bg-creme-de-lait text-sm font-medium text-brun-cafe-doux rounded-lg hover:bg-gris-pierre-chaude/50 focus:outline-none focus:ring-2 focus:ring-terre-cuite-chaleureuse/20 focus:border-terre-cuite-chaleureuse transition-colors duration-200"
              >
                ⭐ Favoris
              </Button>
            </div>
          </div>
        )}

        {/* Grille des jeux ou état vide */}
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {gamesWithCopies.length === 0 ? (
              <div className="col-span-full empty-state">
                <div className="empty-state-icon">
                  <Library className="h-8 w-8" />
                </div>
                <h2 className="empty-state-title">
                  Aucun jeu disponible
                </h2>
                <p className="empty-state-description">
                  Aucun jeu n'est encore partagé. Soyez le premier à ajouter un jeu.
                </p>
                <Link
                  to="/ajouter-jeu"
                  className="bg-terre-cuite-chaleureuse text-white font-semibold px-6 py-3 rounded-lg hover:bg-terre-cuite-chaleureuse/90 focus:outline-none focus:ring-2 focus:ring-terre-cuite-chaleureuse/20 focus:border-terre-cuite-chaleureuse transition-colors duration-200 transform hover:scale-[1.02] active:scale-[0.98] inline-block mt-6"
                >
                  Ajouter le premier jeu
                </Link>
              </div>
            ) : (
              gamesWithCopies.map((game) => (
                <article
                  key={game.id}
                  className="group overflow-hidden rounded-xl border border-gris-pierre-chaude bg-creme-de-lait shadow-md hover:shadow-jeu transition-all duration-300 ease-out-doux"
                >
                  <CardHeader className="border-b border-gris-pierre-chaude/20 px-6 py-6 sm:px-8">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-vert-sauge-doux">
                          {game.category || 'Jeu de société'}
                        </p>
                        <Link
                          to={`/game/${game.id}`}
                          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre-cuite-chaleureuse/20"
                        >
                          <h2 className="text-title text-brun-cafe-doux transition-colors duration-300 ease-out-doux group-hover:text-terre-cuite-chaleureuse">
                            {game.name}
                          </h2>
                        </Link>
                      </div>
                      <Link
                        to={`/game/${game.id}`}
                        className="shrink-0 text-xs font-bold uppercase tracking-wider text-terre-cuite-chaleureuse hover:text-terre-cuite-chaleureuse/90"
                      >
                        Voir la fiche
                      </Link>
                    </div>
                    {game.description && (
                      <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-brun-cafe-doux/60">
                        {game.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="px-6 py-6 sm:px-8">
                    <div className="grid gap-6 md:grid-cols-[minmax(220px,0.75fr)_1fr] md:items-center">
                      {game.image_url ? (
                        <Link
                          to={`/game/${game.id}`}
                          className="block aspect-[4/3] overflow-hidden rounded-xl bg-gris-pierre-chaude/50"
                        >
                          <img
                            src={game.image_url}
                            alt={`Boîte de ${game.name}`}
                            className="h-full w-full object-cover transition duration-500 ease-in-out group-hover:scale-105"
                          />
                        </Link>
                      ) : (
                        <Link
                          to={`/game/${game.id}`}
                          className="flex aspect-[4/3] items-center justify-center rounded-xl bg-terre-cuite-chaleureuse/20 text-sm font-medium text-terre-cuite-chaleureuse"
                        >
                          Image non disponible
                        </Link>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-terre-cuite-chaleureuse/20 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-brun-cafe-doux/60">
                            Âge
                          </p>
                          <p className="mt-1 font-semibold text-brun-cafe-doux">
                            {game.min_age >= 0 ? `${game.min_age}+` : 'À tous les âges'}
                          </p>
                        </div>
                        <div className="rounded-xl bg-terre-cuite-chaleureuse/20 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-brun-cafe-doux/60">
                            Compagnons de jeu
                          </p>
                          <p className="mt-1 font-semibold text-brun-cafe-doux">
                            {game.min_players}-{game.max_players}
                          </p>
                        </div>
                        <div className="rounded-xl bg-terre-cuite-chaleureuse/20 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-brun-cafe-doux/60">
                            Durée
                          </p>
                          <p className="mt-1 font-semibold text-brun-cafe-doux">
                            {game.duration ? `${game.duration} min` : 'À votre rythme'}
                          </p>
                        </div>
                        <div className="rounded-xl bg-terre-cuite-chaleureuse/20 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-brun-cafe-doux/60">
                            Exemplaires disponibles
                          </p>
                          <p className="mt-1 font-semibold text-brun-cafe-doux">
                            {game.copies.length}
                          </p>
                        </div>
                        <div className="rounded-xl bg-vert-sauge-doux/20 p-4 sm:col-span-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-brun-cafe-doux/60">
                            Disponible chez
                          </p>
                          <p className="mt-1 font-semibold text-brun-cafe-doux">
                            {game.copies.map((copy) => copy.owner.username ? `@${copy.owner.username}` : copy.owner.full_name || 'Un membre du groupe').join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-wrap justify-end gap-2 border-t border-gris-pierre-chaude/20 px-6 py-6 sm:px-8">
                    {game.copies.length > 0 ? (
                      <>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            const availableCopies = game.copies.filter(copy => copy.status === 'available' && copy.owner_id !== user?.id);
                            if (availableCopies.length > 0) {
                              handleLoanRequest(availableCopies[0].id, game.name, availableCopies[0].owner.username ? `@${availableCopies[0].owner.username}` : availableCopies[0].owner.full_name || 'Un ami du groupe');
                            } else {
                              toast.info('Aucun exemplaire disponible pour ce jeu parmi les autres membres.');
                            }
                          }}
                        >
                          Emprunter ce jeu
                        </Button>
                        {user && ownAvailableGames.length > 0 && game.copies.some(copy => copy.owner_id !== user.id && copy.status === 'available') && (
                          <Button
                            variant="secondary"
                            onClick={() => {
                              const requestedCopy = game.copies.find(copy => copy.owner_id !== user.id && copy.status === 'available');
                              if (!requestedCopy) return;
                              setExchangeRequestData({
                                requestedCopyId: requestedCopy.id,
                                requestedGameName: game.name,
                                ownerName: requestedCopy.owner.username ? `@${requestedCopy.owner.username}` : requestedCopy.owner.full_name || 'Un ami du groupe',
                                ownerId: requestedCopy.owner_id,
                              });
                            }}
                          >
                            Proposer un échange
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => handleFavoriteToggle(game.id)}
                          className={favorites.includes(game.id) ? 'bg-terre-cuite-chaleureuse/20 text-terre-cuite-chaleureuse' : ''}
                        >
                            {favorites.includes(game.id) ? 'Retirer de nos favoris' : 'Ajouter aux favoris'}
                        </Button>
                      </>
                    ) : (
                      <span className="text-brun-cafe-doux/40">Aucun exemplaire disponible</span>
                    )}
                  </CardFooter>
                </article>
              ))
            )}
          </div>
        </div>

        {loanRequestData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-brun-cafe-doux/50 backdrop-blur-sm">
            <LoanRequestModal
              gameCopyId={loanRequestData.gameCopyId}
              gameName={loanRequestData.gameName}
              ownerName={loanRequestData.ownerName}
              onClose={handleLoanRequestClose}
              onSubmit={handleLoanRequestSubmit}
            />
          </div>
        )}
        {exchangeRequestData && (
          <ExchangeRequestModal
            requestedCopyId={exchangeRequestData.requestedCopyId}
            requestedGameName={exchangeRequestData.requestedGameName}
            ownerName={exchangeRequestData.ownerName}
            ownerId={exchangeRequestData.ownerId}
            offeredGames={ownAvailableGames}
            onClose={() => setExchangeRequestData(null)}
            onSubmitted={() => /* queryClient.invalidateQueries({ queryKey: ['exchangeRequests'] }) */ null}
          />
        )}
      </div>
    </div>
  );
};

export default Games;