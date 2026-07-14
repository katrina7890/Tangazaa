# CLAUDE.md

Guidance for Claude Code (and humans) working in this repository. Keep this file
current — it's the single source of truth for how we build this app.

---

## Project Overview

- **Name:** Tangaza (UI brand wordmark is styled "TANGAZAA")
- **What it does:** a platform for billboard businesses to post their billboards and for clients to
  check availability and pricing to book a billboard for a period of time. Minimum campaign length
  is 30 days (`MIN_CAMPAIGN_DAYS` in `tangaza/src/utils/availability.js`).
- **User roles:** `customer` (books billboards, registers a company), `owner` (lists billboards,
  registers a company), `admin` (platform staff — not self-registrable, seed/tinker only). Stored
  as `App\Enums\UserRole` on the backend; role is chosen via a toggle on the signup form.
- **Billboards and bookings are real backend data** (not mock) as of 2026-06-16 — `App\Models\Billboard`
  (owned by an `owner`) and `App\Models\Booking` (made by a `customer`). Bookings are
  **pending-until-paid** through a simulated Paystack gateway (`App\Models\Payment`, added
  2026-06-22) — see the **Payments / booking lifecycle** section below. Customers get `/dashboard`,
  owners get `/owner`,
  admins get `/admin`; all three dashboards are role-gated on the frontend via `RequireRole` and on
  the backend via the `role:` middleware + `BillboardPolicy`.
- **Architecture:** decoupled — a Laravel API backend and a React SPA frontend, in separate
  folders within this repo. They are deployed independently and talk over HTTP.

```
Tangaza/
  api/       # Laravel 13 API backend
  tangaza/   # React 19 SPA frontend (Create React App)
```

---

## Backend — `api/`

- **Framework:** Laravel 13 · PHP 8.3+
- **Auth:** Laravel Sanctum, SPA mode (cookie-based, stateful requests from the frontend origin)
- **Database:** SQLite (`api/database/database.sqlite`) for local/dev. Swap to PostgreSQL in
  `config/database.php` / `.env` for staging/prod when that's provisioned.
- **PHP deps:** Composer
- **Asset bundling:** Vite is present (Laravel default) but unused for now — no Blade frontend.
  This is a pure JSON API; don't add Blade views/Livewire components here.

### Repository layout (`api/`)

```
app/
  Actions/        # single-purpose business operations
  Http/
    Controllers/  # thin — delegate to actions/services
    Requests/     # FormRequest validation classes
    Middleware/
  Models/         # Eloquent models
  Policies/       # authorization
  Services/       # reusable domain logic
config/           # app config — the only place env() should be read
database/
  migrations/  factories/  seeders/
routes/
  api.php  web.php  console.php
tests/
  Feature/  Unit/
```

- Use `php artisan make:*` generators — don't hand-create files that have a generator.
- All app routes belong in `routes/api.php`. `routes/web.php` only needs to exist for
  Laravel's own housekeeping (e.g. `/up` health check) — don't add page routes there.

### Sanctum / CORS setup (already wired, don't re-derive blindly — verify before changing)

- `bootstrap/app.php` calls `$middleware->statefulApi()` so cookie-based requests from the
  SPA are authenticated via session, not just bearer tokens.
- `config/cors.php`: `supports_credentials => true`, `allowed_origins` driven by `FRONTEND_URLS`
  env var (defaults to `http://localhost:3000`).
- `config/sanctum.php`: `stateful` domains include `localhost:3000` by default; controlled by
  `SANCTUM_STATEFUL_DOMAINS` env var.
- `.env`: `SESSION_DOMAIN=localhost`, `APP_URL=http://localhost:8000`.
- Frontend must call `GET /sanctum/csrf-cookie` once (to get the `XSRF-TOKEN` cookie) before
  any state-changing request, and send `X-XSRF-TOKEN` + `credentials: 'include'` on every call.
  See `tangaza/src/api.js` for the reference implementation.
- A request without `Accept: application/json` that hits an `auth:sanctum` route while
  unauthenticated will try to redirect to a `login` route and crash with
  `RouteNotFoundException` (no Breeze/web auth scaffolding here) — always send
  `Accept: application/json` from the SPA, which `api.js` already does.
