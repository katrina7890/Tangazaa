/**
 * Forest-green header band shared by the dashboards, so each one opens on a
 * strong brand colour instead of a wall of cream. Renders an optional eyebrow,
 * a serif title, and any actions/children on the right.
 */
export default function DashboardHero({ eyebrow, title, children }) {
  return (
    <div className="relative overflow-hidden bg-forest">
      {/* soft gold glow for depth */}
      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
      <div className="relative mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 pb-16 pt-28">
        <div>
          {eyebrow && (
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-coral">{eyebrow}</p>
          )}
          <h1 className="mt-1.5 font-serif text-4xl font-bold tracking-tight text-cream sm:text-5xl">{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
