import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';

const NAV_ITEMS = [
  { to: '/partner', end: true, label: 'Overview', icon: MapPinIcon },
  { to: '/partner/bookings', label: 'Bookings', icon: ClipboardIcon },
  { to: '/partner/availability', label: 'Availability', icon: CalendarIcon },
  { to: '/partner/crm', label: 'Clients', icon: PeopleIcon },
  { to: '/partner/artwork', label: 'Artwork', icon: PaletteIcon },
  { to: '/partner/jobs', label: 'Jobs', icon: WrenchIcon },
  { to: '/partner/chat', label: 'Chat', icon: ChatIcon },
  { to: '/partner/sync', label: 'Sync', icon: SyncIcon },
  { to: '/partner/analytics', label: 'Analytics', icon: ChartIcon },
  // Team is owner-only: staff can't mint or remove logins.
  { to: '/partner/team', label: 'Team', icon: TeamIcon, ownerOnly: true },
  { to: '/partner/settings', label: 'Settings', icon: GearIcon, ownerOnly: true },
];

const PAGE_TITLES = {
  '/partner': 'Overview',
  '/partner/bookings': 'Bookings',
  '/partner/availability': 'Availability',
  '/partner/crm': 'Client CRM',
  '/partner/artwork': 'Artwork studio',
  '/partner/jobs': 'Print & install jobs',
  '/partner/sync': 'Booking sync',
  '/partner/analytics': 'Analytics',
  '/partner/chat': 'Chat centre',
  '/partner/team': 'Team accounts',
  '/partner/settings': 'Settings',
};

/**
 * Shell for the Tangazaa Partner ERP: forest sidebar on desktop, bottom tab
 * bar on mobile (so installers can work it one-handed from the field), and a
 * shared top bar with the notification bell.
 */
export default function PartnerLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const title =
    PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/partner/bookings/') ? 'Booking details' : 'Tangazaa Partner');
  const navItems = NAV_ITEMS.filter((item) => !item.ownerOnly || user?.role !== 'staff');

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
            TANGAZAA<span className="text-coral"> PARTNER</span>
          </p>
          <p className="mt-1 truncate text-xs text-cream/60">{user?.company_name || user?.name}</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map(({ to, end, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={end} className={navLinkClass}>
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="px-5 pb-5 text-[11px] leading-relaxed text-cream/40">
          The operating system for your billboard business.
        </p>
      </aside>

      {/* Main column */}
      <div className="lg:pl-60">
        {/* Top bar (sits under the global fixed header) */}
        <div className="bg-forest pb-6 pt-24">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Tangazaa Partner</p>
              <h1 className="font-serif text-2xl font-semibold text-cream sm:text-3xl">{title}</h1>
            </div>
            <NotificationBell />
          </div>
        </div>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 lg:pb-16">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-[900] flex justify-around border-t border-white/10 bg-forest-deep/95 px-1 py-2 backdrop-blur lg:hidden">
        {navItems.map(({ to, end, label, icon: Icon }) => (
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

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  className: 'h-5 w-5 shrink-0',
  'aria-hidden': true,
};

function MapPinIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="3" />
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

function ChartIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 20V10M10 20V4M16 20v-8M21 20H3" strokeLinecap="round" />
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

function CalendarIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18M8 2v4M16 2v4" strokeLinecap="round" />
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

function PaletteIcon() {
  return (
    <svg {...iconProps}>
      <path
        d="M12 21a9 9 0 1 1 9-9c0 2.5-2 3-3.5 3H16a2 2 0 0 0-1.5 3.3c.6.7.2 2.7-2.5 2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="11.5" r="1" fill="currentColor" />
      <circle cx="10.5" cy="7" r="1" fill="currentColor" />
      <circle cx="15" cy="7.5" r="1" fill="currentColor" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg {...iconProps}>
      <path
        d="M14.7 6.3a4.5 4.5 0 0 0-6 5.6L3 17.6V21h3.4l5.7-5.7a4.5 4.5 0 0 0 5.6-6L14.5 12l-2.5-2.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5c.07-.4.1-.8.1-1.2z" strokeLinejoin="round" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" strokeLinecap="round" />
      <path d="M17.5 3.6a3.5 3.5 0 0 1 0 6.9" strokeLinecap="round" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 12a9 9 0 0 1-15.5 6.2M3 12a9 9 0 0 1 15.5-6.2" strokeLinecap="round" />
      <path d="M21 4v5h-5M3 20v-5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
