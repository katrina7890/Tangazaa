import { formatKES } from '../../utils/availability';

export default function BookingsModal({ billboard, bookings, loading, onClose }) {
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h2 className="font-display text-lg text-slate-900">Bookings — {billboard.title}</h2>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-800">
            ✕
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-600">Loading…</p>
        ) : bookings.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No bookings yet for this billboard.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {bookings.map((booking) => (
              <li key={booking.id} className="rounded-2xl border border-sand p-3">
                <p className="font-medium text-slate-900">
                  {booking.customer?.company_name || booking.customer?.name}
                </p>
                <p className="text-sm text-slate-600">
                  {booking.start_date} → {booking.end_date}
                </p>
                <p className="mt-1 text-sm font-medium text-violet-700">{formatKES(booking.total_price)}</p>
                <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">
                  {booking.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
