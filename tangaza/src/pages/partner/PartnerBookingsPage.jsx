import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPartnerBookings, fetchPartnerReminders } from '../../api';
import BillboardImage from '../../components/BillboardImage';
import PaymentStatusBadge from '../../components/PaymentStatusBadge';
import { deriveProgress, substatusLabel } from '../../components/partner/pipeline';
import { Badge, Chip, EmptyState, formatDisplayDate } from '../../components/partner/ui';
import { formatKES } from '../../utils/availability';

/**
 * The heart of the ERP: every booking (app + offline) with its 7-stage
 * pipeline at a glance. Click through for the full package-tracking view.
 */
export default function PartnerBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('');

  useEffect(() => {
    fetchPartnerReminders().then(setReminders).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPartnerBookings(sourceFilter ? { source: sourceFilter } : {})
      .then(setBookings)
      .finally(() => setLoading(false));
  }, [sourceFilter]);

  const active = bookings.filter((booking) => booking.status !== 'cancelled');

  return (
    <div className="space-y-6">
      {reminders.length > 0 && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-amber-700">
            Needs attention
          </p>
          <ul className="mt-3 space-y-2">
            {reminders.map((reminder, index) => (
              <li key={`${reminder.type}-${index}`} className="flex items-start gap-2.5 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <div className="min-w-0">
                  {reminder.bookingId ? (
                    <Link
                      to={`/partner/bookings/${reminder.bookingId}`}
                      className="font-semibold text-amber-900 hover:underline"
                    >
                      {reminder.title}
                    </Link>
                  ) : (
                    <span className="font-semibold text-amber-900">{reminder.title}</span>
                  )}
                  {reminder.detail && <span className="text-amber-700"> · {reminder.detail}</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex gap-2">
        {[
          { value: '', label: 'All bookings' },
          { value: 'app', label: 'From the app' },
          { value: 'offline', label: 'Offline deals' },
        ].map(({ value, label }) => (
          <Chip key={value} active={sourceFilter === value} onClick={() => setSourceFilter(value)}>
            {label}
          </Chip>
        ))}
      </div>

      {loading ? (
        <p className="text-stone-600">Loading…</p>
      ) : active.length === 0 ? (
        <EmptyState>
          No bookings yet — app bookings land here automatically, offline deals via{' '}
          <Link to="/partner/sync" className="font-semibold text-gold-dark hover:underline">
            Sync
          </Link>
          .
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {active.map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookingRow({ booking }) {
  const progress = deriveProgress(booking);
  const advertiser = booking.customer
    ? booking.customer.company_name || booking.customer.name
    : booking.contact
      ? booking.contact.company || booking.contact.name
      : '—';
  const currentRow = (booking.stages || []).find((row) => row.stage === progress.current?.value);

  return (
    <Link
      to={`/partner/bookings/${booking.id}`}
      className="flex flex-wrap items-center gap-4 rounded-3xl border border-sand bg-white p-4 transition hover:border-gold/50"
    >
      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl">
        <BillboardImage
          id={booking.billboard?.id}
          title={booking.billboard?.title}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-slate-900">{booking.billboard?.title}</p>
          <Badge tone={booking.source === 'offline' ? 'forest' : 'gold'}>
            {booking.source === 'offline' ? 'Offline deal' : 'Tangazaa app'}
          </Badge>
          {booking.source === 'app' && (
            <PaymentStatusBadge bookingStatus={booking.status} paymentStatus={booking.payment?.status} />
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-slate-600">
          {advertiser} · {formatDisplayDate(booking.startDate)} → {formatDisplayDate(booking.endDate)}
        </p>
        <p className="mt-0.5 text-xs text-stone-500">
          {progress.current ? (
            <>
              <span className="font-semibold text-sky-700">{progress.current.label}</span>
              {currentRow?.substatus && <> · {substatusLabel(currentRow.substatus)}</>}
              {currentRow?.assignedTo && <> · {currentRow.assignedTo}</>}
            </>
          ) : (
            <span className="font-semibold text-emerald-700">Pipeline complete</span>
          )}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <p className="text-sm font-semibold text-gold-dark">{formatKES(booking.totalPrice)}</p>
        {/* Mini package-tracking bar: green done, blue current, grey future. */}
        <div className="flex items-center gap-1">
          {progress.applicable.map((stage) => (
            <span
              key={stage.value}
              title={stage.label}
              className={`h-1.5 w-4 rounded-full ${
                progress.done.has(stage.value)
                  ? 'bg-emerald-500'
                  : stage.value === progress.current?.value
                    ? 'bg-sky-500'
                    : 'bg-sand'
              }`}
            />
          ))}
        </div>
        <p className="text-[11px] text-stone-400">
          {progress.completedCount}/{progress.total} stages
        </p>
      </div>
    </Link>
  );
}
