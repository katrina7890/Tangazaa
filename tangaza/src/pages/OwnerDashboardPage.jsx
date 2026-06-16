import { useEffect, useState } from 'react';
import { deleteBillboard, fetchBillboardBookings, fetchMyBillboards } from '../api';
import BillboardForm from '../components/owner/BillboardForm';
import BookingsModal from '../components/owner/BookingsModal';
import { billboardTypeLabel } from '../data/billboardTypes';
import { formatKES } from '../utils/availability';

export default function OwnerDashboardPage() {
  const [billboards, setBillboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | billboard object
  const [viewingBookingsFor, setViewingBookingsFor] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  function reload() {
    setLoading(true);
    fetchMyBillboards()
      .then(setBillboards)
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  async function handleDelete(id) {
    if (!window.confirm('Delete this billboard? This cannot be undone.')) return;
    await deleteBillboard(id);
    reload();
  }

  async function handleViewBookings(billboard) {
    setViewingBookingsFor(billboard);
    setBookingsLoading(true);
    try {
      setBookings(await fetchBillboardBookings(billboard.id));
    } finally {
      setBookingsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-28">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-slate-900">My Billboards</h1>
        {editing === null && (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="rounded-full bg-violet-600 px-5 py-2 text-sm font-bold text-white hover:bg-violet-700"
          >
            + Add Billboard
          </button>
        )}
      </div>

      {editing !== null && (
        <BillboardForm
          billboard={editing === 'new' ? null : editing}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading ? (
        <p className="mt-6 text-slate-600">Loading…</p>
      ) : billboards.length === 0 ? (
        <p className="mt-6 text-slate-600">You haven&apos;t listed any billboards yet.</p>
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
              <div className="mt-3 flex gap-4 text-sm">
                <button
                  type="button"
                  onClick={() => handleViewBookings(billboard)}
                  className="font-semibold text-violet-700 hover:underline"
                >
                  Bookings
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(billboard)}
                  className="font-semibold text-slate-700 hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(billboard.id)}
                  className="font-semibold text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingBookingsFor && (
        <BookingsModal
          billboard={viewingBookingsFor}
          bookings={bookings}
          loading={bookingsLoading}
          onClose={() => setViewingBookingsFor(null)}
        />
      )}
    </div>
  );
}
