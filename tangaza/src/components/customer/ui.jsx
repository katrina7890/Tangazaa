/** Shared primitives for the customer workspace — the counterpart to
 *  components/partner/ui.jsx. Keeps the six dashboard sections visually
 *  identical without each page re-deriving the house style. */

export function SectionHeading({ children, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-forest">
        <span className="h-5 w-1 rounded-full bg-gold" />
        {children}
      </h2>
      {action}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-sand bg-white p-6 shadow-sm ${className}`}>{children}</div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="rounded-3xl border border-dashed border-sand-dark bg-white p-10 text-center">
      <p className="font-semibold text-forest">{title}</p>
      {children && <p className="mt-1 text-sm text-stone-600">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, accent = '#8A3DF0', highlight = false, hint }) {
  // The highlight variant is a full Masterpiece Coral surface — reserved for
  // the money/"masterpiece" stat so it pops against the plain white cards.
  if (highlight) {
    return (
      <div className="rounded-2xl border border-coral bg-coral p-5 shadow-sm">
        <p className="text-sm font-semibold text-coral-ink">{label}</p>
        <p className="mt-1 font-serif text-2xl font-bold text-coral-ink">{value}</p>
        {hint && <p className="mt-1 text-xs text-coral-ink/70">{hint}</p>}
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-sand border-t-4 bg-white p-5 shadow-sm"
      style={{ borderTopColor: accent }}
    >
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 font-serif text-2xl font-semibold text-forest">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-400">{hint}</p>}
    </div>
  );
}

const STATUS_STYLES = {
  confirmed: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-stone-200 text-stone-600',
  success: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize shadow-sm ${
        STATUS_STYLES[status] || 'bg-stone-200 text-stone-700'
      }`}
    >
      {status}
    </span>
  );
}

export function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-right text-stone-800">{value}</dd>
    </div>
  );
}

export function ErrorNotice({ children }) {
  if (!children) return null;
  return (
    <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{children}</p>
  );
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
