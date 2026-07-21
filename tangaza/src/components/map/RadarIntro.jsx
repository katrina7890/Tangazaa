import { useEffect, useMemo, useRef, useState } from 'react';

/** How long the scan plays before the map is revealed. */
export const RADAR_DURATION_MS = 5000;

const FADE_MS = 700;

/** Contacts scattered around the dish, each blinking as the beam passes. */
const CONTACTS = [
  { x: 62, y: 34, delay: 0.15 },
  { x: 38, y: 44, delay: 0.75 },
  { x: 72, y: 60, delay: 1.15 },
  { x: 30, y: 68, delay: 1.5 },
  { x: 55, y: 74, delay: 0.45 },
  { x: 46, y: 26, delay: 1.8 },
];

/**
 * A radar sweep that plays over the browse map before the inventory appears.
 *
 * Deliberately skippable and deliberately time-boxed: it's a flourish, and a
 * flourish that traps someone for five seconds every visit is a cost, not a
 * feature. It also cuts to the map immediately when the OS asks for reduced
 * motion — a rotating beam is a classic vestibular trigger.
 */
export default function RadarIntro({ durationMs = RADAR_DURATION_MS, onDone }) {
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);

  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  useEffect(() => {
    // Someone who asked for reduced motion gets the map straight away.
    if (reducedMotion) {
      onDone();
      return undefined;
    }

    const finish = setTimeout(() => setLeaving(true), durationMs);
    return () => clearTimeout(finish);
  }, [durationMs, reducedMotion, onDone]);

  // Unmount only after the fade, so the map isn't revealed with a hard cut.
  useEffect(() => {
    if (!leaving) return undefined;
    const unmount = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
    }, FADE_MS);
    return () => clearTimeout(unmount);
  }, [leaving, onDone]);

  if (reducedMotion) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-[1100] flex flex-col items-center justify-center bg-forest-deep transition-opacity duration-700 ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative h-[min(72vw,340px)] w-[min(72vw,340px)]">
        {/* Expanding rings, behind the beam */}
        {[0, 0.9, 1.8].map((delay) => (
          <span
            key={delay}
            className="radar-pulse absolute inset-0 rounded-full border border-gold/40"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}

        {/* Static dish: rings + crosshairs */}
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden>
          {[96, 72, 48, 24].map((r) => (
            <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#8a3df0" strokeOpacity="0.28" strokeWidth="1" />
          ))}
          <path d="M100 4V196M4 100H196" stroke="#8a3df0" strokeOpacity="0.22" strokeWidth="1" />
        </svg>

        {/* The rotating beam */}
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div
            className="radar-sweep h-full w-full rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, rgba(138,61,240,0) 0deg, rgba(138,61,240,0) 250deg, rgba(138,61,240,0.28) 320deg, rgba(224,31,102,0.75) 358deg, rgba(224,31,102,0.9) 360deg)',
            }}
          />
        </div>

        {/* Contacts picked up by the sweep */}
        {CONTACTS.map((contact) => (
          <span
            key={`${contact.x}-${contact.y}`}
            className="radar-ping absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-mint shadow-[0_0_12px_2px_rgba(201,238,216,0.7)]"
            style={{
              left: `${contact.x}%`,
              top: `${contact.y}%`,
              animationDelay: `${contact.delay}s`,
            }}
          />
        ))}

        {/* Centre pip */}
        <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold" />
      </div>

      <p className="mt-10 font-display text-lg font-black tracking-[-0.02em] text-cream sm:text-xl">
        Scanning Nairobi for available billboards
      </p>
      <p className="mt-1.5 text-sm text-cream/50">Locating verified inventory near you…</p>

      <div className="mt-6 h-1 w-56 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold to-blush"
          style={{ animation: `radar-progress ${durationMs}ms linear forwards` }}
        />
      </div>

      <button
        type="button"
        onClick={() => setLeaving(true)}
        className="mt-7 rounded-full border border-cream/25 px-5 py-2 text-xs font-bold text-cream/70 transition hover:border-cream/60 hover:text-cream"
      >
        Skip
      </button>
    </div>
  );
}
