import { useEffect, useState } from 'react';
import { fetchAdminLoginAttempts, fetchAdminStats } from '../api';
import DashboardHero from '../components/DashboardHero';
import StatsChart from '../components/StatsChart';
import BillboardsPanel from '../components/admin/BillboardsPanel';
import BookingsPanel from '../components/admin/BookingsPanel';
import UsersPanel from '../components/admin/UsersPanel';
import { formatKES } from '../utils/availability';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'users', label: 'Users' },
  { key: 'billboards', label: 'Billboards' },
  { key: 'bookings', label: 'Bookings' },
];

export default function AdminDashboardPage() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchAdminStats(), fetchAdminLoginAttempts()])
      .then(([statsData, attemptsData]) => {
        setStats(statsData);
        setAttempts(attemptsData);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      <DashboardHero eyebrow="Platform control" title="Admin Dashboard" />

      <div className="mx-auto max-w-6xl px-4 pb-16">
        <div className="relative z-10 -mt-8 flex flex-wrap gap-2 rounded-2xl border border-sand bg-white p-2 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                tab === t.key
                  ? 'bg-forest text-cream shadow-sm'
                  : 'text-stone-500 hover:bg-cream hover:text-forest'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === 'overview' &&
            (loading || !stats ? (
              <p className="text-stone-600">Loading…</p>
            ) : (
              <OverviewTab stats={stats} attempts={attempts} />
            ))}
          {tab === 'users' && <UsersPanel />}
          {tab === 'billboards' && <BillboardsPanel />}
          {tab === 'bookings' && <BookingsPanel />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ stats, attempts }) {
  const chartData = [
    { label: 'Companies', value: stats.companies, color: '#1f3d31' },
    { label: 'Billboards', value: stats.billboards_active, color: '#3f8f6b' },
    { label: 'Customers', value: stats.customers, color: '#d6a23e' },
    { label: 'Bookings', value: stats.bookings_total, color: '#c0703f' },
  ];

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StatsChart title="Platform at a glance" data={chartData} />
        </div>

        {/* Revenue highlight — strong forest/gold colour block */}
        <div className="flex flex-col justify-between rounded-3xl bg-gradient-to-br from-forest to-forest-soft p-6 text-cream shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-soft">Confirmed revenue</p>
            <p className="mt-2 font-serif text-3xl font-semibold text-gold">{formatKES(stats.revenue_confirmed)}</p>
            <p className="mt-1 text-sm text-cream/70">from {stats.bookings_total} bookings</p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-cream/15 pt-4 text-sm">
            <div>
              <p className="text-cream/60">Active boards</p>
              <p className="font-semibold text-cream">
                {stats.billboards_active}
                <span className="text-cream/50"> / {stats.billboards_total}</span>
              </p>
            </div>
            <div>
              <p className="text-cream/60">Flagged logins</p>
              <p className={`font-semibold ${stats.suspicious_logins_count > 0 ? 'text-red-300' : 'text-cream'}`}>
                {stats.suspicious_logins_count}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <SectionHeading>Recent Signups (7 days)</SectionHeading>
          {stats.recent_signups.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No new signups in the last 7 days.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stats.recent_signups.map((signup) => (
                <li key={signup.id} className="rounded-2xl border border-sand bg-white p-3">
                  <p className="font-medium text-slate-900">{signup.company_name || signup.name}</p>
                  <p className="text-sm text-slate-500">
                    {signup.name} · <span className="capitalize">{signup.role}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <SectionHeading
            badge={
              stats.suspicious_logins_count > 0 ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                  {stats.suspicious_logins_count} flagged (7d)
                </span>
              ) : null
            }
          >
            Login Activity
          </SectionHeading>
          {attempts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No login activity yet.</p>
          ) : (
            <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto">
              {attempts.map((attempt) => (
                <li
                  key={attempt.id}
                  className={`rounded-2xl border p-3 ${
                    attempt.is_suspicious ? 'border-red-300 bg-red-50' : 'border-sand bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">
                      {attempt.user?.company_name || attempt.email}
                    </p>
                    <span
                      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                        attempt.successful ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {attempt.successful ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {attempt.ip_address} · {new Date(attempt.created_at).toLocaleString()}
                  </p>
                  {attempt.is_suspicious && (
                    <p className="mt-1 text-sm font-semibold text-red-700">⚠ {attempt.suspicious_reason}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function SectionHeading({ children, badge }) {
  return (
    <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-forest">
      <span className="h-5 w-1 rounded-full bg-gold" />
      {children}
      {badge}
    </h2>
  );
}
