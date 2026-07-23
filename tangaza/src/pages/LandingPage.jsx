import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { fetchBillboards } from '../api';
import { NAIROBI_CENTER, TILE_THEMES } from '../components/map/tileThemes';

/**
 * The public marketing page, built from the "Tangazaa Landing Page" mockup in
 * the claude.ai/design project (imported via DesignSync, 2026-07-21).
 *
 * Photography comes from `public/`, named for the slot it fills in the design:
 *   hero            → "Nairobi Skyine at dusk.jpg"  (sic — the file is spelled
 *                      that way on disk; don't "fix" the path)
 *   verified boards → "Broad daylight.jpg"
 *   site walk       → "site walk.jpg"
 *
 * The design's "Live map" and "Booking calendar" tiles are rendered as the real
 * things — an actual Leaflet map of live inventory and a real current-month
 * grid — rather than the mockup's flat colour blocks.
 */
export default function LandingPage() {
  const [billboards, setBillboards] = useState([]);

  useEffect(() => {
    fetchBillboards()
      .then(setBillboards)
      .catch(() => setBillboards([]));
  }, []);

  const count = billboards.length;

  return (
    <div className="overflow-hidden bg-cream">
      <Hero />
      <Philosophy />
      <RealBoards billboards={billboards} count={count} />
      <OnePlatform />
      <Footer />
    </div>
  );
}

/* ── Hero ─────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative isolate flex min-h-[88vh] flex-col overflow-hidden bg-forest-deep">
      <img
        src={`${process.env.PUBLIC_URL}/Nairobi Skyine at dusk.jpg`}
        alt="Nairobi skyline at dusk, with lit billboards along the highway"
        className="absolute inset-0 h-full w-full object-cover"
        // The LCP image — hint the browser to fetch it ahead of other assets.
        fetchPriority="high"
      />
      {/* The mockup's plum→amber wash, laid over the photo so the white type
          stays readable against the city lights. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(160deg, rgba(23,17,13,.92) 0%, rgba(58,20,64,.78) 40%, rgba(123,31,82,.55) 70%, rgba(232,152,95,.30) 100%)',
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col px-4 pt-20 sm:px-8">
        {/* In-page section nav, lifted to sit alongside the global Header's
            sign-in controls (the header's wordmark is hidden on this route). */}
        <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-semibold text-white/85">
          {/* The one nav item that leaves the page — given the signature
              gradient so the route to the map reads as the primary action.
              Swapped ahead of "About us" per request; the gradient stays with it. */}
          <Link
            to="/map"
            className="rounded-full bg-gradient-to-r from-gold to-blush px-5 py-2 text-white shadow-lg shadow-gold/30 transition hover:opacity-90"
          >
            Billboards
          </Link>
          <a href="#how-it-works" className="transition hover:text-white">
            How it works
          </a>
          <a href="#about" className="transition hover:text-white">
            About us
          </a>
        </nav>

        <p className="mt-12 text-sm font-semibold uppercase tracking-[0.2em] text-white/75 sm:text-base">
          Outdoor advertising, booked in minutes
        </p>

        <div className="flex-1" />

        {/* The signature wordmark: enormous, tight, with the trailing "aa" in
            italic. Bleeds off the bottom edge exactly as designed. */}
        <p
          className="wordmark-display translate-y-[12%] select-none text-center text-[clamp(4rem,19.5vw,17.5rem)] text-[#fdf6ee]"
          aria-hidden
        >
          tangaz<em>aa</em>
        </p>
      </div>
    </section>
  );
}

/* ── Philosophy ───────────────────────────────────────────────── */

function Philosophy() {
  return (
    <section id="about" className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
      <div>
        <h2 className="max-w-md font-display text-3xl font-extrabold leading-[1.15] text-forest sm:text-4xl">
          A new way to book outdoor advertising in Nairobi
        </h2>
        <p className="mt-6 max-w-md leading-relaxed text-forest/70">
          Tangazaa is about conscious media buying — verified boards, transparent pricing, and
          instant confirmations for real everyday campaigns.
        </p>
        <p className="mt-3.5 max-w-md leading-relaxed text-forest/70">
          We believe booking a billboard shouldn&apos;t take a week of calls. Modern tooling, calm and
          minimal, built for how Nairobi advertises.
        </p>
        <Link
          to="/signup"
          className="mt-7 inline-block rounded-full bg-gradient-to-br from-gold to-blush px-7 py-3.5 text-sm font-bold text-white transition hover:opacity-90"
        >
          More about Tangazaa
        </Link>
      </div>

      <div className="flex justify-center">
        <PhoneMockup />
      </div>
    </section>
  );
}

