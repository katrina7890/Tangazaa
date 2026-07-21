import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useOutletContext, useSearchParams } from 'react-router-dom';
import { cancelMyBooking, fetchMyBookings, initializePayment, resendVerificationEmail } from '../../api';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../partner/NotificationBell';
import PaymentModal from '../payments/PaymentModal';

const NAV_ITEMS = [
  { to: '/dashboard', end: true, label: 'Overview', icon: HomeIcon },
  { to: '/dashboard/campaigns', label: 'Campaigns', icon: ClipboardIcon },
  { to: '/dashboard/messages', label: 'Messages', icon: ChatIcon },
  { to: '/dashboard/payments', label: 'Payments', icon: CardIcon },
  { to: '/dashboard/documents', label: 'Documents', icon: DocumentIcon },
  { to: '/dashboard/profile', label: 'Profile', icon: UserIcon },
];

const PAGE_TITLES = {
  '/dashboard': 'Overview',
  '/dashboard/campaigns': 'My campaigns',
  '/dashboard/messages': 'Messages',
  '/dashboard/payments': 'Payments',
  '/dashboard/documents': 'Documents',
  '/dashboard/profile': 'Profile & settings',
};

/**
 * Shell for the customer workspace — the same shape as PartnerLayout so both
 * sides of the marketplace navigate identically: obsidian sidebar on desktop,
 * bottom tab bar on mobile, shared top band with the notification bell.
 */
export default function CustomerLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const title =
    PAGE_TITLES[location.pathname] ||
    (location.pathname.includes('/progress') ? 'Campaign progress' : 'My account');

  // Bookings live here rather than in each section: switching tabs is then
  // instant, and paying or cancelling updates every view at once.
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [checkout, setCheckout] = useState(null);

  const reloadBookings = useCallback(
    () =>
      fetchMyBookings()
        .then((items) => {
          setBookings(items);
          setError('');
        })
        .catch(() => setError('Could not load your campaigns. Is the API running?'))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    reloadBookings();
  }, [reloadBookings]);

  const replaceBooking = useCallback((updated) => {
    setBookings((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }, []);

  const payBooking = useCallback(async (booking) => {
    setError('');
    setPayingId(booking.id);
    try {
      setCheckout(await initializePayment(booking.id));
    } catch (payError) {
      setError(payError.message);
      setPayingId(null);
    }
  }, []);

  const cancelBooking = useCallback(
    async (booking) => {
      if (!window.confirm(`Cancel your booking for “${booking.billboard.title}”? This cannot be undone.`)) {
        return;
      }
      setCancellingId(booking.id);
      try {
        replaceBooking(await cancelMyBooking(booking.id));
      } catch (cancelError) {
        setError(cancelError.message);
      } finally {
        setCancellingId(null);
      }
    },
    [replaceBooking],
  );

  function handlePaymentSuccess(updated) {
    setCheckout(null);
    setPayingId(null);
    replaceBooking(updated);
  }

  function closeCheckout() {
    setCheckout(null);
    setPayingId(null);
  }

  const outletContext = {
    bookings,
    loading,
    error,
    setError,
    reloadBookings,
    payBooking,
    cancelBooking,
    payingId,
    cancellingId,
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
      isActive ? 'bg-gold text-white shadow-sm' : 'text-cream/80 hover:bg-white/10 hover:text-cream'
    }`;

  return (
    <div className="min-h-screen bg-cream">
      {/* Desktop sidebar */}
      <aside className="fixed bottom-0 left-0 top-0 z-[900] hidden w-60 flex-col bg-forest-deep pt-24 lg:flex">
        <div className="px-5 pb-6">
          <p className="font-display text-lg tracking-wide text-cream">
            TANGAZAA<span className="text-coral"> ADS</span>
          </p>
          <p className="mt-1 truncate text-xs text-cream/60">{user?.company_name || user?.name}</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ to, end, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={end} className={navLinkClass}>
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="px-5 pb-5 text-[11px] leading-relaxed text-cream/40">
          Every campaign you run, in one place.
        </p>
      </aside>

      {/* Main column */}
      <div className="lg:pl-60">
        <div className="bg-forest pb-6 pt-24">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
                {user?.company_name || 'Tangazaa'}
              </p>
              <h1 className="font-serif text-2xl font-semibold text-cream sm:text-3xl">{title}</h1>
            </div>
            <NotificationBell />
          </div>
        </div>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 lg:pb-16">
          <VerificationBanner />
          <Outlet context={outletContext} />
        </main>
      </div>

      {checkout && (
        <PaymentModal payment={checkout} onSuccess={handlePaymentSuccess} onClose={closeCheckout} />
      )}

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-[900] flex justify-around border-t border-white/10 bg-forest-deep/95 px-1 py-2 backdrop-blur lg:hidden">
        {NAV_ITEMS.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-semibold ${
                isActive ? 'text-coral' : 'text-cream/70'
              }`
            }
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/** Shared campaign data + actions, provided by CustomerLayout. */
export function useCustomerData() {
  return useOutletContext();
}

/**
 * Verification is a nudge, not a gate — nothing here blocks the dashboard.
 * The `?verified=` param is what the API's signed link redirects back with.
 */
function VerificationBanner() {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const outcome = searchParams.get('verified');

  useEffect(() => {
    if (!outcome) return;
    // Confirming happens in another tab, so the cached user is stale.
    if (outcome === '1' && refreshUser) refreshUser();
    const timer = setTimeout(() => {
      setSearchParams({}, { replace: true });
    }, 6000);
    return () => clearTimeout(timer);
  }, [outcome, refreshUser, setSearchParams]);

  async function handleResend() {
    setSending(true);
    setNotice('');
    try {
      const response = await resendVerificationEmail();
      setNotice(response?.message || 'Verification email sent.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSending(false);
    }
  }

  if (outcome === '1') {
    return (
      <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm font-medium text-emerald-800">
        Your email address is confirmed — you&apos;re all set.
      </div>
    );
  }

  if (outcome === 'invalid') {
    return (
      <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm font-medium text-red-700">
        That confirmation link has expired or isn&apos;t valid. Request a new one from your profile.
      </div>
    );
  }

  if (!user || user.email_verified_at) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/30 bg-gold/10 px-5 py-3.5">
      <div>
        <p className="text-sm font-semibold text-forest">Confirm your email address</p>
        <p className="text-sm text-stone-600">
          {notice || `We sent a link to ${user.email}. Confirming keeps your receipts and campaign updates coming.`}
        </p>
      </div>
      <button
        type="button"
        onClick={handleResend}
        disabled={sending}
        className="shrink-0 rounded-full bg-gold px-5 py-2 text-sm font-bold text-white transition hover:bg-gold-soft disabled:opacity-60"
      >
        {sending ? 'Sending…' : 'Resend email'}
      </button>
    </div>
  );
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  className: 'h-5 w-5 shrink-0',
  'aria-hidden': true,
};

function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg {...iconProps}>
      <rect x="5" y="4" width="14" height="18" rx="2" />
      <path d="M9 4a3 3 0 0 1 6 0M9 10h6M9 14h6M9 18h4" strokeLinecap="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 12a8 8 0 0 1-8 8H4l1.5-3.5A8 8 0 1 1 21 12z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 11h7M8.5 14h4" strokeLinecap="round" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19M6 15h3" strokeLinecap="round" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg {...iconProps}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" strokeLinecap="round" />
    </svg>
  );
}
