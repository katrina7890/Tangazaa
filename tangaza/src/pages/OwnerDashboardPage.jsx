import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { deleteBillboard, fetchBillboardBookings, fetchMyBillboards } from '../api';
import DashboardHero from '../components/DashboardHero';
import BillboardForm from '../components/owner/BillboardForm';
import BookingsModal from '../components/owner/BookingsModal';
import { NAIROBI_CENTER, TILE_THEMES } from '../components/map/tileThemes';
import { billboardTypeLabel } from '../data/billboardTypes';
import { formatKES } from '../utils/availability';

export default function OwnerDashboardPage() {
  const [billboards, setBillboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | billboard object
  const [viewingBookingsFor, setViewingBookingsFor] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  function reload() {
    setLoading(true);
    fetchMyBillboards()
      .then(setBillboards)
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  async function handleDelete(id) {
    if (!window.confirm('Delete this billboard? This cannot be undone.')) return;
    await deleteBillboard(id);
    reload();
  }

  async function handleViewBookings(billboard) {
    setViewingBookingsFor(billboard);
    setBookingsLoading(true);
    try {
      setBookings(await fetchBillboardBookings(billboard.id));
    } finally {
      setBookingsLoading(false);
    }
  }

  const mapPoints = useMemo(
    () => billboards.filter((billboard) => billboard.lat != null && billboard.lng != null),
    [billboards]
  );

  return (
    <div className="min-h-screen bg-cream">
      <DashboardHero eyebrow="Your inventory" title="My Billboards">
        {editing === null && (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="rounded-full bg-gold px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-forest shadow-sm transition hover:-translate-y-0.5 hover:bg-gold-soft hover:shadow-md"
          >
            + Add Billboard
          </button>
        )}
      </DashboardHero>

      <div className="mx-auto max-w-5xl px-4 pb-16 pt-8">
        {editing !== null && (
          <BillboardForm
            billboard={editing === 'new' ? null : editing}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
            onCancel={() => setEditing(null)}
          />
        )}

        {!loading && mapPoints.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 font-serif text-xl font-semibold text-forest">
              <span className="h-5 w-1 rounded-full bg-gold" />
              Where your billboards are
            </h2>
            <div className="h-72 overflow-hidden rounded-3xl border border-sand shadow-sm">
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

        {loading ? (
          <p className="text-stone-600">Loading…</p>
        ) : billboards.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-sand-dark bg-white p-10 text-center text-stone-600">
            You haven&apos;t listed any billboards yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {billboards.map((billboard) => (
              <div
                key={billboard.id}
                className="rounded-2xl border border-sand border-t-4 border-t-gold bg-white p-4 shadow-sm transition hover:shadow-md"
              >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900">{billboard.title}</h3>
                  <p className="text-sm text-slate-500">{billboard.location}</p>
                </div>
                <span
                  className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                    billboard.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {billboard.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {billboardTypeLabel(billboard.type)} · {billboard.size}
              </p>
              <p className="mt-1 font-medium text-gold-dark">{formatKES(billboard.pricePerWeek)}/week</p>
              {billboard.nextAvailableFrom && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <CalendarDot />
                  Next available {formatDisplayDate(billboard.nextAvailableFrom)}
                </p>
              )}
              <div className="mt-3 flex gap-4 text-sm">
                <button
                  type="button"
                  onClick={() => handleViewBookings(billboard)}
                  className="font-semibold text-gold-dark hover:underline"
                >
                  Bookings &amp; calendar
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(billboard)}
                  className="font-semibold text-slate-700 hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(billboard.id)}
                  className="font-semibold text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

        {viewingBookingsFor && (
          <BookingsModal
            billboard={viewingBookingsFor}
            bookings={bookings}
            loading={bookingsLoading}
            onClose={() => setViewingBookingsFor(null)}
          />
        )}
      </div>
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

function CalendarDot() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18M8 2v4M16 2v4" strokeLinecap="round" />
    </svg>
  );
}

function formatDisplayDate(dateISO) {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
