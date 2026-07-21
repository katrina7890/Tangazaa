import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { assignAccountManager, fetchBookingPipeline, fetchPartnerBooking, updateBookingStage } from '../../api';
import BillboardImage from '../../components/BillboardImage';
import PaymentStatusBadge from '../../components/PaymentStatusBadge';
import BookingUpdatesModal from '../../components/partner/BookingUpdatesModal';
import { substatusLabel } from '../../components/partner/pipeline';
import { Badge, EmptyState, SectionCard, formatDisplayDate, ghostButtonClass, goldButtonClass, inputClass, labelClass } from '../../components/partner/ui';
import { formatKES } from '../../utils/availability';

/**
 * The ERP's booking details page: client + billboard info, payment history,
 * and the clickable 7-stage pipeline (green done / blue current / grey next).
 * Completing a stage notifies the client automatically.
 */
export default function PartnerBookingDetailPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [payments, setPayments] = useState([]);
  const [stages, setStages] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openStage, setOpenStage] = useState(null);
  const [updatesOpen, setUpdatesOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchPartnerBooking(id), fetchBookingPipeline(id)])
      .then(([bookingData, pipeline]) => {
        if (cancelled) return;
        setBooking(bookingData.booking);
        setPayments(bookingData.payments);
        setStages(pipeline.stages);
        setTeam(pipeline.team);
      })
      .catch(() => !cancelled && setError('Could not load this booking.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <p className="text-stone-600">Loading…</p>;
  if (error || !booking) {
    return (
      <EmptyState>
        {error || 'Booking not found.'}{' '}
        <Link to="/partner/bookings" className="font-semibold text-gold-dark hover:underline">
          Back to bookings
        </Link>
      </EmptyState>
    );
  }

  const applicable = stages.filter((stage) => stage.applicable);
  const currentIndex = applicable.findIndex((stage) => !stage.completedAt);
  const advertiser = booking.customer
    ? booking.customer.company_name || booking.customer.name
    : booking.contact
      ? booking.contact.company || booking.contact.name
      : '—';

  return (
    <div className="space-y-6">
      <Link to="/partner/bookings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-gold-dark">
        ← All bookings
      </Link>

      {/* ── Header ─────────────────────────────────────────── */}
      <SectionCard>
        <div className="flex flex-wrap items-start gap-5">
          <div className="h-24 w-36 shrink-0 overflow-hidden rounded-2xl">
            <BillboardImage id={booking.billboard?.id} title={booking.billboard?.title} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-forest">{booking.billboard?.title}</h2>
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
            <p className="mt-0.5 text-sm text-stone-500">{booking.billboard?.location}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              <InfoFact label="Client" value={advertiser} />
              <InfoFact
                label="Contact"
                value={
                  booking.contact?.email || booking.contact?.phone || (booking.customer ? 'Via Tangazaa app' : '—')
                }
              />
              <InfoFact
                label="Campaign"
                value={`${formatDisplayDate(booking.startDate)} → ${formatDisplayDate(booking.endDate)}`}
              />
              <InfoFact label="Value" value={<span className="font-semibold text-gold-dark">{formatKES(booking.totalPrice)}</span>} />
            </dl>
          </div>
          <button type="button" onClick={() => setUpdatesOpen(true)} className={goldButtonClass}>
            Post client update
          </button>
        </div>
      </SectionCard>

      {/* ── Campaign manager ───────────────────────────────── */}
      <AccountManagerCard
        booking={booking}
        team={team}
        onAssigned={(updated) => setBooking(updated)}
      />

      {/* ── Pipeline ───────────────────────────────────────── */}
      <SectionCard title="Pipeline">
        <ol>
          {applicable.map((stage, index) => {
            const state = stage.completedAt ? 'done' : index === currentIndex ? 'current' : 'future';
            return (
              <StageRow
                key={stage.stage}
                stage={stage}
                state={state}
                isLast={index === applicable.length - 1}
                open={openStage === stage.stage}
                onToggle={() => setOpenStage(openStage === stage.stage ? null : stage.stage)}
                bookingId={booking.id}
                team={team}
                onSaved={(freshStages) => {
                  setStages(freshStages);
                  setOpenStage(null);
                }}
              />
            );
          })}
        </ol>
        <p className="mt-4 text-xs text-stone-400">
          Completing a stage automatically notifies the client in their Tangazaa account.
        </p>
      </SectionCard>

      {/* ── Payments ───────────────────────────────────────── */}
      <SectionCard title="Payment history">
        {payments.length === 0 ? (
          <EmptyState>
            {booking.source === 'offline' ? 'Offline deal — payment handled outside Tangazaa.' : 'No payment attempts yet.'}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-sand/70 text-sm">
            {payments.map((payment) => (
              <li key={payment.reference} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <span className="font-mono text-xs text-stone-500">{payment.reference}</span>
                <Badge tone={{ success: 'emerald', pending: 'amber', failed: 'red' }[payment.status] || 'stone'}>
                  {payment.status}
                </Badge>
                <span className="font-semibold text-slate-800">{formatKES(payment.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {updatesOpen && <BookingUpdatesModal booking={booking} onClose={() => setUpdatesOpen(false)} />}
    </div>
  );
}

function StageRow({ stage, state, isLast, open, onToggle, bookingId, team, onSaved }) {
  return (
    <li className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <StageDot state={state} />
        {!isLast && (
          <span className={`w-0.5 flex-1 ${state === 'done' ? 'bg-emerald-400' : 'bg-sand'}`} aria-hidden="true" />
        )}
      </div>

      <div className={`min-w-0 flex-1 ${isLast ? '' : 'pb-5'}`}>
        <button type="button" onClick={onToggle} className="flex w-full flex-wrap items-center gap-2 text-left">
          <span
            className={`pt-0.5 text-sm font-bold ${
              state === 'done' ? 'text-emerald-700' : state === 'current' ? 'text-sky-700' : 'text-stone-400'
            }`}
          >
            {stage.label}
          </span>
          {stage.substatus && <Badge tone="sky">{substatusLabel(stage.substatus)}</Badge>}
          {stage.assignedTo && <Badge tone="stone">{stage.assignedTo.name}</Badge>}
          {stage.completedAt && (
            <span className="text-[11px] text-stone-400">done {formatDisplayDate(stage.completedAt)}</span>
          )}
          <span className="ml-auto text-xs text-stone-400">{open ? 'Close' : 'Manage'}</span>
        </button>

        {stage.note && !open && <p className="mt-1 text-xs text-stone-500">{stage.note}</p>}
        {stage.photos.length > 0 && !open && (
          <div className="mt-2 flex gap-2">
            {stage.photos.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg">
                <img src={url} alt="Stage attachment" className="h-14 w-20 object-cover" />
              </a>
            ))}
          </div>
        )}

        {open && (
          <StageEditor stage={stage} bookingId={bookingId} team={team} onSaved={onSaved} />
        )}
      </div>
    </li>
  );
}

function StageEditor({ stage, bookingId, team, onSaved }) {
  const [substatus, setSubstatus] = useState(stage.substatus || '');
  const [note, setNote] = useState(stage.note || '');
  const [assignedTo, setAssignedTo] = useState(stage.assignedTo?.id || '');
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(completed) {
    setSaving(true);
    setError('');
    try {
      const fresh = await updateBookingStage(bookingId, stage.stage, {
        completed,
        substatus: substatus || null,
        note: note || null,
        assignedTo: assignedTo || null,
        photos,
      });
      onSaved(fresh);
    } catch (saveError) {
      setError(saveError.errors ? Object.values(saveError.errors).flat().join(' ') : saveError.message);
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-sand bg-cream/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {stage.substatuses.length > 0 && (
          <div>
            <label className={labelClass} htmlFor={`sub-${stage.stage}`}>Sub-status</label>
            <select id={`sub-${stage.stage}`} value={substatus} onChange={(e) => setSubstatus(e.target.value)} className={inputClass}>
              <option value="">—</option>
              {stage.substatuses.map((value) => (
                <option key={value} value={value}>{substatusLabel(value)}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className={labelClass} htmlFor={`assign-${stage.stage}`}>Assigned to</label>
          <select id={`assign-${stage.stage}`} value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={inputClass}>
            <option value="">Unassigned</option>
            {team.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor={`note-${stage.stage}`}>Notes</label>
          <textarea id={`note-${stage.stage}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor={`photos-${stage.stage}`}>Photos & attachments (up to 4)</label>
          <input
            id={`photos-${stage.stage}`}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setPhotos([...e.target.files].slice(0, 4))}
            className="w-full text-xs text-stone-600 file:mr-3 file:rounded-full file:border-0 file:bg-forest file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-cream hover:file:bg-forest-soft"
          />
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {stage.completedAt ? (
          <button type="button" disabled={saving} onClick={() => save(false)} className={ghostButtonClass}>
            {saving ? 'Saving…' : 'Reopen stage'}
          </button>
        ) : (
          <button type="button" disabled={saving} onClick={() => save(true)} className={goldButtonClass}>
            {saving ? 'Saving…' : 'Mark complete & notify client'}
          </button>
        )}
        <button type="button" disabled={saving} onClick={() => save(undefined)} className={ghostButtonClass}>
          {saving ? 'Saving…' : 'Save details'}
        </button>
      </div>
    </div>
  );
}

function StageDot({ state }) {
  if (state === 'done') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4" aria-hidden="true">
          <path d="M5 13l4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (state === 'current') {
    return <span className="h-7 w-7 shrink-0 rounded-full border-[7px] border-sky-500 bg-white ring-4 ring-sky-500/20" />;
  }
  return <span className="h-7 w-7 shrink-0 rounded-full border-2 border-sand bg-white" />;
}

/**
 * Names the salesperson who owns this campaign. Saving emails the client an
 * introduction with that person's contact details, so it only fires on a real
 * change — re-saving the same person doesn't re-introduce them.
 */
function AccountManagerCard({ booking, team, onAssigned }) {
  const [selected, setSelected] = useState(booking.accountManager?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const current = booking.accountManager;
  const dirty = String(selected) !== String(current?.id ?? '');

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await assignAccountManager(booking.id, selected === '' ? null : Number(selected));
      onAssigned(updated);
      setSaved(true);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Campaign manager">
      {current ? (
        <p className="text-sm text-stone-600">
          <span className="font-semibold text-forest">{current.name}</span> is the client&apos;s named
          contact for this campaign.
        </p>
      ) : (
        <p className="text-sm text-stone-600">
          Nobody is assigned yet. Naming someone emails the client an introduction with their contact
          details.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="min-w-[12rem] flex-1">
          <span className={labelClass}>Assigned to</span>
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className={inputClass}
          >
            <option value="">Nobody</option>
            {team.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className={`${goldButtonClass} disabled:opacity-50`}
        >
          {saving ? 'Saving…' : 'Save & notify client'}
        </button>
      </div>

      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
      {saved && !dirty && (
        <p className="mt-2 text-sm font-medium text-emerald-700">
          Saved{current ? ` — ${current.name} was introduced to the client by email.` : '.'}
        </p>
      )}

      {booking.source === 'offline' && (
        <p className="mt-2 text-xs text-stone-400">
          This is an offline deal, so there&apos;s no client account to email — the assignment is
          recorded for your team only.
        </p>
      )}
    </SectionCard>
  );
}

function InfoFact({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-stone-400">{label}</dt>
      <dd className="mt-0.5 truncate text-slate-800">{value}</dd>
    </div>
  );
}
