import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import BillboardImage from '../components/BillboardImage';
import PaymentModal from '../components/payments/PaymentModal';
import { createBooking, fetchBillboard } from '../api';
import { useAuth } from '../context/AuthContext';
import { billboardTypeLabel } from '../data/billboardTypes';
import {
  MIN_CAMPAIGN_DAYS,
  conflictingRanges,
  daysBetween,
  formatKES,
  isAvailable,
  todayISO,
} from '../utils/availability';

export default function BillboardDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [billboard, setBillboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchBillboard(id)
      .then(setBillboard)
      .catch(() => setBillboard(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 pb-8 pt-28 text-slate-600">Loading…</div>;
  }

  if (!billboard) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-8 pt-28">
        <p className="text-stone-700">Billboard not found.</p>
        <Link to="/map" className="mt-2 inline-block text-gold-dark hover:underline">
          Back to map
        </Link>
      </div>
    );
  }

  // Earliest bookable date: the later of today and the owner's available-from.
  const bookFrom =
    billboard.availableFrom && billboard.availableFrom > todayISO()
      ? billboard.availableFrom
      : todayISO();

  const hasDateRange = Boolean(startDate && endDate);
  const dateRangeValid = hasDateRange && startDate <= endDate;
  const days = dateRangeValid ? daysBetween(startDate, endDate) : null;
  const meetsMinimum = days === null || days >= MIN_CAMPAIGN_DAYS;
  const available = dateRangeValid && meetsMinimum && isAvailable(billboard.bookedRanges, startDate, endDate);
  const conflicts = dateRangeValid ? conflictingRanges(billboard.bookedRanges, startDate, endDate) : [];
  const total = available && days ? days * billboard.pricePerDay : null;

  async function handleConfirmBooking() {
    setBooking(true);
    setBookingError('');
    try {
      // Booking is created `pending`; we hand the customer straight to checkout.
      const { payment: checkout } = await createBooking({
        billboard_id: billboard.id,
        start_date: startDate,
        end_date: endDate,
      });
      setPayment(checkout);
    } catch (error) {
      setBookingError(error.message);
    } finally {
      setBooking(false);
    }
  }

  async function handlePaymentSuccess() {
    setPayment(null);
    setBookingSuccess(true);
    setBillboard(await fetchBillboard(id));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-28">
      <Link to="/map" className="text-sm text-gold-dark hover:underline">
        ← Back to map
      </Link>

      <div className="relative mt-4 h-64 overflow-hidden rounded-3xl border border-sand shadow-sm">
        <BillboardImage
          id={billboard.id}
          title={billboard.title}
          className="h-full w-full object-cover"
        />
        <span className="absolute left-4 top-4 rounded-full bg-forest/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cream backdrop-blur">
          {billboardTypeLabel(billboard.type)}
        </span>
      </div>

      <h1 className="mt-6 font-serif text-3xl font-semibold text-forest">{billboard.title}</h1>
      <p className="text-stone-500">{billboard.location}</p>

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="text-sm text-slate-500">Type</dt>
          <dd className="font-medium text-slate-900">{billboardTypeLabel(billboard.type)}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Size</dt>
          <dd className="font-medium text-slate-900">{billboard.size}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Daily rate</dt>
          <dd className="font-medium text-slate-900">{formatKES(billboard.pricePerDay)}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Weekly rate</dt>
          <dd className="font-medium text-slate-900">{formatKES(billboard.pricePerWeek)}</dd>
        </div>
      </dl>

      <p className="mt-4 text-slate-700">{billboard.description}</p>

      <div className="mt-8 rounded-3xl border border-sand bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Check availability &amp; price</h2>

        {bookingSuccess && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-semibold text-emerald-800">Payment received — booking confirmed! 🎉</p>
            <p className="mt-1 text-sm text-emerald-700">
              Your campaign is booked.{' '}
              <Link to="/dashboard" className="font-semibold underline">
                View it in your dashboard
              </Link>
              .
            </p>
          </div>
        )}

        {bookFrom > todayISO() && (
          <p className="mt-3 rounded-xl bg-cream px-3 py-2 text-sm text-stone-600">
            Available from {formatDisplayDate(bookFrom)} — earlier dates are unavailable.
          </p>
        )}

        <div className="mt-4">
          <AvailabilityCalendar
            bookedRanges={billboard.bookedRanges}
            minDate={bookFrom}
            value={{ start: startDate, end: endDate }}
            onChange={({ start, end }) => {
              setStartDate(start);
              setEndDate(end);
              setBookingSuccess(false);
            }}
          />
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Pick a start date, then an end date. Crossed-out days are already booked. Min.{' '}
          {MIN_CAMPAIGN_DAYS} days booking.
        </p>

        {hasDateRange && !dateRangeValid && (
          <p className="mt-4 text-sm text-amber-600">End date must be on or after the start date.</p>
        )}

        {dateRangeValid && !meetsMinimum && (
          <p className="mt-4 text-sm text-amber-600">
            Selected range is {days} day{days === 1 ? '' : 's'} — campaigns need at least{' '}
            {MIN_CAMPAIGN_DAYS} days.
          </p>
        )}

        {!bookingSuccess && dateRangeValid && meetsMinimum && (
          <div className="mt-4">
            {available ? (
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="font-medium text-emerald-700">Available for {days} days</p>
                <p className="mt-1 text-lg font-semibold text-emerald-900">{formatKES(total)} total</p>

                {user?.role === 'customer' ? (
                  <button
                    type="button"
                    onClick={handleConfirmBooking}
                    disabled={booking}
                    className="mt-3 rounded-full bg-gold px-5 py-2 text-sm font-bold text-forest transition hover:bg-gold-soft disabled:opacity-60"
                  >
                    {booking ? 'Starting checkout…' : 'Book & Pay'}
                  </button>
                ) : user ? (
                  <p className="mt-3 text-sm text-slate-600">Only customer accounts can book billboards.</p>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">
                    <Link to="/login" className="font-semibold text-gold-dark underline">
                      Sign in
                    </Link>{' '}
                    as a customer to book this billboard.
                  </p>
                )}

                {bookingError && <p className="mt-3 text-sm font-medium text-red-600">{bookingError}</p>}
              </div>
            ) : (
              <div className="rounded-2xl bg-red-50 p-4">
                <p className="font-medium text-red-700">Not available for the selected dates.</p>
                <ul className="mt-2 list-inside list-disc text-sm text-red-600">
                  {conflicts.map((range) => (
                    <li key={`${range.start}-${range.end}`}>
                      Already booked {range.start} to {range.end}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {payment && (
        <PaymentModal
          payment={payment}
          onSuccess={handlePaymentSuccess}
          onClose={() => setPayment(null)}
        />
      )}
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
