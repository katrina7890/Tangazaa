import { useMemo, useState } from 'react';
import { todayISO } from '../utils/availability';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n) => String(n).padStart(2, '0');
const iso = (year, monthIndex, day) => `${year}-${pad(monthIndex + 1)}-${pad(day)}`;

function inAnyRange(dateISO, ranges) {
  return ranges.some((range) => range.start <= dateISO && dateISO <= range.end);
}

// Every ISO date from start to end inclusive — used to reject a selected range
// that would straddle a booked or unavailable day.
function eachISO(startISO, endISO) {
  const out = [];
  const cursor = new Date(`${startISO}T00:00:00`);
  const last = new Date(`${endISO}T00:00:00`);
  while (cursor <= last) {
    out.push(iso(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/**
 * Month-grid availability calendar.
 *
 * - Days before `minDate` (already the later of today / the billboard's
 *   available-from) are greyed out and unselectable.
 * - Days inside a confirmed booked range are crossed out and unselectable.
 * - mode="select": click a free day to set the start, click a later free day to
 *   set the end. A range that would cross a blocked day restarts the selection.
 * - mode="view": read-only; the next free date gets a gold ring.
 */
export default function AvailabilityCalendar({
  bookedRanges = [],
  minDate = todayISO(),
  mode = 'select',
  value = { start: '', end: '' },
  onChange,
  nextAvailable = null,
}) {
  const initial = new Date(`${(value.start || minDate || todayISO())}T00:00:00`);
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });

  const cells = useMemo(() => {
    const firstWeekday = new Date(view.year, view.month, 1).getDay();
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const list = Array.from({ length: firstWeekday }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) list.push(day);
    return list;
  }, [view]);

  function handleClick(dateISO) {
    if (mode !== 'select' || !onChange) return;
    const { start, end } = value;
    // Begin a fresh selection if nothing started, both ends set, or clicked before start.
    if (!start || (start && end) || dateISO < start) {
      onChange({ start: dateISO, end: '' });
      return;
    }
    // Extending: reject a range that crosses a blocked day by restarting here.
    const spansBlocked = eachISO(start, dateISO).some(
      (d) => d < minDate || inAnyRange(d, bookedRanges)
    );
    onChange(spansBlocked ? { start: dateISO, end: '' } : { start, end: dateISO });
  }

  return (
    <div className="rounded-2xl border border-sand bg-white p-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} className={navClass} aria-label="Previous month">
          ‹
        </button>
        <p className="font-serif text-sm font-semibold text-forest">
          {MONTHS[view.month]} {view.year}
        </p>
        <button type="button" onClick={() => shift(1)} className={navClass} aria-label="Next month">
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((label) => (
          <span key={label} className="py-1 text-[11px] font-semibold uppercase text-stone-400">
            {label}
          </span>
        ))}

        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} />;

          const dateISO = iso(view.year, view.month, day);
          const isBooked = inAnyRange(dateISO, bookedRanges);
          const isPast = dateISO < minDate;
          const disabled = isBooked || isPast;

          const { start, end } = value;
          const isStart = dateISO === start;
          const isEnd = dateISO === end;
          const inSelected = start && end && start <= dateISO && dateISO <= end;
          const isNextAvailable = mode === 'view' && dateISO === nextAvailable;

          return (
            <button
              key={dateISO}
              type="button"
              disabled={disabled || mode === 'view'}
              onClick={() => handleClick(dateISO)}
              aria-label={`${dateISO}${isBooked ? ' (booked)' : isPast ? ' (unavailable)' : ''}`}
              className={cellClass({ disabled, isBooked, isStart, isEnd, inSelected, isNextAvailable, mode })}
            >
              {day}
            </button>
          );
        })}
      </div>

      <Legend mode={mode} />
    </div>
  );

  function shift(delta) {
    setView((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }
}

const navClass =
  'flex h-7 w-7 items-center justify-center rounded-full text-lg text-forest transition hover:bg-cream';

function cellClass({ disabled, isBooked, isStart, isEnd, inSelected, isNextAvailable, mode }) {
  const base =
    'relative flex h-9 w-full items-center justify-center rounded-lg text-sm transition';

  if (isBooked) {
    return `${base} cursor-not-allowed text-red-400 line-through`;
  }
  if (disabled) {
    return `${base} cursor-not-allowed text-stone-300`;
  }
  if (isStart || isEnd) {
    return `${base} bg-gold font-bold text-forest`;
  }
  if (inSelected) {
    return `${base} bg-gold-soft/60 text-forest`;
  }
  if (isNextAvailable) {
    return `${base} text-forest ring-2 ring-gold`;
  }
  return `${base} text-stone-700 ${mode === 'select' ? 'hover:bg-cream' : ''}`;
}

function Legend({ mode }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded bg-gold" />
        {mode === 'view' ? 'Available' : 'Selected'}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded bg-red-100 line-through text-red-400">×</span>
        Booked
      </span>
      {mode === 'view' && nextAvailableHint()}
    </div>
  );
}

function nextAvailableHint() {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-3 w-3 rounded ring-2 ring-gold" />
      Next free date
    </span>
  );
}
