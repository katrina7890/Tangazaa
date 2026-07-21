import { useEffect, useRef, useState } from 'react';
import {
  createPartnerBookingUpdate,
  deletePartnerBookingUpdate,
  fetchPartnerBookingUpdates,
} from '../../api';
import { CAMPAIGN_STAGES, stageLabel } from '../progress/stages';
import { Badge, formatDisplayDate, ghostButtonClass, goldButtonClass, inputClass, labelClass } from './ui';

const EMPTY_FORM = { stage: 'agent_contact', message: '', requiresApproval: false };

/**
 * The company side of the campaign tracker: post progress updates the customer
 * follows Glovo-style on their dashboard — including install photos and
 * "should we go ahead?" questions — and see the client's reactions.
 */
export default function BookingUpdatesModal({ booking, onClose }) {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchPartnerBookingUpdates(booking.id)
      .then(setUpdates)
      .catch(() => setError('Could not load updates.'))
      .finally(() => setLoading(false));
  }, [booking.id]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await createPartnerBookingUpdate(booking.id, {
        stage: form.stage,
        message: form.message,
        requiresApproval: form.requiresApproval,
        photos,
      });
      setUpdates((current) => [...current, created]);
      setForm(EMPTY_FORM);
      setPhotos([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (submitError) {
      setError(
        submitError.errors
          ? Object.values(submitError.errors).flat().join(' ')
          : submitError.message,
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(update) {
    if (!window.confirm('Delete this update? The client will no longer see it.')) return;
    try {
      await deletePartnerBookingUpdate(update.id);
      setUpdates((current) => current.filter((item) => item.id !== update.id));
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  const advertiser = booking.customer
    ? booking.customer.company_name || booking.customer.name
    : booking.contact
      ? booking.contact.company || booking.contact.name
      : null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-forest-deep/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 bg-forest px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-coral">Progress updates</p>
            <h2 className="mt-1 font-serif text-lg font-semibold text-cream">{booking.billboard?.title}</h2>
            <p className="text-xs text-cream/70">
              {advertiser ? `${advertiser} · ` : ''}
              {formatDisplayDate(booking.startDate)} → {formatDisplayDate(booking.endDate)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-cream/70 transition hover:bg-white/10 hover:text-cream"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {booking.source === 'app' ? (
            <p className="text-xs text-stone-500">
              Every update you post here appears instantly on the client&apos;s Tangazaa dashboard —
              they can approve go-aheads and react without a single phone call.
            </p>
          ) : (
            <p className="text-xs text-stone-500">
              Offline deal — updates are kept for your team&apos;s records (the client isn&apos;t on the app).
            </p>
          )}

          {/* Timeline so far */}
          {loading ? (
            <p className="mt-4 text-sm text-stone-600">Loading…</p>
          ) : updates.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-sand-dark bg-cream/40 p-4 text-center text-sm text-stone-600">
              No updates yet. Post the first one below — start with “Agent in touch”.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {updates.map((update) => (
                <li key={update.id} className="rounded-2xl border border-sand bg-cream/40 p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="forest">{stageLabel(update.stage)}</Badge>
                    {update.requiresApproval && !update.clientReaction && (
                      <Badge tone="amber">Awaiting client go-ahead</Badge>
                    )}
                    {update.clientReaction === 'approved' && <Badge tone="emerald">Client approved</Badge>}
                    {update.clientReaction === 'liked' && <Badge tone="gold">Client loved it</Badge>}
                    {update.clientReaction === 'changes_requested' && (
                      <Badge tone="red">Changes requested</Badge>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(update)}
                      className="ml-auto text-xs font-semibold text-stone-400 transition hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                  {update.message && <p className="mt-2 text-sm text-stone-800">{update.message}</p>}
                  {update.photos.length > 0 && (
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {update.photos.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg">
                          <img src={url} alt="Update" className="h-16 w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  {update.clientComment && (
                    <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs italic text-stone-600">
                      Client: “{update.clientComment}”
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-stone-400">
                    {update.author?.name || '—'} · {formatDateTime(update.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {/* New update */}
          <form onSubmit={handleSubmit} className="mt-5 rounded-2xl border border-sand p-4">
            <p className="text-sm font-bold text-forest">Post an update</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="update-stage">Stage</label>
                <select
                  id="update-stage"
                  value={form.stage}
                  onChange={(event) => setForm({ ...form, stage: event.target.value })}
                  className={inputClass}
                >
                  {CAMPAIGN_STAGES.map((stage) => (
                    <option key={stage.value} value={stage.value}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="update-photos">Photos (up to 4)</label>
                <input
                  id="update-photos"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => setPhotos([...event.target.files].slice(0, 4))}
                  className="w-full text-xs text-stone-600 file:mr-3 file:rounded-full file:border-0 file:bg-forest file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-cream hover:file:bg-forest-soft"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className={labelClass} htmlFor="update-message">Message</label>
              <textarea
                id="update-message"
                rows={2}
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                placeholder="e.g. Artwork is locked — should we go ahead and print?"
                className={inputClass}
              />
            </div>
            {photos.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {photos.map((file) => (
                  <img
                    key={file.name}
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-16 w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            )}
            <label className="mt-3 flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={form.requiresApproval}
                onChange={(event) => setForm({ ...form, requiresApproval: event.target.checked })}
                className="h-4 w-4 rounded border-sand accent-[#8A3DF0]"
              />
              Ask the client to approve before we proceed
            </label>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex gap-3">
              <button type="submit" disabled={saving} className={goldButtonClass}>
                {saving ? 'Posting…' : 'Post update'}
              </button>
              <button type="button" onClick={onClose} className={ghostButtonClass}>
                Close
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(value) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
