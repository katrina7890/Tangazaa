import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardPathForRole } from '../utils/roles';

export default function Header() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const onLanding = location.pathname === '/';
  // These routes have a dark forest backdrop at the top, so the wordmark needs to be light there.
  // `/admin` is deliberately absent: the console's floating-panel remodel opens
  // on a light sand canvas, so the wordmark must stay dark there.
  const darkBackdropRoutes = ['/', '/login', '/signup', '/owner'];
  const onDarkBackdrop =
    darkBackdropRoutes.includes(location.pathname) ||
    location.pathname.startsWith('/partner') ||
    // The customer workspace is a nested shell — every /dashboard/* section
    // opens on the same forest band, as does the old /bookings/:id/progress URL.
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/bookings/');

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
      {/* On the landing page the hero carries the wordmark at display size, so
          the header's own is redundant until the hero scrolls away — then it
          fades into its usual slot. Every other route shows it immediately.
          While the hero is in view, the in-page section nav lives in this left
          slot so it sits on one top bar with the sign-in controls; it's replaced
          by the wordmark once you scroll past the hero. Hidden on small screens,
          where the same links live in the footer. */}
      {onLanding && !scrolled ? (
        <nav className="hidden items-center gap-x-6 text-sm font-semibold text-cream/85 md:flex">
          <Link
            to="/map"
            className="rounded-full bg-gradient-to-r from-gold to-blush px-4 py-2 text-white shadow-lg shadow-gold/30 transition hover:opacity-90"
          >
            Billboards
          </Link>
          <a href="#how-it-works" className="transition hover:text-white">
            How it works
          </a>
          <a href="#about" className="transition hover:text-white">
            About us
          </a>
        </nav>
      ) : (
        <Link
          to="/"
          // On the landing page this links to the page you're already on, so
          // give it something to do rather than leaving a dead click.
          onClick={onLanding ? () => window.scrollTo({ top: 0, behavior: 'smooth' }) : undefined}
          className={`font-display text-2xl font-bold tracking-[0.08em] transition-colors ${
            onLanding ? 'header-mark ' : ''
          }${lightWordmark ? 'text-cream' : 'text-forest'}`}
        >
          TANGAZAA
        </Link>
      )}

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
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-sm font-bold text-white shadow-sm">
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
              {user.role === 'customer' && (
                <Link
                  to="/dashboard/messages"
                  role="menuitem"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-cream"
                >
                  <ChatBubbleIcon />
                  Messages
                </Link>
              )}
              {(user.role === 'owner' || user.role === 'admin') && (
                <Link
                  to="/partner"
                  role="menuitem"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-cream"
                >
                  <BriefcaseIcon />
                  Tangazaa Partner
                </Link>
              )}
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
        <div className="flex items-center gap-2.5">
          {/* Separate door for billboard company teams — owners and their staff. */}
          <Link
            to="/partner/login"
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              lightWordmark
                ? 'border-cream/30 text-cream hover:border-coral hover:text-coral'
                : 'border-forest/25 text-forest hover:border-gold-dark hover:text-gold-dark'
            }`}
          >
            Partner
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-white transition hover:bg-gold-soft"
          >
            <UserIcon />
            Sign in
          </Link>
        </div>
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

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-gold-dark" aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" strokeLinecap="round" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-gold-dark" aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-8 8H4l1.5-3.5A8 8 0 1 1 21 12z" strokeLinecap="round" strokeLinejoin="round" />
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
