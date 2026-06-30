import AvailabilityCalendar from '../AvailabilityCalendar';
import PaymentStatusBadge from '../PaymentStatusBadge';
import { formatKES, todayISO } from '../../utils/availability';

export default function BookingsModal({ billboard, bookings, loading, onClose }) {
  const bookFrom =
    billboard.availableFrom && billboard.availableFrom > todayISO()
      ? billboard.availableFrom
      : todayISO();

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h2 className="font-display text-lg text-slate-900">Availability — {billboard.title}</h2>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-800">
            ✕
          </button>
        </div>

        <div className="mt-4">
          <AvailabilityCalendar
            mode="view"
            bookedRanges={billboard.bookedRanges || []}
            minDate={bookFrom}
            nextAvailable={billboard.nextAvailableFrom}
          />
          {billboard.nextAvailableFrom && (
            <p className="mt-2 text-sm text-stone-600">
              Next available from{' '}
              <span className="font-semibold text-forest">
                {formatDisplayDate(billboard.nextAvailableFrom)}
              </span>
              .
            </p>
          )}
        </div>

        <h3 className="mt-6 font-serif text-base font-semibold text-forest">Bookings</h3>

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
                <p className="mt-1 text-sm font-medium text-gold-dark">{formatKES(booking.total_price)}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">
                    {booking.status}
                  </span>
                  <PaymentStatusBadge bookingStatus={booking.status} paymentStatus={booking.payment?.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatDisplayDate(dateISO) {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
