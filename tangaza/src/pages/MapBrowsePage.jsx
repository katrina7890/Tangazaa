import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import FilterPanel from '../components/map/FilterPanel';
import MapControls from '../components/map/MapControls';
import { NAIROBI_CENTER, TILE_THEMES } from '../components/map/tileThemes';
import { fetchBillboards } from '../api';
import { BILLBOARD_TYPES } from '../data/billboardTypes';
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
    <div className="fixed inset-0">
      <MapContainer
        ref={mapRef}
        center={NAIROBI_CENTER}
        zoom={12}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer url={TILE_THEMES[theme].url} attribution={TILE_THEMES[theme].attribution} />
        {filteredBillboards.map((billboard) => (
          <CircleMarker
            key={billboard.id}
            center={[billboard.lat, billboard.lng]}
            radius={9}
            pathOptions={{ color: '#fff', weight: 2, fillColor: '#7c3aed', fillOpacity: 1 }}
          >
            <Popup>
              <p className="font-semibold text-slate-900">{billboard.title}</p>
              <p className="text-sm text-slate-600">{billboard.location}</p>
              <p className="mt-1 text-sm font-medium text-violet-700">
                {formatKES(billboard.pricePerWeek)}/week
              </p>
              <button
                type="button"
                onClick={() => navigate(`/billboards/${billboard.id}`)}
                className="mt-2 text-sm font-semibold text-violet-700 underline"
              >
                View details
              </button>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <MapControls
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
        onZoomIn={() => mapRef.current?.zoomIn()}
        onZoomOut={() => mapRef.current?.zoomOut()}
      />

      {error && (
        <div className="absolute left-1/2 top-24 z-[900] -translate-x-1/2 rounded-2xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700 shadow">
          {error}
        </div>
      )}

      <FilterPanel
        query={query}
        onQueryChange={setQuery}
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
