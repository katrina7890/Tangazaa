import { useEffect, useState } from 'react';
import {
  createPartnerContact,
  deletePartnerContact,
  fetchPartnerContacts,
  updatePartnerContact,
} from '../../api';
import {
  Badge,
  EmptyState,
  SectionCard,
  ghostButtonClass,
  goldButtonClass,
  inputClass,
  labelClass,
} from '../../components/partner/ui';

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
    </div>
  );
}
