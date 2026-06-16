export default function MapControls({ theme, onToggleTheme, onZoomIn, onZoomOut }) {
  return (
    <div className="absolute left-4 top-24 z-[900] flex flex-col gap-2">
      <button
        type="button"
        onClick={onToggleTheme}
        title="Toggle map style"
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-sand text-slate-800 shadow-md hover:bg-sand-dark"
      >
        <LayersIcon />
      </button>
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
      <button
        type="button"
        title="Settings (coming soon)"
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-800 shadow-md hover:bg-slate-50"
      >
        <GearIcon />
      </button>
      <p className="sr-only">Current map style: {theme}</p>
    </div>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
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
