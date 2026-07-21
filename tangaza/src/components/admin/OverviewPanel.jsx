import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatKES } from '../../utils/availability';

/**
 * The admin Overview, built from the "2a — floating-panel remodel" mockup
 * (claude.ai/design → "Tangazaa admin dashboard mockups").
 *
 * The mockup's palette (Archivo/Inter, purple→pink gradient, pink/maroon/green
 * chips) is expressed in the app's existing Vesper Editorial tokens instead, so
 * the console still matches Tangazaa Partner and the customer workspace:
 *   ink #241c16  → forest-deep      purple #7b3ce0 → gold
 *   canvas       → sand             pink   #ee5586 → blush
 *   green        → mint / mint-ink  maroon         → sustain / coral-ink
 *
 * Every panel is backed by real data from GET /api/admin/stats — the charts,
 * the ring and the review queue included. Nothing here is sample data.
 */
export default function OverviewPanel({ stats, attempts, onNavigate }) {
  const { user } = useAuth();
  const firstName = (user?.name || 'there').split(' ')[0];

  return (
    <div className="flex flex-col gap-5 xl:flex-row">
      {/* ── Main column ─────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <GreetingHero name={firstName} flagged={stats.suspicious_logins_count} />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatPill label="Billboards" value={stats.billboards_active} tone="coral" />
          <StatPill label="Bookings" value={stats.bookings_total} tone="purple" />
          <StatPill label="Customers" value={stats.customers} tone="mint" />
          <StatPill label="Companies" value={stats.companies} tone="sand" />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <BookingActivity series={stats.booking_activity} />
          <AttentionList items={stats.attention} onNavigate={onNavigate} />
        </div>

        <RevenuePanel
          series={stats.revenue_activity}
          total={stats.revenue_confirmed}
          approvalRate={stats.approval_rate}
          bookings={stats.bookings_total}
        />
      </div>

      {/* ── Right column ────────────────────────────────────── */}
      <div className="flex w-full flex-col gap-5 xl:w-[300px] xl:flex-none">
        <AdminCard user={user} flagged={stats.suspicious_logins_count} onNavigate={onNavigate} />
        <ActivityStrip series={stats.booking_activity} />
        <RecentSignups signups={stats.recent_signups} />
        <LoginFeed attempts={attempts} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

/* ── Panels ────────────────────────────────────────────────── */

function GreetingHero({ name, flagged }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-white p-7 sm:p-8">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-black tracking-[-0.03em] text-forest sm:text-3xl">
            {greeting()}, {name}
          </h2>
          <p className="mt-2 text-sm text-stone-500 sm:text-base">
            {flagged > 0
              ? `${flagged} flagged ${flagged === 1 ? 'login' : 'logins'} to review this week.`
              : 'Nothing flagged this week — the platform is quiet.'}
          </p>
          <p className="mt-0.5 font-editorial text-sm italic text-stone-400">Have a good day.</p>
        </div>

        {/* Stands in for the mockup's illustration slot — abstract billboards
            rather than a stock image, so nothing external is fetched. */}
        <div className="relative hidden h-[120px] w-[150px] flex-none sm:block" aria-hidden>
          <span className="absolute right-4 top-1 h-5 w-5 rotate-12 rounded-md bg-coral-ink/80" />
          <span className="absolute bottom-2 left-0 h-4 w-4 rounded-full bg-mint-ink" />
          <div className="flex h-full w-full items-end justify-center gap-2 rounded-2xl bg-cream p-4">
            <span className="h-10 w-6 rounded-t bg-forest/15" />
            <span className="h-16 w-6 rounded-t bg-gold/60" />
            <span className="h-8 w-6 rounded-t bg-forest/15" />
            <span className="h-[70px] w-6 rounded-t bg-gold" />
          </div>
        </div>
      </div>
    </section>
  );
}

const PILL_TONES = {
  coral: { chip: 'bg-coral', dot: 'bg-coral-ink' },
  purple: { chip: 'bg-gold/15', dot: 'bg-gold' },
  mint: { chip: 'bg-mint', dot: 'bg-mint-ink' },
  sand: { chip: 'bg-sustain', dot: 'bg-forest' },
};

function StatPill({ label, value, tone }) {
  const styles = PILL_TONES[tone] || PILL_TONES.purple;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4">
      <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${styles.chip}`}>
        <span className={`h-3.5 w-3.5 rounded-sm ${styles.dot}`} />
      </span>
      <div className="min-w-0">
        <p className="font-display text-lg font-black text-forest">{value}</p>
        <p className="truncate text-xs text-stone-500">{label}</p>
      </div>
    </div>
  );
}

function BookingActivity({ series = [] }) {
  const total = series.reduce((sum, point) => sum + point.count, 0);
  const path = useMemo(() => smoothPath(series.map((point) => point.count)), [series]);
  const peak = useMemo(() => {
    if (series.length === 0) return null;
    const max = Math.max(...series.map((point) => point.count));
    // No point marking a "peak" on a flat week of zeroes.
    return max > 0 ? series.findIndex((point) => point.count === max) : null;
  }, [series]);

  return (
    <section className="rounded-3xl bg-white p-6 sm:p-7">
      <p className="font-semibold text-forest">Booking activity</p>
      <p className="mt-0.5 text-sm text-stone-400">
        {total} {total === 1 ? 'booking' : 'bookings'} in the last 7 days
      </p>

      <svg viewBox="0 0 400 110" className="mt-4 h-[110px] w-full" role="img" aria-label="Bookings per day over the last seven days">
        <defs>
          <linearGradient id="admin-wave" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8A3DF0" />
            <stop offset="100%" stopColor="#E01F66" />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke="url(#admin-wave)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {peak !== null && <circle cx={pointX(peak)} cy={pointY(series[peak].count, series.map((p) => p.count))} r="6" fill="#17110D" />}
      </svg>

      <div className="mt-1 flex justify-between text-[11px] text-stone-400">
        {series.map((point) => (
          <span key={point.date}>{point.day}</span>
        ))}
      </div>
    </section>
  );
}

const ATTENTION_TONES = {
  coral: 'bg-coral-ink',
  maroon: 'bg-forest',
  purple: 'bg-gold',
  mint: 'bg-mint-ink',
};

/** The mockup's "Pending Approvals" list, wired to real admin work. */
function AttentionList({ items = [], onNavigate }) {
  const targets = {
    flagged_logins: 'security',
    locked_accounts: 'security',
    suspended_accounts: 'users',
    pending_bookings: 'bookings',
  };
  const outstanding = items.filter((item) => item.count > 0);

  return (
    <section className="rounded-3xl bg-white p-6 sm:p-7">
      <p className="mb-4 font-semibold text-forest">Needs review</p>

      {outstanding.length === 0 ? (
        <p className="text-sm text-stone-500">Nothing outstanding. Every queue is clear.</p>
      ) : (
        <ul className="space-y-3.5">
          {outstanding.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onNavigate(targets[item.key])}
                // The visible label is split across spans, so name it explicitly.
                aria-label={`${item.label}: ${item.count}`}
                className="group flex w-full items-center gap-3 text-left"
              >
                <span className={`h-2 w-2 flex-none rounded-full ${ATTENTION_TONES[item.tone] || 'bg-gold'}`} />
                <span className="min-w-0 flex-1 truncate text-sm text-forest group-hover:underline">
                  {item.label}
                </span>
                <span className="flex-none rounded-full bg-cream px-2 py-0.5 text-xs font-bold text-forest">
                  {item.count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RevenuePanel({ series = [], total, approvalRate, bookings }) {
  const max = Math.max(...series.map((point) => point.amount), 1);
  const weekTotal = series.reduce((sum, point) => sum + point.amount, 0);

  return (
    <section className="flex flex-col gap-7 rounded-3xl bg-white p-6 sm:flex-row sm:items-center sm:p-7">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-forest">
          {formatKES(weekTotal)} <span className="text-sm font-normal text-stone-400">settled this week</span>
        </p>
        <p className="mt-0.5 text-sm text-stone-400">{formatKES(total)} confirmed all time</p>

        <div className="mt-4 flex h-[110px] items-end gap-3 sm:gap-5">
          {series.map((point) => {
            const height = point.amount > 0 ? Math.max(6, (point.amount / max) * 100) : 3;
            // Only days with money get the purple→coral gradient; the rest stay ink.
            return (
              <div
                key={point.date}
                className={`w-7 flex-1 rounded-t ${
                  point.amount > 0 ? 'bg-gradient-to-b from-gold to-blush' : 'bg-forest/15'
                }`}
                style={{ height: `${height}%` }}
                title={`${point.day}: ${formatKES(point.amount)}`}
              />
            );
          })}
        </div>
        <div className="mt-2 flex gap-3 sm:gap-5">
          {series.map((point) => (
            <span key={point.date} className="flex-1 text-center text-[11px] text-stone-400">
              {point.day.charAt(0)}
            </span>
          ))}
        </div>
      </div>

      <div className="h-px w-full bg-sand sm:h-[120px] sm:w-px sm:flex-none" />

      <div className="flex flex-none flex-col items-center gap-2">
        <div
          className="flex h-[110px] w-[110px] items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(#8A3DF0 0% ${approvalRate}%, #E9E3D6 ${approvalRate}% 100%)`,
          }}
          role="img"
          aria-label={`${approvalRate} percent of bookings confirmed`}
        >
          <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white">
            <span className="font-display text-xl font-black text-forest">{approvalRate}%</span>
          </div>
        </div>
        <span className="text-xs text-stone-500">Confirmed of {bookings}</span>
      </div>
    </section>
  );
}

