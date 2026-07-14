import { useEffect, useState } from 'react';
import {
  createPartnerArtwork,
  deletePartnerArtwork,
  fetchMyBillboards,
  fetchPartnerArtworks,
  fetchPartnerContacts,
  updatePartnerArtwork,
} from '../../api';
import {
  ARTWORK_STATUSES,
  Badge,
  Chip,
  EmptyState,
  SectionCard,
  formatDisplayDate,
  ghostButtonClass,
  goldButtonClass,
  inputClass,
  labelClass,
  statusMeta,
} from '../../components/partner/ui';

const EMPTY_FORM = { title: '', contact_id: '', billboard_id: '', due_date: '', file_name: '', notes: '' };

/**
 * Creative pipeline for clients who ask the billboard company to handle their
 * artwork: brief → design → approval → ready for print.
 */
export default function PartnerArtworkPage() {
  const [artworks, setArtworks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [billboards, setBillboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetchPartnerContacts(), fetchMyBillboards()])
      .then(([contactList, boardList]) => {
        setContacts(contactList);
        setBillboards(boardList);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPartnerArtworks(statusFilter ? { status: statusFilter } : {})
      .then(setArtworks)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        contact_id: form.contact_id ? Number(form.contact_id) : null,
        billboard_id: form.billboard_id ? Number(form.billboard_id) : null,
        due_date: form.due_date || null,
        file_name: form.file_name || null,
        notes: form.notes || null,
      };
      const created = await createPartnerArtwork(payload);
      setArtworks((prev) => [created, ...prev]);
      setCreating(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.errors ? Object.values(err.errors).flat().join(' ') : err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(artwork, status) {
    const updated = await updatePartnerArtwork(artwork.id, { status });
    setArtworks((prev) =>
      statusFilter && updated.status !== statusFilter
        ? prev.filter((item) => item.id !== artwork.id)
        : prev.map((item) => (item.id === artwork.id ? updated : item))
    );
  }

  async function handleDelete(artwork) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete "${artwork.title}"?`)) return;
    await deletePartnerArtwork(artwork.id);
    setArtworks((prev) => prev.filter((item) => item.id !== artwork.id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Chip active={statusFilter === ''} onClick={() => setStatusFilter('')}>
            All
          </Chip>
          {ARTWORK_STATUSES.map(({ value, label }) => (
            <Chip key={value} active={statusFilter === value} onClick={() => setStatusFilter(value)}>
              {label}
            </Chip>
          ))}
        </div>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={goldButtonClass}>
            + New artwork
          </button>
        )}
      </div>

      {creating && (
        <SectionCard title="New artwork job">
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="art-title">Title *</label>
              <input
                id="art-title"
                required
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className={inputClass}
                placeholder="e.g. Naivas December campaign — 12m x 6m skin"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="art-contact">Client</label>
              <select
                id="art-contact"
                value={form.contact_id}
                onChange={(event) => setForm({ ...form, contact_id: event.target.value })}
                className={inputClass}
              >
                <option value="">— none —</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                    {contact.company ? ` (${contact.company})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="art-board">Billboard</label>
              <select
                id="art-board"
                value={form.billboard_id}
                onChange={(event) => setForm({ ...form, billboard_id: event.target.value })}
                className={inputClass}
              >
                <option value="">— none —</option>
                {billboards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="art-due">Due date</label>
              <input
                id="art-due"
                type="date"
                value={form.due_date}
                onChange={(event) => setForm({ ...form, due_date: event.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="art-file">File reference</label>
              <input
                id="art-file"
                value={form.file_name}
                onChange={(event) => setForm({ ...form, file_name: event.target.value })}
                className={inputClass}
                placeholder="naivas-dec-final-v3.pdf (uploads coming later)"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="art-notes">Brief / notes</label>
              <textarea
                id="art-notes"
                rows={3}
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                className={inputClass}
              />
            </div>
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={saving} className={goldButtonClass}>
                {saving ? 'Saving…' : 'Create artwork job'}
              </button>
              <button type="button" onClick={() => setCreating(false)} className={ghostButtonClass}>
                Cancel
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {loading ? (
        <p className="text-stone-600">Loading…</p>
      ) : artworks.length === 0 ? (
        <EmptyState>
          {statusFilter ? 'Nothing in this stage right now.' : 'No artwork jobs yet — create one when a client sends a brief.'}
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {artworks.map((artwork) => {
            const meta = statusMeta(ARTWORK_STATUSES, artwork.status);
            return (
              <div
                key={artwork.id}
                className="rounded-2xl border border-sand border-t-4 border-t-gold bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 truncate font-semibold text-slate-900">{artwork.title}</h3>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
                <div className="mt-1.5 space-y-0.5 text-sm text-slate-600">
                  {artwork.contact && (
                    <p className="truncate">
                      {artwork.contact.name}
                      {artwork.contact.company ? ` · ${artwork.contact.company}` : ''}
                    </p>
                  )}
                  {artwork.billboard && <p className="truncate text-stone-500">{artwork.billboard.title}</p>}
                  {artwork.dueDate && <p className="text-xs text-stone-500">Due {formatDisplayDate(artwork.dueDate)}</p>}
                  {artwork.fileName && (
                    <p className="truncate text-xs font-medium text-gold-dark">📎 {artwork.fileName}</p>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <select
                    aria-label={`Move "${artwork.title}" to another stage`}
                    value={artwork.status}
                    onChange={(event) => handleStatusChange(artwork, event.target.value)}
                    className="rounded-lg border border-sand bg-white px-2 py-1 text-xs font-semibold text-stone-700 focus:border-gold focus:outline-none"
                  >
                    {ARTWORK_STATUSES.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => handleDelete(artwork)} className="font-semibold text-red-600 hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
