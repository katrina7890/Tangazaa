import { useEffect, useState } from 'react';
import { fetchAdminBillboards, updateBillboard } from '../../api';
import { billboardTypeLabel } from '../../data/billboardTypes';
import { formatKES } from '../../utils/availability';

export default function BillboardsPanel() {
  const [billboards, setBillboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  function reload() {
    setLoading(true);
    fetchAdminBillboards({ search })
      .then(setBillboards)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timeout = setTimeout(reload, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleToggleActive(billboard) {
    setBusyId(billboard.id);
    try {
      const updated = await updateBillboard(billboard.id, {
        title: billboard.title,
        location: billboard.location,
        lat: billboard.lat,
        lng: billboard.lng,
        size: billboard.size,
        type: billboard.type,
        price_per_day: billboard.pricePerDay,
        price_per_week: billboard.pricePerWeek,
        description: billboard.description,
        is_active: !billboard.isActive,
      });
      setBillboards((current) =>
        current.map((b) => (b.id === updated.id ? { ...updated, owner: b.owner } : b))
      );
    } catch (error) {
      window.alert(error.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by title or location…"
        className="w-full max-w-md rounded-full border border-sand bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
      />

      {loading ? (
        <p className="mt-6 text-slate-600">Loading…</p>
      ) : billboards.length === 0 ? (
        <p className="mt-6 text-slate-600">No billboards found.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {billboards.map((billboard) => (
            <div key={billboard.id} className="rounded-2xl border border-sand bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900">{billboard.title}</h3>
                  <p className="text-sm text-slate-500">{billboard.location}</p>
                </div>
                <span
                  className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                    billboard.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {billboard.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {billboardTypeLabel(billboard.type)} · {billboard.size}
              </p>
              <p className="mt-1 font-medium text-violet-700">{formatKES(billboard.pricePerWeek)}/week</p>
              {billboard.owner && (
                <p className="mt-1 text-sm text-slate-500">
                  Owned by {billboard.owner.company_name || billboard.owner.name}
                </p>
              )}
              <button
                type="button"
                onClick={() => handleToggleActive(billboard)}
                disabled={busyId === billboard.id}
                className="mt-3 text-sm font-semibold text-violet-700 hover:underline disabled:opacity-50"
              >
                {billboard.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
