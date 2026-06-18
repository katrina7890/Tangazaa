import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardPathForRole } from '../utils/roles';

export default function Header() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  // These routes have a dark forest backdrop at the top, so the wordmark needs to be light there.
  const darkBackdropRoutes = ['/', '/login', '/signup', '/dashboard', '/owner', '/admin'];
  const onDarkBackdrop = darkBackdropRoutes.includes(useLocation().pathname);

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

  async function handleLogout() {
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
        <div className="flex items-center gap-3">
          <Link
            to={dashboardPathForRole(user.role)}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-800 shadow hover:bg-slate-50"
          >
            DASHBOARD
          </Link>
          <div className="hidden text-right sm:block">
            <p className={`text-sm font-semibold ${lightWordmark ? 'text-cream' : 'text-slate-900'}`}>
              {user.name}
            </p>
            <p className={`text-xs capitalize ${lightWordmark ? 'text-cream/60' : 'text-slate-500'}`}>
              {user.role}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-800 shadow hover:bg-slate-50"
          >
            SIGN OUT
          </button>
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

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  );
}
