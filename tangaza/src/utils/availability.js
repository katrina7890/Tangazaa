export const MIN_CAMPAIGN_DAYS = 30;

export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

export function isAvailable(bookedRanges, start, end) {
  if (!start || !end) return true;
  return !bookedRanges.some((range) => rangesOverlap(start, end, range.start, range.end));
}

export function conflictingRanges(bookedRanges, start, end) {
  if (!start || !end) return [];
  return bookedRanges.filter((range) => rangesOverlap(start, end, range.start, range.end));
}

export function daysBetween(start, end) {
  const ms = new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`);
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

// Format a Date from its local components, avoiding the UTC shift that
// toISOString() introduces for positive timezone offsets (e.g. Nairobi UTC+3).
function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayISO() {
  return toISODate(new Date());
}

function addDaysISO(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

// Earliest date (YYYY-MM-DD) the billboard is free, walking past any confirmed
// bookings that currently cover the start point.
export function availableFrom(bookedRanges, fromDate = todayISO()) {
  let cursor = fromDate;
  const sorted = [...bookedRanges].sort((a, b) => a.start.localeCompare(b.start));
  for (const range of sorted) {
    if (range.start <= cursor && cursor <= range.end) {
      cursor = addDaysISO(range.end, 1);
    }
  }
  return cursor;
}

export function formatKES(amount) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount);
}
