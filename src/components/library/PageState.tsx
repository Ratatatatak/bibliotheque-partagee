import type { ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { errorMessage } from '@/data/repository';
import { Button } from '@/components/ui/button';

export const LoadingState = ({ label = 'Chargement…' }: { label?: string }) => (
  <div className="flex min-h-[40vh] items-center justify-center gap-3 text-brun-cafe-doux" role="status" aria-live="polite">
    <Loader2 className="h-5 w-5 animate-spin text-terre-cuite-chaleureuse" aria-hidden="true" />
    <span>{label}</span>
  </div>
);

export const ErrorState = ({ error, onRetry, title = 'Impossible de charger les données' }: { error: unknown; onRetry?: () => void; title?: string }) => (
  <div className="empty-state border-error-atténue" role="alert">
    <div className="empty-state-icon bg-error-atténue/40 text-destructive"><AlertTriangle className="h-6 w-6" aria-hidden="true" /></div>
    <h2 className="empty-state-title">{title}</h2>
    <p className="empty-state-description">{errorMessage(error)}</p>
    {onRetry && <Button className="mt-6 h-12" variant="outline" onClick={onRetry}>Réessayer</Button>}
  </div>
);

export const EmptyState = ({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) => (
  <div className="empty-state">
    <div className="empty-state-icon" aria-hidden="true">{icon}</div>
    <h2 className="empty-state-title">{title}</h2>
    {children && <div className="empty-state-description">{children}</div>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

export const PageHeader = ({ eyebrow, title, lead, actions }: { eyebrow: string; title: string; lead?: ReactNode; actions?: ReactNode }) => (
  <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="page-eyebrow">{eyebrow}</p>
      <h1 className="page-title">{title}</h1>
      {lead && <p className="page-lead">{lead}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
  </div>
);
