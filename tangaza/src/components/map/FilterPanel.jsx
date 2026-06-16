import { MIN_CAMPAIGN_DAYS, formatKES } from '../../utils/availability';

export default function FilterPanel({
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
          className="w-full rounded-full bg-sand py-3 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      <span className="mt-4 inline-block rounded-full bg-violet-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
        Live Inventory
      </span>
      <p className="mt-2 text-2xl font-bold text-slate-900">
        {count} Board{count === 1 ? '' : 's'}
      </p>

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
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500"
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
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500"
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
        className="w-full rounded-2xl bg-sand px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                  ? 'bg-violet-600 text-white'
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
        className="w-full accent-violet-600"
      />
      <p className="mt-1 text-xs text-slate-600">
        Up to {formatKES(maxWeeklyBudget)}/week
      </p>
    </div>
  );
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
