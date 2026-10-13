import { FormEvent, useState } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { repository, useGames, useLibraryAction, useSessions } from '@/hooks/useLibrary';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/library/PageState';
import { formatDate, todayIso } from '@/domain/dates';
import type { GameSessionView } from '@/domain/types';

const Sessions = () => {
  const { user } = useAuth();
  const sessions = useSessions();
  const games = useGames();
  const [formOpen, setFormOpen] = useState(false);
  const [gameId, setGameId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('20:00');
  const [location, setLocation] = useState('');

  const create = useLibraryAction((a, input: { gameId: string; date: string; time: string | null; location: string | null }) => repository.createSession(a, input), { success: 'Partie programmée.' });
  const join = useLibraryAction((a, args: { id: string; join: boolean }) => repository.toggleSessionParticipation(a, args.id, args.join), { success: (args) => (args.join ? 'Vous participez !' : 'Participation retirée.') });
  const setStatus = useLibraryAction((a, args: { id: string; status: 'played' | 'cancelled' }) => repository.setSessionStatus(a, args.id, args.status), { success: (args) => (args.status === 'played' ? 'Partie marquée comme jouée.' : 'Partie annulée.') });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!gameId || !date) return;
    create.mutate({ gameId, date, time: time || null, location: location.trim() || null }, {
      onSuccess: () => { setFormOpen(false); setDate(''); setLocation(''); },
    });
  };

  if (sessions.isLoading) return <LoadingState label="Chargement des parties…" />;
  if (sessions.isError) return <div className="page-container"><ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} /></div>;

  const list = sessions.data ?? [];
  const planned = list.filter((s) => s.status === 'planned');
  const past = list.filter((s) => s.status !== 'planned').reverse();

  const renderSession = (session: GameSessionView) => {
    const participating = session.playerIds.includes(user?.id ?? '');
    const isCreator = session.creatorId === user?.id;
    return (
      <li key={session.id} className="surface p-6">
        <p className="page-eyebrow">{formatDate(session.date)}{session.time ? ` · ${session.time}` : ''}</p>
        <h3 className="mt-2 font-display text-xl font-bold text-brun-cafe-doux">{session.game.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">Organisée par {session.creator.displayName}{session.location ? ` · ${session.location}` : ''}</p>
        <p className="mt-3 text-sm text-brun-cafe-doux">
          {session.players.length ? `Participants : ${session.players.map((p) => p.displayName).join(', ')}` : 'Personne inscrit pour le moment.'}
        </p>
        {session.status === 'planned' ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant={participating ? 'outline' : 'default'} onClick={() => join.mutate({ id: session.id, join: !participating })}>
              {participating ? 'Je ne participe plus' : 'Je participe'}
            </Button>
            {isCreator && <>
              <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: session.id, status: 'played' })}>Marquer comme jouée</Button>
              <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: session.id, status: 'cancelled' })}>Annuler</Button>
            </>}
          </div>
        ) : <p className="mt-3 text-sm font-semibold text-muted-foreground">{session.status === 'played' ? 'Jouée' : 'Annulée'}</p>}
      </li>
    );
  };

  const gameOptions = games.data ?? [];

  return (
    <div className="page-container">
      <PageHeader eyebrow="On se retrouve" title="Parties" lead="Préparez les prochaines soirées jeux et gardez-en la trace."
        actions={<Button onClick={() => setFormOpen((o) => !o)} aria-expanded={formOpen}><Plus className="h-4 w-4" aria-hidden="true" />Prévoir une partie</Button>} />

      {formOpen && (
        <form onSubmit={submit} className="surface mb-10 p-6" aria-labelledby="new-session">
          <h2 id="new-session" className="mb-4 font-display text-lg font-bold text-brun-cafe-doux">Nouvelle partie</h2>
          {gameOptions.length === 0 ? <p className="text-sm text-muted-foreground">Ajoutez d’abord des jeux à la ludothèque.</p> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><label htmlFor="session-game" className="field-label">Jeu</label>
                <select id="session-game" className="native-select" value={gameId} onChange={(e) => setGameId(e.target.value)} required>
                  <option value="">Choisir…</option>
                  {gameOptions.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select></div>
              <div><label htmlFor="session-date" className="field-label">Date</label><Input id="session-date" type="date" min={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} required /></div>
              <div><label htmlFor="session-time" className="field-label">Heure</label><Input id="session-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
              <div><label htmlFor="session-place" className="field-label">Lieu</label><Input id="session-place" value={location} maxLength={120} onChange={(e) => setLocation(e.target.value)} placeholder="Chez qui ?" /></div>
            </div>
          )}
          <div className="mt-6 flex gap-3"><Button type="submit" disabled={!gameId || !date || create.isLoading}>Créer la partie</Button><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Fermer</Button></div>
        </form>
      )}

      <section aria-labelledby="planned" className="mb-10">
        <h2 id="planned" className="mb-4 font-display text-xl font-bold text-brun-cafe-doux">Prochaines parties</h2>
        {planned.length ? <ul className="grid gap-6 md:grid-cols-2">{planned.map(renderSession)}</ul>
          : <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="Aucune partie prévue">Lancez l’invitation avec « Prévoir une partie ».</EmptyState>}
      </section>
      {past.length > 0 && (
        <section aria-labelledby="past">
          <h2 id="past" className="mb-4 font-display text-xl font-bold text-brun-cafe-doux">Parties passées</h2>
          <ul className="grid gap-6 md:grid-cols-2">{past.map(renderSession)}</ul>
        </section>
      )}
    </div>
  );
};

export { Sessions };
