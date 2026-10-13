import { useMemo, useState } from 'react';
import LoanRequestModal from '@/components/ui/LoanRequestModal';
import ExchangeRequestModal from '@/components/ui/ExchangeRequestModal';
import { repository, useCollection, useMyActivity } from '@/hooks/useLibrary';
import { useAuth } from '@/hooks/useAuth';
import type { CopyView } from '@/domain/types';

/** Gère les fenêtres « demander à emprunter » et « proposer un échange » d'une page. */
export const useBorrowDialogs = () => {
  const { user } = useAuth();
  const { data: activity } = useMyActivity();
  const { data: collection } = useCollection();
  const [requestTarget, setRequestTarget] = useState<{ copy: CopyView; gameName: string } | null>(null);
  const [exchangeTarget, setExchangeTarget] = useState<{ copy: CopyView; gameName: string } | null>(null);

  const myPendingCopyIds = useMemo(() => new Set(
    (activity?.requests ?? []).filter((r) => r.requesterId === user?.id && r.status === 'pending').map((r) => r.copyId),
  ), [activity, user]);

  const offeredGames = useMemo(() => (collection ?? []).flatMap((game) => game.copies
    .filter((copy) => copy.status === 'available')
    .map((copy) => ({ copyId: copy.id, name: game.name }))), [collection]);

  const canExchange = repository.supportsExchanges && offeredGames.length > 0;

  const dialogs = (
    <>
      <LoanRequestModal gameName={requestTarget?.gameName ?? ''} copy={requestTarget?.copy ?? null} onClose={() => setRequestTarget(null)} />
      {repository.supportsExchanges && (
        <ExchangeRequestModal
          requestedGameName={exchangeTarget?.gameName ?? ''}
          requestedCopy={exchangeTarget?.copy ?? null}
          offeredGames={offeredGames}
          onClose={() => setExchangeTarget(null)}
        />
      )}
    </>
  );

  return {
    myPendingCopyIds,
    openRequest: (gameName: string) => (copy: CopyView) => setRequestTarget({ copy, gameName }),
    openExchange: canExchange ? (gameName: string) => (copy: CopyView) => setExchangeTarget({ copy, gameName }) : undefined,
    dialogs,
  };
};