- `EnsureFrontendRequestsAreStateful` only starts a session when the request's `Referer`/`Origin`
  header matches a configured stateful domain. Real browser requests send this automatically;
  raw `curl` testing needs `-H "Origin: http://localhost:3000"` or you'll get
  `RuntimeException: Session store not set on request.` Feature tests get this via a default
  `Referer` header set in `tests/TestCase::setUp()`.

### Auth endpoints (`AuthController`, all under `/api`)

| Method | Path | Notes |
|---|---|---|
| POST | `/register` | `RegisterRequest` validates `company_name`, `name`, `email`, `password`, `role` (`customer`\|`owner` only — `admin` is rejected). Logs the new user in. |
| POST | `/login` | `LoginRequest` validates `email`, `password`. 422 with a `email` field error on bad credentials. |
| POST | `/logout` | Behind `auth:sanctum`. |
| GET | `/user` | Behind `auth:sanctum`. Returns the current user including `role`/`company_name`. |

Business logic lives in `app/Actions/Auth/RegisterUser.php`, not the controller. To seed an admin,
use `User::factory()->admin()->create([...])` or `php artisan tinker` — there's no admin signup route.

### Billboard / Booking / Admin endpoints

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/billboards` | public | Active billboards only, with `booked_ranges` (confirmed bookings), `available_from`, and a computed `next_available_from`. |
| GET | `/billboards/{id}` | public | Single billboard, same shape. |
| GET | `/my/billboards` | owner, admin | The current owner's billboards (including inactive). |
| POST | `/billboards` | owner, admin | `StoreBillboardRequest` (now requires `available_from`, a `date` `after_or_equal:today`); authorized via `BillboardPolicy::create`. |
| PUT | `/billboards/{id}` | owner (own), admin | `UpdateBillboardRequest`; authorized via `BillboardPolicy::update`. |
| DELETE | `/billboards/{id}` | owner (own), admin | Authorized via `BillboardPolicy::delete`. |
| GET | `/billboards/{id}/bookings` | owner (own), admin | Bookings on one billboard, with customer info and `latestPayment` (so owners see paid/pending per booking). |
| POST | `/bookings` | customer only | `CreateBooking` action enforces the 30-day minimum, the overlap check, **and (as of 2026-06-30) rejects a `start_date` in the past or before the billboard's `available_from`** (mirrors the customer calendar — the backend is authoritative). Booking is created `pending` (not confirmed) and the response includes a freshly-`initialize`d `payment` so the SPA can go straight to checkout. See **Payments** below. |
| GET | `/my/bookings` | customer only | The current customer's bookings (eager-loads `billboard` + `latestPayment`). |
| PATCH | `/bookings/{id}/cancel` | customer (own) | Customer cancels their own booking (`BookingController@cancel`); 403 if it isn't theirs, 422 if already cancelled. Distinct from the admin cancel route below. |
| POST | `/bookings/{id}/pay` | customer (own) | `PaymentController@initialize` — (re)opens a simulated Paystack checkout for a `pending` booking; 403 if not theirs, 422 if the booking isn't pending. Reuses an existing pending `payment` so repeated clicks don't duplicate transactions. Returns a `PaymentResource`. |
| POST | `/payments/{reference}/verify` | customer (own) | `PaymentController@verify` — settles a checkout. Body `{ "success": bool }` (default `true`; `false` simulates a decline). On success re-checks date overlap, marks the payment `success` + booking `confirmed`; on conflict marks both failed/cancelled with a 422. Returns the updated `BookingResource` plus the `payment`. |
| GET | `/admin/stats` | admin only | Companies/billboards/customers/bookings counts, revenue, recent signups, suspicious-login count. |
| GET | `/admin/login-attempts` | admin only | Last 50 login attempts (success/fail, IP, flagged reason). |
| GET | `/admin/users` | admin only | Paginated, `?search=` (name/email/company) and `?role=customer\|owner\|admin` filters. `AdminUserController@index`. |
| PATCH | `/admin/users/{id}/toggle-suspension` | admin only | Flips `is_suspended`; 422 if targeting your own account (`AdminUserController@toggleSuspension`). |
| GET | `/admin/billboards` | admin only | Paginated, platform-wide (active + inactive), `?search=` (title/location), eager-loads `owner`. `Admin\BillboardController@index`. Use the existing `PUT /billboards/{id}` (full payload) to activate/deactivate — admins already pass `BillboardPolicy::update`. |
| GET | `/admin/bookings` | admin only | Paginated, platform-wide, `?search=` (billboard title/customer name/company). `Admin\BookingController@index`. |
| PATCH | `/admin/bookings/{id}/cancel` | admin only | Sets status to `cancelled` regardless of owner. `Admin\BookingController@cancel`. |

**Billboard availability (as of 2026-06-30):** `billboards.available_from` (nullable `date`) is the
first day an owner makes a board bookable; it's **required** when creating a billboard (the form
sends it) but nullable in the DB so seed data without it is valid (a null is treated as "available
today"). The model's `Billboard::nextAvailableDate()` derives the *next genuinely free* date —
the later of today / `available_from`, stepped past any confirmed booking that currently covers it
— and the resource exposes it as `next_available_from` (only `whenLoaded('bookings')`, to avoid an
N+1 on list endpoints). The frontend mirrors the walk in `availability.js#availableFrom`. A shared
`components/AvailabilityCalendar.jsx` renders a month grid that greys out past / pre-availability
days and crosses out booked days; it's interactive (range select) on the customer
`BillboardDetailPage` and read-only (`mode="view"`, next-free date ringed) in the owner's
`BookingsModal`. The owner dashboard also shows a Leaflet map of their billboards and a
"next available" badge per card.

