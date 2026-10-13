import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightLeft, CalendarClock, Inbox, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/hooks/useAuth';
import { repository, useExchanges, useLibraryAction, useMyActivity } from '@/hooks/useLibrary';
import { GameImage } from '@/components/library/GameImage';
import { RequestStatusBadge } from '@/components/library/CopyStatusBadge';
import { ErrorState, LoadingState, PageHeader } from '@/components/library/PageState';
import { daysUntil, formatDate, todayIso } from '@/domain/dates';
import { memberLabel, type LoanRequestView, type LoanView } from '@/domain/types';
import { cn } from '@/lib/utils';

const Section = ({ id, title, icon, count, children, empty }: { id: string; title: string; icon: ReactNode; count: number; children: ReactNode; empty: string }) => (
  <section aria-labelledby={id} className="mb-10">
    <h2 id={id} className="mb-4 flex items-center gap-3 font-display text-xl font-bold text-brun-cafe-doux">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-terre-cuite-chaleureuse/15" aria-hidden="true">{icon}</span>
      {title}
      {count > 0 && <span className="rounded-full bg-gris-perle px-3 py-1 text-sm font-semibold">{count}</span>}
    </h2>
    {count === 0 ? <p className="rounded-lg border border-dashed border-gris-pierre-chaude p-6 text-sm text-muted-foreground">{empty}</p> : <ul className="space-y-3">{children}</ul>}
  </section>
);

const Row = ({ game, children, actions }: { game: { id: string; name: string; imageUrl: string | null }; children: ReactNode; actions?: ReactNode }) => (
  <li className="surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
    <GameImage src={game.imageUrl} name={game.name} className="h-20 w-16 shrink-0 rounded-md" size="sm" />
    <div className="min-w-0 flex-1 space-y-1 text-sm text-brun-cafe-doux">
      <p className="font-display text-lg font-bold"><Link to={`/game/${encodeURIComponent(game.id)}`} className="hover:underline">{game.name}</Link></p>
      {children}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
  </li>
);

const DueDate = ({ loan }: { loan: LoanView }) => {
  const days = daysUntil(loan.expectedReturnDate);
  return (
    <p className={cn('font-semibold', days < 0 && 'text-destructive')}>
      Retour prévu le {formatDate(loan.expectedReturnDate)}
      {days < 0 ? ` — en retard de ${-days} jour${-days > 1 ? 's' : ''}` : days === 0 ? ' — aujourd’hui' : days <= 3 ? ` — dans ${days} jour${days > 1 ? 's' : ''}` : ''}
    </p>
  );
};

const ExtendDialog = ({ loan, onClose }: { loan: LoanView | null; onClose: () => void }) => {
  const [date, setDate] = useState('');
  const extend = useLibraryAction((actorId, args: { loanId: string; date: string }) => repository.extendLoan(actorId, args.loanId, args.date), { success: 'Nouvelle date de retour enregistrée.' });
  return (
    <Modal open={Boolean(loan)} onOpenChange={(open) => { if (!open) onClose(); }} title="Modifier la date de retour" description={loan ? `${loan.game.name}, prêté à ${memberLabel(loan.borrower)}` : undefined}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (loan && date) extend.mutate({ loanId: loan.id, date }, { onSuccess: onClose }); }}>
        <div>
          <label htmlFor="new-date" className="field-label">Nouvelle date de retour</label>
          <Input id="new-date" type="date" min={todayIso()} value={date || loan?.expectedReturnDate || ''} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>Annuler</Button><Button type="submit" disabled={!date || extend.isLoading}>Enregistrer</Button></div>
      </form>
    </Modal>
  );
};

