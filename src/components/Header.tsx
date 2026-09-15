import { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Library, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const navLinks = [
  { href: '/games', label: 'Ludothèque' },
  { href: '/my-collection', label: 'Ma collection' },
  { href: '/my-loans', label: 'Mes prêts' },
  { href: '/sessions', label: 'Nos parties' },
  { href: '/members', label: 'Nos membres' },
  { href: '/profile', label: 'Mon profil' },
];

const Header = () => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-gris-pierre-chaude/40 bg-creme-de-lait/95 backdrop-blur-xl shadow-md">
      <div className="mx-auto flex min-h-[4.5rem] w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Brand/logo */}
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-3" onClick={() => setMenuOpen(false)}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-terre-cuite-chaleureuse/20 text-terre-cuite-chaleureuse shadow-lg shadow-terre-cuite-chaleureuse/20">
            <Library className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-wider text-terre-cuite-chaleureuse/80">bibliotheque</span>
            <span className="font-serif text-xl font-bold text-brun-cafe-doux tracking-tight">
              Partagée
            </span>
          </div>
        </Link>

        {/* Desktop menu */}
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex" aria-label="Navigation principale">
          {navLinks.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              aria-current="page"
              className={({ isActive }) => `
                relative rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ease-out-doux
                ${isActive
                  ? 'bg-terre-cuite-chaleureuse/20 text-terre-cuite-chaleureuse shadow-md'
                  : 'text-brun-cafe-doux/60 hover:text-terre-cuite-chaleureuse/90 hover:bg-terre-cuite-chaleureuse/5'}
              `}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* User profile */}
        <div className="hidden md:block">
          <div className="ml-4 flex items-center md:ml-6">
            <div className="relative">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full hover:bg-terre-cuite-chaleureuse/20 focus:outline-none focus:ring-2 focus:ring-terre-cuite-chaleureuse/20"
              >
                <span className="h-6 w-6 bg-terre-cuite-chaleureuse/10 text-terre-cuite-chaleureuse rounded-full flex items-center justify-center">
                  {user?.user_metadata?.username ? (
                    <>
                      <span className="text-xs">{`@${user.user_metadata.username}`}</span>
                      <span className="pointer-events-none absolute -right-1 -top-1 h-2 w-2 bg-vert-sauge-doux rounded-full" />
                    </>
                  ) : (
                    <span className="text-xs">👤</span>
                  )}
                </span>
              </button>
              {/* Mobile menu dropdown */}
              {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-creme-de-lait rounded-xl shadow-xl border border-gris-pierre-chaude z-20">
                  <div className="space-y-1">
                    {navLinks.map((link) => (
                      <NavLink
                        key={link.href}
                        to={link.href}
                        className={({ isActive }) =>
                          isActive
                            ? 'block px-4 py-3 text-sm font-medium text-brun-cafe-doux bg-terre-cuite-chaleureuse/20'
                            : 'block px-4 py-3 text-sm font-medium text-brun-cafe-doux hover:bg-gris-pierre-chaude/50 hover:text-terre-cuite-chaleureuse'}
                      >
                        {link.label}
                      </NavLink>
                    ))}
                    <NavLink
                      to={user ? '/profile' : '/login'}
                      onClick={() => setIsOpen(false)}
                      className="block px-4 py-3 text-sm font-medium text-brun-cafe-doux hover:bg-gris-pierre-chaude/50"
                    >
                      {user ? 'Mon profil' : 'Se connecter'}
                    </NavLink>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu button (visible uniquement sur mobile) */}
        <div className="md:hidden">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-full hover:bg-terre-cuite-chaleureuse/20 focus:outline-none focus:ring-2 focus:ring-terre-cuite-chaleureuse/20"
          >
            <span className="h-6 w-6 bg-terre-cuite-chaleureuse/10 text-terre-cuite-chaleureuse rounded-full flex items-center justify-center">
              ≡
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-gris-pierre-chaude/40 bg-creme-de-lait px-4 py-4 shadow-lg xl:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1" aria-label="Navigation mobile">
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `
                  rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ease-out-doux
                  ${isActive
                    ? 'bg-terre-cuite-chaleureuse/20 text-terre-cuite-chaleureuse'
                    : 'text-brun-cafe-doux hover:bg-terre-cuite-chaleureuse/20'}
                `}
              >
                {link.label}
              </NavLink>
            ))}
            <NavLink
              to={user ? '/profile' : '/login'}
              onClick={() => setMenuOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-medium text-brun-cafe-doux hover:bg-gris-pierre-chaude/50"
            >
              {user ? 'Mon profil' : 'Se connecter'}
            </NavLink>
          </nav>
        </div>
      )}
    </header>
  );
};

export { Header };