/** The mockup's "booking flow — phone mockup" slot, drawn as real UI. */
function PhoneMockup() {
  return (
    <div className="relative">
      <div className="flex h-[400px] w-[300px] rotate-6 items-center justify-center rounded-[34px] bg-gradient-to-br from-forest to-forest-soft p-5 shadow-2xl">
        <div className="flex h-full w-full flex-col gap-3 rounded-3xl bg-cream p-4">
          <span className="mx-auto h-1 w-10 rounded-full bg-forest/20" />

          <div className="h-20 overflow-hidden rounded-xl">
            <img
              src={`${process.env.PUBLIC_URL}/map-billboard.jpg`}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>

          <div>
            <p className="text-[13px] font-bold text-forest">Waiyaki Way Gantry</p>
            <p className="text-[11px] text-forest/50">Westlands · Digital LED</p>
          </div>

          <div className="rounded-xl border border-sand bg-white p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-gold-dark">Campaign</p>
            <p className="mt-0.5 text-[11px] font-semibold text-forest">1 Aug – 31 Aug</p>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-forest/50">Total</span>
            <span className="font-display text-base font-black text-forest">Ksh 434,000</span>
          </div>

          <div className="mt-auto rounded-xl bg-gradient-to-r from-gold to-blush py-2.5 text-center text-[12px] font-bold text-white">
            Book &amp; pay
          </div>
        </div>
      </div>

      <div className="absolute -right-5 top-8 -rotate-[4deg] rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-mint-ink shadow-xl">
        ✓ Confirmed
      </div>
    </div>
  );
}

/* ── Real boards ──────────────────────────────────────────────── */

function RealBoards({ billboards, count }) {
  return (
    <section id="how-it-works" className="mx-auto grid max-w-6xl items-start gap-6 px-4 pb-20 sm:px-8 lg:grid-cols-[1.1fr_1.1fr_1fr] lg:pb-28">
      <PhotoCard
        src={`${process.env.PUBLIC_URL}/Broad daylight.jpg`}
        alt="Billboards along a Nairobi expressway in daylight"
        caption={
          count > 0
            ? `${count} verified boards live across Nairobi`
            : 'Verified boards live across Nairobi'
        }
      />
      <PhotoCard
        src={`${process.env.PUBLIC_URL}/site walk.jpg`}
        alt="People looking up at a Tangazaa-branded billboard during a site walk"
        caption="Real site photos, updated weekly"
      />

      <div>
        <h2 className="font-display text-2xl font-extrabold leading-tight text-forest sm:text-3xl">
          Real boards. Real data.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-forest/70">
          Thoughtfully vetted inventory brought to your screen — live availability, footfall
          estimates, and honest pricing, without the back-and-forth.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Tile label="Live map">
            <MiniMap billboards={billboards} />
          </Tile>
          <Tile label="Booking calendar">
            <MiniCalendar />
          </Tile>
          <Tile label="Reach analytics">
            <MiniAnalytics />
          </Tile>
        </div>
      </div>
    </section>
  );
}

function PhotoCard({ src, alt, caption }) {
  return (
    <figure className="relative m-0 h-[340px] overflow-hidden rounded-3xl">
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/80 via-forest-deep/10 to-transparent" />
      <figcaption className="absolute inset-x-5 bottom-5 text-base font-bold leading-snug text-white">
        {caption}
      </figcaption>
    </figure>
  );
}

function Tile({ label, children }) {
  return (
    <div>
      <div className="h-[86px] overflow-hidden rounded-xl border border-sand bg-white">{children}</div>
      <p className="mt-2 text-[11px] text-forest/55">{label}</p>
    </div>
  );
}

/** The design's "Live map" block, drawn as a real map of live inventory. */
function MiniMap({ billboards }) {
  const points = useMemo(
    () => billboards.filter((board) => board.lat != null && board.lng != null).slice(0, 40),
    [billboards],
  );

  return (
    <MapContainer
      center={NAIROBI_CENTER}
      zoom={10}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      keyboard={false}
      attributionControl={false}
      // Decorative: the real browsable map is at /map.
      className="pointer-events-none h-full w-full"
    >
      <TileLayer url={TILE_THEMES.dark.url} />
      {points.map((board) => (
        <CircleMarker
          key={board.id}
          center={[board.lat, board.lng]}
          radius={3}
          pathOptions={{ color: '#e01f66', weight: 0, fillColor: '#e01f66', fillOpacity: 0.95 }}
        />
      ))}
    </MapContainer>
  );
}

/**
 * A month laid out Monday-first, matching the calendars elsewhere in the app.
 * Leading blanks are `null` so callers can render them as empty cells.
 */
