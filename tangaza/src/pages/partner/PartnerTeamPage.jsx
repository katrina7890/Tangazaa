import { useEffect, useState } from 'react';
import { createPartnerStaff, deletePartnerStaff, fetchPartnerTeam } from '../../api';
import {
  Badge,
  EmptyState,
  SectionCard,
  formatDisplayDate,
  ghostButtonClass,
  goldButtonClass,
  inputClass,
  labelClass,
} from '../../components/partner/ui';

const EMPTY_FORM = { name: '', email: '', password: '' };

/**
 * Owner-only: create and remove staff logins. Employees get the Partner
 * workspace with their own credentials, so the owner's account — and the
 * owner dashboard, revenue figures, and billing details — are never shared.
 */
export default function PartnerTeamPage() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPartnerTeam()
      .then(setTeam)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await createPartnerStaff(form);
      setTeam((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setCreating(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.errors ? Object.values(err.errors).flat().join(' ') : err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(member) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Remove ${member.name}'s account? They will no longer be able to sign in.`)) return;
    await deletePartnerStaff(member.id);
    setTeam((prev) => prev.filter((item) => item.id !== member.id));
  }

  return (
    <div className="space-y-6">
      <SectionCard>
        <p className="text-sm leading-relaxed text-stone-600">
          Give each employee their <span className="font-semibold text-forest">own login</span> for Tangazaa
          Partner. Staff see this workspace — availability, clients, artwork, jobs, and sync — but never your
          owner dashboard, your revenue figures, or your account.
        </p>
      </SectionCard>

      <div className="flex justify-end">
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={goldButtonClass}>
            + Add staff account
          </button>
        )}
      </div>

      {creating && (
        <SectionCard title="New staff account">
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="team-name">Name *</label>
              <input
                id="team-name"
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="team-email">Work email *</label>
              <input
                id="team-email"
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="team-password">Password * (share it with them privately)</label>
              <input
                id="team-password"
                type="text"
                required
                minLength={8}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                className={inputClass}
                placeholder="At least 8 characters"
              />
            </div>
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={saving} className={goldButtonClass}>
                {saving ? 'Creating…' : 'Create account'}
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
      ) : team.length === 0 ? (
        <EmptyState>No staff accounts yet — add your installers, designers, and sales team.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {team.map((member) => (
            <div
              key={member.id}
              className="rounded-2xl border border-sand border-t-4 border-t-gold bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-900">{member.name}</h3>
                  <p className="truncate text-sm text-slate-500">{member.email}</p>
                </div>
                {member.isSuspended ? <Badge tone="red">Suspended</Badge> : <Badge tone="emerald">Active</Badge>}
              </div>
              <p className="mt-1.5 text-xs text-stone-500">Added {formatDisplayDate(member.createdAt)}</p>
              <div className="mt-3 text-sm">
                <button
                  type="button"
                  onClick={() => handleDelete(member)}
                  className="font-semibold text-red-600 hover:underline"
                >
                  Remove account
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
