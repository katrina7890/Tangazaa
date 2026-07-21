import { useEffect, useState } from 'react';
import { fetchAdminLoginAttempts, fetchAdminStats } from '../api';
import AccessControlPanel from '../components/admin/AccessControlPanel';
import AuditLogPanel from '../components/admin/AuditLogPanel';
import BillboardsPanel from '../components/admin/BillboardsPanel';
import BookingsPanel from '../components/admin/BookingsPanel';
import OverviewPanel from '../components/admin/OverviewPanel';
import SecurityPanel from '../components/admin/SecurityPanel';
import UsersPanel from '../components/admin/UsersPanel';

const TABS = [
  { key: 'overview', label: 'Overview', icon: GridIcon },
  { key: 'users', label: 'Users', icon: PeopleIcon },
  { key: 'billboards', label: 'Billboards', icon: PanelIcon },
  { key: 'bookings', label: 'Bookings', icon: ClipboardIcon },
  { key: 'access', label: 'Access control', icon: KeyIcon },
  { key: 'audit', label: 'Audit log', icon: HistoryIcon },
  { key: 'security', label: 'Security', icon: ShieldIcon },
];

/**
 * The platform admin console, remodelled from the "2a — floating-panel" mockup
 * (claude.ai/design → "Tangazaa admin dashboard mockups"): rounded panels
 * floating on a warm sand canvas, an obsidian sidebar card, and a gradient
 * primary action — all expressed in the app's existing Vesper Editorial tokens.
 *
 * This layout is local to the admin console. Tangazaa Partner and the customer
 * workspace keep their own shells (`PartnerLayout`, `CustomerLayout`) and are
 * deliberately untouched by it.
 */
export default function AdminDashboardPage() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetched independently: the login-attempt feed needs `audit.view`, and an
    // admin without it must still get the rest of the overview rather than a
    // screen stuck on "Loading…".
    Promise.all([
      fetchAdminStats().catch(() => null),
      fetchAdminLoginAttempts().catch(() => []),
    ])
      .then(([statsData, attemptsData]) => {
        setStats(statsData);
        setAttempts(attemptsData);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeLabel = TABS.find((t) => t.key === tab)?.label ?? 'Overview';

  const flagged = stats?.suspicious_logins_count ?? 0;

  return (
    <div className="min-h-screen bg-sand pt-20">
      <div className="mx-auto flex max-w-[1500px] gap-5 px-3 pb-28 pt-4 sm:px-5 lg:pb-6">
        {/* ── Sidebar card ──────────────────────────────────── */}
        <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] w-56 flex-none flex-col gap-5 rounded-3xl bg-forest-deep p-5 text-cream lg:flex xl:w-60">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-gold to-blush font-display text-xs font-black text-white">
              TA
            </span>
            <span className="font-display text-base font-black tracking-wide">TANGAZAA</span>
          </div>

          {/* The mockup's gradient CTA. Admins don't create bookings, so the
              slot carries the console's real primary action instead. */}
          <button
            type="button"
            onClick={() => setTab('security')}
            className="rounded-2xl bg-gradient-to-r from-gold to-blush py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            Review security
          </button>

          <nav className="-mr-2 flex-1 space-y-1 overflow-y-auto pr-2">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left text-[13px] font-semibold transition ${
                  tab === key
                    ? 'bg-gradient-to-r from-gold to-blush text-white'
                    : 'text-cream/70 hover:bg-white/10 hover:text-cream'
                }`}
              >
                <Icon />
                {label}
              </button>
            ))}
          </nav>

          {/* Mirrors the mockup's promo block — driven by the real flagged count. */}
          <div className="rounded-2xl bg-white/[0.06] p-4">
            <p className="text-[13px] font-bold">
              {flagged > 0 ? 'Weekly audit due' : 'All clear'}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-cream/50">
              {flagged > 0
                ? `${flagged} flagged ${flagged === 1 ? 'login' : 'logins'} in the last 7 days.`
                : 'No suspicious logins this week.'}
            </p>
            <button
              type="button"
              onClick={() => setTab('audit')}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-gold to-blush py-2 text-xs font-bold text-white transition hover:opacity-90"
            >
              Open audit log
            </button>
          </div>
        </aside>

        {/* ── Content ───────────────────────────────────────── */}
        <main className="min-w-0 flex-1">
          {tab !== 'overview' && (
            <div className="mb-5 rounded-3xl bg-white px-7 py-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold-dark">
                Platform control
              </p>
              <h1 className="mt-1 font-display text-2xl font-black tracking-[-0.03em] text-forest">
                {activeLabel}
              </h1>
            </div>
          )}

          {tab === 'overview' &&
            (loading ? (
              <p className="rounded-3xl bg-white p-8 text-center text-stone-600">Loading…</p>
            ) : stats ? (
              <OverviewPanel stats={stats} attempts={attempts} onNavigate={setTab} />
            ) : (
              <p className="rounded-3xl bg-red-50 px-6 py-5 text-sm font-medium text-red-700">
                Could not load platform statistics.
              </p>
            ))}
          {tab === 'users' && <UsersPanel />}
          {tab === 'billboards' && <BillboardsPanel />}
          {tab === 'bookings' && <BookingsPanel />}
          {tab === 'access' && <AccessControlPanel />}
          {tab === 'audit' && <AuditLogPanel />}
          {tab === 'security' && <SecurityPanel />}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-[900] flex justify-around overflow-x-auto border-t border-white/10 bg-forest-deep/95 px-1 py-2 backdrop-blur lg:hidden">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold ${
              tab === key ? 'text-coral' : 'text-cream/70'
            }`}
          >
            <Icon />
            {label.split(' ')[0]}
          </button>
        ))}
      </nav>
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

function GridIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" strokeLinecap="round" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20c0-2.8-1.9-5-4.5-5.7" strokeLinecap="round" />
    </svg>
  );
}

function PanelIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 9h18M12 18v3M8 21h8" strokeLinecap="round" />
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

function KeyIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="8" cy="15" r="4" />
      <path d="M10.8 12.2 21 2M17 6l3 3M15 8l2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3v5h5M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
