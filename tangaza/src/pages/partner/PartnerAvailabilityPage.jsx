import { useEffect, useMemo, useState } from 'react';
import { fetchMyBillboards } from '../../api';
import AvailabilityCalendar from '../../components/AvailabilityCalendar';
import { Badge, EmptyState, SectionCard, formatDisplayDate } from '../../components/partner/ui';
import { availableFrom, todayISO } from '../../utils/availability';

/**
 * One calendar per billboard: pick a board on the left, see its confirmed
 * bookings crossed out on the right — the same truth customers see on the app.
 */
export default function PartnerAvailabilityPage() {
  const [billboards, setBillboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetchMyBillboards()
      .then((boards) => {
        setBillboards(boards);
        if (boards.length > 0) setSelectedId(boards[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(
    () => billboards.find((board) => board.id === selectedId) || null,
    [billboards, selectedId]
  );

  if (loading) return <p className="text-stone-600">Loading…</p>;
  if (billboards.length === 0) {
    return <EmptyState>No billboards yet — list one from the My Billboards page first.</EmptyState>;
  }

  const minDate = selected
    ? [todayISO(), selected.availableFrom || todayISO()].sort()[1]
    : todayISO();
  const nextFree = selected ? availableFrom(selected.bookedRanges, minDate) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <SectionCard title="Your billboards">
        <div className="space-y-2">
          {billboards.map((board) => (
            <button
              key={board.id}
              type="button"
              onClick={() => setSelectedId(board.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition ${
                board.id === selectedId
                  ? 'border-gold bg-gold/10 shadow-sm'
                  : 'border-sand bg-white hover:border-gold/60'
              }`}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{board.title}</p>
                <p className="truncate text-sm text-slate-500">{board.location}</p>
              </div>
              <Badge tone={board.bookedRanges.length > 0 ? 'gold' : 'emerald'}>
                {board.bookedRanges.length > 0
                  ? `${board.bookedRanges.length} booking${board.bookedRanges.length > 1 ? 's' : ''}`
                  : 'Open'}
              </Badge>
            </button>
          ))}
        </div>
      </SectionCard>

      {selected && (
        <SectionCard title={selected.title}>
          <p className="mb-3 text-sm text-stone-600">
            Next free date:{' '}
            <span className="font-semibold text-emerald-700">{formatDisplayDate(nextFree)}</span>
            {selected.availableFrom && (
              <span className="text-stone-500"> · listed from {formatDisplayDate(selected.availableFrom)}</span>
            )}
          </p>
          <AvailabilityCalendar
            mode="view"
            bookedRanges={selected.bookedRanges}
            minDate={minDate}
            nextAvailable={nextFree}
          />
          <p className="mt-3 text-xs text-stone-500">
            Crossed-out days are confirmed bookings (app and offline). Record an off-app deal in the Sync tab to
            block dates here and on the customer map.
          </p>
        </SectionCard>
      )}
    </div>
  );
}
