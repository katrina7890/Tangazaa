import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyPayments } from '../../api';
import { useCustomerData } from '../../components/customer/CustomerLayout';
import {
  EmptyState,
  ErrorNotice,
  SectionHeading,
  StatCard,
  StatusBadge,
  formatDateTime,
} from '../../components/customer/ui';
import { formatKES } from '../../utils/availability';

/**
 * Billing: what's still owed, and every transaction attempt ever made.
 * Unlike a booking's `payment` field (the latest attempt only), this includes
 * failed and superseded transactions so the history reconciles.
 */
export default function CustomerPaymentsPage() {
  const { bookings, error, payBooking, payingId } = useCustomerData();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetchMyPayments()
      .then(setPayments)
      .catch(() => setLoadError('Could not load your payment history.'))
      .finally(() => setLoading(false));
  }, []);

  // A booking that was paid for and later cancelled still shows in history,
  // but it isn't outstanding — only live pending bookings are.
  const outstanding = useMemo(
    () => bookings.filter((booking) => booking.status === 'pending'),
    [bookings],
  );
  const outstandingTotal = useMemo(
    () => outstanding.reduce((sum, booking) => sum + booking.totalPrice, 0),
    [outstanding],
  );
  const paidTotal = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === 'success')
        .reduce((sum, payment) => sum + payment.amount, 0),
    [payments],
  );

  return (
    <div className="space-y-10">
      <ErrorNotice>{error || loadError}</ErrorNotice>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Paid to date" value={formatKES(paidTotal)} accent="#16704A" />
        <StatCard label="Transactions" value={payments.length} accent="#8A3DF0" />
        <StatCard
          label="Outstanding"
          value={formatKES(outstandingTotal)}
          highlight={outstandingTotal > 0}
          accent="#E4572E"
          hint={outstanding.length ? `${outstanding.length} awaiting payment` : 'Nothing owed'}
        />
      </div>

      {outstanding.length > 0 && (
        <section>
          <SectionHeading>Awaiting payment</SectionHeading>
          <div className="mt-4 space-y-3">
            {outstanding.map((booking) => (
              <div
                key={booking.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/30 bg-gold/10 px-5 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-forest">{booking.billboard.title}</p>
                  <p className="text-sm text-stone-600">
                    {formatKES(booking.totalPrice)} · your dates aren&apos;t held until this clears
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => payBooking(booking)}
                  disabled={payingId === booking.id}
                  className="shrink-0 rounded-full bg-gold px-5 py-2 text-sm font-bold text-white transition hover:bg-gold-soft disabled:opacity-60"
                >
                  {payingId === booking.id ? 'Opening checkout…' : 'Complete payment'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeading
          action={
            <Link to="/dashboard/documents" className="text-sm font-semibold text-gold-dark hover:underline">
              Download receipts →
            </Link>
          }
        >
          Payment history
        </SectionHeading>

        {loading ? (
          <p className="mt-4 text-stone-600">Loading your payments…</p>
        ) : payments.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No payments yet">
              Once you pay for a campaign, every transaction shows up here.
            </EmptyState>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-3xl border border-sand bg-white shadow-sm">
            {/* Table scrolls inside its own container so the page never does. */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-sm">
                <thead>
                  <tr className="border-b border-sand text-left text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
                    <th className="px-5 py-3">Reference</th>
                    <th className="px-5 py-3">Campaign</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-sand/60 last:border-0">
                      <td className="px-5 py-3.5 font-mono text-xs text-stone-600">{payment.reference}</td>
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/dashboard/bookings/${payment.bookingId}/progress`}
                          className="font-medium text-forest hover:underline"
                        >
                          {payment.billboard}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-stone-500">
                        {formatDateTime(payment.paidAt || payment.createdAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={payment.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-forest">
                        {formatKES(payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
