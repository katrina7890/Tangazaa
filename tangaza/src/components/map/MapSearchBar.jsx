/**
 * The filter bar across the top of the browse map: the primary search, quick
 * area shortcuts, and a live result count.
 *
 * This is the *only* search input on the map — it was moved here out of
 * FilterPanel rather than duplicated, since two boxes bound to the same
 * `query` state is a confusing control, not a convenience. The side panel
 * keeps the detailed filters (dates, type, budget).
 */
export default function MapSearchBar({
  query,
  onQueryChange,
  locations,
  location,
  onLocationChange,
  count,
  loading,
  hidden = false,
}) {
  // A handful of shortcuts; the full list stays in the panel's dropdown.
  const shortcuts = locations.slice(0, 4);
  const filtered = query.trim() !== '' || location !== 'All locations';

  function clearAll() {
    onQueryChange('');
    onLocationChange('All locations');
  }

  return (
    // Slides away while a billboard is selected, so the panel's detail card has
    // the stage. `inert` keeps it out of the tab order and the a11y tree while
    // it's off-screen — opacity alone would leave a focusable ghost.
    <div
      aria-hidden={hidden}
      // React 19 wants a real boolean here — an empty string is dropped, which
      // leaves the off-screen input still tabbable.
      inert={hidden}
      className={`pointer-events-none absolute inset-x-0 top-20 z-[901] flex justify-center px-4 transition duration-300 ease-out sm:top-24 ${
        hidden ? '-translate-y-6 opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      <div
        // Rounded rectangle at every width, matching the map's side menu
        // (FilterPanel is rounded-3xl) rather than the pill `sm:rounded-full` gave.
        className={`w-full max-w-xl rounded-3xl border border-sand bg-cream/95 p-2.5 shadow-xl backdrop-blur map-dark:border-white/10 map-dark:bg-forest-deep/95 sm:p-2 ${
          hidden ? 'pointer-events-none' : 'pointer-events-auto'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="pl-3 text-stone-500 map-dark:text-cream/50" aria-hidden>
            <SearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Where are you looking to advertise?"
            aria-label="Search billboards by area or name"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-forest placeholder:text-stone-500 focus:outline-none map-dark:text-cream map-dark:placeholder:text-cream/50"
          />

          <span
            className="hidden shrink-0 rounded-full bg-gold px-3.5 py-1.5 text-xs font-bold text-white sm:inline-block"
            aria-live="polite"
          >
            {loading ? 'Loading…' : `${count} board${count === 1 ? '' : 's'}`}
          </span>

          {filtered && (
            <button
              type="button"
              onClick={clearAll}
              className="mr-1 shrink-0 rounded-full p-1.5 text-stone-400 transition hover:bg-sand hover:text-forest map-dark:text-cream/50 map-dark:hover:bg-white/10 map-dark:hover:text-cream"
              aria-label="Clear search and area filter"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        {shortcuts.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-1 pb-1 pt-2 sm:px-3">
            {/* Both tones are AA-measured for 11px: the original stone-400 /
                cream-40 pair came in at 3.0 and 3.43:1. */}
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-600 map-dark:text-cream/60">
              Popular
            </span>
            {shortcuts.map((area) => {
              const active = location === area;
              return (
                <button
                  key={area}
                  type="button"
                  // Clicking an active chip clears it, so the row toggles.
                  onClick={() => onLocationChange(active ? 'All locations' : area)}
                  aria-pressed={active}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                    active
                      ? // Inverts on dark, where ink-on-ink would vanish.
                        'bg-forest text-cream map-dark:bg-cream map-dark:text-forest'
                      : 'bg-sand text-forest/70 hover:bg-sand-dark hover:text-forest map-dark:bg-white/10 map-dark:text-cream/70 map-dark:hover:bg-white/20 map-dark:hover:text-cream'
                  }`}
                >
                  {area}
                </button>
              );
            })}
            <span className="ml-auto text-xs font-bold text-forest map-dark:text-cream sm:hidden">
              {loading ? '…' : `${count} board${count === 1 ? '' : 's'}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}
