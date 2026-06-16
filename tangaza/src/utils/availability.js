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

export function formatKES(amount) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount);
}