function monthCells(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  return [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
}

/** The design's "Booking calendar" block, as a real current-month grid. */
function MiniCalendar() {
  const { cells, today } = useMemo(() => {
    const now = new Date();
    return { cells: monthCells(now), today: now.getDate() };
  }, []);

  return (
    <div className="grid h-full grid-cols-7 content-start gap-[1px] p-1.5">
      {cells.slice(0, 28).map((day, index) => (
        <span
          key={index}
          className={`rounded-[2px] ${
            day === null
              ? ''
              : day === today
                ? 'bg-gradient-to-br from-gold to-blush'
                : day > today && day <= today + 5
                  ? 'bg-gold/25'
                  : 'bg-forest/10'
          }`}
        />
      ))}
    </div>
  );
}

/** The design's "Reach analytics" block, as a small bar chart. */
function MiniAnalytics() {
  const bars = [38, 62, 45, 80, 55, 92, 70];
  return (
    <div className="flex h-full items-end gap-[3px] p-2">
      {bars.map((height, index) => (
        <span
          key={index}
          className={`flex-1 rounded-t-[2px] ${index % 3 === 1 ? 'bg-mint-ink' : 'bg-forest/25'}`}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

/* ── One platform ─────────────────────────────────────────────── */

function OnePlatform() {
  return (
    <section className="px-4 sm:px-8">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-extrabold leading-tight text-forest sm:text-4xl">
            One platform,
            <br />
            every step
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-forest/70">
            Multifunctional booking line designed to simplify your campaign without compromising
            reach.
          </p>
        </div>

        {/* `isolate` gives the cards their own stacking context, so a hovered
            card can rise above its neighbours without escaping the section. */}
        <div className="flex h-[270px] items-center justify-center isolate">
          <StepCard label="Search" tone="-rotate-6 bg-gradient-to-br from-forest to-forest-soft text-white">
            <SearchPreview />
          </StepCard>
          <StepCard label="Book" tone="-ml-5 bg-gradient-to-br from-gold to-blush text-white">
            <BookPreview />
          </StepCard>
          <StepCard label="Pay" tone="-ml-5 rotate-6 bg-gradient-to-br from-mint-ink to-mint text-forest">
            <PayPreview />
          </StepCard>
        </div>
      </div>

      {/* Outlined display type — the design's second typographic anchor. */}
      <p
        className="wordmark-display -my-[2%] select-none text-center text-[clamp(4rem,20vw,18rem)] text-transparent"
        style={{ WebkitTextStroke: '2px var(--color-gold)' }}
        aria-hidden
      >
        book
      </p>

      <div className="mx-auto grid max-w-6xl items-center gap-10 pb-20 lg:grid-cols-[1.3fr_1fr] lg:pb-28">
        <BookingSummaryCard />
        <div>
          <p className="text-sm leading-relaxed text-forest/75">
            Search, compare, and confirm bookings in one flow — with verified inventory, transparent
            pricing, and instant confirmations.
          </p>
          <Link
            to="/map"
            className="mt-5 inline-block rounded-full border-[1.5px] border-forest px-6 py-3 text-sm font-bold text-forest transition hover:bg-forest hover:text-cream"
          >
            View billboards
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * One step of the booking flow, as a fanned card carrying a miniature of that
 * screen. Hovering lifts the card, straightens its tilt and brings it forward
 * over its neighbours.
 *
 * The preview content is always rendered rather than revealed on hover — touch
 * devices have no hover state, and hiding it would make the cards meaningless
 * on a phone.
 */
function StepCard({ label, tone, children }) {
  return (
    <div
      className={`relative z-0 flex h-[218px] w-[116px] flex-col rounded-2xl p-3 shadow-xl transition duration-300 ease-out hover:z-30 hover:-translate-y-3 hover:rotate-0 hover:scale-110 hover:shadow-2xl sm:w-[150px] sm:p-4 ${tone}`}
    >
      <div className="min-h-0 flex-1">{children}</div>
      <p className="mt-2 text-[13px] font-bold">{label}</p>
    </div>
  );
}

/** Step 1 — a miniature of the map/search screen. */
function SearchPreview() {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-1.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-2.5 w-2.5 flex-none opacity-80" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
        <span className="truncate text-[9px] font-semibold">Westlands</span>
      </div>

      <div className="space-y-1.5">
        {[
          { w: 'w-full', active: true },
          { w: 'w-4/5', active: false },
          { w: 'w-3/4', active: false },
        ].map((row, index) => (
          <div
            key={index}
            className={`flex items-center gap-1.5 rounded-md p-1 ${row.active ? 'bg-white/15' : ''}`}
          >
            <span className="h-5 w-5 flex-none rounded bg-white/25" />
            <span className="min-w-0 flex-1 space-y-1">
              <span className={`block h-1 rounded-full bg-white/50 ${row.w}`} />
              <span className="block h-1 w-1/2 rounded-full bg-white/25" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Step 2 — the availability calendar with a campaign range selected. */
function BookPreview() {
  const { cells, month } = useMemo(() => {
    const now = new Date();
    return {
      cells: monthCells(now),
      month: now.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
    };
  }, []);

  // A contiguous selected block — this is an illustration of a chosen campaign,
  // not live availability.
  const [from, to] = [9, 21];

  return (
    <div className="flex h-full flex-col gap-1.5">
      <p className="text-[9px] font-semibold opacity-80">{month}</p>
      <div className="grid grid-cols-7 gap-[2px]">
        {cells.slice(0, 35).map((day, index) => {
          const selected = day !== null && day >= from && day <= to;
          return (
            <span
              key={index}
              className={`aspect-square rounded-[2px] ${
                day === null
                  ? ''
                  : selected
                    ? day === from || day === to
                      ? 'bg-white'
                      : 'bg-white/70'
                    : 'bg-white/20'
              }`}
            />
          );
        })}
      </div>
      <p className="mt-auto text-[9px] font-bold">
        {from}–{to} selected
      </p>
    </div>
  );
}

/** Step 3 — the payment confirmation. */
function PayPreview() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest/15">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="h-4 w-4" aria-hidden>
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="text-[9px] font-semibold opacity-70">Payment confirmed</p>
      <p className="font-display text-[13px] font-black leading-none">Ksh 434,000</p>
      <span className="rounded-full bg-forest/15 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide">
        Paid
      </span>
    </div>
  );
}

/** The design's "dashboard screenshot — booking summary" slot, as real UI. */
function BookingSummaryCard() {
  return (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-forest-deep via-[#3a1440] to-[#c9436f] p-6 sm:p-8">
      <div className="rounded-2xl bg-white/95 p-5 backdrop-blur">
        <div className="flex items-center justify-between gap-3 border-b border-sand pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold-dark">
              Booking summary
            </p>
            <p className="mt-1 font-display text-lg font-black text-forest">Waiyaki Way Gantry</p>
          </div>
          <span className="rounded-full bg-mint px-3 py-1 text-[11px] font-bold text-mint-ink">
            Confirmed
          </span>
        </div>

        <dl className="mt-3 space-y-2 text-[13px]">
          {[
            ['Campaign', '1 Aug – 31 Aug 2026'],
            ['Duration', '31 days'],
            ['Rate', 'Ksh 14,000 / day'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-forest/50">{label}</dt>
              <dd className="font-semibold text-forest">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-3 flex items-baseline justify-between border-t border-sand pt-3">
          <span className="text-[13px] text-forest/50">Total paid</span>
          <span className="font-display text-xl font-black text-forest">Ksh 434,000</span>
        </div>
      </div>
    </div>
  );
}

/* ── Footer ───────────────────────────────────────────────────── */

// Only destinations that actually exist — the design's Pricing/Blog/Legal
// columns are deliberately dropped rather than shipped as dead links.
const FOOTER_COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'Browse billboards', to: '/map' },
      { label: 'How it works', href: '#how-it-works' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About us', href: '#about' },
      { label: 'For billboard owners', to: '/partner/login' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Sign in', to: '/login' },
      { label: 'Create an account', to: '/signup' },
    ],
  },
];

function Footer() {
  return (
    <footer className="bg-forest text-white">
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-10 px-4 pb-8 pt-14 sm:px-8 md:flex-row">
        <div>
          <p className="font-display text-xl font-black tracking-wide">TANGAZAA</p>
          <p className="mt-2.5 max-w-[220px] text-sm text-white/50">
            Outdoor advertising, booked in minutes.
          </p>
        </div>

        <div className="flex flex-wrap gap-10 sm:gap-16">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.heading} className="flex flex-col gap-2.5">
              <p className="text-[11px] uppercase tracking-[0.1em] text-white/40">{column.heading}</p>
              {column.links.map((link) =>
                link.to ? (
                  <Link key={link.label} to={link.to} className="text-sm text-white/70 transition hover:text-white">
                    {link.label}
                  </Link>
                ) : (
                  <a key={link.label} href={link.href} className="text-sm text-white/70 transition hover:text-white">
                    {link.label}
                  </a>
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="mx-auto max-w-6xl px-4 pb-7 text-xs text-white/40 sm:px-8">
        © {new Date().getFullYear()} Tangazaa. All rights reserved.
      </p>
    </footer>
  );
}
