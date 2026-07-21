import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import BookingCard from '../../components/customer/BookingCard';
import { useCustomerData } from '../../components/customer/CustomerLayout';
import { EmptyState, ErrorNotice, SectionHeading, StatCard, formatDate } from '../../components/customer/ui';
import { NAIROBI_CENTER, TILE_THEMES } from '../../components/map/tileThemes';
import { formatKES } from '../../utils/availability';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function CustomerOverviewPage() {
  const { bookings, loading, error, payBooking, cancelBooking, payingId, cancellingId } =
    useCustomerData();

  const active = useMemo(
    () => bookings.filter((booking) => booking.status !== 'cancelled'),
    [bookings],
  );
  const totalSpend = useMemo(
    () => active.reduce((sum, booking) => sum + booking.totalPrice, 0),
    [active],
  );

  // Anything the customer has to act on, surfaced ahead of everything else —
  // an unpaid booking loses its dates, an unanswered go-ahead stalls a build.
  const todos = useMemo(() => {
    const items = [];
    active.forEach((booking) => {
      if (booking.status === 'pending') {
        items.push({
          id: `pay-${booking.id}`,
          urgent: true,
          title: `Complete payment for ${booking.billboard.title}`,
          body: 'Your dates are not held until this payment clears.',
          to: '/dashboard/payments',
          cta: 'Pay now',
        });
      }
      if (booking.pendingApprovals > 0) {
        items.push({
          id: `approve-${booking.id}`,
          urgent: true,
          title: `${booking.billboard.title} needs your go-ahead`,
          body: 'The company is waiting on your approval before they continue.',
          to: `/dashboard/bookings/${booking.id}/progress`,
          cta: 'Review',
        });
      }
    });
    return items;
  }, [active]);

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

  const endingSoon = useMemo(
    () =>
      active.filter((booking) => {
        const days = (new Date(booking.endDate) - Date.now()) / DAY_MS;
        return days >= 0 && days <= 14;
      }),
    [active],
  );

  const recent = active.slice(0, 3);

  return (
    <div className="space-y-10">
      <ErrorNotice>{error}</ErrorNotice>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Active campaigns" value={active.length} accent="#16704A" />
        <StatCard label="Billboards" value={mapPoints.length} accent="#8A3DF0" />
        <StatCard
          label="Ending soon"
          value={endingSoon.length}
          accent="#E4572E"
          hint={endingSoon.length ? 'Within 14 days' : undefined}
        />
        {/* The money card gets the Masterpiece Coral highlight surface. */}
        <StatCard label="Committed spend" value={formatKES(totalSpend)} highlight />
      </div>

      {todos.length > 0 && (
        <section>
          <SectionHeading>Needs your attention</SectionHeading>
          <div className="mt-4 space-y-3">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/30 bg-gold/10 px-5 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-forest">{todo.title}</p>
                  <p className="text-sm text-stone-600">{todo.body}</p>
                </div>
                <Link
                  to={todo.to}
                  className="shrink-0 rounded-full bg-gold px-5 py-2 text-sm font-bold text-white transition hover:bg-gold-soft"
                >
                  {todo.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {endingSoon.length > 0 && (
        <section>
          <SectionHeading>Ending soon</SectionHeading>
          <div className="mt-4 space-y-2">
            {endingSoon.map((booking) => (
              <div
                key={booking.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand bg-white px-5 py-3.5"
              >
                <div>
                  <p className="text-sm font-semibold text-forest">{booking.billboard.title}</p>
                  <p className="text-xs text-stone-500">Runs until {formatDate(booking.endDate)}</p>
                </div>
                <Link
                  to="/map"
                  className="shrink-0 rounded-full border border-forest/20 bg-forest/5 px-4 py-1.5 text-xs font-bold text-forest transition hover:bg-forest/10"
                >
                  Book the next flight
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {mapPoints.length > 0 && (
        <section>
          <SectionHeading>Where your billboards are</SectionHeading>
          <div className="mt-4 h-80 overflow-hidden rounded-3xl border border-sand shadow-sm">
            <MapContainer center={NAIROBI_CENTER} zoom={12} zoomControl={false} className="h-full w-full">
              <TileLayer url={TILE_THEMES.light.url} attribution={TILE_THEMES.light.attribution} />
              <FitBounds points={mapPoints.map((board) => [board.lat, board.lng])} />
              {mapPoints.map((board) => (
                <CircleMarker
                  key={board.id}
                  center={[board.lat, board.lng]}
                  radius={10}
                  pathOptions={{ color: '#fff', weight: 2, fillColor: '#8A3DF0', fillOpacity: 1 }}
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

      <section>
        <SectionHeading
          action={
            bookings.length > 3 && (
              <Link to="/dashboard/campaigns" className="text-sm font-semibold text-gold-dark hover:underline">
                See all {bookings.length} →
              </Link>
            )
          }
        >
          Recent campaigns
        </SectionHeading>

        {loading ? (
          <p className="mt-4 text-stone-600">Loading your campaigns…</p>
        ) : recent.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No campaigns yet"
              action={
                <Link
                  to="/map"
                  className="inline-block rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gold-soft"
                >
                  Find a billboard
                </Link>
              }
            >
              Browse the network and book your first billboard.
            </EmptyState>
          </div>
        ) : (
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((booking) => (
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
      </section>
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
