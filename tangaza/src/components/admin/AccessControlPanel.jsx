import { useEffect, useState } from 'react';
import {
  createAdminAccount,
  fetchAdminAccounts,
  fetchAdminPermissionCatalogue,
  updateAdminPermissions,
  updateAdminSuperStatus,
} from '../../api';
import { useAuth } from '../../context/AuthContext';

const EMPTY_FORM = { name: '', email: '', password: '', permissions: [] };

/**
 * Administrator roster and the permission matrix (RBAC).
 *
 * The server is the authority: it refuses any change from a non-Super-Admin
 * regardless of what this UI renders. Controls are hidden here purely to keep
 * the screen honest about what the viewer can actually do.
 */
export default function AccessControlPanel() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const isSuperAdmin = admins.find((admin) => admin.id === user?.id)?.isSuperAdmin ?? false;

  useEffect(() => {
    Promise.all([fetchAdminAccounts(), fetchAdminPermissionCatalogue()])
      .then(([accounts, permissions]) => {
        setAdmins(accounts);
        setCatalogue(permissions);
      })
      .catch((loadError) =>
        setError(loadError.status === 403 ? 'You do not have permission to manage administrators.' : loadError.message),
      )
      .finally(() => setLoading(false));
  }, []);

  const groups = [...new Set(catalogue.map((permission) => permission.group))];

  async function togglePermission(admin, value) {
    const next = admin.permissions.includes(value)
      ? admin.permissions.filter((permission) => permission !== value)
      : [...admin.permissions, value];

    setSavingId(admin.id);
    setError('');
    try {
      const updated = await updateAdminPermissions(admin.id, next);
      setAdmins((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingId(null);
    }
  }

  async function toggleSuper(admin) {
    const action = admin.isSuperAdmin ? 'Remove Super Admin from' : 'Grant full Super Admin powers to';
    if (!window.confirm(`${action} ${admin.name}?`)) return;

    setSavingId(admin.id);
    setError('');
    try {
      const updated = await updateAdminSuperStatus(admin.id, !admin.isSuperAdmin);
      setAdmins((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await createAdminAccount(form);
      setAdmins((current) => [...current, created]);
      setForm(EMPTY_FORM);
      setCreating(false);
    } catch (createError) {
      setError(
        createError.errors ? Object.values(createError.errors).flat().join(' ') : createError.message,
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-stone-600">Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-sand bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-bold tracking-tight text-forest">Administrators</h2>
            <p className="mt-1 text-sm text-stone-600">
              Super Admins hold every permission. Everyone else holds exactly what is ticked below —
              enforced on the server for every request, and each change is written to the audit trail.
            </p>
          </div>
          {isSuperAdmin && !creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-white transition hover:bg-gold-soft"
            >
              + Add administrator
            </button>
          )}
        </div>

        {!isSuperAdmin && (
          <p className="mt-3 rounded-xl bg-cream px-3 py-2 text-xs text-stone-600">
            You can view this roster but only a Super Admin can change access.
          </p>
        )}

        {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

        {creating && (
          <form onSubmit={handleCreate} className="mt-4 grid gap-3 rounded-2xl border border-sand bg-cream/40 p-4 sm:grid-cols-3">
            <input
              required
              placeholder="Full name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className={inputClass}
            />
            <input
              required
              type="email"
              placeholder="Work email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className={inputClass}
            />
            <input
              required
              type="password"
              placeholder="Password (min 12 chars)"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className={inputClass}
            />
            <p className="text-xs text-stone-500 sm:col-span-3">
              Passwords must be at least 12 characters with letters, numbers and symbols, and are
              rejected if they appear in a known breach corpus. Grant permissions after creating.
            </p>
            <div className="flex gap-3 sm:col-span-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-forest px-5 py-2 text-sm font-semibold text-cream transition hover:bg-forest-soft disabled:opacity-50"
              >
                {saving ? 'Creating…' : 'Create administrator'}
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-full border border-sand px-5 py-2 text-sm font-semibold text-stone-600"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Permission matrix */}
      <div className="overflow-x-auto rounded-2xl border border-sand bg-white">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead>
            <tr className="border-b border-sand bg-cream/50">
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500">
                Administrator
              </th>
              {groups.map((group) => (
                <th key={group} className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500">
                  {group}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} className="border-b border-sand/60 last:border-0 align-top">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{admin.name}</p>
                  <p className="text-xs text-stone-500">{admin.email}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {admin.isSuperAdmin && (
                      <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold-dark">
                        Super Admin
                      </span>
                    )}
                    {admin.isSuspended && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                        Suspended
                      </span>
                    )}
                    {admin.isLocked && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        Locked
                      </span>
                    )}
                    {admin.id === user?.id && <span className="text-[10px] text-stone-400">(you)</span>}
                  </div>
                  {isSuperAdmin && admin.id !== user?.id && (
                    <button
                      type="button"
                      disabled={savingId === admin.id}
                      onClick={() => toggleSuper(admin)}
                      className="mt-2 text-xs font-semibold text-gold-dark hover:underline disabled:opacity-50"
                    >
                      {admin.isSuperAdmin ? 'Revoke Super Admin' : 'Make Super Admin'}
                    </button>
                  )}
                </td>

                {groups.map((group) => (
                  <td key={group} className="px-4 py-3">
                    <div className="space-y-1.5">
                      {catalogue
                        .filter((permission) => permission.group === group)
                        .map((permission) => {
                          const held = admin.permissions.includes(permission.value);
                          const editable = isSuperAdmin && !admin.isSuperAdmin && admin.id !== user?.id;
                          return (
                            <label
                              key={permission.value}
                              title={permission.label}
                              className={`flex items-start gap-1.5 text-xs ${
                                editable ? 'cursor-pointer text-stone-700' : 'text-stone-400'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={held}
                                disabled={!editable || savingId === admin.id}
                                onChange={() => togglePermission(admin, permission.value)}
                                className="mt-0.5"
                              />
                              <span>
                                {permission.value.split('.')[1]}
                                {permission.high_risk && <span className="ml-1 text-red-500" title="High-risk">•</span>}
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-stone-500">
        <span className="text-red-500">•</span> High-risk capability — grant sparingly.
      </p>
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30';
