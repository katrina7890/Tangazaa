import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createOfflineBooking,
  fetchMyBillboards,
  fetchPartnerBookings,
  fetchPartnerContacts,
} from '../../api';
import PaymentStatusBadge from '../../components/PaymentStatusBadge';
import BookingUpdatesModal from '../../components/partner/BookingUpdatesModal';
import {
  Badge,
  EmptyState,
  SectionCard,
  formatDisplayDate,
  ghostButtonClass,
  goldButtonClass,
  inputClass,
  labelClass,
} from '../../components/partner/ui';
import { formatKES } from '../../utils/availability';

const EMPTY_FORM = { billboard_id: '', contact_id: '', start_date: '', end_date: '', total_price: '' };

/**
 * The sync module: deals closed off the app (phone, walk-in, agency) get
 * recorded here so the Tangazaa availability calendar stays truthful — the
 * dates are blocked for app customers the moment the deal is saved.
 */
export default function PartnerSyncPage() {
  const [bookings, setBookings] = useState([]);
  const [billboards, setBillboards] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [progressBooking, setProgressBooking] = useState(null);

  useEffect(() => {
    Promise.all([fetchMyBillboards(), fetchPartnerContacts()])
      .then(([boardList, contactList]) => {
        setBillboards(boardList);
        setContacts(contactList);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPartnerBookings(sourceFilter ? { source: sourceFilter } : {})
      .then(setBookings)
      .finally(() => setLoading(false));
  }, [sourceFilter]);

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await createOfflineBooking({
        billboard_id: Number(form.billboard_id),
        contact_id: Number(form.contact_id),
        start_date: form.start_date,
        end_date: form.end_date,
        total_price: form.total_price ? Number(form.total_price) : null,
      });
      setBookings((prev) => [created, ...prev]);
      setCreating(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.errors ? Object.values(err.errors).flat().join(' ') : err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard>
        <p className="text-sm leading-relaxed text-stone-600">
          Closed a deal over the phone or a walk-in? Record it here and the dates are{' '}
          <span className="font-semibold text-forest">instantly blocked</span> on the Tangazaa customer map and
          calendars — no double bookings, one truthful schedule.
        </p>
      </SectionCard>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {[
            { value: '', label: 'All bookings' },
            { value: 'app', label: 'From the app' },
            { value: 'offline', label: 'Offline deals' },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSourceFilter(value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                sourceFilter === value
                  ? 'bg-forest text-cream shadow-sm'
                  : 'border border-sand bg-white text-stone-600 hover:border-gold hover:text-gold-dark'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={goldButtonClass}>
            + Record offline deal
          </button>
        )}
      </div>

      {creating && (
        <SectionCard title="Record an offline deal">
          {contacts.length === 0 ? (
            <p className="text-sm text-stone-600">
              You need a client to attach the deal to —{' '}
              <Link to="/partner/crm" className="font-semibold text-gold-dark hover:underline">
                add one in the CRM
              </Link>{' '}
              first.
            </p>
          ) : (
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="sync-board">Billboard *</label>
                <select
                  id="sync-board"
                  required
                  value={form.billboard_id}
                  onChange={(event) => setForm({ ...form, billboard_id: event.target.value })}
                  className={inputClass}
                >
                  <option value="">Choose a billboard…</option>
                  {billboards.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.title} — {board.location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="sync-contact">Client *</label>
                <select
                  id="sync-contact"
                  required
                  value={form.contact_id}
                  onChange={(event) => setForm({ ...form, contact_id: event.target.value })}
                  className={inputClass}
                >
                  <option value="">Choose a client…</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                      {contact.company ? ` (${contact.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="sync-start">Start date *</label>
                <input
                  id="sync-start"
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(event) => setForm({ ...form, start_date: event.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="sync-end">End date *</label>
                <input
                  id="sync-end"
                  type="date"
                  required
                  min={form.start_date || undefined}
                  value={form.end_date}
                  onChange={(event) => setForm({ ...form, end_date: event.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="sync-price">Agreed price (KES, optional)</label>
                <input
                  id="sync-price"
                  type="number"
                  min="0"
                  value={form.total_price}
                  onChange={(event) => setForm({ ...form, total_price: event.target.value })}
                  className={inputClass}
                  placeholder="Leave blank to use the board's daily rate"
                />
              </div>
              {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
              <div className="flex gap-3 sm:col-span-2">
                <button type="submit" disabled={saving} className={goldButtonClass}>
                  {saving ? 'Saving…' : 'Save & block dates'}
                </button>
                <button type="button" onClick={() => setCreating(false)} className={ghostButtonClass}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </SectionCard>
      )}

      {loading ? (
        <p className="text-stone-600">Loading…</p>
      ) : bookings.length === 0 ? (
        <EmptyState>No bookings here yet.</EmptyState>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const advertiser = booking.customer
              ? booking.customer.company_name || booking.customer.name
              : booking.contact
                ? booking.contact.company || booking.contact.name
                : '—';
            return (
              <div
                key={booking.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-slate-900">{booking.billboard?.title}</p>
                    <Badge tone={booking.source === 'offline' ? 'forest' : 'gold'}>
                      {booking.source === 'offline' ? 'Offline deal' : 'Tangazaa app'}
                    </Badge>
                    {booking.status === 'cancelled' ? (
                      <Badge tone="red">Cancelled</Badge>
                    ) : (
                      booking.source === 'app' && (
                        <PaymentStatusBadge bookingStatus={booking.status} paymentStatus={booking.payment?.status} />
                      )
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-600">
                    {advertiser} · {formatDisplayDate(booking.startDate)} → {formatDisplayDate(booking.endDate)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="font-semibold text-gold-dark">{formatKES(booking.totalPrice)}</p>
                  {booking.status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => setProgressBooking(booking)}
                      className="rounded-full border border-forest/20 bg-forest/5 px-3.5 py-1.5 text-xs font-bold text-forest transition hover:border-forest/40 hover:bg-forest/10"
                    >
                      Progress
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {progressBooking && (
        <BookingUpdatesModal booking={progressBooking} onClose={() => setProgressBooking(null)} />
      )}
    </div>
  );
}
