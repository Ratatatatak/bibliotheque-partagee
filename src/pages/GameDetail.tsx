import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock3, Star, Users } from 'lucide-react';
import { bggService } from '@/lib/bggService';
import { gameCatalog } from '@/data/gameCatalog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export const GameDetail = () => {
  const { id: gameId } = useParams<{ id: string }>();
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get game data from BGG API
  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      setError('ID de jeu manquant');
      return;
    }

    // Convertir l'ID de notre format en ID BGG si nécessaire
    // Pour l'instant, on suppose que nos IDs correspondent aux IDs BGG
    // Dans une implémentation plus robuste, nous aurions une table de correspondance
    const fetchGameDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: storedGame, error: storedGameError } = await supabase
          .from('games')
          .select('id, name, published_year, description, image_url, min_players, max_players, duration, min_age, category, average_rating, ratings_count')
          .eq('id', gameId)
          .maybeSingle();

        if (storedGameError) throw storedGameError;

        if (storedGame) {
          setGame({
            id: storedGame.id,
            name: storedGame.name,
            year: storedGame.published_year,
            description: storedGame.description,
            minPlayers: storedGame.min_players,
            maxPlayers: storedGame.max_players,
            playtime: storedGame.duration ? `${storedGame.duration} min` : 'Durée libre',
            minAge: storedGame.min_age,
            category: storedGame.category || 'Jeu de société',
            imageUrl: storedGame.image_url,
            averageRating: storedGame.average_rating ? Number(storedGame.average_rating).toFixed(1) : null,
            usersRated: storedGame.ratings_count ? Number(storedGame.ratings_count).toLocaleString() : null,
          });
          setLoading(false);
          return;
        }

        const bggGame = await bggService.getDetails(gameId);

        const catalogGame = gameCatalog.find((item) => item.id === gameId);

        if (!bggGame && !catalogGame) {
          setLoading(false);
          setError('Jeu non trouvé sur BGG');
          return;
        }

        // Convertir les données BGG au format attendu par l'UI
        if (!bggGame) {
          if (!catalogGame) {
            setLoading(false);
            setError('Jeu non trouvé sur BGG');
            return;
          }

          setGame({
            id: catalogGame.id,
            name: catalogGame.name,
            year: catalogGame.year,
            description: catalogGame.description,
            minPlayers: catalogGame.min_players,
            maxPlayers: catalogGame.max_players,
            playtime: `${catalogGame.duration} min`,
            minAge: catalogGame.min_age,
            category: catalogGame.category,
            imageUrl: catalogGame.image_url,
            averageRating: catalogGame.bgg_rating?.toFixed(1) ?? null,
            usersRated: catalogGame.bgg_voters?.toLocaleString() ?? null
          });
          setLoading(false);
          return;
        }

        const gameData = {
          id: bggGame.id,
          name: bggGame.name,
          year: bggGame.year,
          description: bggGame.description,
          minPlayers: bggGame.minPlayers,
          maxPlayers: bggGame.maxPlayers,
          playtime: bggGame.playingTime ? `${bggGame.playingTime} min` : 'Durée libre',
          minAge: bggGame.minAge,
          category: 'Jeu de société',
          imageUrl: bggGame.image,
          averageRating: bggGame.rating.average ? parseFloat(bggGame.rating.average).toFixed(1) : null,
          usersRated: bggGame.rating.usersRated ? parseInt(bggGame.rating.usersRated, 10).toLocaleString() : null
        };

        setGame(gameData);
        setLoading(false);
      } catch (err) {
        console.error('Erreur lors de la récupération des détails BGG:', err);
        setLoading(false);
        setError('Erreur lors du chargement des détails du jeu. Veuillez réessayer plus tard.');
      }
    };

    fetchGameDetails();
  }, [gameId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-de-lait">
        <div className="loading">
          <div className="point" aria-hidden="true"></div>
          <div className="point" aria-hidden="true"></div>
          <div className="point" aria-hidden="true"></div>
          <span className="ml-2 text-brun-cafe-doux">Chargement des détails du jeu...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-de-lait">
        <div className="empty-state">
          <div className="empty-state-icon">
            <Users className="h-8 w-8" />
          </div>
          <h2 className="empty-state-title">Jeu introuvable</h2>
          <p className="empty-state-description">{error}</p>
          <p className="mt-4 text-body">
            Ce jeu n'existe pas encore dans la base de données,
            ou un problème de connexion est survenu.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-terre-cuite-chaleureuse text-white font-semibold px-6 py-3 rounded-lg hover:bg-terre-cuite-chaleureuse/90 focus:outline-none focus:ring-2 focus:ring-terre-cuite-chaleureuse/20 focus:border-terre-cuite-chaleureuse transition-colors duration-200 transform hover:scale-[1.02] active:scale-[0.98] inline-block"
          >
            Retour à la ludothèque
          </button>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-de-lait">
        <div className="empty-state">
          <div className="empty-state-icon">
            <Users className="h-8 w-8" />
          </div>
          <h2 className="empty-state-title">Jeu non trouvé</h2>
          <p className="empty-state-description">
            Aucune donnée disponible pour ce jeu.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-terre-cuite-chaleureuse text-white font-semibold px-6 py-3 rounded-lg hover:bg-terre-cuite-chaleureuse/90 focus:outline-none focus:ring-2 focus:ring-terre-cuite-chaleureuse/20 focus:border-terre-cuite-chaleureuse transition-colors duration-200 transform hover:scale-[1.02] active:scale-[0.98] inline-block"
          >
            Retour à la ludothèque
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-creme-de-lait">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Button variant="ghost" className="mb-6 -ml-3 gap-2 text-muted-foreground hover:text-foreground" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
          Retour à ma collection
        </Button>

        <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_50px_hsl(218_31%_17%_/_0.10)]">
          <div className="h-2 bg-accent" />
          <div className="grid lg:grid-cols-[minmax(280px,0.8fr)_1.2fr]">
            <div className="relative min-h-[360px] overflow-hidden bg-primary p-5 sm:min-h-[500px] sm:p-8">
              {game.imageUrl ? (
                <img src={game.imageUrl} alt={`Boîte de ${game.name}`} className="h-full min-h-[320px] w-full rounded-xl object-cover shadow-2xl ring-1 ring-white/20 sm:min-h-[440px]" />
              ) : (
                <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-dashed border-white/30 text-sm text-white/70 sm:min-h-[440px]">
                  Image non disponible
                </div>
              )}
              <div className="absolute left-9 top-9 flex items-center gap-2 rounded-full bg-background/95 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary shadow-lg sm:left-12 sm:top-12">
                <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                Fiche du jeu
              </div>
            </div>

            <div className="flex flex-col p-6 sm:p-10 lg:p-12">
              <div className="mb-6 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-accent">
                <span>{game.category}</span>
                {game.year && <span className="text-muted-foreground">· {game.year}</span>}
              </div>
              <h1 className="max-w-2xl text-4xl font-bold leading-tight text-foreground sm:text-5xl">{game.name}</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                {game.description || 'Aucune description disponible.'}
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3 border-y border-border py-5 sm:grid-cols-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" />
                  <div><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Joueurs</p><p className="font-semibold">{game.minPlayers}-{game.maxPlayers}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-accent" />
                  <div><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Durée</p><p className="font-semibold">{game.playtime}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-accent" />
                  <div><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Âge</p><p className="font-semibold">{game.minAge}+</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  <div><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Note</p><p className="font-semibold">{game.averageRating ? `${game.averageRating}/10` : 'N/C'}</p></div>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between gap-4 pt-8">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{game.usersRated ? `${game.usersRated} évaluations` : 'Notation communautaire non disponible'}</p>
                  {/* À améliorer : afficher la source si disponible dans les données BGG */}
                  <p className="text-xs text-muted-foreground">Source : BoardGameGeek</p>
                </div>
                <Button onClick={() => window.history.back()} className="gap-2 bg-primary px-5 hover:bg-primary/90">
                  <ArrowLeft className="h-4 w-4" />
                  Revenir à la collection
                </Button>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default GameDetail;