import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { fetchPartnerOverview } from '../../api';
import { NAIROBI_CENTER, TILE_THEMES } from '../../components/map/tileThemes';
import { Badge, EmptyState, SectionCard, formatDisplayDate } from '../../components/partner/ui';
import { formatKES } from '../../utils/availability';

const OCCUPIED_COLOR = '#d6a23e'; // gold — earning money
const VACANT_COLOR = '#10b981'; // emerald — ready to sell

export default function PartnerOverviewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPartnerOverview()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-stone-600">Loading…</p>;
  if (!data) return <EmptyState>Couldn&apos;t load the overview — try refreshing.</EmptyState>;

  const { stats, billboards } = data;
  const mapPoints = billboards.filter((board) => board.lat != null && board.lng != null);

  const statCards = [
    { label: 'Billboards', value: stats.billboards },
    { label: 'Occupied today', value: stats.occupiedToday, accent: 'text-gold-dark' },
    { label: 'Vacant today', value: stats.vacantToday, accent: 'text-emerald-600' },
    { label: 'Active bookings', value: stats.activeBookings },
    // The backend omits revenue for staff accounts — owner-only information.
    ...(stats.confirmedRevenue != null
      ? [{ label: 'Confirmed revenue', value: formatKES(stats.confirmedRevenue) }]
      : []),
    { label: 'Clients', value: stats.contacts, to: '/partner/crm' },
    { label: 'Open artwork', value: stats.openArtworks, to: '/partner/artwork' },
    { label: 'Open jobs', value: stats.openWorkOrders, to: '/partner/jobs' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map(({ label, value, accent, to }) => {
          const card = (
            <div className="h-full rounded-2xl border border-sand border-t-4 border-t-gold bg-white p-4 shadow-sm transition hover:shadow-md">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
              <p className={`mt-1 font-serif text-2xl font-semibold ${accent || 'text-forest'}`}>{value}</p>
            </div>
          );
          return to ? (
            <Link key={label} to={to}>
              {card}
            </Link>
          ) : (
            <div key={label}>{card}</div>
          );
        })}
      </div>

      <SectionCard
        title="Live occupancy map"
        action={
          <div className="flex items-center gap-3 text-xs text-stone-600">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: OCCUPIED_COLOR }} />
              Occupied
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: VACANT_COLOR }} />
              Vacant
            </span>
          </div>
        }
      >
        {mapPoints.length === 0 ? (
          <EmptyState>
            No billboards yet — add your first one from{' '}
            <Link to="/owner" className="font-semibold text-gold-dark hover:underline">
              My Billboards
            </Link>
            .
          </EmptyState>
        ) : (
          <div className="h-[26rem] overflow-hidden rounded-2xl border border-sand">
            <MapContainer center={NAIROBI_CENTER} zoom={12} zoomControl={false} className="h-full w-full">
              <TileLayer url={TILE_THEMES.light.url} attribution={TILE_THEMES.light.attribution} />
              <FitBounds points={mapPoints.map((board) => [board.lat, board.lng])} />
              {mapPoints.map((board) => (
                <CircleMarker
                  key={board.id}
                  center={[board.lat, board.lng]}
                  radius={10}
                  pathOptions={{
                    color: '#fff',
                    weight: 2,
                    fillColor: board.occupied ? OCCUPIED_COLOR : VACANT_COLOR,
                    fillOpacity: 1,
                  }}
                >
                  <Popup>
                    <p className="font-semibold text-forest">{board.title}</p>
                    <p className="text-sm text-stone-600">{board.location}</p>
                    {board.occupied && board.currentBooking ? (
                      <p className="mt-1 text-sm">
                        <span className="font-medium text-gold-dark">
                          {board.currentBooking.advertiser || 'Booked'}
                        </span>{' '}
                        until {formatDisplayDate(board.currentBooking.endDate)}
                        {board.currentBooking.source === 'offline' ? ' (offline deal)' : ''}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm font-medium text-emerald-600">Available now</p>
                    )}
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        )}
      </SectionCard>

      {mapPoints.length > 0 && (
        <SectionCard title="Board-by-board status">
          <div className="grid gap-3 sm:grid-cols-2">
            {billboards.map((board) => (
              <div key={board.id} className="flex items-start justify-between gap-3 rounded-2xl border border-sand bg-white p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{board.title}</p>
                  <p className="truncate text-sm text-slate-500">{board.location}</p>
                  <p className="mt-1.5 text-xs text-stone-500">
                    {board.occupied && board.currentBooking
                      ? `${board.currentBooking.advertiser || 'Booked'} · to ${formatDisplayDate(board.currentBooking.endDate)}`
                      : `Next free ${formatDisplayDate(board.nextAvailableFrom)}`}
                  </p>
                </div>
                <Badge tone={board.occupied ? 'gold' : 'emerald'}>{board.occupied ? 'Occupied' : 'Vacant'}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    // Leaflet can mis-measure its container on first mount (grey tiles) until a
    // resize; force a recalculation so the map always paints.
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
