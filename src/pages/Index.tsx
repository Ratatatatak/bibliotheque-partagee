import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/hooks/useAuth';
import { useGames, useMembers, useMyActivity, useSessions } from '@/hooks/useLibrary';
import { GameImage } from '@/components/library/GameImage';
import { daysUntil, formatDate } from '@/domain/dates';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const games = useGames();
  const members = useMembers();
  const activity = useMyActivity();
  const sessions = useSessions();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    navigate(search.trim() ? `/games?search=${encodeURIComponent(search.trim())}` : '/games');
  };

  const allGames = games.data ?? [];
  const copies = allGames.flatMap((g) => g.copies);
  const available = copies.filter((c) => c.status === 'available').length;
  const toAnswer = (activity.data?.requests ?? []).filter((r) => r.status === 'pending' && r.ownerId === user?.id);
  const lateOrSoon = (activity.data?.loans ?? []).filter((l) => l.status === 'active' && daysUntil(l.expectedReturnDate) <= 2);
  const nextSession = (sessions.data ?? []).find((s) => s.status === 'planned');
  // Liste d'attente : jeux attendus qui ont de nouveau un exemplaire disponible.
  const backInStock = allGames.filter((g) => g.waitingMembers.some((m) => m.id === user?.id) && g.copies.some((c) => c.status === 'available'));
  const recent = [...allGames].sort((a, b) => {
    const latest = (g: typeof a) => g.copies.reduce((max, c) => (c.createdAt > max ? c.createdAt : max), '');
    return latest(b).localeCompare(latest(a));
  }).slice(0, 4);

  return (
    <div>
      <SEO title="Ludothèque du groupe" description="La ludothèque privée de notre groupe d'amis." path="/" />
      <section className="border-b border-gris-pierre-chaude bg-creme-de-lait">
        <div className="page-container">
          <p className="page-eyebrow">Bonjour {user?.displayName}</p>
          <h1 className="mt-2 max-w-3xl font-display text-4xl font-bold leading-tight text-brun-cafe-doux sm:text-5xl">Le bon jeu, au bon moment.</h1>
          <p className="page-lead">Consultez les jeux du groupe, empruntez-les et suivez vos prêts.</p>
          <form onSubmit={submit} className="mt-6 flex max-w-2xl flex-col gap-3 sm:flex-row" role="search">
            <label htmlFor="home-search" className="sr-only">Rechercher un jeu</label>
            <div className="flex-1"><Input id="home-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un jeu…" startContent={<Search className="h-4 w-4 text-muted-foreground" />} /></div>
            <Button type="submit">Rechercher</Button>
          </form>
          <dl className="mt-8 grid max-w-2xl grid-cols-3 gap-4">
            {[
              { label: 'jeux', value: games.isLoading ? '…' : allGames.length },
              { label: 'disponibles', value: games.isLoading ? '…' : available },
              { label: 'membres', value: members.isLoading ? '…' : (members.data ?? []).length },
            ].map((stat) => (
              <div key={stat.label} className="surface p-4 text-center">
                <dd className="font-display text-3xl font-bold text-brun-cafe-doux">{stat.value}</dd>
                <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="page-container space-y-12">
        {(toAnswer.length > 0 || lateOrSoon.length > 0 || nextSession || backInStock.length > 0) && (
          <section aria-labelledby="todo">
            <h2 id="todo" className="mb-4 flex items-center gap-2 font-display text-2xl font-bold text-brun-cafe-doux"><Bell className="h-5 w-5" aria-hidden="true" />À suivre</h2>
            <ul className="space-y-3">
              {toAnswer.length > 0 && (
                <li><Link to="/my-loans" className="surface flex min-h-12 items-center justify-between gap-4 p-4 font-semibold text-brun-cafe-doux hover:shadow-md">
                  {toAnswer.length} demande{toAnswer.length > 1 ? 's' : ''} d’emprunt attend{toAnswer.length > 1 ? 'ent' : ''} votre réponse <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link></li>
              )}
              {lateOrSoon.map((loan) => {
                const days = daysUntil(loan.expectedReturnDate);
                const mine = loan.borrowerId === user?.id;
                return (
                  <li key={loan.id}><Link to="/my-loans" className="surface flex min-h-12 items-center justify-between gap-4 p-4 text-brun-cafe-doux hover:shadow-md">
                    <span><strong>{loan.game.name}</strong> {mine ? `à rendre à ${loan.owner.displayName}` : `prêté à ${loan.borrower.displayName}`} — {days < 0 ? `en retard depuis le ${formatDate(loan.expectedReturnDate)}` : `retour prévu le ${formatDate(loan.expectedReturnDate)}`}</span>
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </Link></li>
                );
              })}
              {backInStock.map((game) => (
                <li key={game.id}><Link to={`/game/${encodeURIComponent(game.id)}`} className="surface flex min-h-12 items-center justify-between gap-4 border-vert-sauge-doux p-4 text-brun-cafe-doux hover:shadow-md">
                  <span><strong>{game.name}</strong> est de nouveau disponible : vous pouvez le demander.</span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </Link></li>
              ))}
              {nextSession && (
                <li><Link to="/sessions" className="surface flex min-h-12 items-center justify-between gap-4 p-4 text-brun-cafe-doux hover:shadow-md">
                  <span>Prochaine partie : <strong>{nextSession.game.name}</strong> le {formatDate(nextSession.date)}{nextSession.time ? ` à ${nextSession.time}` : ''}</span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </Link></li>
              )}
            </ul>
          </section>
        )}

        <section aria-labelledby="recent">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 id="recent" className="font-display text-2xl font-bold text-brun-cafe-doux">Dernières boîtes arrivées</h2>
            <Link to="/games" className="inline-flex min-h-12 items-center gap-2 font-semibold text-bleu-canard-profond hover:underline">Toute la ludothèque <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          {recent.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-title">Aucun jeu pour l’instant</p>
              <p className="empty-state-description">Commencez par ajouter vos propres jeux.</p>
              <Button asChild className="mt-6"><Link to="/my-collection">Ajouter mes jeux</Link></Button>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {recent.map((game) => (
                <li key={game.id}>
                  <Link to={`/game/${encodeURIComponent(game.id)}`} className="surface group block overflow-hidden hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-canard-profond">
                    <GameImage src={game.thumbnailUrl ?? game.imageUrl} name={game.name} className="aspect-square w-full" />
                    <span className="block p-4 font-display font-bold text-brun-cafe-doux group-hover:underline">{game.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export { Index };
