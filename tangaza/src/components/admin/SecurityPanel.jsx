import { useEffect, useState } from 'react';
import {
  fetchAdminSecurityOverview,
  fetchMyAdminSessions,
  revokeOtherAdminSessions,
  unlockUserAccount,
} from '../../api';

/** Security posture: lockouts, recent security events, and your own devices. */
export default function SecurityPanel() {
  const [overview, setOverview] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    Promise.all([fetchAdminSecurityOverview(), fetchMyAdminSessions()])
      .then(([overviewData, sessionData]) => {
        setOverview(overviewData);
        setSessions(sessionData);
      })
      .catch((loadError) =>
        setError(loadError.status === 403 ? 'You do not have permission to view security data.' : loadError.message),
      )
      .finally(() => setLoading(false));
  }, []);

  async function handleUnlock(account) {
    setBusyId(account.id);
    setError('');
    try {
      await unlockUserAccount(account.id);
      setOverview((current) => ({
        ...current,
        lockedAccounts: current.lockedAccounts.filter((item) => item.id !== account.id),
        stats: { ...current.stats, locked_accounts: Math.max(0, current.stats.locked_accounts - 1) },
      }));
    } catch (unlockError) {
      setError(unlockError.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRevokeSessions() {
    if (!window.confirm('Sign out every other device signed in as you?')) return;
    setError('');
    try {
      await revokeOtherAdminSessions();
      setSessions(await fetchMyAdminSessions());
    } catch (revokeError) {
      setError(revokeError.message);
    }
  }

  if (loading) return <p className="text-stone-600">Loading…</p>;
  if (error && !overview) {
    return <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>;
  }

  const { stats, lockedAccounts, recentEvents } = overview;

  return (
    <div className="space-y-5">
      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Locked accounts" value={stats.locked_accounts} tone={stats.locked_accounts > 0 ? 'text-amber-600' : undefined} />
        <Stat label="Suspended accounts" value={stats.suspended_accounts} />
        <Stat
          label="Suspicious logins (7d)"
          value={stats.suspicious_logins_7d}
          tone={stats.suspicious_logins_7d > 0 ? 'text-red-600' : undefined}
        />
        <Stat label="Failed logins (24h)" value={stats.failed_logins_24h} />
        <Stat label="Active sessions" value={stats.active_sessions} />
        <Stat label="Administrators" value={stats.admins} />
        <Stat label="Super Admins" value={stats.super_admins} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-sand bg-white p-5">
          <h3 className="font-serif text-lg font-bold tracking-tight text-forest">Locked out</h3>
          <p className="mt-1 text-xs text-stone-500">
            Accounts locked by repeated failed sign-ins. Locks expire on their own — release one
            early only after verifying the person.
          </p>
          {lockedAccounts.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-sand-dark bg-cream/40 p-4 text-center text-sm text-stone-600">
              No accounts are currently locked.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-sand/70">
              {lockedAccounts.map((account) => (
                <li key={account.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{account.name}</p>
                    <p className="truncate text-xs text-stone-500">
                      {account.email} · until {formatDateTime(account.locked_until)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === account.id}
                    onClick={() => handleUnlock(account)}
                    className="rounded-full border border-sand px-3.5 py-1.5 text-xs font-semibold text-forest transition hover:border-gold hover:text-gold-dark disabled:opacity-50"
                  >
                    {busyId === account.id ? 'Unlocking…' : 'Unlock'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-sand bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-serif text-lg font-bold tracking-tight text-forest">Your devices</h3>
              <p className="mt-1 text-xs text-stone-500">
                Every session signed in as you. Revoke the rest if anything looks unfamiliar.
              </p>
            </div>
            {sessions.length > 1 && (
              <button
                type="button"
                onClick={handleRevokeSessions}
                className="shrink-0 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
              >
                Sign out others
              </button>
            )}
          </div>
          <ul className="mt-4 divide-y divide-sand/70">
            {sessions.map((session) => (
              <li key={session.id} className="py-2.5">
                <p className="text-sm font-medium text-slate-800">
                  {session.ipAddress || 'Unknown IP'}
                  {session.isCurrent && (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      This device
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-stone-500">{session.userAgent || 'Unknown device'}</p>
                <p className="text-[11px] text-stone-400">Last active {formatDateTime(session.lastActivity)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-sand bg-white p-5">
        <h3 className="font-serif text-lg font-bold tracking-tight text-forest">Recent security events</h3>
        {recentEvents.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-sand-dark bg-cream/40 p-4 text-center text-sm text-stone-600">
            Nothing recorded yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-sand/70">
            {recentEvents.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <code className="rounded bg-cream px-1.5 py-0.5 text-xs font-semibold text-forest">{event.action}</code>
                <span className="text-slate-700">
                  {event.actor || 'System'}
                  {event.target && ` → ${event.target}`}
                </span>
                <span className="ml-auto text-[11px] text-stone-400">{formatDateTime(event.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-2xl border border-sand bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500">{label}</p>
      <p className={`mt-1.5 font-serif text-3xl font-bold tracking-tight ${tone || 'text-forest'}`}>{value}</p>
    </div>
  );
}

function formatDateTime(value) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
