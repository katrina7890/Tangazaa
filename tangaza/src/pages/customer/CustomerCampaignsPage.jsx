import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BookingCard from '../../components/customer/BookingCard';
import { useCustomerData } from '../../components/customer/CustomerLayout';
import { EmptyState, ErrorNotice } from '../../components/customer/ui';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'confirmed', label: 'Running' },
  { value: 'pending', label: 'Awaiting payment' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function CustomerCampaignsPage() {
  const { bookings, loading, error, payBooking, cancelBooking, payingId, cancellingId } =
    useCustomerData();
  const [filter, setFilter] = useState('all');

  const counts = useMemo(
    () =>
      bookings.reduce(
        (totals, booking) => ({ ...totals, [booking.status]: (totals[booking.status] || 0) + 1 }),
        { all: bookings.length },
      ),
    [bookings],
  );

  const visible = useMemo(
    () => (filter === 'all' ? bookings : bookings.filter((booking) => booking.status === filter)),
    [bookings, filter],
  );

  return (
    <div className="space-y-6">
      <ErrorNotice>{error}</ErrorNotice>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === value
                ? 'bg-forest text-cream'
                : 'border border-sand bg-white text-stone-600 hover:border-gold/50'
            }`}
          >
            {label}
            <span className="ml-1.5 opacity-60">{counts[value] ?? 0}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-stone-600">Loading your campaigns…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title={filter === 'all' ? 'No campaigns yet' : 'Nothing here'}
          action={
            filter === 'all' ? (
              <Link
                to="/map"
                className="inline-block rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gold-soft"
              >
                Find a billboard
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="rounded-full border border-sand px-6 py-2.5 text-sm font-semibold text-forest transition hover:border-gold/50"
              >
                Show all campaigns
              </button>
            )
          }
        >
          {filter === 'all'
            ? 'Browse the network and book your first billboard.'
            : 'No campaigns match this filter right now.'}
        </EmptyState>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              cancelling={cancellingId === booking.id}
              paying={payingId === booking.id}
              onCancel={() => cancelBooking(booking)}
              onPay={() => payBooking(booking)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