**Payments / booking lifecycle (as of 2026-06-22):** bookings are **pending-until-paid**. A
booking starts `BookingStatus::Pending` and *does not hold the dates* — `booked_ranges` and all
overlap checks only count `Confirmed` bookings, so two customers can have pending bookings on the
same dates until one pays. Payment promotes the booking to `Confirmed`. Lifecycle:
`POST /bookings` (creates pending + opens checkout) → `POST /payments/{reference}/verify`
(`PaystackService::verify` re-checks overlap, then sets payment `success` + booking `confirmed`;
a late conflict fails the payment and cancels the booking). The customer dashboard surfaces a
**Complete payment** button on any still-`pending` booking, which calls `POST /bookings/{id}/pay`
to resume checkout. Both the customer dashboard and the owner's bookings list render a shared
`components/PaymentStatusBadge.jsx` chip — **Paid** (booking `confirmed` or payment `success`),
**Payment pending**, or **Payment failed** — so each side can see a booking's payment state at a
glance (hidden for `cancelled` bookings, which already show a status badge).

The gateway is **simulated** — `App\Services\Payments\PaystackService` keeps Paystack's
`initialize`/`verify` shape but resolves everything locally (no API keys), and the SPA renders its
own Paystack-styled modal (`components/payments/PaymentModal.jsx`) against the two payment
endpoints. Swap in real Paystack HTTP calls inside `PaystackService` when going live; the
controller/route/response contract shouldn't need to change. `payments` table: `booking_id`,
`reference` (unique, `TGZ-…`), `amount`, `email`, `channel`, `status`
(`App\Enums\PaymentStatus`: `pending`/`success`/`failed`), `paid_at`. A `Booking hasMany Payment`,
with a `latestPayment` relation for list views. `verify` is idempotent (re-verifying a settled
payment is a no-op).

**Account suspension:** `users.is_suspended` (boolean, default `false`). A suspended user's
`POST /login` is rejected with a 422 on the `email` field (checked in `AuthController::login`
right after `Auth::attempt()` succeeds, before the session is regenerated) — the failed attempt
is still recorded via `RecordLoginAttempt`. Admins can't suspend themselves (guarded in
`toggleSuspension`); the frontend additionally hides the toggle for the currently-logged-in
admin's own row (compares against `useAuth().user.id`, not role, so other admins can still be
suspended).

