import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createPartnerContact,
  deletePartnerContact,
  fetchPartnerContactDetail,
  fetchPartnerContacts,
  updatePartnerContact,
} from '../../api';
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

const EMPTY_FORM = { name: '', company: '', email: '', phone: '', notes: '' };

/** Client book for the billboard company: advertisers, agencies, walk-ins. */
export default function PartnerCrmPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | contact
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(null); // null | contact (client file modal)

  // Debounced search, same 250ms pattern as the admin panels.
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      fetchPartnerContacts(search ? { search } : {})
        .then(setContacts)
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  function startEdit(contact) {
    setEditing(contact);
    setForm(
      contact === 'new'
        ? EMPTY_FORM
        : {
            name: contact.name,
            company: contact.company || '',
            email: contact.email || '',
            phone: contact.phone || '',
            notes: contact.notes || '',
          }
    );
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing === 'new') {
        const created = await createPartnerContact(form);
        setContacts((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        const updated = await updatePartnerContact(editing.id, form);
        setContacts((prev) => prev.map((contact) => (contact.id === updated.id ? updated : contact)));
      }
      setEditing(null);
    } catch (err) {
      setError(err.errors ? Object.values(err.errors).flat().join(' ') : err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(contact) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete ${contact.name}? Their bookings stay, but the contact card is removed.`)) return;
    await deletePartnerContact(contact.id);
    setContacts((prev) => prev.filter((item) => item.id !== contact.id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, company, email, phone…"
          className={`${inputClass} max-w-sm`}
        />
        {editing === null && (
          <button type="button" onClick={() => startEdit('new')} className={goldButtonClass}>
            + Add client
          </button>
        )}
      </div>

      {editing !== null && (
        <SectionCard title={editing === 'new' ? 'New client' : `Edit ${editing.name}`}>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="crm-name">Name *</label>
              <input
                id="crm-name"
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="crm-company">Company</label>
              <input
                id="crm-company"
                value={form.company}
                onChange={(event) => setForm({ ...form, company: event.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="crm-email">Email</label>
              <input
                id="crm-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="crm-phone">Phone</label>
              <input
                id="crm-phone"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                className={inputClass}
                placeholder="+2547…"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="crm-notes">Notes</label>
              <textarea
                id="crm-notes"
                rows={3}
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                className={inputClass}
                placeholder="Preferred sites, billing contact, negotiated rates…"
              />
            </div>
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={saving} className={goldButtonClass}>
                {saving ? 'Saving…' : 'Save client'}
              </button>
              <button type="button" onClick={() => setEditing(null)} className={ghostButtonClass}>
                Cancel
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {loading ? (
        <p className="text-stone-600">Loading…</p>
      ) : contacts.length === 0 ? (
        <EmptyState>
          {search ? 'No clients match that search.' : 'No clients yet — add the advertisers you already work with.'}
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="rounded-2xl border border-sand border-t-4 border-t-gold bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-900">{contact.name}</h3>
                  {contact.company && <p className="truncate text-sm text-slate-500">{contact.company}</p>}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {contact.bookingsCount > 0 && <Badge tone="forest">{contact.bookingsCount} booking{contact.bookingsCount > 1 ? 's' : ''}</Badge>}
                  {contact.artworksCount > 0 && <Badge tone="sky">{contact.artworksCount} artwork{contact.artworksCount > 1 ? 's' : ''}</Badge>}
                </div>
              </div>
              <div className="mt-2 space-y-0.5 text-sm text-slate-600">
                {contact.email && <p className="truncate">{contact.email}</p>}
                {contact.phone && <p>{contact.phone}</p>}
                {contact.notes && <p className="mt-1.5 line-clamp-2 text-xs text-stone-500">{contact.notes}</p>}
              </div>
              <div className="mt-3 flex gap-4 text-sm">
                <button type="button" onClick={() => setViewing(contact)} className="font-semibold text-forest hover:underline">
                  Client file
                </button>
                <button type="button" onClick={() => startEdit(contact)} className="font-semibold text-gold-dark hover:underline">
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(contact)} className="font-semibold text-red-600 hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewing && <ClientFileModal contact={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

/** The PRD §4 client file: campaigns, revenue and outstanding balance. */
function ClientFileModal({ contact, onClose }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchPartnerContactDetail(contact.id).then(setData).catch(() => setFailed(true));
  }, [contact.id]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-forest-deep/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 bg-forest px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">Client file</p>
            <h2 className="mt-1 font-serif text-lg font-semibold text-cream">{contact.name}</h2>
            {contact.company && <p className="text-xs text-cream/70">{contact.company}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-cream/70 hover:bg-white/10 hover:text-cream">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          {failed ? (
            <p className="text-sm text-red-600">Could not load this client.</p>
          ) : !data ? (
            <p className="text-sm text-stone-600">Loading…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <FileStat label="Revenue" value={formatKES(data.summary.revenue)} />
                <FileStat label="Current" value={data.summary.currentCampaigns} />
                <FileStat label="Past" value={data.summary.pastCampaigns} />
                <FileStat
                  label="Outstanding"
                  value={formatKES(data.summary.outstanding)}
                  accent={data.summary.outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}
                />
              </div>
              <div className="mt-4 space-y-0.5 text-sm text-slate-600">
                {contact.email && <p>{contact.email}</p>}
                {contact.phone && <p>{contact.phone}</p>}
                {contact.notes && <p className="mt-1 text-xs text-stone-500">{contact.notes}</p>}
              </div>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500">Campaigns</p>
              {data.bookings.length === 0 ? (
                <p className="mt-2 text-sm text-stone-600">No campaigns recorded yet.</p>
              ) : (
                <ul className="mt-2 divide-y divide-sand/70">
                  {data.bookings.map((booking) => (
                    <li key={booking.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                      <div className="min-w-0">
                        <Link
                          to={`/partner/bookings/${booking.id}`}
                          className="font-semibold text-slate-900 hover:text-gold-dark hover:underline"
                        >
                          {booking.billboard?.title}
                        </Link>
                        <p className="text-xs text-stone-500">
                          {formatDisplayDate(booking.startDate)} → {formatDisplayDate(booking.endDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={booking.endDate >= today && booking.status === 'confirmed' ? 'emerald' : 'stone'}>
                          {booking.status === 'cancelled' ? 'Cancelled' : booking.endDate >= today ? 'Current' : 'Past'}
                        </Badge>
                        <span className="font-semibold text-gold-dark">{formatKES(booking.totalPrice)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FileStat({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-sand bg-cream/40 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500">{label}</p>
      <p className={`mt-0.5 font-serif text-lg font-bold ${accent || 'text-forest'}`}>{value}</p>
    </div>
  );
}
