import { MIN_CAMPAIGN_DAYS, availableFrom, formatKES, isAvailable } from '../../utils/availability';
import { billboardTypeLabel } from '../../data/billboardTypes';

export default function FilterPanel({
  selectedBillboard,
  onClearSelected,
  onViewDetails,
  query,
  onQueryChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  daysSelected,
  meetsMinimum,
  locations,
  location,
  onLocationChange,
  billboardTypes,
  selectedTypes,
  onToggleType,
  maxWeeklyBudget,
  budgetBounds,
  onMaxWeeklyBudgetChange,
  count,
}) {
  return (
    <div className="absolute right-4 top-24 z-[900] max-h-[80vh] w-80 overflow-y-auto rounded-3xl border border-sand bg-cream/95 p-5 shadow-xl backdrop-blur">
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search locations..."
          className="w-full rounded-full bg-sand py-3 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold"
        />
      </div>

      <span className="mt-4 inline-block rounded-full bg-gold px-3 py-1 text-xs font-bold uppercase tracking-wide text-forest">
        Live Inventory
      </span>
      <p className="mt-2 text-2xl font-bold text-slate-900">
        {count} Board{count === 1 ? '' : 's'}
      </p>

      {selectedBillboard && (
        <SelectedBillboardCard
          billboard={selectedBillboard}
          startDate={startDate}
          endDate={endDate}
          meetsMinimum={meetsMinimum}
          onClear={onClearSelected}
          onViewDetails={onViewDetails}
        />
      )}

      <SectionLabel icon={<CalendarIcon />}>Campaign Dates</SectionLabel>
      <div className="rounded-2xl bg-campaign-green p-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="panel-start" className="block text-xs font-medium text-slate-600">
              Start
            </label>
            <input
              id="panel-start"
              type="date"
              value={startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
          <div>
            <label htmlFor="panel-end" className="block text-xs font-medium text-slate-600">
              End
            </label>
            <input
              id="panel-end"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => onEndDateChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
        </div>
        <p className="mt-2 flex items-center gap-1 text-xs text-slate-600">
          <InfoIcon className="h-3.5 w-3.5" />
          Min. {MIN_CAMPAIGN_DAYS} days booking
        </p>
        {daysSelected !== null && !meetsMinimum && (
          <p className="mt-1 text-xs font-medium text-red-600">
            Selected range is {daysSelected} day{daysSelected === 1 ? '' : 's'} — extend it to at least{' '}
            {MIN_CAMPAIGN_DAYS} days to filter by availability.
          </p>
        )}
      </div>

      <SectionLabel icon={<PinIcon />}>Location</SectionLabel>
      <select
        value={location}
        onChange={(event) => onLocationChange(event.target.value)}
        className="w-full rounded-2xl bg-sand px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold"
      >
        <option value="All locations">All locations</option>
        {locations.map((loc) => (
          <option key={loc} value={loc}>
            {loc}
          </option>
        ))}
      </select>

      <SectionLabel icon={<SizeIcon />}>Size</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        {billboardTypes.map((type) => {
          const selected = selectedTypes.includes(type.value);
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onToggleType(type.value)}
              className={`rounded-xl px-3 py-2 text-xs font-medium ${
                selected
                  ? 'bg-gold text-forest'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {type.label}
            </button>
          );
        })}
      </div>

      <SectionLabel icon={<BudgetIcon />}>Weekly Budget</SectionLabel>
      <input
        type="range"
        min={budgetBounds.min}
        max={budgetBounds.max}
        step={1000}
        value={maxWeeklyBudget}
        onChange={(event) => onMaxWeeklyBudgetChange(Number(event.target.value))}
        className="w-full accent-gold"
      />
      <p className="mt-1 text-xs text-slate-600">
        Up to {formatKES(maxWeeklyBudget)}/week
      </p>
    </div>
  );
}

function SelectedBillboardCard({ billboard, startDate, endDate, meetsMinimum, onClear, onViewDetails }) {
  const datesChosen = Boolean(startDate && endDate && meetsMinimum);
  const free = datesChosen && isAvailable(billboard.bookedRanges, startDate, endDate);
  const freeFrom = availableFrom(billboard.bookedRanges);

  return (
    <div className="mt-4 rounded-2xl border-2 border-gold bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-forest">{billboard.title}</p>
          <p className="truncate text-xs text-stone-500">{billboard.location}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className="-mr-1 -mt-1 rounded-full p-1 text-stone-400 transition hover:bg-sand hover:text-stone-600"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-medium text-gold-dark">
          {billboardTypeLabel(billboard.type)}
        </span>
        <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-medium text-stone-600">
          {billboard.size}
        </span>
      </div>

      <dl className="mt-3 space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <dt className="flex items-center gap-1.5 text-stone-500">
            <CalendarIcon />
            Available from
          </dt>
          <dd className="font-semibold text-forest">{formatDate(freeFrom)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="flex items-center gap-1.5 text-stone-500">
            <TagIcon />
            Price range
          </dt>
          <dd className="text-right font-semibold text-gold-dark">
            {formatKES(billboard.pricePerDay)}
            <span className="font-normal text-stone-500">/day</span>
            {' · '}
            {formatKES(billboard.pricePerWeek)}
            <span className="font-normal text-stone-500">/wk</span>
          </dd>
        </div>
      </dl>

      {datesChosen && (
        <span
          className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            free ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
          }`}
        >
          {free ? 'Available for your dates' : 'Booked for your dates'}
        </span>
      )}

      <button
        type="button"
        onClick={() => onViewDetails(billboard.id)}
        className="mt-3 w-full rounded-full bg-gold px-3 py-2 text-xs font-bold uppercase tracking-wide text-forest transition hover:bg-gold-soft"
      >
        View details &amp; book
      </button>
    </div>
  );
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function SectionLabel({ icon, children }) {
  return (
    <div className="mb-2 mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700">
      {icon}
      {children}
    </div>
  );
}

function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function InfoIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 1 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function SizeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M21 3l-7 7M21 3v5M21 3h-5M3 21l7-7M3 21v-5M3 21h5" />
    </svg>
  );
}

function BudgetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0l-7-7A2 2 0 0 1 3 12.2V5a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6l7 7a2 2 0 0 1 0 2.8z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  );
}
