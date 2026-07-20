import { useEffect, useState } from 'react';
import {
  createPartnerWorkOrder,
  fetchMyBillboards,
  fetchPartnerWorkOrders,
  updatePartnerWorkOrder,
} from '../../api';
import {
  Badge,
  Chip,
  EmptyState,
  JOB_STATUSES,
  JOB_TYPES,
  SectionCard,
  formatDisplayDate,
  ghostButtonClass,
  goldButtonClass,
  inputClass,
  labelClass,
  statusMeta,
} from '../../components/partner/ui';

const EMPTY_FORM = { billboard_id: '', type: 'printing', assignee_name: '', scheduled_for: '', notes: '' };

// The next sensible step in the field workflow, one tap per transition —
// designed for an installer on a phone at the site.
const NEXT_STEP = {
  pending: { status: 'scheduled', label: 'Mark scheduled' },
  scheduled: { status: 'in_progress', label: 'Start job' },
  in_progress: { status: 'completed', label: 'Mark completed' },
};

/** Printing & installation workflows — the mobile-first installer view. */
export default function PartnerJobsPage() {
  const [orders, setOrders] = useState([]);
  const [billboards, setBillboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyBillboards().then(setBillboards).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (typeFilter) params.type = typeFilter;
    fetchPartnerWorkOrders(params)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [statusFilter, typeFilter]);

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await createPartnerWorkOrder({
        billboard_id: Number(form.billboard_id),
        type: form.type,
        assignee_name: form.assignee_name || null,
        scheduled_for: form.scheduled_for || null,
        notes: form.notes || null,
      });
      setOrders((prev) => [created, ...prev]);
      setCreating(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.errors ? Object.values(err.errors).flat().join(' ') : err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(order, status) {
    const updated = await updatePartnerWorkOrder(order.id, { status });
    setOrders((prev) =>
      statusFilter && updated.status !== statusFilter
        ? prev.filter((item) => item.id !== order.id)
        : prev.map((item) => (item.id === order.id ? updated : item))
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Chip active={statusFilter === ''} onClick={() => setStatusFilter('')}>
              All statuses
            </Chip>
            {JOB_STATUSES.map(({ value, label }) => (
              <Chip key={value} active={statusFilter === value} onClick={() => setStatusFilter(value)}>
                {label}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip active={typeFilter === ''} onClick={() => setTypeFilter('')}>
              All types
            </Chip>
            {JOB_TYPES.map(({ value, label }) => (
              <Chip key={value} active={typeFilter === value} onClick={() => setTypeFilter(value)}>
                {label}
              </Chip>
            ))}
          </div>
        </div>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={goldButtonClass}>
            + New job
          </button>
        )}
      </div>

      {creating && (
        <SectionCard title="New job">
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="job-board">Billboard *</label>
              <select
                id="job-board"
                required
                value={form.billboard_id}
                onChange={(event) => setForm({ ...form, billboard_id: event.target.value })}
                className={inputClass}
              >
                <option value="">Choose a billboard…</option>
                {billboards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.title} — {board.location}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="job-type">Job type *</label>
              <select
                id="job-type"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
                className={inputClass}
              >
                {JOB_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="job-assignee">Assigned to</label>
              <input
                id="job-assignee"
                value={form.assignee_name}
                onChange={(event) => setForm({ ...form, assignee_name: event.target.value })}
                className={inputClass}
                placeholder="Installer / print shop"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="job-date">Scheduled for</label>
              <input
                id="job-date"
                type="date"
                value={form.scheduled_for}
                onChange={(event) => setForm({ ...form, scheduled_for: event.target.value })}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="job-notes">Notes</label>
              <textarea
                id="job-notes"
                rows={2}
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                className={inputClass}
                placeholder="Access instructions, material specs…"
              />
            </div>
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={saving} className={goldButtonClass}>
                {saving ? 'Saving…' : 'Create job'}
              </button>
              <button type="button" onClick={() => setCreating(false)} className={ghostButtonClass}>
                Cancel
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {loading ? (
        <p className="text-stone-600">Loading…</p>
      ) : orders.length === 0 ? (
        <EmptyState>No jobs match — printing and installation work lands here.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {orders.map((order) => {
            const meta = statusMeta(JOB_STATUSES, order.status);
            const typeLabel = statusMeta(JOB_TYPES, order.type).label;
            const next = NEXT_STEP[order.status];
            return (
              <div
                key={order.id}
                className="rounded-2xl border border-sand border-t-4 border-t-gold bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-gold-dark">{typeLabel}</p>
                    <h3 className="truncate font-semibold text-slate-900">{order.billboard?.title}</h3>
                    <p className="truncate text-sm text-slate-500">{order.billboard?.location}</p>
                  </div>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
                <div className="mt-2 space-y-0.5 text-sm text-slate-600">
                  {order.assigneeName && <p>👷 {order.assigneeName}</p>}
                  {order.scheduledFor && <p className="text-xs text-stone-500">Scheduled {formatDisplayDate(order.scheduledFor)}</p>}
                  {order.completedAt && <p className="text-xs text-emerald-600">Done {formatDisplayDate(order.completedAt)}</p>}
                  {order.notes && <p className="mt-1 line-clamp-2 text-xs text-stone-500">{order.notes}</p>}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {next && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(order, next.status)}
                      className="rounded-full bg-forest px-4 py-2 text-xs font-semibold text-cream transition hover:bg-forest-soft"
                    >
                      {next.label}
                    </button>
                  )}
                  {order.status !== 'cancelled' && order.status !== 'completed' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(order, 'cancelled')}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Cancel job
                    </button>
                  )}
                  {(order.status === 'completed' || order.status === 'cancelled') && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(order, 'pending')}
                      className="text-xs font-semibold text-stone-500 hover:underline"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
