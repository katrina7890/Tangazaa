/**
 * Small chip showing whether a booking has been paid for. Used on both the
 * customer dashboard and the owner's bookings list.
 *
 * A booking is "Paid" once payment has settled — i.e. the booking is
 * `confirmed` (payment promotes it) or its latest payment is `success`.
 * A `cancelled` booking shows nothing here (its status badge already says so).
 */
export default function PaymentStatusBadge({ bookingStatus, paymentStatus }) {
  if (bookingStatus === 'cancelled') return null;

  const paid = bookingStatus === 'confirmed' || paymentStatus === 'success';
  const failed = !paid && paymentStatus === 'failed';

  const { label, className } = paid
    ? { label: 'Paid', className: 'bg-emerald-100 text-emerald-800' }
    : failed
      ? { label: 'Payment failed', className: 'bg-red-100 text-red-700' }
      : { label: 'Payment pending', className: 'bg-amber-100 text-amber-800' };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${paid ? 'bg-emerald-500' : failed ? 'bg-red-500' : 'bg-amber-500'}`} />
      {label}
    </span>
  );
}
