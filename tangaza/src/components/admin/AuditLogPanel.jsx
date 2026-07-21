import { useEffect, useState } from 'react';
import { fetchAuditLogs } from '../../api';

/**
 * The immutable audit trail, rendered as a timeline. Entries can only ever be
 * read — there is no edit or delete path anywhere in the stack.
 */
export default function AuditLogPanel() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  // Debounce the search box so typing doesn't hammer the API.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    fetchAuditLogs({ search: debouncedSearch, action, page, per_page: 20 })
      .then((result) => {
        setLogs(result.items);
        setMeta(result.meta);
        if (result.actions.length) setActions(result.actions);
      })
      .catch((loadError) =>
        setError(loadError.status === 403 ? 'You do not have permission to view audit logs.' : loadError.message),
      )
      .finally(() => setLoading(false));
  }, [debouncedSearch, action, page]);

  if (error) {
    return <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sand bg-white p-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search actor, target or action…"
          className="min-w-[16rem] flex-1 rounded-xl border border-sand px-3 py-2 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
        <select
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-sand px-3 py-2 text-sm outline-none focus:border-gold"
        >
          <option value="">All actions</option>
          {actions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        {meta && (
          <span className="text-xs text-stone-500">
            {meta.total} {meta.total === 1 ? 'entry' : 'entries'}
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-sand bg-white p-5">
        {loading ? (
          <p className="text-sm text-stone-600">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-sand-dark bg-cream/40 p-6 text-center text-sm text-stone-600">
            No audit entries match this filter.
          </p>
        ) : (
          <ol className="relative space-y-4 border-l border-sand pl-5">
            {logs.map((log) => (
              <li key={log.id} className="relative">
                <span
                  className={`absolute -left-[1.55rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white ${dotFor(log.action)}`}
                />
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <code className="rounded bg-cream px-1.5 py-0.5 text-xs font-semibold text-forest">{log.action}</code>
                  <span className="text-sm text-slate-800">
                    {log.actor ? log.actor.name : 'System'}
                    {log.target?.label && (
                      <>
                        {' → '}
                        <span className="font-semibold">{log.target.label}</span>
                      </>
                    )}
                  </span>
                  <span className="ml-auto text-[11px] text-stone-400">
                    {formatDateTime(log.createdAt)}
                    {log.ipAddress && ` · ${log.ipAddress}`}
                  </span>
                </div>
                {log.changes && (
                  <ul className="mt-1.5 space-y-0.5">
                    {Object.entries(log.changes).map(([field, change]) => (
                      <li key={field} className="text-xs text-stone-500">
                        <span className="font-medium text-stone-600">{field}</span>{' '}
                        <span className="text-red-600">{renderValue(change.from)}</span>
                        {' → '}
                        <span className="text-emerald-700">{renderValue(change.to)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}

        {meta && meta.last_page > 1 && (
          <div className="mt-5 flex items-center justify-between border-t border-sand pt-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-full border border-sand px-4 py-1.5 text-sm font-semibold text-stone-600 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-stone-500">
              Page {meta.current_page} of {meta.last_page}
            </span>
            <button
              type="button"
              disabled={page >= meta.last_page}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-full border border-sand px-4 py-1.5 text-sm font-semibold text-stone-600 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function dotFor(action) {
  if (action.startsWith('auth.') || action.includes('locked')) return 'bg-red-500';
  if (action.startsWith('admin.')) return 'bg-gold';
  if (action.includes('suspended')) return 'bg-amber-500';
  return 'bg-forest';
}

function renderValue(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'none';
  return String(value);
}

function formatDateTime(value) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
