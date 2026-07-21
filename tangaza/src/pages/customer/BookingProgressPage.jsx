import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  fetchBookingMessages,
  fetchBookingProgress,
  fetchMyBookings,
  sendBookingMessage,
} from '../../api';
import ChatThread from '../../components/chat/ChatThread';
import PaymentStatusBadge from '../../components/PaymentStatusBadge';
import CampaignTimeline from '../../components/progress/CampaignTimeline';
import { Card, EmptyState, SectionHeading, formatDate } from '../../components/customer/ui';
import { billboardTypeLabel } from '../../data/billboardTypes';
import { formatKES } from '../../utils/availability';

/**
 * The Glovo-style campaign tracker for one booking: a summary, the stage
 * timeline where the customer follows progress and answers go-ahead requests,
 * and a direct line to the company.
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

  if (error) {
    return (
      <EmptyState
        title="Campaign not found"
        action={
          <Link
            to="/dashboard/campaigns"
            className="inline-block rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gold-soft"
          >
            Back to my campaigns
          </Link>
        }
      >
        {error}
      </EmptyState>
    );
  }

  if (loading) {
    return (
      <p className="rounded-3xl border border-sand bg-white p-8 text-center text-stone-600 shadow-sm">
        Loading your campaign timeline…
      </p>
    );
  }

  if (!booking) return null;

  const manager = booking.accountManager;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        to="/dashboard/campaigns"
        className="group inline-flex items-center gap-2 text-sm font-semibold text-stone-500 transition hover:text-forest"
      >
        <BackIcon />
        All campaigns
      </Link>

      <Card>
        <h2 className="font-serif text-xl font-semibold text-forest">{booking.billboard.title}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
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
      </Card>

      {manager && (
        <Card className="border-gold/30 bg-gold/5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold-dark">
            Your campaign manager
          </p>
          <p className="mt-1.5 font-serif text-lg font-semibold text-forest">{manager.name}</p>
          <p className="text-sm text-stone-600">
            Running this campaign for you. Reach them any time:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`mailto:${manager.email}`}
              className="rounded-full border border-sand bg-white px-4 py-2 text-sm font-semibold text-forest transition hover:border-gold/50"
            >
              {manager.email}
            </a>
            {manager.phone && (
              <a
                href={`tel:${manager.phone}`}
                className="rounded-full border border-sand bg-white px-4 py-2 text-sm font-semibold text-forest transition hover:border-gold/50"
              >
                {manager.phone}
              </a>
            )}
          </div>
        </Card>
      )}

      <section className="rounded-3xl border border-sand bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <SectionHeading>From booking to billboard</SectionHeading>
        </div>
        <CampaignTimeline updates={updates} onReacted={handleReacted} />
      </section>

      <section className="rounded-3xl border border-sand bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-4">
          <SectionHeading>Messages</SectionHeading>
        </div>
        <BookingChat bookingId={booking.id} />
      </section>
    </div>
  );
}

function BookingChat({ bookingId }) {
  const fetchMessages = useCallback(() => fetchBookingMessages(bookingId), [bookingId]);
  const sendMessage = useCallback((payload) => sendBookingMessage(bookingId, payload), [bookingId]);
  return (
    <ChatThread
      fetchMessages={fetchMessages}
      sendMessage={sendMessage}
      emptyHint="Questions about your campaign? Message the billboard team directly — they're notified instantly."
    />
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

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1"
      aria-hidden
    >
      <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
