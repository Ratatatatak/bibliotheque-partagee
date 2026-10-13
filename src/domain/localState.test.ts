import { describe, expect, it } from 'vitest';
import {
  acceptLoanRequest,
  addCopy,
  addMember,
  cancelLoanRequest,
  createLoanRequest,
  emptyLocalState,
  extendLoan,
  refuseLoanRequest,
  removeCopy,
  returnLoan,
  setCopyAvailability,
  upsertGame,
  type Clock,
  type LocalState,
} from './localState';
import { buildGamesWithCopies, buildLoanViews } from './views';
import { DomainError, type GameInput } from './types';

let counter = 0;
const clock: Clock = { now: () => new Date('2026-10-13T10:00:00'), newId: (p) => `${p}-${++counter}` };

const gameInput = (name: string, bggId: string): GameInput => ({
  name, originalName: null, year: 2000, publishers: [], designers: [], illustrators: [],
  minPlayers: 2, maxPlayers: 4, playingTime: 45, minAge: 8, description: null, categories: [], mechanics: [],
  imageUrl: null, thumbnailUrl: null, bggId, isExpansion: false, rating: null, ratingsCount: null,
  origin: 'bgg', sources: [{ name: 'BoardGameGeek', url: `https://boardgamegeek.com/boardgame/${bggId}`, retrievedAt: '2026-10-13T10:00:00Z' }],
});

/** Groupe de test : Alice et Bruno possèdent chacun Azul ; Chloé n'a rien. */
const setup = () => {
  let state: LocalState = emptyLocalState();
  const a = addMember(state, 'Alice', 'alice', clock); state = a.state;
  const b = addMember(a.state, 'Bruno', 'bruno', clock); state = b.state;
  const c = addMember(b.state, 'Chloé', null, clock); state = c.state;
  const g = upsertGame(state, gameInput('Azul', '230802'), clock); state = g.state;
  const ca = addCopy(state, a.member.id, g.game.id, clock); state = ca.state;
  const cb = addCopy(state, b.member.id, g.game.id, clock); state = cb.state;
  return { state, alice: a.member, bruno: b.member, chloe: c.member, game: g.game, aliceCopy: ca.copy, brunoCopy: cb.copy };
};

describe('inventaire', () => {
  it('distingue la fiche du jeu de ses exemplaires et gère plusieurs propriétaires', () => {
    const { state, game } = setup();
    expect(state.games).toHaveLength(1);
    const [view] = buildGamesWithCopies(state);
    expect(view.id).toBe(game.id);
    expect(view.copies.map((copy) => copy.owner.displayName)).toEqual(['Alice', 'Bruno']);
    expect(view.copies.every((copy) => copy.status === 'available' && copy.holder.id === copy.owner.id)).toBe(true);
  });

  it('refuse un doublon du même jeu chez le même propriétaire', () => {
    const { state, alice, game } = setup();
    expect(() => addCopy(state, alice.id, game.id, clock)).toThrow(DomainError);
  });

  it('une resynchronisation de la fiche ne touche ni les exemplaires ni les notes', () => {
    let { state } = setup();
    const { alice, aliceCopy, game } = setup();
    state = { ...state, copies: state.copies.map((c) => (c.id === aliceCopy.id ? { ...c, notes: 'Boîte abîmée' } : c)) };
    const updated = upsertGame(state, { ...gameInput('Azul (nouvelle traduction)', '230802'), id: game.id }, clock).state;
    expect(updated.copies).toEqual(state.copies);
    expect(updated.games[0].name).toBe('Azul (nouvelle traduction)');
    expect(alice).toBeDefined();
  });
});

