import { useEffect, useState } from 'react';
import { fetchAdminUsers, toggleUserSuspension } from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function UsersPanel() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [busyId, setBusyId] = useState(null);

  function reload() {
    setLoading(true);
    fetchAdminUsers({ search, role })
      .then(setUsers)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timeout = setTimeout(reload, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, role]);

  async function handleToggle(user) {
    setBusyId(user.id);
    try {
      const updated = await toggleUserSuspension(user.id);
      setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)));
    } catch (error) {
      window.alert(error.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, email or company…"
          className="flex-1 min-w-[200px] rounded-full border border-sand bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className="rounded-full border border-sand bg-white px-4 py-2 text-sm text-slate-900 focus:border-violet-500 focus:outline-none"
        >
          <option value="">All roles</option>
          <option value="customer">Customers</option>
          <option value="owner">Owners</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {loading ? (
        <p className="mt-6 text-slate-600">Loading…</p>
      ) : users.length === 0 ? (
        <p className="mt-6 text-slate-600">No users found.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-medium text-slate-900">{user.companyName || user.name}</p>
                <p className="text-sm text-slate-500">
                  {user.name} · {user.email} · <span className="capitalize">{user.role}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                    user.isSuspended ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {user.isSuspended ? 'Suspended' : 'Active'}
                </span>
                {user.id !== currentUser?.id && (
                  <button
                    type="button"
                    onClick={() => handleToggle(user)}
                    disabled={busyId === user.id}
                    className="text-sm font-semibold text-violet-700 hover:underline disabled:opacity-50"
                  >
                    {user.isSuspended ? 'Reactivate' : 'Suspend'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
