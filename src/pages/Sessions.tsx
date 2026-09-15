import { FormEvent, useState } from 'react';
import { CalendarDays, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { gameCatalog } from '@/data/gameCatalog';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { LocalSession, readLocalSessions, writeLocalSessions } from '@/lib/localWorkspace';

const Sessions = () => {
  const [sessions, setSessions] = useState<LocalSession[]>(readLocalSessions);
  const [formOpen, setFormOpen] = useState(false);
  const [gameId, setGameId] = useState(gameCatalog[0].id);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('20:00');
  const [place, setPlace] = useState('');

  const addSession = (event: FormEvent) => {
    event.preventDefault();
    const game = gameCatalog.find(item => item.id === gameId) || gameCatalog[0];
    const next = [...sessions, { id: `session-${Date.now()}`, gameId: game.id, gameName: game.name, date, time, place, players: [], status: 'planned' as const }].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    setSessions(next);
    writeLocalSessions(next);
    setFormOpen(false);
    setDate('');
    setPlace('');
  };

  const toggleParticipation = (session: LocalSession) => {
    const players = session.players.includes('Moi') ? session.players.filter(player => player !== 'Moi') : [...session.players, 'Moi'];
    const next = sessions.map(item => item.id === session.id ? { ...item, players } : item);
    setSessions(next);
    writeLocalSessions(next);
  };

  const markPlayed = (session: LocalSession) => {
    const next = sessions.map(item => item.id === session.id ? { ...item, status: 'played' as const } : item);
    setSessions(next);
    writeLocalSessions(next);
  };

  const plannedSessions = sessions.filter(session => session.status === 'planned');
  const playedSessions = sessions.filter(session => session.status === 'played');
  const getGameOwner = (gameName: string) => {
    if (!isSupabaseConfigured) {
      // Demo mode: simulate ownership
      const getCurrentUserCollection = (): any[] => {
        try {
          const saved = localStorage.getItem('bibliotheque-local-collection');
          return saved ? JSON.parse(saved) : [];
        } catch {
          return [];
        }
      };
      const currentUserCollection = getCurrentUserCollection();
      const currentUserId = 'current-user';
      const currentUserName = 'Moi';
      const otherOwners = ['Marie', 'Thomas', 'Léa'];

      // Find the game in the catalog by name
      const game = gameCatalog.find(g => g.name === gameName);
      if (!game) return 'Inconnu';

      // Check if current user has this game
      const userHasGame = currentUserCollection.some((item: any) => item.game.id === game.id);

      if (userHasGame) {
        return currentUserName;
      } else {
        // Assign a deterministic owner based on the game's index in the catalog
        const gameIndex = gameCatalog.findIndex(g => g.name === gameName);
        const ownerIndex = gameIndex % otherOwners.length;
        return otherOwners[ownerIndex];
      }
    } else {
      // In Supabase mode, we would need to query the game_copies to see who owns it.
      // For now, we return a placeholder.
      return 'Inconnu';
    }
  };
  const renderSession = (session: LocalSession) => <article key={session.id} className="rounded-lg border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium capitalize text-primary">{session.date ? new Date(`${session.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Date à définir'} · {session.time}</p><h2 className="mt-2 text-2xl font-bold">{session.gameName}</h2><p className="mt-1 text-sm text-muted-foreground">Propriétaire : {getGameOwner(session.gameName)} - {session.place || 'Lieu à définir'}</p></div><Badge variant={session.status === 'planned' ? 'default' : 'secondary'}>{session.status === 'planned' ? 'Prévue' : 'Jouée'}</Badge></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4"><span className="text-sm text-muted-foreground">{session.players.length ? `${session.players.length} participant(s)` : 'Personne inscrit pour le moment'}</span>{session.status === 'planned' ? <div className="flex gap-2"><Button size="sm" variant={session.players.includes('Moi') ? 'secondary' : 'outline'} onClick={() => toggleParticipation(session)}>{session.players.includes('Moi') && <Check className="mr-2 h-4 w-4" />}Je participe</Button><Button size="sm" variant="ghost" onClick={() => markPlayed(session)}>Marquer comme jouée</Button></div> : <span className="text-sm text-muted-foreground">Historique du groupe</span>}</div></article>;

  return <main className="min-h-screen bg-background"><div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8"><div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-wider text-primary">On se retrouve</p><h1 className="mt-1 text-3xl font-bold">Parties</h1><p className="mt-2 text-muted-foreground">Prépare les prochaines soirées et garde leur historique.</p></div><Button onClick={() => setFormOpen(!formOpen)}><Plus className="mr-2 h-4 w-4" />Prévoir une partie</Button></div>{formOpen && <form onSubmit={addSession} className="mb-8 rounded-lg border bg-card p-5 shadow-sm"><h2 className="mb-4 text-lg font-semibold">Nouvelle partie</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><select aria-label="Jeu" value={gameId} onChange={e => setGameId(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{gameCatalog.map(game => <option key={game.id} value={game.id}>{game.name}</option>)}</select><Input aria-label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} required /><Input aria-label="Heure" type="time" value={time} onChange={e => setTime(e.target.value)} required /><Input aria-label="Lieu" placeholder="Lieu" value={place} onChange={e => setPlace(e.target.value)} /></div><Button className="mt-4" type="submit">Créer la partie</Button></form>}<section><h2 className="mb-4 text-xl font-semibold">Prochaines parties</h2><div className="grid gap-5 md:grid-cols-2">{plannedSessions.length ? plannedSessions.map(renderSession) : <div className="rounded-lg border border-dashed p-10 text-center md:col-span-2"><CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Aucune partie prévue.</p></div>}</div></section>{playedSessions.length > 0 && <section className="mt-10"><h2 className="mb-4 text-xl font-semibold">Parties jouées</h2><div className="grid gap-5 md:grid-cols-2">{playedSessions.map(renderSession)}</div></section>}</div></main>;
};

export { Sessions };
