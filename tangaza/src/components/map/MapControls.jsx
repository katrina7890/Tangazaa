import { useEffect, useRef, useState } from 'react';
import { TILE_THEMES } from './tileThemes';

export default function MapControls({ theme, onThemeChange, onZoomIn, onZoomOut }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click or Escape while open (same pattern as the header account menu).
  useEffect(() => {
    if (!menuOpen) return undefined;
    function onPointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="absolute left-4 top-24 z-[900] flex flex-col gap-2">
      <button
        type="button"
        onClick={onZoomIn}
        title="Zoom in"
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-bold text-slate-800 shadow-md hover:bg-slate-50"
      >
        +
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        title="Zoom out"
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-bold text-slate-800 shadow-md hover:bg-slate-50"
      >
        −
      </button>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title="Map style"
          className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-md transition ${
            menuOpen ? 'bg-forest text-cream' : 'bg-white text-slate-800 hover:bg-slate-50'
          }`}
        >
          <GearIcon />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute left-0 top-full mt-2 w-40 overflow-hidden rounded-2xl border border-sand bg-white p-1.5 shadow-xl"
          >
            <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
              Map style
            </p>
            {Object.entries(TILE_THEMES).map(([key, config]) => {
              const active = theme === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => onThemeChange(key)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition ${
                    active ? 'bg-forest text-cream' : 'text-stone-700 hover:bg-cream'
                  }`}
                >
                  <ThemeIcon theme={key} />
                  {config.label}
                  {active && <CheckIcon className="ml-auto h-3.5 w-3.5 text-gold" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="sr-only">Current map style: {TILE_THEMES[theme]?.label ?? theme}</p>
    </div>
  );
}

function ThemeIcon({ theme }) {
  if (theme === 'dark') return <MoonIcon />;
  if (theme === 'satellite') return <SatelliteIcon />;
  return <SunIcon />;
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
      <circle cx="12" cy="12" r="4" />
      <path
        strokeLinecap="round"
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinejoin="round" />
    </svg>
  );
}

function SatelliteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
      <path d="M13 7l4 4-1.5 1.5a5 5 0 0 1-7-7L10 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 21l3.5-3.5M17.5 6.5L19 5M15 9l2-2M7 13l2 2" strokeLinecap="round" />
      <circle cx="19" cy="5" r="1.5" />
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={className}>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
