import { useState } from 'react';
import { verifyPayment } from '../../api';
import { formatKES } from '../../utils/availability';

/**
 * Simulated Paystack inline checkout. A real integration would redirect to (or
 * embed) Paystack's hosted page; here we mimic its look and settle through our
 * own /payments/{reference}/verify endpoint so the demo needs no API keys.
 */
export default function PaymentModal({ payment, onSuccess, onClose }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  async function settle(success) {
    setProcessing(true);
    setError('');
    try {
      const result = await verifyPayment(payment.reference, success);
      if (result.payment?.status === 'success') {
        onSuccess(result.booking);
      } else {
        setError('Payment was declined. You can try again.');
      }
    } catch (settleError) {
      setError(settleError.message || 'Something went wrong processing your payment.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-forest-deep/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Paystack-style header */}
        <div className="flex items-center justify-between bg-[#011B33] px-6 py-4">
          <div className="flex items-center gap-2">
            <PaystackMark />
            <span className="text-sm font-semibold lowercase tracking-wide text-white">paystack</span>
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#3BD6F0]">
            Test mode
          </span>
        </div>

        <div className="px-6 py-6">
          <p className="text-xs font-medium text-stone-500">{payment.email}</p>
          <p className="mt-1 text-sm text-stone-500">Pay</p>
          <p className="font-serif text-3xl font-bold text-forest">{formatKES(payment.amount)}</p>

          <div className="mt-5 rounded-2xl border border-sand bg-cream/60 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-500">Reference</span>
              <span className="font-mono text-xs text-stone-700">{payment.reference}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-stone-500">Channel</span>
              <span className="font-medium capitalize text-stone-700">{payment.channel || 'card'}</span>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
          )}

          <button
            type="button"
            onClick={() => settle(true)}
            disabled={processing}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#0BA4DB] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0a93c4] disabled:opacity-60"
          >
            <LockIcon />
            {processing ? 'Processing…' : `Pay ${formatKES(payment.amount)}`}
          </button>

          <div className="mt-3 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => settle(false)}
              disabled={processing}
              className="text-stone-400 underline-offset-2 hover:text-stone-600 hover:underline disabled:opacity-60"
            >
              Simulate declined payment
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="font-medium text-stone-500 hover:text-stone-700 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-stone-400">
            <LockIcon className="h-3 w-3" />
            Secured by Paystack · simulated for demo
          </p>
        </div>
      </div>
    </div>
  );
}

function PaystackMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#3BD6F0" aria-hidden="true">
      <rect x="2" y="3" width="20" height="3.2" rx="1.2" />
      <rect x="2" y="8" width="20" height="3.2" rx="1.2" />
      <rect x="2" y="13" width="13" height="3.2" rx="1.2" />
      <rect x="2" y="18" width="20" height="3.2" rx="1.2" />
    </svg>
  );
}

function LockIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
