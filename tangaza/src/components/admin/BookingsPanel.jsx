import { useEffect, useState } from 'react';
import { cancelAdminBooking, fetchAdminBookings } from '../../api';
import { formatKES } from '../../utils/availability';

export default function BookingsPanel() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  function reload() {
    setLoading(true);
    fetchAdminBookings({ search })
      .then(setBookings)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timeout = setTimeout(reload, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleCancel(booking) {
    if (!window.confirm('Cancel this booking?')) return;
    setBusyId(booking.id);
    try {
      const updated = await cancelAdminBooking(booking.id);
      setBookings((current) => current.map((b) => (b.id === updated.id ? updated : b)));
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
        placeholder="Search by billboard or customer…"
        className="w-full max-w-md rounded-full border border-sand bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
      />

      {loading ? (
        <p className="mt-6 text-slate-600">Loading…</p>
      ) : bookings.length === 0 ? (
        <p className="mt-6 text-slate-600">No bookings found.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-medium text-slate-900">{booking.billboard.title}</p>
                <p className="text-sm text-slate-500">
                  {booking.customer?.company_name || booking.customer?.name} · {booking.start_date} →{' '}
                  {booking.end_date}
                </p>
                <p className="mt-1 text-sm font-medium text-violet-700">{formatKES(booking.total_price)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    booking.status === 'cancelled'
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {booking.status}
                </span>
                {booking.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => handleCancel(booking)}
                    disabled={busyId === booking.id}
                    className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                  >
                    Cancel
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
