import { useEffect, useState } from 'react';
import { fetchAdminLoginAttempts, fetchAdminStats } from '../api';
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
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-28">
      <h1 className="font-display text-2xl text-slate-900">Admin Dashboard</h1>

      <div className="mt-6 flex gap-2 border-b border-sand">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'overview' &&
          (loading || !stats ? (
            <p className="text-slate-600">Loading…</p>
          ) : (
            <OverviewTab stats={stats} attempts={attempts} />
          ))}
        {tab === 'users' && <UsersPanel />}
        {tab === 'billboards' && <BillboardsPanel />}
        {tab === 'bookings' && <BookingsPanel />}
      </div>
    </div>
  );
}

function OverviewTab({ stats, attempts }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Billboard Companies" value={stats.companies} />
        <StatCard
          label="Active Billboards"
          value={stats.billboards_active}
          sub={`${stats.billboards_total} total`}
        />
        <StatCard label="Customers" value={stats.customers} />
        <StatCard
          label="Bookings"
          value={stats.bookings_total}
          sub={`${formatKES(stats.revenue_confirmed)} revenue`}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-lg text-slate-900">Recent Signups (7 days)</h2>
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
          <h2 className="flex items-center gap-2 font-display text-lg text-slate-900">
            Login Activity
            {stats.suspicious_logins_count > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                {stats.suspicious_logins_count} flagged (7d)
              </span>
            )}
          </h2>
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

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-sand bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
