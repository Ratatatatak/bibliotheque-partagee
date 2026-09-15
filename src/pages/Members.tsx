import { Users } from 'lucide-react';
import { gameCatalog } from '@/data/gameCatalog';

const members = [
  { name: 'Marie', games: gameCatalog.slice(0, 4).map(game => game.name), color: 'bg-emerald-100 text-emerald-800' },
  { name: 'Thomas', games: gameCatalog.slice(4, 8).map(game => game.name), color: 'bg-amber-100 text-amber-800' },
  { name: 'Léa', games: gameCatalog.slice(1, 3).map(game => game.name), color: 'bg-rose-100 text-rose-800' },
].sort((a, b) => a.name.localeCompare(b.name));

const Members = () => <main className="min-h-screen bg-background"><div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8"><div className="mb-8"><p className="text-sm font-semibold uppercase tracking-wider text-primary">Le groupe</p><h1 className="mt-1 text-3xl font-bold">Membres</h1><p className="mt-2 text-muted-foreground">Les personnes qui font vivre notre ludothèque.</p></div><div className="grid gap-5 md:grid-cols-3">{members.map(member => <article key={member.name} className="rounded-lg border bg-card p-5 shadow-sm"><div className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold ${member.color}`}>{member.name.slice(0, 1)}</div><h2 className="mt-4 text-xl font-semibold">{member.name}</h2><p className="mt-1 text-sm text-muted-foreground">{member.games.length} jeux partagés</p><div className="mt-4 flex flex-wrap gap-2">{member.games.map(game => <span key={game} className="rounded-full bg-muted px-2.5 py-1 text-xs">{game}</span>)}</div></article>)}</div></div></main>;

export { Members };
