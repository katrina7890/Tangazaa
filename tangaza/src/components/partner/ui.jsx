// Small shared primitives for the Tangazaa Partner screens, so every page
// speaks the same forest/gold dialect without repeating class soup.

export const inputClass =
  'w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30';

export const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500';

export const goldButtonClass =
  'rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-50';

export const ghostButtonClass =
  'rounded-full border border-sand bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-gold hover:text-gold-dark';

export function SectionCard({ title, action, children }) {
  return (
    <section className="rounded-3xl border border-sand bg-white p-5 shadow-sm">
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-forest">
              <span className="h-5 w-1 rounded-full bg-gold" />
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-sand-dark bg-cream/40 p-8 text-center text-sm text-stone-600">
      {children}
    </div>
  );
}

export function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
        active
          ? 'bg-forest text-cream shadow-sm'
          : 'border border-sand bg-white text-stone-600 hover:border-gold hover:text-gold-dark'
      }`}
    >
      {children}
    </button>
  );
}

const BADGE_STYLES = {
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  sky: 'bg-sky-100 text-sky-700',
  stone: 'bg-slate-100 text-slate-600',
  red: 'bg-red-100 text-red-700',
  gold: 'bg-gold/15 text-gold-dark',
  forest: 'bg-forest/10 text-forest',
};

export function Badge({ tone = 'stone', children }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_STYLES[tone]}`}>
      {children}
    </span>
  );
}

export const ARTWORK_STATUSES = [
  { value: 'brief', label: 'Brief received', tone: 'stone' },
  { value: 'in_design', label: 'In design', tone: 'sky' },
  { value: 'awaiting_approval', label: 'Awaiting approval', tone: 'amber' },
  { value: 'approved', label: 'Approved', tone: 'emerald' },
  { value: 'rejected', label: 'Rejected', tone: 'red' },
];

export const JOB_TYPES = [
  { value: 'printing', label: 'Printing' },
  { value: 'installation', label: 'Installation' },
  { value: 'removal', label: 'Removal' },
  { value: 'maintenance', label: 'Maintenance' },
];

export const JOB_STATUSES = [
  { value: 'pending', label: 'Pending', tone: 'stone' },
  { value: 'scheduled', label: 'Scheduled', tone: 'sky' },
  { value: 'in_progress', label: 'In progress', tone: 'amber' },
  { value: 'completed', label: 'Completed', tone: 'emerald' },
  { value: 'cancelled', label: 'Cancelled', tone: 'red' },
];

export function statusMeta(list, value) {
  return list.find((item) => item.value === value) || { value, label: value, tone: 'stone' };
}

export function formatDisplayDate(dateISO) {
  if (!dateISO) return '—';
  return new Date(`${dateISO.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
