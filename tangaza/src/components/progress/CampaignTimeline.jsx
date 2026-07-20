import { useState } from 'react';
import { reactToBookingUpdate } from '../../api';
import { CAMPAIGN_STAGES, currentStageIndex } from './stages';

/**
 * The Glovo-style campaign timeline: the fixed stages (agent contact →
 * artwork → production → installation) as a vertical spine, with the billboard
 * company's updates under each — including "approve to proceed?" questions the
 * customer answers inline, and photos of the install.
 */
export default function CampaignTimeline({ updates, onReacted }) {
  const reachedIndex = currentStageIndex(updates);

  function handleReacted(updated) {
    onReacted?.(updated);
  }

  return (
    <div>
      <ol>
        {CAMPAIGN_STAGES.map((stage, index) => {
          const stageUpdates = updates.filter((update) => update.stage === stage.value);
          const state = index < reachedIndex ? 'done' : index === reachedIndex ? 'current' : 'upcoming';
          return (
            <StageRow
              key={stage.value}
              stage={stage}
              state={state}
              isLast={index === CAMPAIGN_STAGES.length - 1}
              updates={stageUpdates}
              onReacted={handleReacted}
            />
          );
        })}
      </ol>

      {updates.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-sand-dark bg-cream/50 p-5 text-center text-sm text-stone-600">
          No updates yet — the billboard team will post progress here, from first contact to
          photos of your billboard going up.
        </p>
      )}
    </div>
  );
}

function StageRow({ stage, state, isLast, updates, onReacted }) {
  return (
    <li className="relative flex gap-4 sm:gap-5">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <StageDot state={state} />
        {!isLast && (
          <span
            className={`w-0.5 flex-1 ${state === 'done' ? 'bg-gold' : 'bg-sand'}`}
            aria-hidden="true"
          />
        )}
      </div>

      <div className={`min-w-0 flex-1 ${isLast ? '' : 'pb-8'}`}>
        <p
          className={`pt-1 font-serif text-base font-semibold sm:text-lg ${
            state === 'upcoming' ? 'text-stone-400' : 'text-forest'
          }`}
        >
          {stage.label}
        </p>
        <p className={`text-xs sm:text-sm ${state === 'upcoming' ? 'text-stone-400' : 'text-stone-500'}`}>
          {stage.description}
        </p>

        {updates.map((update) => (
          <UpdateCard key={update.id} update={update} onReacted={onReacted} />
        ))}
      </div>
    </li>
  );
}

function StageDot({ state }) {
  if (state === 'done' || state === 'current') {
    return (
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-forest shadow-sm ${
          state === 'current' ? 'ring-4 ring-gold/30' : ''
        }`}
      >
        <CheckIcon />
      </span>
    );
  }
  return <span className="h-8 w-8 shrink-0 rounded-full border-2 border-sand bg-white" />;
}

function UpdateCard({ update, onReacted }) {
  const [mode, setMode] = useState(null); // null | 'changes'
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function react(reaction, withComment) {
    setSaving(true);
    setError('');
    try {
      const updated = await reactToBookingUpdate(update.id, {
        reaction,
        comment: withComment ? comment : null,
      });
      setMode(null);
      setComment('');
      onReacted(updated);
    } catch (reactError) {
      setError(reactError.message || 'Could not send your response.');
    } finally {
      setSaving(false);
    }
  }

  const needsAnswer = update.requiresApproval && !update.clientReaction;

  return (
    <div
      className={`mt-3 rounded-2xl border p-4 ${
        needsAnswer ? 'border-gold bg-gold/10' : 'border-sand bg-cream/50'
      }`}
    >
      {update.message && <p className="text-sm leading-relaxed text-stone-800">{update.message}</p>}

      {update.photos.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {update.photos.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl">
              <img
                src={url}
                alt="Campaign progress"
                className="h-28 w-full object-cover transition hover:scale-105 sm:h-32"
              />
            </a>
          ))}
        </div>
      )}

      <p className="mt-2 text-[11px] text-stone-400">
        {update.author?.company_name || update.author?.name || 'The billboard team'} ·{' '}
        {formatDateTime(update.createdAt)}
      </p>

      {/* The customer's answer / feedback */}
      {needsAnswer ? (
        <div className="mt-3 rounded-xl bg-white p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gold-dark">Your go-ahead is needed</p>
          {mode === 'changes' && (
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={2}
              placeholder="Tell them what you'd like changed…"
              className="mt-2 w-full rounded-xl border border-sand px-3 py-2 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
          )}
          {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
          <div className="mt-2.5 flex flex-wrap gap-2">
            {mode === 'changes' ? (
              <>
                <button
                  type="button"
                  disabled={saving || !comment.trim()}
                  onClick={() => react('changes_requested', true)}
                  className="rounded-full bg-forest px-4 py-2 text-xs font-bold text-cream transition hover:bg-forest-soft disabled:opacity-50"
                >
                  {saving ? 'Sending…' : 'Send change request'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setMode(null)}
                  className="rounded-full border border-sand px-4 py-2 text-xs font-semibold text-stone-600 hover:border-gold"
                >
                  Back
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => react('approved', false)}
                  className="rounded-full bg-gold px-4 py-2 text-xs font-semibold text-forest-deep transition hover:bg-gold-soft disabled:opacity-50"
                >
                  {saving ? 'Sending…' : 'Yes — go ahead'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setMode('changes')}
                  className="rounded-full border border-sand bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition hover:border-gold hover:text-gold-dark"
                >
                  Request changes
                </button>
              </>
            )}
          </div>
        </div>
      ) : update.clientReaction ? (
        <div className="mt-2.5">
          <ReactionBadge reaction={update.clientReaction} />
          {update.clientComment && (
            <p className="mt-1.5 rounded-xl bg-white px-3 py-2 text-xs italic text-stone-600">
              “{update.clientComment}”
            </p>
          )}
        </div>
      ) : (
        <div className="mt-2.5">
          {mode === 'changes' ? (
            <div>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={2}
                placeholder="Tell them what you'd like changed…"
                className="w-full rounded-xl border border-sand px-3 py-2 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
              />
              {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={saving || !comment.trim()}
                  onClick={() => react('changes_requested', true)}
                  className="rounded-full bg-forest px-4 py-1.5 text-xs font-bold text-cream transition hover:bg-forest-soft disabled:opacity-50"
                >
                  {saving ? 'Sending…' : 'Send'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setMode(null)}
                  className="rounded-full border border-sand px-4 py-1.5 text-xs font-semibold text-stone-600 hover:border-gold"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => react('liked', false)}
                className="rounded-full border border-sand bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-gold hover:text-gold-dark disabled:opacity-50"
              >
                👍 Love it
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setMode('changes')}
                className="rounded-full border border-sand bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-gold hover:text-gold-dark disabled:opacity-50"
              >
                Request changes
              </button>
            </div>
          )}
          {error && mode !== 'changes' && (
            <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

const REACTION_META = {
  approved: { label: 'You approved — work continues', classes: 'bg-emerald-100 text-emerald-800' },
  liked: { label: 'You liked this update', classes: 'bg-gold/20 text-gold-dark' },
  changes_requested: { label: 'You requested changes', classes: 'bg-amber-100 text-amber-800' },
};

function ReactionBadge({ reaction }) {
  const meta = REACTION_META[reaction];
  if (!meta) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.classes}`}>
      <CheckIcon className="h-3 w-3" />
      {meta.label}
    </span>
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

function CheckIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={className} aria-hidden="true">
      <path d="M5 13l4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
