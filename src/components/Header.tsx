import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Dices, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMyActivity } from '@/hooks/useLibrary';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/games', label: 'Ludothèque' },
  { href: '/my-collection', label: 'Ma collection' },
  { href: '/my-loans', label: 'Mes prêts' },
  { href: '/sessions', label: 'Parties' },
  { href: '/members', label: 'Membres' },
  { href: '/profile', label: 'Mon profil' },
];

const linkClass = ({ isActive }: { isActive: boolean }) => cn(
  'relative flex min-h-12 items-center rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-canard-profond',
  isActive ? 'bg-terre-cuite-chaleureuse/15 text-brun-cafe-doux' : 'text-brun-cafe-doux/80 hover:bg-terre-cuite-chaleureuse/10 hover:text-brun-cafe-doux',
);

const Header = () => {
  const { user, signOut, mode } = useAuth();
  const { data: activity } = useMyActivity();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  // Nombre d'actions qui attendent la personne connectée (demandes reçues à traiter).
  const pendingForMe = activity?.requests.filter((r) => r.status === 'pending' && r.ownerId === user?.id).length ?? 0;

  const renderLinks = () => navLinks.map((link) => (
    <NavLink key={link.href} to={link.href} className={linkClass}>
      {link.label}
      {link.href === '/my-loans' && pendingForMe > 0 && (
        <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-bleu-canard-profond px-2 text-xs font-bold text-white">
          {pendingForMe}<span className="sr-only"> demande{pendingForMe > 1 ? 's' : ''} à traiter</span>
        </span>
      )}
    </NavLink>
  ));

  return (
    <header className="sticky top-0 z-40 border-b border-gris-pierre-chaude bg-creme-de-lait/95 backdrop-blur">
      <div className="mx-auto flex min-h-[72px] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-h-12 shrink-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-canard-profond">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-terre-cuite-chaleureuse/20 text-brun-cafe-doux">
            <Dices className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-bold leading-tight text-brun-cafe-doux">
            Ludothèque<span className="block text-xs font-sans font-semibold uppercase tracking-wider text-bleu-canard-profond">du groupe</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">{renderLinks()}</nav>

        <div className="hidden items-center gap-2 lg:flex">
          {mode === 'local' && <span className="rounded-full border border-warning-doux bg-warning-doux/20 px-3 py-1 text-xs font-semibold text-brun-cafe-doux">Mode local</span>}
          {user && (
            <button type="button" onClick={() => void signOut()} className="flex h-12 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-brun-cafe-doux hover:bg-gris-perle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-canard-profond" title={`Connecté en tant que ${user.displayName}`}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Se déconnecter ({user.displayName})</span>
            </button>
          )}
        </div>

        <button
          type="button"
          className="relative flex h-12 w-12 items-center justify-center rounded-lg text-brun-cafe-doux hover:bg-gris-perle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-canard-profond lg:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          {!menuOpen && pendingForMe > 0 && <span className="absolute right-2 top-2 h-3 w-3 rounded-full bg-terre-cuite-chaleureuse" aria-hidden="true" />}
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-gris-pierre-chaude bg-creme-de-lait px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Navigation mobile">
            {renderLinks()}
            {user && (
              <button type="button" onClick={() => void signOut()} className="flex min-h-12 items-center gap-2 rounded-lg px-4 text-left text-sm font-semibold text-brun-cafe-doux hover:bg-gris-perle">
                <LogOut className="h-4 w-4" aria-hidden="true" /> Se déconnecter ({user.displayName})
              </button>
            )}
          </nav>
          {mode === 'local' && <p className="mt-3 px-4 text-xs text-muted-foreground">Mode local : les données restent dans ce navigateur.</p>}
        </div>
      )}
    </header>
  );
};

export { Header };
