import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import FilterPanel from '../components/map/FilterPanel';
import MapControls from '../components/map/MapControls';
import MapSearchBar from '../components/map/MapSearchBar';
import { NAIROBI_CENTER, TILE_THEMES } from '../components/map/tileThemes';
import { fetchBillboards } from '../api';
import { BILLBOARD_TYPES, billboardTypeLabel } from '../data/billboardTypes';
import { MIN_CAMPAIGN_DAYS, daysBetween, formatKES, isAvailable } from '../utils/availability';

export default function MapBrowsePage() {
  const mapRef = useRef(null);
  const navigate = useNavigate();

  const [billboards, setBillboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [theme, setTheme] = useState('light');
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('All locations');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [maxWeeklyBudget, setMaxWeeklyBudget] = useState(Infinity);
  const [selectedId, setSelectedId] = useState(null);
  // Flipped just after mount so the opacity-0 frame commits first and the
  // reveal actually transitions rather than snapping to the end state.
  //
  // Deliberately a timeout, not requestAnimationFrame: rAF is paused in
  // background tabs, so opening /map in one (cmd-click, restored session) would
  // leave the map stuck at opacity 0 until the tab was focused. A timer fires
  // regardless of visibility — this should fail visible, never blank.
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 40);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchBillboards()
      .then(setBillboards)
      .catch(() => setError('Could not load billboards. Is the API running?'))
      .finally(() => setLoading(false));
  }, []);

  const budgetBounds = useMemo(() => {
    if (billboards.length === 0) return { min: 0, max: 0 };
    const prices = billboards.map((billboard) => billboard.pricePerWeek);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [billboards]);

  useEffect(() => {
    if (billboards.length > 0 && maxWeeklyBudget === Infinity) {
      setMaxWeeklyBudget(budgetBounds.max);
    }
  }, [billboards, budgetBounds, maxWeeklyBudget]);

  const locations = useMemo(
    () => [...new Set(billboards.map((billboard) => billboard.location))].sort(),
    [billboards]
  );

  const daysSelected = startDate && endDate ? daysBetween(startDate, endDate) : null;
  const meetsMinimum = daysSelected === null || daysSelected >= MIN_CAMPAIGN_DAYS;

  const filteredBillboards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return billboards.filter((billboard) => {
      const matchesQuery =
        !normalizedQuery ||
        billboard.title.toLowerCase().includes(normalizedQuery) ||
        billboard.location.toLowerCase().includes(normalizedQuery);

      const matchesLocation = location === 'All locations' || billboard.location === location;

      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(billboard.type);

      const matchesBudget = billboard.pricePerWeek <= maxWeeklyBudget;

      const matchesAvailability =
        !meetsMinimum || isAvailable(billboard.bookedRanges, startDate, endDate);

      return matchesQuery && matchesLocation && matchesType && matchesBudget && matchesAvailability;
    });
  }, [billboards, query, location, selectedTypes, maxWeeklyBudget, startDate, endDate, meetsMinimum]);

  function toggleType(type) {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
    );
  }

  return (
    // `data-map-theme` drives the `map-dark:` variant on the floating panels —
    // they sit over the tiles, so they follow the map's style rather than the
    // OS colour scheme. `overflow-hidden` contains the reveal's slight scale.
    <div
      className={`map-reveal fixed inset-0 overflow-hidden ${revealed ? 'is-revealed' : ''}`}
      data-map-theme={theme}
    >
      <MapContainer
        ref={mapRef}
        center={NAIROBI_CENTER}
        zoom={12}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer url={TILE_THEMES[theme].url} attribution={TILE_THEMES[theme].attribution} />
        {filteredBillboards.map((billboard) => {
          const showAvailability = Boolean(startDate && endDate && meetsMinimum);
          const free = showAvailability && isAvailable(billboard.bookedRanges, startDate, endDate);

          return (
            <CircleMarker
              key={billboard.id}
              center={[billboard.lat, billboard.lng]}
              radius={9}
              pathOptions={{ color: '#fff', weight: 2, fillColor: '#8A3DF0', fillOpacity: 1 }}
              eventHandlers={{
                // Zoom into the spot the customer clicked, surface its details in
                // the side panel, then the popup anchors there.
                click: () => {
                  setSelectedId(billboard.id);
                  mapRef.current?.flyTo([billboard.lat, billboard.lng], 15, { duration: 0.8 });
                },
              }}
            >
              <Popup>
                <div className="w-56">
                  <img
                    src="/map-billboard.jpg"
                    alt={billboard.title}
                    loading="lazy"
                    className="h-28 w-full rounded-lg object-cover"
                  />
                  <p className="mt-2 font-semibold text-forest">{billboard.title}</p>
                  <p className="text-xs text-stone-500">{billboard.location}</p>

                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-medium text-gold-dark">
                      {billboardTypeLabel(billboard.type)}
                    </span>
                    <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-medium text-stone-600">
                      {billboard.size}
                    </span>
                  </div>

                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-sm font-bold text-gold-dark">
                      {formatKES(billboard.pricePerWeek)}
                      <span className="text-xs font-normal text-stone-500">/week</span>
                    </span>
                    <span className="text-xs text-stone-500">{formatKES(billboard.pricePerDay)}/day</span>
                  </div>

                  {showAvailability && (
                    <span
                      className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        free ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {free ? 'Available for your dates' : 'Booked for your dates'}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => navigate(`/billboards/${billboard.id}`)}
                    className="mt-3 w-full rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gold-soft"
                  >
                    View details &amp; book
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <MapSearchBar
        query={query}
        onQueryChange={setQuery}
        locations={locations}
        location={location}
        onLocationChange={setLocation}
        count={filteredBillboards.length}
        loading={loading}
        hidden={selectedId !== null}
      />

      <MapControls
        theme={theme}
        onThemeChange={setTheme}
        onZoomIn={() => mapRef.current?.zoomIn()}
        onZoomOut={() => mapRef.current?.zoomOut()}
      />

      {error && (
        <div className="absolute left-1/2 top-24 z-[900] -translate-x-1/2 rounded-2xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700 shadow">
          {error}
        </div>
      )}

      <FilterPanel
        selectedBillboard={billboards.find((billboard) => billboard.id === selectedId) || null}
        onClearSelected={() => setSelectedId(null)}
        onViewDetails={(billboardId) => navigate(`/billboards/${billboardId}`)}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        daysSelected={daysSelected}
        meetsMinimum={meetsMinimum}
        locations={locations}
        location={location}
        onLocationChange={setLocation}
        billboardTypes={BILLBOARD_TYPES}
        selectedTypes={selectedTypes}
        onToggleType={toggleType}
        maxWeeklyBudget={maxWeeklyBudget === Infinity ? budgetBounds.max : maxWeeklyBudget}
        budgetBounds={budgetBounds}
        onMaxWeeklyBudgetChange={setMaxWeeklyBudget}
        count={loading ? 0 : filteredBillboards.length}
      />
    </div>
  );
}