const MyLoans = () => {
  const { user } = useAuth();
  const activity = useMyActivity();
  const exchanges = useExchanges();
  const [extendTarget, setExtendTarget] = useState<LoanView | null>(null);
  const [returnTarget, setReturnTarget] = useState<LoanView | null>(null);

  const accept = useLibraryAction((a, r: LoanRequestView) => repository.acceptLoanRequest(a, r.id), { success: (r) => `Prêt confirmé : ${r.game.name} pour ${r.requester.displayName}.` });
  const refuse = useLibraryAction((a, r: LoanRequestView) => repository.refuseLoanRequest(a, r.id), { success: 'Demande refusée.' });
  const cancel = useLibraryAction((a, r: LoanRequestView) => repository.cancelLoanRequest(a, r.id), { success: 'Demande annulée.' });
  const giveBack = useLibraryAction((a, l: LoanView) => repository.returnLoan(a, l.id), { success: (l) => `Retour enregistré : ${l.game.name} est de nouveau disponible.` });
  const respondExchange = useLibraryAction((a, args: { id: string; decision: 'accept' | 'refuse' | 'cancel' }) => repository.respondToExchange(a, args.id, args.decision), {
    success: (args) => (args.decision === 'accept' ? 'Échange accepté : les deux jeux ont changé de propriétaire.' : args.decision === 'refuse' ? 'Proposition refusée.' : 'Proposition annulée.'),
  });
  const busy = accept.isLoading || refuse.isLoading || cancel.isLoading;

  if (activity.isLoading) return <LoadingState label="Chargement de vos prêts…" />;
  if (activity.isError) return <div className="page-container"><ErrorState error={activity.error} onRetry={() => void activity.refetch()} /></div>;

  const { requests, loans } = activity.data!;
  const received = requests.filter((r) => r.ownerId === user?.id && r.status === 'pending');
  const sent = requests.filter((r) => r.requesterId === user?.id && r.status === 'pending');
  const lent = loans.filter((l) => l.ownerId === user?.id && l.status === 'active');
  const borrowed = loans.filter((l) => l.borrowerId === user?.id && l.status === 'active');
  const closedLoans = loans.filter((l) => l.status === 'returned');
  const closedRequests = requests.filter((r) => r.status !== 'pending').slice(0, 20);
  const exchangeList = exchanges.data ?? [];

  return (
    <div className="page-container">
      <PageHeader eyebrow="Mes prêts" title="Prêts et demandes" lead="Les demandes à traiter, les jeux prêtés ou empruntés, et l’historique." />

      <Section id="received" title="Demandes reçues à traiter" icon={<Inbox className="h-5 w-5" />} count={received.length} empty="Aucune demande en attente pour vos jeux.">
        {received.map((r) => (
          <Row key={r.id} game={r.game} actions={<>
            <Button size="sm" disabled={busy} onClick={() => accept.mutate(r)}>Accepter le prêt</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => refuse.mutate(r)}>Refuser</Button>
          </>}>
            <p><strong>{memberLabel(r.requester)}</strong> souhaite emprunter votre exemplaire jusqu’au <strong>{formatDate(r.requestedReturnDate)}</strong>.</p>
            {r.message && <p className="italic text-muted-foreground">« {r.message} »</p>}
            <p className="text-xs text-muted-foreground">Demandé le {formatDate(r.createdAt)}. Accepter refusera automatiquement les autres demandes pour cet exemplaire.</p>
          </Row>
        ))}
      </Section>

      <Section id="lent" title="Jeux que j’ai prêtés" icon={<CalendarClock className="h-5 w-5" />} count={lent.length} empty="Aucun de vos jeux n’est prêté actuellement.">
        {lent.map((l) => (
          <Row key={l.id} game={l.game} actions={<>
            <Button size="sm" onClick={() => setReturnTarget(l)}>J’ai récupéré mon jeu</Button>
            <Button size="sm" variant="outline" onClick={() => setExtendTarget(l)}>Modifier l’échéance</Button>
          </>}>
            <p>Chez <strong>{memberLabel(l.borrower)}</strong> depuis le {formatDate(l.startDate)}.</p>
            <DueDate loan={l} />
          </Row>
        ))}
      </Section>

      <Section id="borrowed" title="Jeux que j’ai empruntés" icon={<CalendarClock className="h-5 w-5" />} count={borrowed.length} empty="Vous n’avez aucun jeu emprunté en ce moment.">
        {borrowed.map((l) => (
          <Row key={l.id} game={l.game}>
            <p>Prêté par <strong>{memberLabel(l.owner)}</strong> le {formatDate(l.startDate)}.</p>
            <DueDate loan={l} />
            <p className="text-xs text-muted-foreground">Au moment du retour, c’est {l.owner.displayName} qui confirme la réception du jeu.</p>
          </Row>
        ))}
      </Section>

      <Section id="sent" title="Mes demandes en attente" icon={<Send className="h-5 w-5" />} count={sent.length} empty="Aucune demande envoyée en attente.">
        {sent.map((r) => (
          <Row key={r.id} game={r.game} actions={<Button size="sm" variant="outline" disabled={busy} onClick={() => cancel.mutate(r)}>Annuler ma demande</Button>}>
            <p>Demandé à <strong>{memberLabel(r.owner)}</strong>, retour proposé le {formatDate(r.requestedReturnDate)}.</p>
            <RequestStatusBadge status={r.status} />
          </Row>
        ))}
      </Section>

      {repository.supportsExchanges && (
        <Section id="exchanges" title="Propositions d’échange" icon={<ArrowRightLeft className="h-5 w-5" />} count={exchangeList.length} empty="Aucune proposition d’échange.">
          {exchangeList.map((x) => {
            const incoming = x.recipient.id === user?.id;
            return (
              <li key={x.id} className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1 text-sm text-brun-cafe-doux">
                  <p className="font-semibold">{x.offeredGameName} <span aria-hidden="true">⇄</span><span className="sr-only">contre</span> {x.requestedGameName}</p>
                  <p className="text-muted-foreground">{incoming ? `Proposé par ${memberLabel(x.proposer)}` : `Proposé à ${memberLabel(x.recipient)}`} le {formatDate(x.createdAt)}. Échange définitif de propriété.</p>
                  {x.message && <p className="italic text-muted-foreground">« {x.message} »</p>}
                  <RequestStatusBadge status={x.status} />
                </div>
                {x.status === 'pending' && (
                  <div className="flex flex-wrap gap-2">
                    {incoming ? <>
                      <Button size="sm" onClick={() => respondExchange.mutate({ id: x.id, decision: 'accept' })}>Accepter l’échange</Button>
                      <Button size="sm" variant="outline" onClick={() => respondExchange.mutate({ id: x.id, decision: 'refuse' })}>Refuser</Button>
                    </> : <Button size="sm" variant="outline" onClick={() => respondExchange.mutate({ id: x.id, decision: 'cancel' })}>Annuler</Button>}
                  </div>
                )}
              </li>
            );
          })}
        </Section>
      )}

      <section aria-labelledby="history" className="mb-10">
        <h2 id="history" className="mb-4 font-display text-xl font-bold text-brun-cafe-doux">Historique</h2>
        {closedLoans.length === 0 && closedRequests.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gris-pierre-chaude p-6 text-sm text-muted-foreground">L’historique est vide pour l’instant.</p>
        ) : (
          <div className="surface overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm text-brun-cafe-doux">
              <caption className="sr-only">Prêts terminés et demandes traitées</caption>
              <thead className="border-b border-gris-pierre-chaude bg-gris-perle/60">
                <tr><th scope="col" className="p-4">Jeu</th><th scope="col" className="p-4">Entre</th><th scope="col" className="p-4">Période / date</th><th scope="col" className="p-4">Résultat</th></tr>
              </thead>
              <tbody>
                {closedLoans.map((l) => (
                  <tr key={l.id} className="border-b border-gris-pierre-chaude last:border-0">
                    <td className="p-4 font-semibold">{l.game.name}</td>
                    <td className="p-4">{l.owner.displayName} → {l.borrower.displayName}</td>
                    <td className="p-4">{formatDate(l.startDate)} → {formatDate(l.actualReturnDate)}</td>
                    <td className="p-4">Prêt terminé{l.actualReturnDate && l.actualReturnDate > l.expectedReturnDate ? ' (rendu en retard)' : ''}</td>
                  </tr>
                ))}
                {closedRequests.filter((r) => r.status !== 'accepted').map((r) => (
                  <tr key={r.id} className="border-b border-gris-pierre-chaude last:border-0">
                    <td className="p-4 font-semibold">{r.game.name}</td>
                    <td className="p-4">{r.requester.displayName} → {r.owner.displayName}</td>
                    <td className="p-4">{formatDate(r.respondedAt ?? r.createdAt)}</td>
                    <td className="p-4"><RequestStatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ExtendDialog key={extendTarget?.id ?? "aucun"} loan={extendTarget} onClose={() => setExtendTarget(null)} />
      <Modal open={Boolean(returnTarget)} onOpenChange={(open) => { if (!open) setReturnTarget(null); }} title="Confirmer le retour ?" description={returnTarget ? `Confirmez que ${returnTarget.borrower.displayName} vous a rendu ${returnTarget.game.name}. Le jeu redeviendra disponible pour le groupe.` : undefined}>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setReturnTarget(null)}>Pas encore</Button>
          <Button disabled={giveBack.isLoading} onClick={() => returnTarget && giveBack.mutate(returnTarget, { onSuccess: () => setReturnTarget(null) })}>Oui, je l’ai récupéré</Button>
        </div>
      </Modal>
    </div>
  );
};

export { MyLoans };
