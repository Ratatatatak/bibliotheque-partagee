import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { repository, useLibraryAction } from '@/hooks/useLibrary';
import type { GameWithCopies } from '@/domain/types';

/**
 * « Me prévenir quand il revient » : visible quand aucun exemplaire n'est
 * disponible et que le membre ne possède pas le jeu. Le retour est signalé sur
 * la page d'accueil (et plus tard par email).
 */
export const WaitlistButton = ({ game }: { game: GameWithCopies }) => {
  const { user } = useAuth();
  const waiting = game.waitingMembers.some((member) => member.id === user?.id);
  const join = useLibraryAction((a, gameId: string) => repository.joinWaitlist(a, gameId), { success: 'C’est noté : l’accueil vous signalera son retour.' });
  const leave = useLibraryAction((a, gameId: string) => repository.leaveWaitlist(a, gameId), { success: 'Vous ne serez plus prévenu pour ce jeu.' });

  const available = game.copies.some((copy) => copy.status === 'available');
  const owns = game.copies.some((copy) => copy.ownerId === user?.id);
  const others = game.waitingMembers.filter((member) => member.id !== user?.id).length;

  if (owns || game.copies.length === 0 || (available && !waiting)) {
    return game.waitingMembers.length > 0 && owns
      ? <p className="text-sm text-muted-foreground">{game.waitingMembers.length} membre{game.waitingMembers.length > 1 ? 's attendent' : ' attend'} ce jeu.</p>
      : null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {waiting ? (
        <Button size="sm" variant="outline" disabled={leave.isLoading} onClick={() => leave.mutate(game.id)}>
          <BellOff className="h-4 w-4" aria-hidden="true" />Ne plus me prévenir
        </Button>
      ) : (
        <Button size="sm" variant="outline" disabled={join.isLoading} onClick={() => join.mutate(game.id)}>
          <Bell className="h-4 w-4" aria-hidden="true" />Me prévenir quand il revient
        </Button>
      )}
      <span className="text-sm text-muted-foreground">
        {waiting ? 'Vous êtes sur la liste d’attente' : 'Liste d’attente'}
        {others > 0 ? ` · ${others} autre${others > 1 ? 's' : ''} membre${others > 1 ? 's' : ''}` : ''}
      </span>
    </div>
  );
};
