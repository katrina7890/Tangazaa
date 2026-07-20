import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchBillboards } from '../api';
import billboardHero from '../assets/billboard-hero.jpg';

const FEATURES = [
  {
    title: 'Live availability',
    description: 'See real booking calendars for every billboard — no back-and-forth emails or phone tag.',
    icon: <CalendarIcon />,
  },
  {
    title: 'Transparent pricing',
    description: 'Daily and weekly rates are shown upfront. No hidden fees, no surprise quotes.',
    icon: <PriceTagIcon />,
  },
  {
    title: 'Verified listings',
    description: 'Every billboard is tied to a real, accountable company account, not an anonymous ad.',
    icon: <ShieldIcon />,
  },
  {
    title: 'Nationwide map view',
    description: 'Browse by location on an interactive map and compare options at a glance.',
    icon: <PinIcon />,
  },
];

// Demo advertiser wordmarks (fictional brands, two of them straight from the
// seeded demo data). Text-only "logos" in varied type treatments until real
// clients supply artwork — swap in <img> logos here when they exist.
const ADVERTISERS = [
  { name: 'Acme Ads', wordmarkClass: 'font-display text-xl font-bold' },
  { name: 'SAVANNAH BRANDS', wordmarkClass: 'text-sm font-bold tracking-[0.18em]' },
  { name: 'Kifaru Lager', wordmarkClass: 'font-display text-xl font-semibold italic' },
  { name: 'NYOTA BANK', wordmarkClass: 'text-sm font-extrabold tracking-[0.12em]' },
  { name: 'Mavuno Foods', wordmarkClass: 'font-display text-xl font-bold' },
  { name: 'baraka air', wordmarkClass: 'text-base font-bold lowercase tracking-tight' },
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
      <section className="relative isolate flex min-h-[92vh] flex-col overflow-hidden bg-forest-deep">
        <img
          src={billboardHero}
          alt="A billboard against a blue sky"
          className="absolute inset-0 -z-10 h-full w-full object-cover object-center opacity-70"
        />
        {/* Charcoal wash: dark at top for the nav, darkest at the bottom for headline legibility. */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-forest-deep/80 via-forest-deep/40 to-forest-deep/95" />

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-end px-4 pb-24 pt-36 text-center">
          <span className="mb-6 text-[11px] font-bold uppercase tracking-[0.12em] text-gold">
            Tangazaa &middot; Kenya&apos;s billboard marketplace
          </span>

          <h1 className="font-serif text-5xl font-bold leading-[1.02] tracking-tight text-white sm:text-7xl">
            The right billboard.
            <span className="block">Booked in minutes.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75">
            Tangazaa connects advertisers with billboard owners across Kenya — live
            availability, upfront pricing, and campaigns you can follow from artwork
            to installation.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              to="/map"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3 text-sm font-semibold text-forest-deep transition hover:bg-gold-soft"
            >
              Browse billboards
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center rounded-full border border-white/25 px-7 py-3 text-sm font-semibold text-white transition hover:border-gold hover:text-gold"
            >
              List your billboard
            </Link>
          </div>

          {billboardCount !== null && (
            <p className="mt-10 inline-flex items-center gap-2 text-[13px] text-white/60">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
              </span>
              {billboardCount} billboard{billboardCount === 1 ? '' : 's'} live on the map right now
            </p>
          )}
        </div>
      </section>

      {/* ── By the numbers ───────────────────────────────────── */}
      <section className="border-b border-sand bg-cream">
        <div className="mx-auto grid max-w-5xl grid-cols-1 divide-y divide-sand sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Stat value="30 days" label="Minimum campaign length" />
          <Stat value="Nationwide" label="Coverage across Kenya" />
          <Stat value="Verified" label="Accountable owners only" />
        </div>
      </section>

      {/* ── Verified advertisers ─────────────────────────────── */}
      <section className="bg-forest px-4 py-16">
        <div className="mx-auto max-w-5xl text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold">
            Trusted by advertisers across Kenya
          </span>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {ADVERTISERS.map((brand) => (
              <div
                key={brand.name}
                className="flex min-h-[7rem] flex-col items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-5 transition-colors hover:border-gold/40"
              >
                <span className={`text-cream ${brand.wordmarkClass}`}>{brand.name}</span>
                <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-gold">
                  <VerifiedIcon />
                  Verified
                </span>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-8 max-w-md text-xs leading-relaxed text-cream/60">
            Every campaign on Tangazaa is tied to a verified, accountable company account —
            on both sides of the booking.
          </p>
        </div>
      </section>

      {/* ── Why Tangazaa ─────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <div className="text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold-dark">
            Why Tangazaa
          </span>
          <h2 className="mt-3 font-serif text-4xl font-bold tracking-tight text-forest sm:text-5xl">
            Outdoor advertising, without the friction.
          </h2>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-black/5 bg-white p-7 transition-colors hover:border-gold/40"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cream text-gold-dark ring-1 ring-sand">
                {feature.icon}
              </div>
              <h3 className="mt-5 font-semibold text-forest">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Owner CTA ────────────────────────────────────────── */}
      <section className="bg-forest px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold">
            For billboard companies
          </span>
          <h2 className="mt-3 font-serif text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Own a billboard? Put it to work.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-white/70">
            List it on Tangazaa and start getting bookings from advertisers across the
            country — you set the rates, we bring the demand.
          </p>
          <Link
            to="/signup"
            className="mt-8 inline-flex items-center rounded-full bg-gold px-7 py-3 text-sm font-semibold text-forest-deep transition hover:bg-gold-soft"
          >
            List your billboard
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-forest-deep px-4 py-14 text-center text-white/60">
        <p className="font-display text-2xl font-bold tracking-[0.08em] text-white">
          TANGAZ<span className="text-gold">AA</span>
        </p>
        <p className="mt-2 text-sm">Billboard advertising, made simple.</p>
        <div className="mt-8 flex flex-col items-center gap-3 text-sm sm:flex-row sm:justify-center sm:gap-10">
          <a href="mailto:hello@tangaza.test" className="transition-colors hover:text-gold">
            hello@tangaza.test
          </a>
          <a href="tel:+254700000000" className="transition-colors hover:text-gold">
            +254 700 000 000
          </a>
          <span>Westlands, Nairobi, Kenya</span>
        </div>
        <p className="mt-10 text-xs text-white/30">
          &copy; {new Date().getFullYear()} Tangazaa. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="font-serif text-4xl font-bold tracking-tight text-forest">{value}</p>
      <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">{label}</p>
    </div>
  );
}

function VerifiedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3" aria-hidden="true">
      <path d="M12 2l2.4 2.1 3.1-.5 1 3 3 1-.5 3.1L23 13l-2 2.4.5 3.1-3 1-1 3-3.1-.5L12 24l-2.4-2-3.1.5-1-3-3-1 .5-3.1L1 13l2-2.4-.5-3.1 3-1 1-3 3.1.5L12 2z" transform="scale(0.92) translate(1,-1)" />
      <path d="M9 12.5l2 2 4-4.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function PriceTagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 1 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
