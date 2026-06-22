import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardPathForRole } from '../utils/roles';

export default function Header() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // These routes have a dark forest backdrop at the top, so the wordmark needs to be light there.
  const darkBackdropRoutes = ['/', '/login', '/signup', '/dashboard', '/owner', '/admin'];
  const onDarkBackdrop = darkBackdropRoutes.includes(location.pathname);

  // Fade a solid forest backdrop in once the user scrolls past the top, so the
  // transparent header stays readable over the cream sections further down.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Light wordmark whenever the backdrop behind it is dark (scrolled header or a dark-backdrop route).
  const lightWordmark = scrolled || onDarkBackdrop;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the account menu on navigation.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  // Close on outside click or Escape while open.
  useEffect(() => {
    if (!menuOpen) return undefined;
    function onPointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate('/');
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[1000] flex items-center justify-between px-6 py-4 transition-all duration-300 ${
        scrolled ? 'bg-forest/95 shadow-lg shadow-black/10 backdrop-blur' : 'bg-transparent'
      }`}
    >
      <Link
        to="/"
        className={`font-display text-2xl tracking-wide transition-colors ${
          lightWordmark ? 'text-cream' : 'text-forest'
        }`}
      >
        TANGAZAA
      </Link>

      {!loading && user ? (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            className={`flex items-center gap-2 rounded-full p-1 pr-2.5 transition ${
              lightWordmark ? 'hover:bg-white/10' : 'hover:bg-black/5'
            }`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-sm font-bold text-forest shadow-sm">
              {initials(user.name)}
            </span>
            <ChevronIcon
              className={`h-4 w-4 transition-transform ${menuOpen ? 'rotate-180' : ''} ${
                lightWordmark ? 'text-cream/80' : 'text-slate-600'
              }`}
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-sand bg-white shadow-xl"
            >
              <div className="border-b border-sand bg-cream/60 px-4 py-3">
                <p className="truncate text-sm font-semibold text-forest">{user.name}</p>
                <p className="truncate text-xs capitalize text-stone-500">
                  {user.role}
                  {user.company_name ? ` · ${user.company_name}` : ''}
                </p>
              </div>
              <Link
                to={dashboardPathForRole(user.role)}
                role="menuitem"
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-cream"
              >
                <GridIcon />
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                <SignOutIcon />
                Sign out
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link
          to="/login"
          className="flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-forest shadow-sm transition hover:bg-gold-soft hover:shadow-md"
        >
          <UserIcon />
          SIGN IN
        </Link>
      )}
    </header>
  );
}

// Up to two initials from the user's name for the avatar.
function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  );
}

function ChevronIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className} aria-hidden="true">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-gold-dark" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" />
      <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
