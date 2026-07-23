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

const PAYMENT_METHODS = [
  { value: 'mpesa', label: 'M-Pesa', dot: 'bg-mint-ink' },
  { value: 'card', label: 'Card', dot: 'bg-gold' },
];

/**
 * The listing + checkout page, built from the "Tangazaa Booking Checkout Page"
 * mockup in the claude.ai/design project.
 *
 * Two things in the mockup were deliberately not carried over:
 *   - Its 5% service fee. The backend charges exactly days x daily rate, so a
 *     fee here would put the checkout total at odds with the payment, the
 *     receipt PDF and the contract. The line now states there's no fee.
 *   - Its blanket "Verified" badge. There's no verification field, so every
 *     listing would show it; the owner's company name is the real per-listing
 *     fact behind the platform's trust claim.
 */
export default function BillboardDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [billboard, setBillboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [channel, setChannel] = useState('mpesa');
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
    return <div className="mx-auto max-w-6xl px-4 pb-8 pt-28 text-stone-600">Loading…</div>;
  }

  if (!billboard) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-28">
        <p className="text-stone-700">Billboard not found.</p>
        <Link to="/map" className="mt-2 inline-block font-semibold text-gold-dark hover:underline">
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
  const available =
    dateRangeValid && meetsMinimum && isAvailable(billboard.bookedRanges, startDate, endDate);
  const conflicts = dateRangeValid ? conflictingRanges(billboard.bookedRanges, startDate, endDate) : [];
  const subtotal = days ? days * billboard.pricePerDay : 0;
  const total = available && days ? subtotal : null;
  const company = billboard.owner?.company_name || billboard.owner?.name || null;

  async function handleConfirmBooking() {
    setBooking(true);
    setBookingError('');
    try {
      // Booking is created `pending`; we hand the customer straight to checkout.
      const { payment: checkout } = await createBooking({
        billboard_id: billboard.id,
        start_date: startDate,
        end_date: endDate,
        channel,
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
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-8">
      <Link to="/map" className="text-sm font-semibold text-gold-dark hover:underline">
        ← Back to map
      </Link>

      <div className="mt-5 grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* ── Listing ─────────────────────────────────────────── */}
        <div>
          <div className="relative h-64 overflow-hidden rounded-3xl shadow-xl sm:h-[360px]">
            <BillboardImage
              id={billboard.id}
              title={billboard.title}
              className="h-full w-full object-cover"
            />
            <span className="absolute left-4 top-4 rounded-full bg-gradient-to-br from-gold to-blush px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white">
              {billboardTypeLabel(billboard.type)}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-black text-forest sm:text-3xl">
                {billboard.title}
              </h1>
              <p className="mt-1 text-sm text-forest/50">{billboard.location}</p>
            </div>
            {company && (
              <span className="rounded-full bg-mint px-4 py-2 text-xs font-bold text-mint-ink">
                Listed by {company}
              </span>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            <SpecCard label="Type" value={billboardTypeLabel(billboard.type)} />
            <SpecCard label="Size" value={billboard.size} />
            <SpecCard label="Daily rate" value={formatKES(billboard.pricePerDay)} />
            <SpecCard label="Weekly rate" value={formatKES(billboard.pricePerWeek)} highlight />
          </div>

          {billboard.description && (
            <div className="mt-6 rounded-3xl bg-white p-6">
              <h2 className="text-[15px] font-bold text-forest">About this site</h2>
              <p className="mt-2 text-sm leading-relaxed text-forest/65">{billboard.description}</p>
            </div>
          )}

          <SiteFacts billboard={billboard} />
        </div>

        {/* ── Checkout ────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-24">
          {bookingSuccess && (
            <div className="rounded-3xl bg-gradient-to-br from-mint-ink to-mint p-6 text-white">
              <p className="font-display text-base font-extrabold">
                Payment received — booking confirmed 🎉
              </p>
              <p className="mt-1.5 text-sm text-white/85">
                Your campaign is booked.{' '}
                <Link to="/dashboard" className="font-semibold text-white underline">
                  View it in your dashboard
                </Link>
                .
              </p>
            </div>
          )}

          <div className="rounded-3xl bg-white p-6 shadow-xl sm:p-7">
            <h2 className="font-display text-xl font-extrabold text-forest">
              Check availability &amp; price
            </h2>

            {bookFrom > todayISO() && (
              <p className="mt-4 rounded-xl bg-cream px-3 py-2 text-sm text-forest/70">
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

            {/* AvailabilityCalendar renders its own Selected/Booked legend —
                the mockup's separate one would duplicate it. */}
            <p className="mt-2.5 text-xs text-forest/45">
              Pick a start date, then an end date. Crossed-out days are already booked. Min.{' '}
              {MIN_CAMPAIGN_DAYS} days booking.
            </p>

            <div className="my-5 h-px bg-forest/10" />

            <dl className="space-y-2 text-sm">
              <Line
                label={days ? `${days} day${days === 1 ? '' : 's'}` : 'Select your dates'}
                value={days ? formatKES(subtotal) : '—'}
              />
              {/* The platform takes no booking fee — the mockup's 5% line would
                  have disagreed with what's actually charged. */}
              <Line label="Service fee" value="No booking fee" muted />
            </dl>

            <div className="mt-4 flex items-baseline justify-between font-display text-lg font-extrabold text-forest">
              <span>Total</span>
              <span>{days ? formatKES(subtotal) : '—'}</span>
            </div>

            {hasDateRange && !dateRangeValid && (
              <p className="mt-4 text-sm font-medium text-amber-600">
                End date must be on or after the start date.
              </p>
            )}

            {dateRangeValid && !meetsMinimum && (
              <p className="mt-4 text-sm font-medium text-amber-600">
                Selected range is {days} day{days === 1 ? '' : 's'} — campaigns need at least{' '}
                {MIN_CAMPAIGN_DAYS} days.
              </p>
            )}

            {dateRangeValid && meetsMinimum && !available && (
              <div className="mt-4 rounded-2xl bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">
                  Not available for the selected dates.
                </p>
                <ul className="mt-2 list-inside list-disc text-xs text-red-600">
                  {conflicts.map((range) => (
                    <li key={`${range.start}-${range.end}`}>
                      Already booked {range.start} to {range.end}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Payment method is only a real choice for the customer who can
                actually book — everyone else gets the sign-in prompt instead. */}
            {user?.role === 'customer' && !bookingSuccess && (
              <>
                <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.1em] text-forest/50">
                  Pay with
                </p>
                {PAYMENT_METHODS.map((method) => {
                  const active = channel === method.value;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setChannel(method.value)}
                      aria-pressed={active}
                      className={`mt-2 flex w-full items-center gap-3 rounded-xl border-2 bg-white px-4 py-3.5 text-left shadow-sm transition ${
                        active ? 'border-mint-ink' : 'border-transparent hover:border-sand-dark'
                      }`}
                    >
                      <span
                        className={`h-4 w-4 flex-none rounded-full ${
                          active ? method.dot : 'border-[1.5px] border-forest/25'
                        }`}
                      />
                      <span
                        className={`text-sm font-semibold ${active ? 'text-forest' : 'text-forest/60'}`}
                      >
                        {method.label}
                      </span>
                    </button>
                  );
                })}
              </>
            )}

            <div className="mt-5">
              {user?.role === 'customer' ? (
                !bookingSuccess && (
                  <button
                    type="button"
                    onClick={handleConfirmBooking}
                    disabled={booking || !available}
                    className="w-full rounded-2xl bg-gradient-to-br from-gold to-blush px-4 py-4 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {booking
                      ? 'Starting checkout…'
                      : available
                        ? `Confirm & Pay — ${formatKES(total)}`
                        : 'Select available dates'}
                  </button>
                )
              ) : user ? (
                <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-forest/70">
                  Only customer accounts can book billboards.
                </p>
              ) : (
                <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-forest/70">
                  <Link to="/login" className="font-semibold text-gold-dark underline">
                    Sign in
                  </Link>{' '}
                  as a customer to book this billboard.
                </p>
              )}
            </div>

            {bookingError && (
              <p className="mt-3 text-sm font-medium text-red-600">{bookingError}</p>
            )}

            <p className="mt-3 text-center text-[11px] text-forest/40">
              🔒 Payment is held until your dates are confirmed
            </p>
          </div>
        </div>
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

function SpecCard({ label, value, highlight = false }) {
  return (
    <div
      className={`rounded-2xl p-4 ${highlight ? 'bg-gradient-to-br from-gold to-blush' : 'bg-white'}`}
    >
      <p
        className={`text-[11px] uppercase tracking-[0.05em] ${
          highlight ? 'text-white/80' : 'text-forest/50'
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 font-display text-[15px] font-extrabold ${
          highlight ? 'text-white' : 'text-forest'
        }`}
      >
        {value || '—'}
      </p>
    </div>
  );
}

/**
 * The mockup's second photo slot. Real billboard photo uploads don't exist yet,
 * so rather than repeat the same placeholder image this shows the ERP
 * attributes owners actually fill in — and renders nothing when none are set.
 */
function SiteFacts({ billboard }) {
  const facts = [
    ['Road', billboard.road],
    ['Lighting', billboard.lighting?.replace(/_/g, ' ')],
    ['Orientation', billboard.orientation],
    ['Daily traffic', billboard.dailyTraffic ? billboard.dailyTraffic.toLocaleString() : null],
    ['Visibility', billboard.visibilityScore ? `${billboard.visibilityScore}/10` : null],
  ].filter(([, value]) => value);

  if (facts.length === 0 && (billboard.amenities || []).length === 0) return null;

  return (
    <div className="mt-6 rounded-3xl bg-white p-6">
      <h2 className="text-[15px] font-bold text-forest">Site details</h2>
      {facts.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-3">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase tracking-[0.05em] text-forest/45">{label}</dt>
              <dd className="mt-0.5 font-semibold capitalize text-forest">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {(billboard.amenities || []).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {billboard.amenities.map((amenity) => (
            <span
              key={amenity}
              className="rounded-full bg-cream px-2.5 py-1 text-xs font-medium capitalize text-forest/70"
            >
              {amenity}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Line({ label, value, muted = false }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-forest/60">{label}</dt>
      <dd className={muted ? 'font-medium text-mint-ink' : 'text-forest/60'}>{value}</dd>
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