**Suspicious login detection** (`App\Actions\Auth\RecordLoginAttempt`, called from every `AuthController::login`
call, success or failure) flags: (1) 5+ failed attempts for the same email within 15 minutes, (2) a
successful login right after 3+ recent failures, (3) a successful login from an IP never seen before
for that user (only checked once the user has at least one prior successful login, so a brand-new
account's first login is never flagged). This is a basic heuristic, not real fraud detection —
extend `detectSuspicious()` if more signals are needed.

`role:owner,admin` / `role:customer` / `role:admin` middleware (`App\Http\Middleware\EnsureUserHasRole`,
aliased as `role` in `bootstrap/app.php`) gates these route groups in `routes/api.php`.

**Tangazaa Partner — lightweight ERP for billboard companies (as of 2026-07-14).** All endpoints
live under `/api/partner/*` behind `role:owner,admin`; every record is scoped to the authenticated
owner (`owner_id`), enforced by `ContactPolicy`/`ArtworkPolicy`/`WorkOrderPolicy` plus
`Rule::exists(...)->where('owner_id', ...)` checks in the Partner FormRequests (so you can't link
someone else's contact/billboard). Modules:

- **Overview / live occupancy** — `GET /partner/overview` (`OverviewController`, invokable):
  headline stats (billboards, occupied/vacant today, active bookings, confirmed revenue, contacts,
  open artworks/work orders) plus a per-billboard occupancy snapshot (current confirmed booking,
  advertiser, `next_available_from`) that powers the SPA's occupancy map.
- **CRM** — `contacts` table (`owner_id`, name, company, email, phone, notes). CRUD at
  `GET|POST /partner/contacts`, `PUT|DELETE /partner/contacts/{id}`; `?search=` matches
  name/company/email/phone.
- **Artwork pipeline** — `artworks` table (`App\Enums\ArtworkStatus`:
  `brief → in_design → awaiting_approval → approved|rejected`; nullable `contact_id`,
  `billboard_id`, `due_date`, `file_name` — file reference only, real uploads are a later task).
  `GET (?status=) | POST /partner/artworks`, `PATCH|DELETE /partner/artworks/{id}`.
- **Print/install work orders** — `work_orders` table (`WorkOrderType`:
  printing/installation/removal/maintenance; `WorkOrderStatus`:
  pending/scheduled/in_progress/completed/cancelled; free-text `assignee_name` — installers are
  not platform users; `scheduled_for`, `completed_at`). `GET (?status=&type=) | POST
  /partner/work-orders`, `PATCH|DELETE /partner/work-orders/{id}`. Setting status to `completed`
  stamps `completed_at`; moving it back clears it (in `WorkOrderController@update`).
- **Booking sync (offline deals)** — `bookings` gained `source` (`App\Enums\BookingSource`:
  `app`/`offline`), nullable `contact_id`, and `customer_id` is now nullable.
  `POST /partner/offline-bookings` (`CreateOfflineBooking` action) records a deal closed off the
  app: created `Confirmed` immediately (blocks the dates for app customers), no payment, **no
  30-day minimum and past start dates allowed** (the campaign may already be running) — but the
  overlap check against confirmed bookings still applies. Optional `total_price` records the
  negotiated amount (defaults to days × `price_per_day`). `GET /partner/bookings (?source=)`
  lists every booking across the owner's boards, app + offline together.
- **Notifications** — `app_notifications` table (deliberately not Laravel's `notifications`, to
  avoid a future collision), `AppNotification` model with a static `notify()` helper. Produced in
  `CreateBooking` (`booking.requested` → billboard owner) and `PaystackService::verify`
  (`booking.paid` → billboard owner). Read endpoints are for **any** signed-in user (not just
  owners): `GET /api/notifications` (last 30 + `unread_count`),
  `PATCH /api/notifications/{id}/read`, `PATCH /api/notifications/read-all`.

### Common commands (run from `api/`)

| Task | Command |
|------|---------|
| Install deps | `composer install` |
| Serve API | `php artisan serve` (defaults to `http://127.0.0.1:8000`) |
| Run migrations | `php artisan migrate` |
| New migration | `php artisan make:migration ⟨create_x_table⟩` |
| Reset + seed DB | `php artisan migrate:fresh --seed` |
| Run all tests | `php artisan test` |
| Single test / filter | `php artisan test --filter=⟨TestName⟩` |
| Format code | `./vendor/bin/pint` |
| REPL | `php artisan tinker` |
| Clear all caches | `php artisan optimize:clear` |
| Process queue | `php artisan queue:work` |

**Before committing backend changes:** `./vendor/bin/pint && php artisan test` must pass.

**Demo accounts** (created by `DatabaseSeeder`, password `password` for all): `admin@tangaza.test`
(admin), `owner@tangaza.test` (owner, has billboards), `customer@tangaza.test` (customer),
`suspended@tangaza.test` (customer, seeded with `is_suspended: true` — for testing the
suspend/reactivate flow and the login-rejection path without having to suspend a real account
first). Plus 4 random owners and 8 random customers with seeded billboards/bookings/login-attempt
history (including a couple of pre-flagged suspicious logins) so the dashboards aren't empty
locally. The project owner's personal admin login (`alumkatrina58@gmail.com`) is also seeded here.

`DatabaseSeeder` also calls `NairobiBillboardSeeder` — a curated set of ~20 billboards at real
Nairobi areas (Westlands, CBD, Mombasa Rd, Thika Rd, Karen, Kilimani, Upper Hill, Gigiri, …) with
accurate coordinates so the browse map looks populated for demos. It's idempotent (skips sites it
already created) and can be run on its own: `php artisan db:seed --class=NairobiBillboardSeeder`.
`BillboardFactory` coordinates are also bounded to the Nairobi metro so random seed data clusters
around the city rather than scattering across Kenya.

---

## Frontend — `tangaza/`

- **Framework:** React 19 (Create React App / `react-scripts`), run through **CRACO**
  (`craco.config.js`) — added so Tailwind v4's PostCSS plugin and a custom Jest
  `transformIgnorePatterns` (for ESM-only `react-leaflet`) can hook into CRA's pipeline without
  ejecting. `start`/`build`/`test` all go through `craco`; `eject` is still plain `react-scripts`.
- **Styling:** Tailwind CSS v4, configured via `@theme` in `src/index.css` (no `tailwind.config.js`
  — that's the v4 way). Custom tokens: `cream`/`sand`/`sand-dark`/`campaign-green` colors and a
  `font-display` (Archivo Black, loaded via Google Fonts in `public/index.html`) for the
  "TANGAZAA" wordmark. **Palette (as of 2026-06-18):** a forest-green + gold luxury scheme —
  tokens `forest`/`forest-deep`/`forest-soft` (dark backgrounds), `gold`/`gold-soft`/`gold-dark`
  (accent; `gold-dark` is the WCAG-safe variant for text on light), plus the existing cream/sand.
  Headings use the `font-serif` token (**Playfair Display**); body is **Inter** (both loaded in
  `public/index.html`). This replaced the original Tailwind `violet` accent from the Lovable.dev
  reference — don't reintroduce `violet-*` classes.
- **Routing:** `react-router-dom`, **pinned to v6** (not v7 — v7's `package.json` `exports` map
  isn't understood by react-scripts 5's bundled Jest 27 and breaks `npm test` with
  `Cannot find module 'react-router-dom'`, even though it works fine in the browser).
- **Map:** `react-leaflet` v5 + Leaflet, tiles from CARTO (`light_all`/`dark_all`, free, no API
  key — see `src/components/map/tileThemes.js`). `MapBrowsePage` is at `/map`. Clicking a marker
  `flyTo`s/zooms into that spot (via the shared `mapRef`) and opens a popup with the billboard's
  photo (`BillboardImage`) and a spec summary — type, size, weekly/daily price, and an
  availability badge when campaign dates are selected. Clicking a marker also sets `selectedId`,
  which surfaces a **selected-billboard card** at the top of `FilterPanel` (photo-less summary:
  title, location, type/size, price range, "available from" date, a clear control, and a
  **View details & book** button) so the selection is visible without relying on the popup.
- **Auth:** `src/context/AuthContext.jsx` (`useAuth()`) wraps the app; checks `GET /api/user` on
  mount to restore the session, exposes `login`/`register`/`logout`. `src/api.js`'s `apiFetch`
  wraps `fetch` with `credentials: 'include'`, JSON headers, and CSRF token handling;
  `ensureCsrfCookie()` hits `/sanctum/csrf-cookie` and is called automatically before
  login/register. Google sign-in buttons on `LoginPage`/`SignupPage` are still placeholders
  (show a "not connected yet" notice) — real OAuth wiring is a separate task.
- **Config:** `REACT_APP_API_URL` in `.env` (default `http://localhost:8000`) — CRA only exposes
  env vars prefixed `REACT_APP_`. Commit `.env` (no secrets in it); use `.env.local` for anything
  per-developer (already gitignored by CRA's default `.gitignore`).
- No state-management library or component UI kit is installed — plain `useState`/Context is
  enough so far. Don't add one speculatively; add it when a real screen needs it.
- **Routes:** `/` is the public marketing landing page (`LandingPage`, hero + "Why Tangazaa"
  features + closing CTA + contact footer — pulls a live billboard count from `/api/billboards`).
  `/map` is the actual map-browse experience (what used to live at `/`). Internal links that mean
  "go look at billboards" point to `/map`, not `/` — don't conflate the two.
- The hero's background is a real photo (`src/assets/billboard-hero.jpg`, user-supplied) under a
  `bg-violet-950/80` overlay for text contrast — not a hotlinked/guessed external image URL. An
  earlier hand-built SVG illustration (`BillboardScene`) was replaced by this and removed; don't
  recreate it.
- **Dashboards:** `CustomerDashboardPage` (`/dashboard`, role `customer`) shows the customer's
  bookings — summary stat cards, a Leaflet map of their booked billboards' locations, and per-booking
  cards (placeholder photo via `components/BillboardImage.jsx`, status badge, dates, total, a
  **Cancel booking** action wired to `cancelMyBooking`, and a **Complete payment** button on any
  still-`pending` booking that opens the `components/payments/PaymentModal.jsx` checkout via
  `initializePayment`). The book-and-pay entry point is on `BillboardDetailPage` ("Book & Pay" →
  `createBooking` returns the booking + an open `payment` → same `PaymentModal`). `OwnerDashboardPage` (`/owner`, role
  `owner`/`admin`) lists/creates/edits/deletes
  the current user's billboards (`components/owner/BillboardForm.jsx` — includes the **Available
  from** field), shows a Leaflet map of their billboards plus a "next available" badge per card,
  and opens an availability view per billboard (`components/owner/BookingsModal.jsx` — a read-only
  `AvailabilityCalendar` + the bookings list). `AdminDashboardPage` (`/admin`, role `admin`)
  is tabbed: **Overview** (stat cards, recent signups, login-attempt/suspicious-login feed — the
  original read-only view), **Users** (`components/admin/UsersPanel.jsx` — search/role-filter,
  suspend/reactivate any user except yourself), **Billboards** (`components/admin/BillboardsPanel.jsx`
  — platform-wide list with owner info, activate/deactivate any billboard), **Bookings**
  (`components/admin/BookingsPanel.jsx` — platform-wide list, cancel any booking). All three panels
  debounce their search input (250ms) before refetching. Both dashboards are gated by
  `components/RequireRole.jsx`, which redirects guests to `/login` and wrong-role users to
  `utils/roles.js#dashboardPathForRole(user.role)` (owner → `/owner`, admin → `/admin`, customer →
  `/dashboard`) — the same helper sends users to the right place after login/register. The
  `Header` shows a signed-in user's initials in a **gold avatar button that opens an account
  dropdown** (role/company line, a **Dashboard** link via `dashboardPathForRole`, a **Tangazaa
  Partner** link for owner/admin, and **Sign out**); it closes on outside-click, Escape, or
  navigation. Guests see a "SIGN IN" link instead.
- **Tangazaa Partner (`/partner/*`, roles owner/admin, as of 2026-07-14):** the ERP workspace,
  nested react-router routes under `components/partner/PartnerLayout.jsx` — a forest-deep sidebar
  on desktop and a **bottom tab bar on mobile** (the installer-in-the-field view), plus a top bar
  with `components/partner/NotificationBell.jsx` (polls `/api/notifications` every 60s, unread
  badge, mark-one/mark-all read). `Header` treats `/partner*` as a dark-backdrop route. Pages in
  `pages/partner/`: `PartnerOverviewPage` (stat cards + **live occupancy map** — gold marker =
  occupied, emerald = vacant, popup shows advertiser + end date), `PartnerAvailabilityPage`
  (board picker + read-only `AvailabilityCalendar`), `PartnerCrmPage` (client book, debounced
  search, inline add/edit form), `PartnerArtworkPage` (status-filter chips + per-card stage
  dropdown), `PartnerJobsPage` (print/install work orders with one-tap "next step" buttons:
  pending → scheduled → in progress → completed, plus cancel/reopen), `PartnerSyncPage` (record
  offline deals — billboard + CRM contact + dates + optional negotiated price — and a unified
  app/offline bookings list with source badges). Shared primitives live in
  `components/partner/ui.jsx`. All Partner API calls are in `api.js` under the
  "Tangazaa Partner" section.
- **Auth screens** (`LoginPage`/`SignupPage`) share `components/AuthLayout.jsx` — a full-bleed
  billboard backdrop (forest overlay + centred cream card). The backdrop loads an optional photo from
  `/public` (`billboard-auth.jpg` for login, `billboard-mockup.jpg` for signup) and **falls back to
  the bundled `assets/billboard-hero.jpg`** if those files are absent, so it's never blank. Because
  these routes have a dark backdrop at the top, `Header` lists `/login` and `/signup` (alongside `/`)
  as `darkBackdropRoutes` so the wordmark stays light there.
- **Billboard imagery** uses `components/BillboardImage.jsx` — a deterministic seeded placeholder
  photo per billboard id with an on-brand forest/gold fallback (used on the customer dashboard and
  the detail-page hero). Swap for real uploads later; there's no `image` column on `billboards` yet.
- **`apiFetch` retries once on HTTP 419** (CSRF token mismatch) by refreshing the CSRF cookie and
  re-sending — see Gotchas below for why this is needed for real, not just defensive padding.

### Common commands (run from `tangaza/`)

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm start` (serves on `http://localhost:3000`) |
| Build for prod | `npm run build` |
| Run tests | `npm test` |

---

## Architecture & Conventions

- **Controllers stay thin** — validate via a `FormRequest`, then delegate to an Action or
  Service. No business logic or query building in controllers.
- **Validation:** every external input is validated in a `FormRequest`. Never trust request
  data directly.
- **Eloquent:** use relationships and route-model binding. **Eager-load** with `->with()` to
  avoid N+1. Keep query logic in models/scopes or services.
- **Authorization:** use Policies/Gates; check with `$this->authorize(...)`.
- **Long-running / external work:** dispatch queued Jobs, don't block the request.
- **API responses:** return JSON (Resources/`JsonResponse`) — never a Blade view from `api/`.
- **Frontend ↔ backend contract:** keep response shapes stable; if a controller's JSON shape
  changes, check `tangaza/src/` for callers expecting the old shape.

---

## Code Style

- **Backend:** Laravel Pint (PSR-12 + Laravel preset) is authoritative. PHP 8 features
  encouraged: typed properties, enums, constructor promotion, match. Type-hint everything.
  Classes `PascalCase`, methods/vars `camelCase`, DB columns `snake_case`. Models singular,
  tables plural.
- **Frontend:** standard CRA ESLint config (`react-app` preset). Components `PascalCase`,
  functions/vars `camelCase`.
- Comment the *why*, not the *what*, on both sides.

---

## Testing

- **Backend:** plain PHPUnit (not Pest — the Laravel 13 skeleton ships PHPUnit-style tests; don't
  add Pest unless asked) in `api/tests/Feature` and `api/tests/Unit`. Favor Feature tests that hit
  `routes/api.php` endpoints end-to-end. Use factories + `RefreshDatabase`.
- **No PHPStan installed** — the original project template mentioned it, but the actual
  `composer.json` never required it. Don't add it unless asked; don't reference it in commands.
- **Backend testing gotcha:** Sanctum's `RequestGuard` (used by `auth:sanctum`) caches its
  resolved user for the guard's lifetime. Laravel's in-process test simulation reuses that guard
  across multiple simulated requests within *one* test method, so chaining e.g.
  login → logout → another `auth:sanctum` request in a single test reads a stale cache and looks
  still-authenticated. This is a test-harness-only artifact (verified for real against a running
  `php artisan serve` + curl — logout correctly 401s the next real request). When asserting logout
  worked, check `Auth::guard('web')->check()` directly rather than a follow-up protected route hit.
- **Frontend:** React Testing Library (already set up via `@testing-library/*` in
  `package.json`) — `npm test` in `tangaza/`. `App.test.js` mocks `react-leaflet` (jsdom has no
  real layout engine / `ResizeObserver`, which Leaflet needs) and mocks `global.fetch` (so
  `AuthProvider`'s session-check on mount doesn't hit the network). Reuse both patterns in new tests
  that render `App`/`MapBrowsePage`.
- Reproduce every bug with a failing test first, then fix. Don't delete a test to go green.

---

## Git & Pull Requests

- Branches: `feat/⟨slug⟩`, `fix/⟨slug⟩`, `chore/⟨slug⟩`.
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`).
- Keep PRs small and focused; describe *what* and *why*.
- Never commit `api/.env`, `api/vendor/`, `tangaza/node_modules/`, or `tangaza/build/`.
- **Single monorepo** as of 2026-06-16: one git repo at the `Tangaza/` root (both `api/` and
  `tangaza/` are plain folders within it, each keeping its own stack-specific `.gitignore`), pushed
  to `github.com/katrina7890/Tangazaa` on `main`. The root also has a `.gitignore` excluding
  `.claude/` (local Claude Code settings, not project config).

---

## Guardrails for Claude

- **Ask before** destructive actions: `migrate:fresh`/`migrate:rollback` on shared DBs,
  deleting migrations, editing `.env`, or changing CI/deploy config.
- **Don't** run `git push`, deploy, or modify secrets/auth config without being asked.
- Use Artisan generators on the backend; match existing patterns; make the smallest change
  that works.
- After backend edits, run Pint + `php artisan test`. After frontend edits, run `npm test`
  and/or `npm run build`. Report results.
- When unsure or a requirement looks wrong, stop and ask rather than guess.
- Don't add a package for something Laravel (or React's built-ins) already provides.

---

## Deployment (high level)

- **Backend build:** `composer install --no-dev --optimize-autoloader`.
- **Frontend build:** `npm run build` in `tangaza/`, serve the static `build/` output
  (e.g. behind a CDN or static host) — it is independent of the Laravel deploy.
- **On backend deploy:** `php artisan migrate --force`, then
  `php artisan config:cache route:cache view:cache event:cache`.
- **Runtime services:** queue worker / Horizon, scheduler (`php artisan schedule:run` via cron).
- **Environments:** local dev only, plus a live demo deploy (as of 2026-07-07): the API on
  **Render** (`render.yaml` — Docker web service + free Postgres, blueprint-deployed), the SPA on
  **Vercel** (`tangaza/vercel.json`, static CRA build). No formal staging tier yet.
- **Render + Vercel are different top-level domains, which breaks Sanctum's cookie-based SPA
  auth if called directly** (its CSRF double-submit pattern needs the SPA's JS to read the
  `XSRF-TOKEN` cookie via `document.cookie`, which a browser will never expose across origins —
  no CORS/SameSite setting changes that). The fix: `tangaza/vercel.json` proxies `/api/*` and
  `/sanctum/*` to the Render API, so the browser sees everything as same-origin. This requires
  `REACT_APP_API_URL` to be **unset** in Vercel's project env (so `api.js#resolveApiBase` falls
  back to relative paths and hits the proxy) — don't set it to the Render URL directly, that
  reintroduces the cross-domain cookie bug (login appears to work but the dashboard never loads,
  since the session never comes back on the next request). See the CORS/Sanctum comment block in
  `render.yaml` for the full explanation.
- Rollback: redeploy the previous Render/Vercel build from their respective dashboards.

---

## Gotchas & Notes

- **`env()` only inside `config/*`** — never call it elsewhere in `api/`; it returns `null`
  once config is cached in production.
- CORS/Sanctum cookies only work if frontend and backend agree on scheme + the domains listed
  in `SANCTUM_STATEFUL_DOMAINS`/`FRONTEND_URLS`. If you change the frontend's dev port from
  3000, update both `api/.env` values.
- CRA's dev server proxies nothing by default — there's no `proxy` field in
  `tangaza/package.json`. All API calls go through the full `REACT_APP_API_URL`, not relative
  paths.
- **CSRF 419s can happen for real, not just in tests.** `AuthProvider`'s session check
  (`GET /api/user` on mount) and a login/register submission both hit Sanctum's stateful
  middleware, which mints a session + CSRF token on any request that doesn't already have one.
  If a user (or React StrictMode double-firing the mount effect in dev) fires two such requests
  close together before either's `Set-Cookie` has settled, the token the second request sends can
  belong to a session the first request's response just superseded → 419. `apiFetch` retries once
  after refreshing the CSRF cookie specifically to absorb this; don't remove that retry as
  "unnecessary" — it was added after hitting this exact race during manual Playwright verification.
