import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { fetchPartnerOverview } from '../../api';
import { NAIROBI_CENTER, TILE_THEMES } from '../../components/map/tileThemes';
import { Badge, EmptyState, SectionCard, formatDisplayDate } from '../../components/partner/ui';
import { formatKES } from '../../utils/availability';

// One colour per portfolio state, mirrored between the map pins and the legend.
const PIN_STATES = {
  online_available: { color: '#16704A', label: 'Online · available' },
  online_booked: { color: '#8A3DF0', label: 'Online · booked' },
  offline_available: { color: '#0284C7', label: 'Offline · available' },
  offline_booked: { color: '#6B5B4A', label: 'Offline · booked' },
  maintenance: { color: '#E11D48', label: 'Maintenance' },
};

function pinState(board) {
  if (board.underMaintenance) return 'maintenance';
  return `${board.channel}_${board.occupied ? 'booked' : 'available'}`;
}

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

  const { stats, billboards, activity } = data;
  const mapPoints = billboards.filter((board) => board.lat != null && board.lng != null);

  return (
    <div className="space-y-6">
      {/* ── Portfolio stats ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total billboards"
          value={stats.billboards}
          sub={`${stats.online} online · ${stats.offline} offline`}
        />
        <StatCard
          label="Available today"
          value={stats.availableToday}
          sub={stats.maintenance > 0 ? `${stats.maintenance} in maintenance` : 'Ready to sell'}
          accent="text-emerald-600"
        />
        <StatCard label="Occupancy" value={`${stats.occupancyPct}%`} sub={`${stats.occupiedToday} occupied now`}>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand/70">
            <div className="h-full rounded-full bg-gold" style={{ width: `${stats.occupancyPct}%` }} />
          </div>
        </StatCard>
        <StatCard label="Active campaigns" value={stats.activeBookings} sub={`${stats.endingSoon} ending ≤ 14 days`} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Upcoming installations"
          value={stats.upcomingInstallations}
          sub="Scheduled or pending"
          to="/partner/jobs"
        />
        <StatCard label="Open artwork" value={stats.openArtworks} sub="In the design pipeline" to="/partner/artwork" />
        <StatCard label="Clients" value={stats.contacts} sub="In your CRM" to="/partner/crm" />
        {/* The backend omits revenue for staff accounts — owner-only information. */}
        {stats.confirmedRevenue != null ? (
          <StatCard label="Confirmed revenue" value={formatKES(stats.confirmedRevenue)} sub="All confirmed bookings" />
        ) : (
          <StatCard label="Open jobs" value={stats.openWorkOrders} sub="Print, install & more" to="/partner/jobs" />
        )}
      </div>

      {/* ── Colour-coded portfolio map ──────────────────────── */}
      <SectionCard
        title="Portfolio map"
        action={
          <div className="flex max-w-md flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[11px] text-stone-600">
            {Object.values(PIN_STATES).map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
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
              {mapPoints.map((board) => {
                const state = pinState(board);
                return (
                  <CircleMarker
                    key={board.id}
                    center={[board.lat, board.lng]}
                    radius={10}
                    pathOptions={{
                      color: '#fff',
                      weight: 2,
                      fillColor: PIN_STATES[state].color,
                      fillOpacity: 1,
                    }}
                  >
                    <Popup>
                      <p className="font-semibold text-forest">{board.title}</p>
                      <p className="text-sm text-stone-600">{board.location}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {board.size} · {formatKES(board.pricePerWeek)}/week
                      </p>
                      <p className="mt-1.5 text-sm">
                        <span className="font-medium" style={{ color: PIN_STATES[state].color }}>
                          {PIN_STATES[state].label}
                        </span>
                      </p>
                      {board.occupied && board.currentBooking ? (
                        <p className="mt-0.5 text-sm">
                          {board.currentBooking.advertiser || 'Booked'} until{' '}
                          {formatDisplayDate(board.currentBooking.endDate)}
                          {board.currentBooking.source === 'offline' ? ' (offline deal)' : ''}
                        </p>
                      ) : !board.underMaintenance ? (
                        <p className="mt-0.5 text-sm">Next free {formatDisplayDate(board.nextAvailableFrom)}</p>
                      ) : null}
                      <Link
                        to="/partner/availability"
                        className="mt-1.5 inline-block text-xs font-semibold text-gold-dark hover:underline"
                      >
                        View availability calendar
                      </Link>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        )}
      </SectionCard>

      {/* ── Activity + board-by-board status ────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Recent activity">
          {activity.length === 0 ? (
            <EmptyState>Nothing yet — activity shows up here as bookings and jobs move.</EmptyState>
          ) : (
            <ul className="divide-y divide-sand/70">
              {activity.map((item, index) => (
                <li key={`${item.at}-${index}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      { booking: 'bg-gold', campaign: 'bg-emerald-500', job: 'bg-sky-500' }[item.type] || 'bg-stone-400'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{item.title}</p>
                    {item.detail && <p className="truncate text-xs text-stone-500">{item.detail}</p>}
                  </div>
                  <span className="shrink-0 text-[11px] text-stone-400">{formatDisplayDate(item.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Board-by-board status">
          {billboards.length === 0 ? (
            <EmptyState>No billboards yet.</EmptyState>
          ) : (
            <div className="space-y-3">
              {billboards.map((board) => (
                <div key={board.id} className="flex items-start justify-between gap-3 rounded-2xl border border-sand bg-white p-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{board.title}</p>
                    <p className="truncate text-xs text-slate-500">{board.location}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {board.underMaintenance
                        ? 'Out of rotation for maintenance'
                        : board.occupied && board.currentBooking
                          ? `${board.currentBooking.advertiser || 'Booked'} · to ${formatDisplayDate(board.currentBooking.endDate)}`
                          : `Next free ${formatDisplayDate(board.nextAvailableFrom)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge tone={board.channel === 'offline' ? 'sky' : 'gold'}>
                      {board.channel === 'offline' ? 'Offline' : 'Tangazaa'}
                    </Badge>
                    {board.underMaintenance ? (
                      <Badge tone="red">Maintenance</Badge>
                    ) : (
                      <Badge tone={board.occupied ? 'amber' : 'emerald'}>{board.occupied ? 'Booked' : 'Available'}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent, to, children }) {
  const card = (
    <div className={`h-full rounded-2xl border border-sand bg-white p-4 ${to ? 'transition hover:border-gold/50' : ''}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500">{label}</p>
      <p className={`mt-1.5 font-serif text-3xl font-bold tracking-tight ${accent || 'text-forest'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-stone-400">{sub}</p>}
      {children}
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
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