function AdminCard({ user, flagged, onNavigate }) {
  return (
    <section className="rounded-3xl bg-forest-deep p-6 text-cream">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-gradient-to-br from-gold to-blush font-display text-sm font-black text-white">
          {initials(user?.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{user?.name}</p>
          <p className="truncate text-xs text-cream/50">
            {user?.is_super_admin ? 'Super Admin' : 'Platform Admin'}
          </p>
        </div>
      </div>

      <p className="text-sm text-cream/60">
        {flagged > 0
          ? `${flagged} flagged ${flagged === 1 ? 'login' : 'logins'} in the last 7 days.`
          : 'No suspicious logins in the last 7 days.'}
      </p>

      <button
        type="button"
        onClick={() => onNavigate('security')}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-gold to-blush py-2.5 text-sm font-bold text-white transition hover:opacity-90"
      >
        Open security
      </button>
    </section>
  );
}

/** The mockup's audit calendar, showing real booking volume per day. */
function ActivityStrip({ series = [] }) {
  const max = Math.max(...series.map((point) => point.count), 1);

  return (
    <section className="rounded-3xl bg-white p-6">
      <p className="mb-4 text-sm font-bold text-forest">Last 7 days</p>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {series.map((point) => (
          <span key={`${point.date}-label`} className="text-[10px] text-stone-400">
            {point.day.charAt(0)}
          </span>
        ))}
        {series.map((point, index) => {
          const isToday = index === series.length - 1;
          const busy = point.count > 0;
          return (
            <span
              key={point.date}
              title={`${point.date}: ${point.count} bookings`}
              className={`rounded-lg py-1.5 text-xs font-semibold ${
                isToday
                  ? 'bg-gradient-to-br from-gold to-blush text-white'
                  : busy
                    ? 'bg-cream text-forest'
                    : 'text-stone-400'
              }`}
              style={!isToday && busy ? { opacity: 0.45 + (point.count / max) * 0.55 } : undefined}
            >
              {new Date(point.date).getDate()}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function RecentSignups({ signups = [] }) {
  return (
    <section className="rounded-3xl bg-white p-6">
      <p className="mb-4 text-sm font-bold text-forest">New this week</p>
      {signups.length === 0 ? (
        <p className="text-sm text-stone-500">No new signups in the last 7 days.</p>
      ) : (
        <ul className="space-y-3">
          {signups.slice(0, 5).map((signup) => (
            <li key={signup.id} className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-cream text-[10px] font-bold text-forest">
                {initials(signup.company_name || signup.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-forest">
                  {signup.company_name || signup.name}
                </span>
                <span className="block text-xs capitalize text-stone-400">{signup.role}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The mockup's agenda column — the real login feed, newest first. */
function LoginFeed({ attempts = [], onNavigate }) {
  const recent = attempts.slice(0, 5);

  return (
    <section className="rounded-3xl bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-forest">Login activity</p>
        <button
          type="button"
          onClick={() => onNavigate('security')}
          className="text-xs font-semibold text-gold-dark hover:underline"
        >
          See all
        </button>
      </div>

      {recent.length === 0 ? (
        <p className="text-sm text-stone-500">No login activity recorded.</p>
      ) : (
        <ul className="space-y-2.5">
          {recent.map((attempt) => (
            <li key={attempt.id} className="flex items-center gap-2.5">
              <span className="w-9 flex-none font-mono text-[11px] text-stone-400">
                {new Date(attempt.created_at).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span
                className={`min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-xs font-semibold ${
                  attempt.is_suspicious
                    ? 'bg-coral text-coral-ink'
                    : attempt.successful
                      ? 'bg-mint text-mint-ink'
                      : 'bg-sustain text-forest'
                }`}
                title={attempt.suspicious_reason || undefined}
              >
                {attempt.user?.company_name || attempt.email}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── Helpers ───────────────────────────────────────────────── */

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function initials(name) {
  if (!name) return '–';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

const CHART_WIDTH = 400;
const CHART_HEIGHT = 110;
const CHART_PAD = 14;

function pointX(index, count = 7) {
  return count <= 1 ? CHART_WIDTH / 2 : (index / (count - 1)) * CHART_WIDTH;
}

function pointY(value, values) {
  const max = Math.max(...values, 1);
  // Inverted: SVG y grows downward, and padding keeps the stroke off the edges.
  return CHART_HEIGHT - CHART_PAD - (value / max) * (CHART_HEIGHT - CHART_PAD * 2);
}

/**
 * A smooth curve through the weekly counts, matching the mockup's wave.
 * Uses midpoint quadratic smoothing — cheap, always passes near every point,
 * and can't overshoot into a misleading dip the way a naive spline can.
 */
function smoothPath(values) {
  if (values.length === 0) return '';
  const points = values.map((value, index) => [pointX(index, values.length), pointY(value, values)]);
  if (points.length === 1) return `M${points[0][0]},${points[0][1]}`;

  let path = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [prevX, prevY] = points[i - 1];
    const [x, y] = points[i];
    const midX = (prevX + x) / 2;
    path += ` Q${prevX},${prevY} ${midX},${(prevY + y) / 2}`;
    if (i === points.length - 1) path += ` T${x},${y}`;
  }
  return path;
}
