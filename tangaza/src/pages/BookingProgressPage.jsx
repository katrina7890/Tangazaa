import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchBookingProgress, fetchMyBookings } from '../api';
import DashboardHero from '../components/DashboardHero';
import PaymentStatusBadge from '../components/PaymentStatusBadge';
import CampaignTimeline from '../components/progress/CampaignTimeline';
import { billboardTypeLabel } from '../data/billboardTypes';
import { formatKES } from '../utils/availability';

/**
 * The full-page Glovo-style campaign tracker for one booking: a forest hero
 * with the billboard's details, then the stage timeline where the customer
 * follows progress, answers go-ahead requests, and sees install photos.
 */
export default function BookingProgressPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    // There's no single-booking endpoint; the customer's own list is small, so
    // pull it and pick the one we're tracking.
    Promise.all([fetchMyBookings(), fetchBookingProgress(id)])
      .then(([bookings, timeline]) => {
        if (cancelled) return;
        const match = bookings.find((item) => String(item.id) === String(id));
        if (!match) {
          setError('We could not find that booking among your campaigns.');
          return;
        }
        setBooking(match);
        setUpdates(timeline);
      })
      .catch(() => {
        if (!cancelled) setError('We could not load this campaign. It may not be one of yours.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function handleReacted(updated) {
    setUpdates((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  return (
    <div className="min-h-screen bg-cream">
      <DashboardHero
        eyebrow="Campaign progress"
        title={booking ? booking.billboard.title : 'Loading…'}
      >
        <Link
          to="/dashboard"
          className="group inline-flex items-center gap-2 rounded-full border border-gold/60 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-gold transition hover:bg-gold hover:text-forest"
        >
          <BackIcon />
          My Campaigns
        </Link>
      </DashboardHero>

      <div className="mx-auto max-w-3xl px-4 pb-16">
        {error ? (
          <div className="relative z-10 -mt-10 rounded-3xl border border-sand bg-white p-8 text-center shadow-sm">
            <p className="text-stone-600">{error}</p>
            <Link
              to="/dashboard"
              className="mt-4 inline-block rounded-full bg-gold px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-forest transition hover:bg-gold-soft"
            >
              Back to my campaigns
            </Link>
          </div>
        ) : loading ? (
          <p className="relative z-10 -mt-10 rounded-3xl border border-sand bg-white p-8 text-center text-stone-600 shadow-sm">
            Loading your campaign timeline…
          </p>
        ) : (
          booking && (
            <>
              {/* Booking summary — pulled up to overlap the forest band */}
              <div className="relative z-10 -mt-10 rounded-3xl border border-sand bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-forest/10 px-3 py-1 text-xs font-bold capitalize text-forest">
                    {booking.status}
                  </span>
                  <PaymentStatusBadge bookingStatus={booking.status} paymentStatus={booking.payment?.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
                  <SummaryFact label="Location" value={booking.billboard.location} />
                  <SummaryFact label="Type" value={billboardTypeLabel(booking.billboard.type)} />
                  <SummaryFact
                    label="Campaign dates"
                    value={`${formatDate(booking.startDate)} – ${formatDate(booking.endDate)}`}
                  />
                  <SummaryFact
                    label="Total"
                    value={<span className="font-semibold text-gold-dark">{formatKES(booking.totalPrice)}</span>}
                  />
                </dl>
              </div>

              {/* The timeline itself */}
              <section className="mt-8 rounded-3xl border border-sand bg-white p-6 shadow-sm sm:p-8">
                <h2 className="mb-6 flex items-center gap-2 font-serif text-xl font-semibold text-forest">
                  <span className="h-5 w-1 rounded-full bg-gold" />
                  From booking to billboard
                </h2>
                <CampaignTimeline updates={updates} onReacted={handleReacted} />
              </section>
            </>
          )
        )}
      </div>
    </div>
  );
}

function SummaryFact({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</dt>
      <dd className="mt-0.5 text-stone-800">{value}</dd>
    </div>
  );
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1"
    >
      <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
