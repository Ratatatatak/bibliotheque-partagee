import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useGames, useMembers } from '@/hooks/useLibrary';
import { useAuth } from '@/hooks/useAuth';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/library/PageState';

const Members = () => {
  const { user } = useAuth();
  const members = useMembers();
  const games = useGames();

  const gamesByOwner = useMemo(() => {
    const map = new Map<string, { id: string; name: string }[]>();
    for (const game of games.data ?? []) {
      for (const copy of game.copies) {
        map.set(copy.ownerId, [...(map.get(copy.ownerId) ?? []), { id: game.id, name: game.name }]);
      }
    }
    return map;
  }, [games.data]);

  if (members.isLoading || games.isLoading) return <LoadingState label="Chargement des membres…" />;
  if (members.isError || games.isError) return <div className="page-container"><ErrorState error={members.error ?? games.error} onRetry={() => { void members.refetch(); void games.refetch(); }} /></div>;

  const list = members.data ?? [];
  return (
    <div className="page-container">
      <PageHeader eyebrow="Le groupe" title="Membres" lead="Les personnes qui font vivre la ludothèque et les jeux qu’elles partagent." />
      {list.length === 0 ? <EmptyState icon={<Users className="h-6 w-6" />} title="Aucun membre pour l’instant" /> : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((member) => {
            const owned = (gamesByOwner.get(member.id) ?? []).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
            return (
              <li key={member.id} className="surface p-6">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-terre-cuite-chaleureuse/20 font-display text-xl font-bold text-brun-cafe-doux" aria-hidden="true">
                    {member.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-lg font-bold text-brun-cafe-doux">{member.displayName}{member.id === user?.id && <span className="ml-2 text-sm font-sans font-semibold text-bleu-canard-profond">(vous)</span>}</h2>
                    {member.username && <p className="text-sm text-muted-foreground">@{member.username}</p>}
                  </div>
                </div>
                <p className="mt-4 text-sm font-semibold text-brun-cafe-doux">{owned.length} jeu{owned.length > 1 ? 'x' : ''} partagé{owned.length > 1 ? 's' : ''}</p>
                {owned.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {owned.map((game) => (
                      <li key={game.id}><Link to={`/game/${encodeURIComponent(game.id)}`} className="inline-flex min-h-8 items-center rounded-full bg-gris-perle px-3 text-xs font-semibold text-brun-cafe-doux hover:bg-gris-pierre-chaude">{game.name}</Link></li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export { Members };
