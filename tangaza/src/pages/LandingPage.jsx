import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchBillboards } from '../api';
import billboardHero from '../assets/billboard-hero.jpg';

const FEATURES = [
  {
    title: 'Live Availability',
    description: 'See real booking calendars for every billboard — no back-and-forth emails or phone tag.',
    icon: <CalendarIcon />,
  },
  {
    title: 'Transparent Pricing',
    description: 'Daily and weekly rates are shown upfront. No hidden fees, no surprise quotes.',
    icon: <PriceTagIcon />,
  },
  {
    title: 'Verified Listings',
    description: 'Every billboard is tied to a real, accountable company account, not an anonymous ad.',
    icon: <ShieldIcon />,
  },
  {
    title: 'Nationwide Map View',
    description: 'Browse by location on an interactive map and compare options at a glance.',
    icon: <PinIcon />,
  },
];

export default function LandingPage() {
  const [billboardCount, setBillboardCount] = useState(null);

  useEffect(() => {
    fetchBillboards()
      .then((billboards) => setBillboardCount(billboards.length))
      .catch(() => setBillboardCount(null));
  }, []);

  return (
    <div className="bg-cream">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative isolate flex min-h-[92vh] flex-col overflow-hidden bg-forest">
        <img
          src={billboardHero}
          alt="A billboard against a blue sky"
          className="absolute inset-0 -z-10 h-full w-full object-cover object-center"
        />
        {/* Layered gradient: dark at top for the nav, clear through the middle so the
            billboard reads clearly, dark again at the bottom for headline legibility. */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-forest/85 via-forest/25 to-forest/95" />
        <div className="absolute inset-0 -z-10 bg-forest/10" />

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-end px-4 pb-20 pt-36 text-center">
          <span className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-gold-soft">
            <span className="h-px w-8 bg-gold/60" />
            Kenya&apos;s Billboard Marketplace
            <span className="h-px w-8 bg-gold/60" />
          </span>

          <h1 className="font-serif text-4xl font-semibold leading-[1.1] text-cream drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] sm:text-6xl">
            Book the Right Billboard,
            <span className="block text-gold">Faster.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-cream/85 sm:text-lg">
            Tangazaa connects advertisers with billboard owners across Kenya — browse live
            availability, compare prices, and book a campaign in minutes.
          </p>

          <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              to="/map"
              className="group inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-forest shadow-lg shadow-black/20 transition duration-200 hover:-translate-y-0.5 hover:bg-gold-soft hover:shadow-xl"
            >
              Browse Billboards
              <ArrowIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center rounded-full border border-cream/40 px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-cream backdrop-blur-sm transition duration-200 hover:border-gold hover:text-gold"
            >
              List Your Billboard
            </Link>
          </div>

          {billboardCount !== null && (
            <p className="mt-8 inline-flex items-center gap-2 text-sm text-cream/70">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold/70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
              </span>
              {billboardCount} billboard{billboardCount === 1 ? '' : 's'} live on the map right now
            </p>
          )}
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────── */}
      <section className="border-y border-sand bg-cream">
        <div className="mx-auto grid max-w-5xl grid-cols-1 divide-y divide-sand sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Stat value="30-day" label="Minimum campaign length" />
          <Stat value="Nationwide" label="Coverage across Kenya" />
          <Stat value="Verified" label="Accountable owners only" />
        </div>
      </section>

      {/* ── Why Tangazaa ─────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-dark">
            Why Tangazaa
          </span>
          <h2 className="mt-3 font-serif text-3xl font-semibold text-forest sm:text-4xl">
            Outdoor advertising without the friction
          </h2>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-sand bg-white p-7 text-center shadow-sm transition duration-200 hover:-translate-y-1.5 hover:border-gold/50 hover:shadow-xl"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cream text-gold-dark ring-1 ring-sand transition-colors duration-200 group-hover:bg-gold group-hover:text-forest group-hover:ring-gold">
                {feature.icon}
              </div>
              <h3 className="mt-5 font-semibold text-forest">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Owner CTA ────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-forest px-4 py-20">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">
            Own a billboard?
          </h2>
          <p className="mt-4 text-cream/80">
            List it on Tangazaa and start getting bookings from advertisers across the country —
            you set the rates, we bring the demand.
          </p>
          <Link
            to="/signup"
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-forest shadow-lg shadow-black/20 transition duration-200 hover:-translate-y-0.5 hover:bg-gold-soft hover:shadow-xl"
          >
            List Your Billboard
            <ArrowIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-forest-deep px-4 py-12 text-center text-cream/70">
        <p className="font-display text-xl tracking-wide text-cream">
          TANGAZ<span className="text-gold">AA</span>
        </p>
        <p className="mt-2 text-sm">Billboard advertising, made simple.</p>
        <div className="mt-7 flex flex-col items-center gap-3 text-sm sm:flex-row sm:justify-center sm:gap-10">
          <a href="mailto:hello@tangaza.test" className="transition-colors hover:text-gold">
            hello@tangaza.test
          </a>
          <a href="tel:+254700000000" className="transition-colors hover:text-gold">
            +254 700 000 000
          </a>
          <span>Westlands, Nairobi, Kenya</span>
        </div>
        <p className="mt-10 text-xs text-cream/40">
          &copy; {new Date().getFullYear()} Tangazaa. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="px-6 py-8 text-center">
      <p className="font-serif text-2xl font-semibold text-gold-dark">{value}</p>
      <p className="mt-1 text-sm text-stone-600">{label}</p>
    </div>
  );
}

function ArrowIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function PriceTagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 1 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