describe('prêts', () => {
  it('une demande en attente ne rend pas le jeu indisponible', () => {
    const { state, chloe, aliceCopy } = setup();
    const { state: next, request } = createLoanRequest(state, chloe.id, { copyId: aliceCopy.id, requestedReturnDate: '2026-10-20' }, clock);
    expect(request.status).toBe('pending');
    expect(next.loans).toHaveLength(0);
    const copy = buildGamesWithCopies(next)[0].copies.find((c) => c.id === aliceCopy.id)!;
    expect(copy.status).toBe('available');
    expect(copy.pendingRequestCount).toBe(1);
  });

  it('refuse d’emprunter son propre jeu, une date passée ou invalide', () => {
    const { state, alice, chloe, aliceCopy } = setup();
    expect(() => createLoanRequest(state, alice.id, { copyId: aliceCopy.id, requestedReturnDate: '2026-10-20' }, clock)).toThrow('propre jeu');
    expect(() => createLoanRequest(state, chloe.id, { copyId: aliceCopy.id, requestedReturnDate: '2026-10-01' }, clock)).toThrow('passé');
    expect(() => createLoanRequest(state, chloe.id, { copyId: aliceCopy.id, requestedReturnDate: '2026-02-31' }, clock)).toThrow('invalide');
  });

  it('accepter crée un prêt sur le bon exemplaire, avec le bon propriétaire et le bon emprunteur', () => {
    const { state, alice, bruno, chloe, aliceCopy, brunoCopy } = setup();
    let s = createLoanRequest(state, chloe.id, { copyId: aliceCopy.id, requestedReturnDate: '2026-10-20', message: 'Pour samedi' }, clock);
    const { state: accepted, loan } = acceptLoanRequest(s.state, alice.id, s.request.id, clock);
    expect(loan).toMatchObject({ copyId: aliceCopy.id, ownerId: alice.id, borrowerId: chloe.id, startDate: '2026-10-13', expectedReturnDate: '2026-10-20', status: 'active' });
    const copies = buildGamesWithCopies(accepted)[0].copies;
    const aliceView = copies.find((c) => c.id === aliceCopy.id)!;
    expect(aliceView.status).toBe('lent');
    expect(aliceView.holder.id).toBe(chloe.id);
    expect(aliceView.owner.id).toBe(alice.id);
    // L'exemplaire de Bruno reste disponible : un même jeu peut avoir plusieurs exemplaires.
    expect(copies.find((c) => c.id === brunoCopy.id)!.status).toBe('available');
    expect(bruno).toBeDefined();
    s = { state: accepted, request: s.request };
  });

  it('empêche un double emprunt et refuse automatiquement les demandes concurrentes', () => {
    const { state, alice, bruno, chloe, aliceCopy } = setup();
    const r1 = createLoanRequest(state, chloe.id, { copyId: aliceCopy.id, requestedReturnDate: '2026-10-20' }, clock);
    const r2 = createLoanRequest(r1.state, bruno.id, { copyId: aliceCopy.id, requestedReturnDate: '2026-10-25' }, clock);
    const { state: accepted } = acceptLoanRequest(r2.state, alice.id, r1.request.id, clock);
    expect(accepted.requests.find((r) => r.id === r2.request.id)!.status).toBe('refused');
    expect(() => acceptLoanRequest(accepted, alice.id, r2.request.id, clock)).toThrow('déjà été traitée');
    expect(() => createLoanRequest(accepted, bruno.id, { copyId: aliceCopy.id, requestedReturnDate: '2026-10-25' }, clock)).toThrow('pas disponible');
  });

  it('les décisions ne peuvent pas être prises par un autre membre', () => {
    const { state, bruno, chloe, aliceCopy } = setup();
    const r = createLoanRequest(state, chloe.id, { copyId: aliceCopy.id, requestedReturnDate: '2026-10-20' }, clock);
    expect(() => acceptLoanRequest(r.state, bruno.id, r.request.id, clock)).toThrow('Seul le propriétaire');
    expect(() => acceptLoanRequest(r.state, chloe.id, r.request.id, clock)).toThrow('Seul le propriétaire');
    expect(() => refuseLoanRequest(r.state, chloe.id, r.request.id, clock)).toThrow('Seul le propriétaire');
    expect(() => cancelLoanRequest(r.state, bruno.id, r.request.id, clock)).toThrow('Seule la personne');
  });

  it('refus et annulation sont explicites et ne créent pas de prêt', () => {
    const { state, alice, chloe, aliceCopy } = setup();
    const r = createLoanRequest(state, chloe.id, { copyId: aliceCopy.id, requestedReturnDate: '2026-10-20' }, clock);
    const refused = refuseLoanRequest(r.state, alice.id, r.request.id, clock);
    expect(refused.requests[0].status).toBe('refused');
    expect(refused.loans).toHaveLength(0);
    const r2 = createLoanRequest(refused, chloe.id, { copyId: aliceCopy.id, requestedReturnDate: '2026-10-20' }, clock);
    const cancelled = cancelLoanRequest(r2.state, chloe.id, r2.request.id, clock);
    expect(cancelled.requests.find((x) => x.id === r2.request.id)!.status).toBe('cancelled');
  });

  it('le retour clôture le prêt, rétablit la disponibilité et conserve l’historique', () => {
    const { state, alice, chloe, aliceCopy } = setup();
    const r = createLoanRequest(state, chloe.id, { copyId: aliceCopy.id, requestedReturnDate: '2026-10-20' }, clock);
    const { state: lent, loan } = acceptLoanRequest(r.state, alice.id, r.request.id, clock);
    expect(() => returnLoan(lent, chloe.id, loan.id, clock)).toThrow('Seul le propriétaire');
    const returned = returnLoan(lent, alice.id, loan.id, clock);
    expect(returned.loans[0]).toMatchObject({ status: 'returned', actualReturnDate: '2026-10-13' });
    expect(buildGamesWithCopies(returned)[0].copies.find((c) => c.id === aliceCopy.id)!.status).toBe('available');
    expect(buildLoanViews(returned)).toHaveLength(1);
    expect(() => returnLoan(returned, alice.id, loan.id, clock)).toThrow('déjà clôturé');
  });

  it('un jeu prêté ne peut être ni retiré, ni rendu disponible/indisponible à la main', () => {
    const { state, alice, chloe, aliceCopy } = setup();
    const r = createLoanRequest(state, chloe.id, { copyId: aliceCopy.id, requestedReturnDate: '2026-10-20' }, clock);
    const { state: lent, loan } = acceptLoanRequest(r.state, alice.id, r.request.id, clock);
    expect(() => removeCopy(lent, alice.id, aliceCopy.id, clock)).toThrow('prêté');
    expect(() => setCopyAvailability(lent, alice.id, aliceCopy.id, true)).toThrow('prêté');
    const extended = extendLoan(lent, alice.id, loan.id, '2026-11-01', clock);
    expect(extended.loans[0].expectedReturnDate).toBe('2026-11-01');
  });

  it('rendre un jeu indisponible clôt les demandes en attente', () => {
    const { state, alice, chloe, aliceCopy } = setup();
    const r = createLoanRequest(state, chloe.id, { copyId: aliceCopy.id, requestedReturnDate: '2026-10-20' }, clock);
    const next = setCopyAvailability(r.state, alice.id, aliceCopy.id, false);
    expect(next.requests[0].status).toBe('refused');
    expect(() => createLoanRequest(next, chloe.id, { copyId: aliceCopy.id, requestedReturnDate: '2026-10-20' }, clock)).toThrow('pas disponible');
  });
});

describe('historique', () => {
  it('retirer un exemplaire après un prêt conserve l’historique avec le nom du jeu', () => {
    const { state, alice, chloe, aliceCopy } = setup();
    const r = createLoanRequest(state, chloe.id, { copyId: aliceCopy.id, requestedReturnDate: '2026-10-20' }, clock);
    const { state: lent, loan } = acceptLoanRequest(r.state, alice.id, r.request.id, clock);
    const removed = removeCopy(returnLoan(lent, alice.id, loan.id, clock), alice.id, aliceCopy.id, clock);
    expect(buildGamesWithCopies(removed)[0].copies.map((c) => c.id)).not.toContain(aliceCopy.id);
    const [history] = buildLoanViews(removed);
    expect(history.game.name).toBe('Azul');
    expect(history.status).toBe('returned');
    // Le jeu peut être de nouveau ajouté plus tard.
    expect(() => addCopy(removed, alice.id, history.game.id, clock)).not.toThrow();
  });
});
