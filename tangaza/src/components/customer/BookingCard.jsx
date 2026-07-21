import { Link } from 'react-router-dom';
import BillboardImage from '../BillboardImage';
import PaymentStatusBadge from '../PaymentStatusBadge';
import { stageLabel } from '../progress/stages';
import { billboardTypeLabel } from '../../data/billboardTypes';
import { formatKES } from '../../utils/availability';
import { Row, StatusBadge, formatDate } from './ui';

/**
 * One campaign, as a card. Shared by the Overview (most recent few) and the
 * Campaigns section (all of them) so the two never drift apart.
 */
export default function BookingCard({ booking, cancelling, paying, onCancel, onPay }) {
  const { billboard } = booking;
  const cancellable = booking.status !== 'cancelled';
  const payable = booking.status === 'pending';
  const trackable = booking.status !== 'cancelled';
  const actionNeeded = booking.pendingApprovals > 0;
  const manager = booking.accountManager;

  return (
    <div className="group overflow-hidden rounded-3xl border border-sand bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-44 overflow-hidden">
        <BillboardImage
          id={billboard.id}
          title={billboard.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3">
          <StatusBadge status={booking.status} />
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-semibold text-forest">{billboard.title}</h3>
        <p className="text-sm text-stone-500">{billboard.location}</p>

        <div className="mt-3">
          <PaymentStatusBadge bookingStatus={booking.status} paymentStatus={booking.payment?.status} />
        </div>

        <dl className="mt-4 space-y-1.5 text-sm">
          <Row label="Type" value={billboardTypeLabel(billboard.type)} />
          <Row label="Dates" value={`${formatDate(booking.startDate)} – ${formatDate(booking.endDate)}`} />
          <Row
            label="Total"
            value={<span className="font-semibold text-gold-dark">{formatKES(booking.totalPrice)}</span>}
          />
        </dl>

        {/* The named contact at the billboard company — the single thing
            customers most often ask for after paying. */}
        {manager && cancellable && (
          <div className="mt-4 rounded-2xl border border-sand bg-cream px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold-dark">
              Your campaign manager
            </p>
            <p className="mt-1 text-sm font-semibold text-forest">{manager.name}</p>
            <a href={`mailto:${manager.email}`} className="block truncate text-xs text-stone-500 hover:underline">
              {manager.email}
            </a>
            {manager.phone && (
              <a href={`tel:${manager.phone}`} className="text-xs text-stone-500 hover:underline">
                {manager.phone}
              </a>
            )}
          </div>
        )}

        <div className="mt-5 space-y-2">
          {trackable && (
            <Link
              to={`/dashboard/bookings/${booking.id}/progress`}
              className={`relative block w-full rounded-full px-4 py-2.5 text-center text-sm font-bold transition ${
                actionNeeded
                  ? 'bg-forest text-cream hover:bg-forest-soft'
                  : 'border border-forest/20 bg-forest/5 text-forest hover:border-forest/40 hover:bg-forest/10'
              }`}
            >
              Track progress
              {booking.latestUpdate && !actionNeeded && (
                <span className="ml-2 text-xs font-medium opacity-70">
                  · {stageLabel(booking.latestUpdate.stage)}
                </span>
              )}
              {actionNeeded && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-forest" />
                  Action needed
                </span>
              )}
            </Link>
          )}
          {payable && (
            <button
              type="button"
              onClick={onPay}
              disabled={paying}
              className="w-full rounded-full bg-gold px-4 py-2.5 text-sm font-bold text-white transition hover:bg-gold-soft disabled:opacity-60"
            >
              {paying ? 'Opening checkout…' : 'Complete payment'}
            </button>
          )}
          {cancellable && (
            <button
              type="button"
              onClick={onCancel}
              disabled={cancelling}
              className="w-full rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
            >
              {cancelling ? 'Cancelling…' : 'Cancel booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
