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
  (owned by an `owner`) and `App\Models\Booking` (made by a `customer`). Owners get `/owner`,
  admins get `/admin`; both dashboards are role-gated on the frontend via `RequireRole` and on the
  backend via the `role:` middleware + `BillboardPolicy`.
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
| GET | `/billboards` | public | Active billboards only, with `booked_ranges` (confirmed bookings). |
| GET | `/billboards/{id}` | public | Single billboard, same shape. |
| GET | `/my/billboards` | owner, admin | The current owner's billboards (including inactive). |
| POST | `/billboards` | owner, admin | `StoreBillboardRequest`; authorized via `BillboardPolicy::create`. |
| PUT | `/billboards/{id}` | owner (own), admin | `UpdateBillboardRequest`; authorized via `BillboardPolicy::update`. |
| DELETE | `/billboards/{id}` | owner (own), admin | Authorized via `BillboardPolicy::delete`. |
| GET | `/billboards/{id}/bookings` | owner (own), admin | Bookings on one billboard, with customer info. |
| POST | `/bookings` | customer only | `CreateBooking` action enforces the 30-day minimum and overlap checks (mirrors the frontend's client-side check in `availability.js` — the backend is authoritative). |
| GET | `/my/bookings` | customer only | The current customer's bookings. |
| GET | `/admin/stats` | admin only | Companies/billboards/customers/bookings counts, revenue, recent signups, suspicious-login count. |
| GET | `/admin/login-attempts` | admin only | Last 50 login attempts (success/fail, IP, flagged reason). |
| GET | `/admin/users` | admin only | Paginated, `?search=` (name/email/company) and `?role=customer\|owner\|admin` filters. `AdminUserController@index`. |
| PATCH | `/admin/users/{id}/toggle-suspension` | admin only | Flips `is_suspended`; 422 if targeting your own account (`AdminUserController@toggleSuspension`). |
| GET | `/admin/billboards` | admin only | Paginated, platform-wide (active + inactive), `?search=` (title/location), eager-loads `owner`. `Admin\BillboardController@index`. Use the existing `PUT /billboards/{id}` (full payload) to activate/deactivate — admins already pass `BillboardPolicy::update`. |
| GET | `/admin/bookings` | admin only | Paginated, platform-wide, `?search=` (billboard title/customer name/company). `Admin\BookingController@index`. |
| PATCH | `/admin/bookings/{id}/cancel` | admin only | Sets status to `cancelled` regardless of owner. `Admin\BookingController@cancel`. |

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

---

## Frontend — `tangaza/`

- **Framework:** React 19 (Create React App / `react-scripts`), run through **CRACO**
  (`craco.config.js`) — added so Tailwind v4's PostCSS plugin and a custom Jest
  `transformIgnorePatterns` (for ESM-only `react-leaflet`) can hook into CRA's pipeline without
  ejecting. `start`/`build`/`test` all go through `craco`; `eject` is still plain `react-scripts`.
- **Styling:** Tailwind CSS v4, configured via `@theme` in `src/index.css` (no `tailwind.config.js`
  — that's the v4 way). Custom tokens: `cream`/`sand`/`sand-dark`/`campaign-green` colors and a
  `font-display` (Archivo Black, loaded via Google Fonts in `public/index.html`) for headings/the
  "TANGAZAA" wordmark. Built-in Tailwind `violet` palette is the primary accent — matches the
  Lovable.dev design reference the UI was modeled on.
- **Routing:** `react-router-dom`, **pinned to v6** (not v7 — v7's `package.json` `exports` map
  isn't understood by react-scripts 5's bundled Jest 27 and breaks `npm test` with
  `Cannot find module 'react-router-dom'`, even though it works fine in the browser).
- **Map:** `react-leaflet` v5 + Leaflet, tiles from CARTO (`light_all`/`dark_all`, free, no API
  key — see `src/components/map/tileThemes.js`). `MapBrowsePage` is the home route (`/`).
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
- **Dashboards:** `OwnerDashboardPage` (`/owner`, role `owner`/`admin`) lists/creates/edits/deletes
  the current user's billboards (`components/owner/BillboardForm.jsx`) and views bookings per
  billboard (`components/owner/BookingsModal.jsx`). `AdminDashboardPage` (`/admin`, role `admin`)
  is tabbed: **Overview** (stat cards, recent signups, login-attempt/suspicious-login feed — the
  original read-only view), **Users** (`components/admin/UsersPanel.jsx` — search/role-filter,
  suspend/reactivate any user except yourself), **Billboards** (`components/admin/BillboardsPanel.jsx`
  — platform-wide list with owner info, activate/deactivate any billboard), **Bookings**
  (`components/admin/BookingsPanel.jsx` — platform-wide list, cancel any booking). All three panels
  debounce their search input (250ms) before refetching. Both dashboards are gated by
  `components/RequireRole.jsx`, which redirects guests to `/login` and wrong-role users to
  `utils/roles.js#dashboardPathForRole(user.role)` (owner → `/owner`, admin → `/admin`, customer →
  `/map`) — the same helper sends users to the right place after login/register.
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
- This repo (`Tangaza/`) is not yet a single git repo — only `tangaza/` is currently
  version-controlled (one commit: CRA init). `api/` has no `.git` of its own. Decide and set up
  the real repo structure (monorepo vs. two repos) before the first real feature PR.

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
- **Environments:** ⟨dev → staging → prod⟩ — not yet defined.
- ⟨Fill in hosting target and rollback plan once decided.⟩

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
