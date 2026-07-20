import { useEffect, useState } from 'react';
import { fetchPartnerAnalytics } from '../../api';
import { EmptyState, SectionCard } from '../../components/partner/ui';
import { formatKES } from '../../utils/availability';

/** Business insights (ERP PRD §6) — computed live, CSS bar charts, no libs. */
export default function PartnerAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPartnerAnalytics()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-stone-600">Loading…</p>;
  if (!data) return <EmptyState>Couldn&apos;t load analytics — try refreshing.</EmptyState>;

  const { stats, revenueByMonth, revenueByBillboard, mostBookedLocations, insights } = data;
  const showMoney = stats.appRevenue != null;

  const cards = [
    { label: 'Occupancy rate', value: `${stats.occupancyRate}%` },
    { label: 'Avg booking duration', value: stats.avgDurationDays != null ? `${stats.avgDurationDays} days` : '—' },
    { label: 'Avg booking lead time', value: stats.avgLeadTimeDays != null ? `${stats.avgLeadTimeDays} days` : '—' },
    { label: 'Booking conversion', value: stats.conversionRate != null ? `${stats.conversionRate}%` : '—', sub: 'App requests that get paid' },
    ...(showMoney
      ? [
          { label: 'Tangazaa revenue', value: formatKES(stats.appRevenue), sub: 'From app bookings' },
          { label: 'Offline revenue', value: formatKES(stats.offlineRevenue), sub: 'Your own sales channels' },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map(({ label, value, sub }) => (
          <div key={label} className="rounded-2xl border border-sand bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500">{label}</p>
            <p className="mt-1.5 font-serif text-3xl font-bold tracking-tight text-forest">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-stone-400">{sub}</p>}
          </div>
        ))}
      </div>

      {insights.length > 0 && (
        <SectionCard title="Recommendations">
          <ul className="space-y-3">
            {insights.map((insight, index) => (
              <li key={index} className="rounded-2xl border border-sand bg-cream/40 p-3.5">
                <p className="text-sm font-semibold text-slate-800">{insight.message}</p>
                <p className="mt-0.5 text-xs text-stone-500">{insight.suggestion}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {showMoney && (
          <SectionCard title="Revenue by month">
            <BarList
              items={revenueByMonth.map((row) => ({ label: row.month, value: row.revenue }))}
              format={formatKES}
            />
          </SectionCard>
        )}
        {showMoney && (
          <SectionCard title="Revenue by billboard">
            <BarList
              items={revenueByBillboard.map((row) => ({ label: row.title, value: row.revenue }))}
              format={formatKES}
            />
          </SectionCard>
        )}
        <SectionCard title="Most booked locations">
          <BarList
            items={mostBookedLocations.map((row) => ({ label: row.location, value: row.bookings }))}
            format={(value) => `${value} booking${value === 1 ? '' : 's'}`}
            tone="bg-forest"
          />
        </SectionCard>
      </div>
    </div>
  );
}

function BarList({ items, format, tone = 'bg-gold' }) {
  if (items.length === 0) return <EmptyState>No data yet.</EmptyState>;
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-slate-700">{item.label}</span>
            <span className="shrink-0 font-semibold text-slate-900">{format(item.value)}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand/60">
            <div className={`h-full rounded-full ${tone}`} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
