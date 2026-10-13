import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { memberLabel, type CopyView } from '@/domain/types';
import { CopyStatusBadge } from './CopyStatusBadge';

type CopyListProps = {
  copies: CopyView[];
  myPendingCopyIds: Set<string>;
  onRequest: (copy: CopyView) => void;
  onExchange?: (copy: CopyView) => void;
  compact?: boolean;
};

/**
 * Liste des exemplaires d'un jeu : qui le possède, où il se trouve, et ce que
 * l'on peut faire. Le propriétaire, le détenteur et l'emprunteur sont toujours
 * nommés explicitement.
 */
export const CopyList = ({ copies, myPendingCopyIds, onRequest, onExchange, compact }: CopyListProps) => {
  const { user } = useAuth();
  if (copies.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun membre ne possède ce jeu pour le moment.</p>;
  }
  return (
    <ul className="divide-y divide-gris-pierre-chaude rounded-lg border border-gris-pierre-chaude bg-creme-de-lait">
      {copies.map((copy) => {
        const mine = copy.ownerId === user?.id;
        const borrowedByMe = copy.activeLoan?.borrowerId === user?.id;
        const pending = myPendingCopyIds.has(copy.id);
        return (
          <li key={copy.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="font-semibold text-brun-cafe-doux">
                {mine ? 'Votre exemplaire' : <>Exemplaire de {memberLabel(copy.owner)}</>}
              </p>
              <CopyStatusBadge copy={copy} />
              {copy.activeLoan && (
                <p className="text-sm text-muted-foreground">
                  Actuellement chez <strong className="text-brun-cafe-doux">{borrowedByMe ? 'vous' : memberLabel(copy.activeLoan.borrower)}</strong>
                </p>
              )}
              {!compact && copy.notes && <p className="text-sm text-muted-foreground">Remarque : {copy.notes}</p>}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {mine ? (
                <Link to="/my-collection" className="inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold text-bleu-canard-profond underline underline-offset-4">Gérer</Link>
              ) : pending ? (
                <Link to="/my-loans" className="inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold text-bleu-canard-profond underline underline-offset-4">Demande envoyée</Link>
              ) : copy.status === 'available' ? (
                <>
                  <Button size="sm" onClick={() => onRequest(copy)}>Demander à emprunter</Button>
                  {onExchange && <Button size="sm" variant="outline" onClick={() => onExchange(copy)}>Proposer un échange</Button>}
                </>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
