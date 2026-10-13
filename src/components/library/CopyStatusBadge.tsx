import type { CopyView } from '@/domain/types';
import { daysUntil, formatDate } from '@/domain/dates';
import { cn } from '@/lib/utils';

/** Statut d'un exemplaire en toutes lettres (jamais la couleur seule). */
export const CopyStatusBadge = ({ copy, className }: { copy: Pick<CopyView, 'status' | 'activeLoan'>; className?: string }) => {
  const late = copy.activeLoan && daysUntil(copy.activeLoan.expectedReturnDate) < 0;
  const styles = copy.status === 'available'
    ? 'bg-success-clair/40 text-brun-cafe-doux border-vert-sauge-doux'
    : copy.status === 'lent'
      ? late ? 'bg-error-atténue/50 text-brun-cafe-doux border-error-atténue' : 'bg-warning-doux/30 text-brun-cafe-doux border-warning-doux'
      : 'bg-gris-perle text-brun-cafe-doux border-gris-pierre-chaude';
  const label = copy.status === 'available'
    ? 'Disponible'
    : copy.status === 'lent'
      ? late ? `En retard (prévu le ${formatDate(copy.activeLoan!.expectedReturnDate)})` : `Prêté jusqu’au ${formatDate(copy.activeLoan?.expectedReturnDate)}`
      : 'Indisponible';
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold', styles, className)}>
      <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', copy.status === 'available' ? 'bg-vert-sauge-doux' : copy.status === 'lent' ? (late ? 'bg-destructive' : 'bg-warning-doux') : 'bg-brun-cafe-doux/40')} />
      {label}
    </span>
  );
};

export const RequestStatusBadge = ({ status }: { status: 'pending' | 'accepted' | 'refused' | 'cancelled' }) => {
  const map = {
    pending: ['En attente de réponse', 'bg-warning-doux/30 border-warning-doux'],
    accepted: ['Acceptée', 'bg-success-clair/40 border-vert-sauge-doux'],
    refused: ['Refusée', 'bg-error-atténue/50 border-error-atténue'],
    cancelled: ['Annulée', 'bg-gris-perle border-gris-pierre-chaude'],
  } as const;
  const [label, style] = map[status];
  return <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold text-brun-cafe-doux', style)}>{label}</span>;
};
