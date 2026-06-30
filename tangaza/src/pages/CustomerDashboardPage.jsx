import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import BillboardImage from '../components/BillboardImage';
import DashboardHero from '../components/DashboardHero';
import PaymentStatusBadge from '../components/PaymentStatusBadge';
import PaymentModal from '../components/payments/PaymentModal';
import { NAIROBI_CENTER, TILE_THEMES } from '../components/map/tileThemes';
import { billboardTypeLabel } from '../data/billboardTypes';
import { cancelMyBooking, fetchMyBookings, initializePayment } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatKES } from '../utils/availability';

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [payingId, setPayingId] = useState(null);

  useEffect(() => {
    fetchMyBookings()
      .then(setBookings)
      .catch(() => setError('Could not load your bookings. Is the API running?'))
      .finally(() => setLoading(false));
  }, []);

  const active = useMemo(
    () => bookings.filter((booking) => booking.status !== 'cancelled'),
    [bookings]
  );
  const totalSpend = useMemo(
    () => active.reduce((sum, booking) => sum + booking.totalPrice, 0),
    [active]
  );

  // One marker per distinct billboard the customer has an active booking on.
  const mapPoints = useMemo(() => {
    const seen = new Map();
    active.forEach((booking) => {
      const board = booking.billboard;
      if (board.lat != null && board.lng != null && !seen.has(board.id)) {
        seen.set(board.id, board);
      }
    });
    return [...seen.values()];
  }, [active]);

  async function handlePay(booking) {
    setError('');
    setPayingId(booking.id);
    try {
      const payment = await initializePayment(booking.id);
      setCheckout(payment);
    } catch (payError) {
      setError(payError.message);
      setPayingId(null);
    }
  }

  function handlePaymentSuccess(updated) {
    setCheckout(null);
    setPayingId(null);
    setBookings((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  function closeCheckout() {
    setCheckout(null);
    setPayingId(null);
  }

  async function handleCancel(booking) {
    if (!window.confirm(`Cancel your booking for “${booking.billboard.title}”? This cannot be undone.`)) {
      return;
    }
    setCancellingId(booking.id);
    try {
      const updated = await cancelMyBooking(booking.id);
      setBookings((current) => current.map((item) => (item.id === booking.id ? updated : item)));
    } catch (cancelError) {
      setError(cancelError.message);
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <DashboardHero eyebrow={user?.companyName || user?.name} title="My Campaigns">
        <Link
          to="/map"
          className="group inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-bold uppercase tracking-wide text-forest shadow-sm transition hover:-translate-y-0.5 hover:bg-gold-soft hover:shadow-md"
        >
          Browse Billboards
          <ArrowIcon />
        </Link>
      </DashboardHero>

      <div className="mx-auto max-w-6xl px-4 pb-16">
        {/* Summary — pulled up to overlap the forest band */}
        <div className="relative z-10 -mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Active bookings" value={active.length} accent="#3f8f6b" />
          <StatCard label="Billboards" value={mapPoints.length} accent="#d6a23e" />
          <StatCard label="Committed spend" value={formatKES(totalSpend)} accent="#c0703f" />
        </div>

        {error && (
          <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
        )}

        {/* Map of booked billboards */}
        {mapPoints.length > 0 && (
          <section className="mt-10">
            <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-forest">
              <span className="h-5 w-1 rounded-full bg-gold" />
              Where your billboards are
            </h2>
            <div className="mt-4 h-80 overflow-hidden rounded-3xl border border-sand shadow-sm">
              <MapContainer center={NAIROBI_CENTER} zoom={12} zoomControl={false} className="h-full w-full">
                <TileLayer url={TILE_THEMES.light.url} attribution={TILE_THEMES.light.attribution} />
                <FitBounds points={mapPoints.map((board) => [board.lat, board.lng])} />
                {mapPoints.map((board) => (
                  <CircleMarker
                    key={board.id}
                    center={[board.lat, board.lng]}
                    radius={10}
                    pathOptions={{ color: '#fff', weight: 2, fillColor: '#d6a23e', fillOpacity: 1 }}
                  >
                    <Popup>
                      <p className="font-semibold text-forest">{board.title}</p>
                      <p className="text-sm text-stone-600">{board.location}</p>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </section>
        )}

        {/* Bookings */}
        <section className="mt-12">
          <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-forest">
            <span className="h-5 w-1 rounded-full bg-gold" />
            Your bookings
          </h2>

          {loading ? (
            <p className="mt-4 text-stone-600">Loading your campaigns…</p>
          ) : bookings.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-dashed border-sand-dark bg-white p-10 text-center">
              <p className="text-stone-600">You haven&apos;t booked any billboards yet.</p>
              <Link
                to="/map"
                className="mt-4 inline-block rounded-full bg-gold px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-forest transition hover:bg-gold-soft"
              >
                Find a Billboard
              </Link>
            </div>
          ) : (
            <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  cancelling={cancellingId === booking.id}
                  paying={payingId === booking.id}
                  onCancel={() => handleCancel(booking)}
                  onPay={() => handlePay(booking)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {checkout && (
        <PaymentModal payment={checkout} onSuccess={handlePaymentSuccess} onClose={closeCheckout} />
      )}
    </div>
  );
}

function BookingCard({ booking, cancelling, paying, onCancel, onPay }) {
  const { billboard } = booking;
  const cancellable = booking.status !== 'cancelled';
  const payable = booking.status === 'pending';

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
          <Row label="Total" value={<span className="font-semibold text-gold-dark">{formatKES(booking.totalPrice)}</span>} />
        </dl>

        <div className="mt-5 space-y-2">
          {payable && (
            <button
              type="button"
              onClick={onPay}
              disabled={paying}
              className="w-full rounded-full bg-gold px-4 py-2.5 text-sm font-bold text-forest transition hover:bg-gold-soft disabled:opacity-60"
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

const STATUS_STYLES = {
  confirmed: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-stone-200 text-stone-600',
};

function StatusBadge({ status }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize shadow-sm ${
        STATUS_STYLES[status] || 'bg-stone-200 text-stone-700'
      }`}
    >
      {status}
    </span>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-right text-stone-800">{value}</dd>
    </div>
  );
}

function StatCard({ label, value, accent = '#d6a23e' }) {
  return (
    <div
      className="rounded-2xl border border-sand border-t-4 bg-white p-5 shadow-sm"
      style={{ borderTopColor: accent }}
    >
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 font-serif text-2xl font-semibold text-forest">{value}</p>
    </div>
  );
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    // Leaflet can mis-measure its container on first mount (renders grey tiles)
    // until a resize; force a recalculation so the map always paints.
    map.invalidateSize();
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
    } else {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [map, points]);
  return null;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
