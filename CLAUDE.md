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
  registers a company), `admin` (platform staff — not self-registrable, seed/tinker only), and
  `staff` (as of 2026-07-14 — an employee of a billboard company, created by their owner from the
  Partner **Team** page, never self-registrable; `users.employer_id` points at the owner, and the
  account only opens the Tangazaa Partner workspace — not the owner dashboard, not the owner's
  revenue). Stored as `App\Enums\UserRole` on the backend; role is chosen via a toggle on the
  signup form (customer/owner only).
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
| GET | `/billboards` | public | Active, `online`-channel, non-maintenance billboards only, with `booked_ranges` (confirmed bookings), `available_from`, and a computed `next_available_from`. |
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
| GET | `/admin/stats` | admin only | Companies/billboards/customers/bookings counts, revenue, recent signups, suspicious-login count. Also feeds the Overview's charts: `booking_activity` + `revenue_activity` (7-day series, oldest first; revenue keyed off `payments.paid_at` so it means "what settled"), `approval_rate` (confirmed ÷ total bookings), and `attention` (review-queue counts: flagged logins, locked accounts, suspended accounts, pending bookings). **Aggregates only** — this route has no `permission:` guard, so per-record data (audit entries, login rows) deliberately stays on its own `audit.view`-gated routes. The 7-day series are grouped in PHP, not SQL, because date functions differ between SQLite and Postgres. |
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

### Admin console security (Phase 1 of the admin-dashboard PRD, as of 2026-07-20)

- **RBAC** — `App\Enums\AdminPermission` (12 granular capabilities, e.g. `users.manage`,
  `finance.manage`, `audit.view`), stored per-admin in `users.admin_permissions` (JSON), plus
  `users.is_super_admin` (holds everything implicitly). Enforced by
  `App\Http\Middleware\EnsureAdminPermission` aliased as **`permission:`** — every admin route
  names the capability it needs; `role:admin` alone is never sufficient. Unknown permission
  strings **fail closed** (403), so a typo in a route guard can't silently open an endpoint.
  `User::hasAdminPermission()` also refuses suspended accounts.
- **Privilege-escalation guards:** reading the admin roster needs `admins.manage`, but *granting*
  anything requires `is_super_admin` — otherwise an admin with `admins.manage` could grant
  themselves finance powers. Admins can't edit their own permissions/super status, the **last
  Super Admin can't be demoted**, and only a Super Admin can suspend another admin.
- **Immutable audit trail** — `audit_logs` table (no `updated_at`; actor name/email denormalised
  so entries survive account deletion; `changes` JSON holds a `{field: {from, to}}` diff, plus IP
  and user agent). `AuditLog` throws on `updating`/`deleting`, so tampering fails loudly.
  Written by `App\Services\Security\AuditLogger` from user suspend/restore/unlock, admin
  create/permission/super changes, booking cancel, session revoke and account lockout.
  `GET /admin/audit-logs` is read-only, filterable (action/actor/target/date/search) and
  paginated — **there is deliberately no write or delete endpoint.**
- **Brute-force protection** — `App\Actions\Auth\ApplyLoginLockout`: 5 failures in 15 min locks
  `users.locked_until` for 15 min; a locked account is rejected *before* credentials are checked,
  so the correct password won't open it. Cleared by a successful login, expiry, or
  `PATCH /admin/users/{user}/unlock` (`users.manage`). Failed-login messages stay generic so they
  never reveal whether an address exists.
- **Rate limiting** — named limiters in `AppServiceProvider`: `login` (5/min per email+IP, 20/min
  per IP), `register` (10/hour per IP), `admin` (120/min), `api` (300/min). Note the login
  limiter and the lockout trip at similar counts — tests that target one disable the other.
- **Session/device management** — session driver is `database`, so `GET /admin/sessions` lists the
  acting admin's own sessions (scoped server-side to `auth()->id()`; only a SHA-256 fingerprint of
  the session id is exposed) and `DELETE /admin/sessions/others` signs out every other device.
- **SPA:** `AdminDashboardPage` gained **Access control** (permission matrix), **Audit log**
  (filterable timeline) and **Security** (lockouts, devices, recent events) tabs. Panels degrade
  gracefully to "you do not have permission" on 403 — the UI hides what you can't use, but the
  server is the authority. Demo accounts: `admin@tangaza.test` (Super Admin),
  `support@tangaza.test` (restricted: users/bookings/billboards view + bookings manage).
- **Not yet built** (later phases): admin MFA, malware scanning on uploads, PDF/Excel export,
  websocket notifications, the financial ledger (blocked on a real payment gateway — Paystack is
  still simulated), collapsible sidebar/global search shell, and soft-delete/restore beyond the
  existing suspend flow.

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
live under `/api/partner/*` behind `role:owner,admin,staff`; every record is scoped to the
**workspace owner** via `User::partnerOwner()`/`partnerOwnerId()` (staff → their employer,
everyone else → themselves), enforced by `ContactPolicy`/`ArtworkPolicy`/`WorkOrderPolicy` plus
`Rule::exists(...)->where('owner_id', $this->user()->partnerOwnerId())` checks in the Partner
FormRequests (so you can't link another company's contact/billboard). Staff boundaries:
`GET /my/billboards` is readable by staff (returns the employer's inventory) but billboard
create/update/delete stays `role:owner,admin`; the overview returns `confirmed_revenue: null`
for staff (money is owner-only); and **team management** (`GET|POST /partner/team`,
`DELETE /partner/team/{member}` — `TeamController`, creates `staff` users with the owner's
`company_name`) is `role:owner,admin` only. An owner can only delete staff whose
`employer_id` is theirs. Modules:

- **Overview / live occupancy** — `GET /partner/overview` (`OverviewController`, invokable):
  headline stats (total/online/offline/maintenance boards, available today, occupancy %, active
  bookings, ending-soon ≤14 days, upcoming installations, confirmed revenue, contacts, open
  artworks/work orders), a per-billboard snapshot (channel, maintenance flag, current confirmed
  booking, advertiser, `next_available_from`) that powers the SPA's **colour-coded portfolio
  map** (online/offline × available/booked + maintenance), and a merged `activity` feed (latest
  bookings, campaign updates, work orders).
- **Online/offline inventory (as of 2026-07-19)** — `billboards.channel`
  (`App\Enums\BillboardChannel`: `online`/`offline`, default online) and
  `billboards.under_maintenance` (bool). Offline boards are ERP-only: hidden from the public
  `GET /billboards` list, 404 on public show, and `CreateBooking` rejects them (maintenance
  boards are also unlisted/unbookable but still viewable by id). Owners set both from
  `BillboardForm` ("Sales channel" select + maintenance checkbox); offline deals on offline
  boards still book through `POST /partner/offline-bookings` as before.
- **Rich billboard attributes (as of 2026-07-19, ERP PRD §3)** — nullable `billboards` columns:
  `road`, `lighting` (front_lit|back_lit|led|none), `orientation` (landscape|portrait),
  `daily_traffic`, `visibility_score` (1–10), `discount_pct` (0–90), `tags`/`amenities` (JSON
  string arrays), and `archived_at` (**archive**: API boolean `archived` on update, translated in
  `BillboardController@update`; archived boards leave the public marketplace + `CreateBooking`,
  are excluded from analytics, but stay in `/my/billboards`). All editable in `BillboardForm`
  (tags/amenities as comma-separated inputs). **Billboard photo uploads are still not built**
  (placeholder images remain) — the one §3 item deferred.
- **CRM** — `contacts` table (`owner_id`, name, company, email, phone, notes). CRUD at
  `GET|POST /partner/contacts`, `PUT|DELETE /partner/contacts/{id}`; `?search=` matches
  name/company/email/phone. **Client file (PRD §4)**: `GET /partner/contacts/{id}` returns the
  contact + their bookings + summary (revenue, current/past campaign counts, `outstanding` =
  confirmed app bookings without a successful payment). SPA: "Client file" modal on
  `PartnerCrmPage`. Contracts/invoices remain unbuilt (no document system).
- **Analytics (PRD §6)** — `GET /partner/analytics` (`AnalyticsController`, invokable; archived
  boards excluded): occupancy rate, avg duration, avg lead time (app bookings, created→start),
  conversion rate (app confirmed/all), app vs offline revenue, revenue by month (last 6, keyed by
  start date) & by billboard, most-booked locations, and plain-language `insights` (boards vacant
  ≥14 days; per-location demand delta month-over-month). Money fields are null/empty for staff.
  SPA: `PartnerAnalyticsPage` at `/partner/analytics` (CSS bar charts, no chart lib).
- **Chat Centre (PRD §5, as of 2026-07-19)** — `chat_messages` table (`booking_id`, `sender_id`,
  nullable `body`, `attachments` JSON of public-disk image paths; body-or-attachment required).
  **One conversation per booking**: app bookings are two-way with the customer; offline-deal
  threads double as the team's internal comms log (those clients aren't platform users). Partner
  side (`Partner\ChatController`, auth via `BookingStagePolicy`): `GET /partner/chats`
  (conversation list + latest message), `GET|POST /partner/bookings/{id}/messages`. Customer side
  (in `BookingController`): `GET|POST /bookings/{id}/messages`. New messages notify the other
  side in-app (`chat.message`). `ChatMessageResource` returns `mine` per-requester so bubbles
  align. Customer inbox: `GET /my/chats` (one conversation per booking). SPA: `/partner/chat`
  (`PartnerChatPage` — conversation list + thread), the customer's `/dashboard/messages` inbox
  (`pages/customer/CustomerMessagesPage.jsx`, reached from the sidebar or the Header account menu),
  and a Messages card on the customer's `BookingProgressPage`; all use shared
  `components/chat/ChatThread.jsx` (thread + composer with ≤4 image attachments). No polling —
  threads refresh on load/send; real-time (websockets) is future infra.
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
- **Booking pipeline + reminders (as of 2026-07-19, ERP PRD §2)** — the ERP's package-tracking
  view. `booking_stages` table (unique per `booking_id`+`stage`; `App\Enums\PipelineStage`:
  `confirmed → artwork → printing → installation_scheduled → installed → campaign_active →
  payment_released`; per-stage nullable `substatus` (artwork: waiting/client_providing/
  provider_designing/approved; printing: client_printing/provider_printing/completed), `note`,
  `photos` JSON (public disk), `assigned_to` FK users (workspace members only, validated in
  `UpdateBookingStageRequest`), `completed_at`). Rows exist only for touched stages;
  `GET /partner/bookings/{id}/pipeline` composes the full ladder (+ `team` for the assignee
  picker), auto-completing `confirmed` from booking status, and `payment_released` is
  inapplicable to offline deals. `POST /partner/bookings/{id}/pipeline/{stage}` (POST not PATCH —
  PHP won't parse multipart on PATCH) updates fields; `completed=1` **cascades earlier stages
  complete** and notifies the client in-app (`booking.stage` — email/SMS are future infra),
  `completed=0` reopens later stages. `GET /partner/bookings/{id}` (detail incl. `payments`),
  `GET /partner/reminders` (computed by `Services\Partner\ReminderService`: artwork/printing
  overdue, installation tomorrow, campaign starting/ending, payout release). SPA:
  `/partner/bookings` (`PartnerBookingsPage` — reminders banner, list with image/client/dates/
  current stage/mini 7-segment bar) and `/partner/bookings/:id` (`PartnerBookingDetailPage` —
  clickable green/blue/grey pipeline with per-stage editor, payment history, "Post client
  update" opens the existing `BookingUpdatesModal`). Shared stage metadata in
  `components/partner/pipeline.js`.
- **Workspace settings (PRD §7, as of 2026-07-19)** — `partner_settings` table (one row per
  owner, created lazily on first `GET /partner/settings`; `SettingsController`, routes are
  `role:owner,admin` — staff locked out). Fields: `logo_path` (upload via
  `POST /partner/settings/logo`), contact email/phone, `working_hours`, design/printing service
  toggles + prices, `installation_price`, **`lead_times` JSON (days keyed by `BillboardType`
  value; defaults physical=7 / digital_led=3 in `PartnerSetting::DEFAULT_LEAD_TIMES`)**, `payout`
  JSON (escrow account, demo strings), `notifications` JSON, `marketplace_visible`.
  **Load-bearing behavior:** lead times apply **only once the owner has a settings row** (so
  unconfigured owners keep old behavior) — `Billboard::leadDays()` pushes
  `nextAvailableDate()` and `CreateBooking` rejects earlier starts with the earliest date in the
  message; `marketplace_visible=false` hides the owner's whole portfolio from public
  list/show (404). Public billboard queries eager-load `owner.partnerSettings`. SPA:
  `/partner/settings` (`PartnerSettingsPage`, owner-only nav item + nested `RequireRole`).
  Notification prefs/payout are stored records only (no email/SMS/escrow infra yet).
- **Notifications** — `app_notifications` table (deliberately not Laravel's `notifications`, to
  avoid a future collision), `AppNotification` model with a static `notify()` helper. Produced in
  `CreateBooking` (`booking.requested` → billboard owner), `PaystackService::verify`
  (`booking.paid` → billboard owner), and the campaign progress tracker (`campaign.update` →
  customer, `campaign.reaction` → owner). Read endpoints are for **any** signed-in user (not just
  owners): `GET /api/notifications` (last 30 + `unread_count`),
  `PATCH /api/notifications/{id}/read`, `PATCH /api/notifications/read-all`.
- **Campaign progress tracker (as of 2026-07-17)** — a Glovo-style delivery timeline per booking.
  `booking_updates` table (`booking_id`, `user_id` author, `stage` = `App\Enums\CampaignStage`:
  `agent_contact → artwork → production → installation`, nullable `message`, `photos` JSON array
  of **public-disk paths** (real uploads — `photos[]` multipart, ≤4 images ≤4MB, needs
  `php artisan storage:link`; the resource returns absolute `APP_URL/storage/...` URLs, and note
  Render's disk is ephemeral so demo photos vanish on redeploy), `requires_approval` bool
  ("should we go ahead and build?"), `client_reaction` = `App\Enums\ClientReaction`
  (`approved`/`liked`/`changes_requested`) + `client_comment`). Partner side
  (`Partner\BookingUpdateController`, scoped via `BookingUpdatePolicy` → `partnerOwnerId`):
  `GET|POST /partner/bookings/{id}/updates`, `DELETE /partner/booking-updates/{id}` (deletes
  stored photos too). Customer side (in `BookingController`): `GET /bookings/{id}/updates` and
  `PATCH /booking-updates/{id}/react` — `approved` is only valid on `requires_approval` updates,
  `liked` only on non-approval ones (`changes_requested` works on both). An update with a message
  *or* photos is valid; both missing is a 422. `GET /my/bookings` now also returns
  `updates_count`, `pending_approvals` (unanswered go-aheads) and `latest_update` for the
  dashboard card badge. `DatabaseSeeder` seeds a mid-flight demo timeline (booking for
  `customer@tangaza.test` ending on an unanswered production go-ahead).

### Transactional email + customer documents (as of 2026-07-21)

**Email verification is a soft nudge, never a gate.** `User` now implements `MustVerifyEmail`, but
**no route is behind the `verified` middleware** — an unverified customer can browse, book and pay
exactly as before. Registration queues a `VerifyEmailMail`; the SPA shows a dismissible banner in
`CustomerLayout` with a resend button. Don't "finish the job" by adding `verified` to routes unless
that's explicitly asked for — it would lock out every seeded demo account and break the demo if a
mail provider ever fails.

- `GET /api/email/verify/{id}/{hash}` (**named `verification.verify`**, `signed` + throttled) is
  deliberately **not** behind `auth:sanctum` — the link is routinely opened in a different browser
  or a webmail preview from the one that signed up, so the signature plus the SHA-1 email hash is
  the whole authentication story. It validates, marks verified, then `redirect()->away()`s to
  `{frontend}/dashboard?verified=1|already|invalid`, which the banner reads.
- `config('app.frontend_url')` (added to `config/app.php`) is the first entry of `FRONTEND_URLS`.
  Every email links at the **SPA**, not the API — `env()` stays inside `config/`, as always.

**Mailables** (all `ShouldQueue`, in `app/Mail/`): `VerifyEmailMail`, `BookingRequestedMail`,
`PaymentReceiptMail` (attaches both PDFs), `CampaignManagerAssignedMail` (sets `replyTo` to the
salesperson so replies reach a human, not the platform), `CampaignStageUpdateMail`,
`BookingCancelledMail`. Views live in `resources/views/emails/`, built from the Blade components in
`resources/views/components/mail/` (`layout`, `text`, `button`, `details`). Those are **table-based
with inline styles on purpose** — Outlook ignores `<style>` blocks and flexbox entirely. The palette
mirrors `tangaza/src/index.css`; keep the two in step.

**Everything dispatches through `App\Services\Mail\CustomerMailer`** — never call `Mail::to()` from a
controller or action directly. It centralises three things every call site would otherwise repeat:
offline bookings have **no `customer` user at all** (a CRM contact instead, so the send must no-op),
opt-outs are per-topic, and a mail failure is caught and logged so it can **never roll back the
business action that triggered it** — a paid booking is still paid if SMTP is down.

Send points: `AuthController@register` → verification · `CreateBooking` → requested ·
`PaystackService::verify` → receipt + contract · both cancel routes (customer and admin) →
cancelled · `Partner\BookingUpdateController@store` → stage update ·
`Partner\AccountManagerController` → manager introduction.

**Opt-outs:** `users.email_preferences` (JSON, keyed by `App\Enums\EmailTopic`). **Null means opted
in**, so existing accounts are never silenced. `User::wantsEmail()` is the only reader. Payment
receipts and verification deliberately have **no topic** and ignore preferences — one is a financial
record, the other account security.

**Campaign manager** — `bookings.account_manager_id` (+ `account_manager_assigned_at`) names the
salesperson who owns a campaign, answering the customer's biggest post-payment question ("who do I
call?"). Set via `PATCH /partner/bookings/{booking}/account-manager` (`AccountManagerController`,
`AssignAccountManagerRequest` restricts the id to the workspace — owner or their own staff — so a
company can't put a rival's employee in front of their client). Only a **real change** emails the
client, so re-saving the same person doesn't re-introduce them. Surfaced on the customer's booking
cards and progress page, and edited from `PartnerBookingDetailPage`.

**Documents** — receipts and contracts are **generated on demand, never stored**: they're pure
functions of the booking/payment rows, so there's nothing to keep in sync and nothing to lose when
Render recycles its ephemeral disk. `App\Services\Documents\DocumentService` renders
`resources/views/documents/{receipt,contract}.blade.php` via **`barryvdh/laravel-dompdf`** (the one
new Composer package). dompdf supports only a conservative CSS subset — block layout and tables, no
flex/grid, built-in fonts only. Contract clause text is a plain-language summary of what the platform
actually enforces; swap `DocumentService::CLAUSES` for counsel-reviewed terms without touching the
pipeline. `Booking::contractNumber()` derives `TGZ-C-000123` from the id rather than storing it, so
it can't drift. Endpoints: `GET /my/documents` (derived list), `GET /bookings/{booking}/documents/contract`
(404 until confirmed), `GET /payments/{reference}/receipt` — all 403 on someone else's booking.

**Other new customer endpoints:** `PUT /profile` (changing the email **resets verification** and
re-sends), `GET /profile/email-topics`, `POST /email/verification-notification` (throttled),
`GET /my/payments` (every attempt including failed/superseded — unlike a booking's `payment` field,
which is only the latest).

**⚠️ Local dev: `QUEUE_CONNECTION=database`, so queued mail sits in the `jobs` table until you run
`php artisan queue:work`.** Nothing appears in `storage/logs/laravel.log` (the `log` mailer) until a
worker drains it — this looks exactly like "email is broken" and isn't. Render sets
`QUEUE_CONNECTION=sync`, so there mail sends inline (and PDF rendering happens in the request —
~300ms on payment verification, which is why `CustomerMailer` swallows failures). **Render also
still sets `MAIL_MAILER=log`, so no mail actually leaves the demo** — point `MAIL_*` at a real
provider (Resend/Postmark/Mailgun/SMTP) when that's wanted; no code changes are needed.

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
(admin), `owner@tangaza.test` (owner, has billboards), `staff@tangaza.test` (staff — employee of
`owner@tangaza.test`'s company, for testing the Partner team boundary), `customer@tangaza.test`
(customer), `suspended@tangaza.test` (customer, seeded with `is_suspended: true` — for testing the
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
  — that's the v4 way). Custom tokens: `cream`/`sand`/`sand-dark`/`campaign-green` colors plus
  `forest`/`forest-deep`/`forest-soft` and `gold`/`gold-soft`/`gold-dark`.
  **Palette — "Tangazaa Nightfall" (applied 2026-07-21):** taken from the *Tangazaa Landing Page*
  mockup in the claude.ai/design project. Warm paper `#f8ecdc` (`cream`) / `#e9e3d6` (`sand`),
  ink `#241c16` (`forest`) with `#17110d` (`forest-deep`), Electric Purple `#8a3df0` (`gold`) as
  the action accent, and **`blush` `#e01f66`** — the far end of the signature purple→pink gradient.
  Pastel context surfaces `mint`/`coral`/`sustain` keep their readable ink partners
  `mint-ink` `#16704a` / `coral-ink` `#a3234f`. **The token names are historical on purpose** —
  hundreds of classes reference `cream`/`forest`/`gold`, so re-skinning is a values-only change
  in `index.css`; don't rename them.
  **⚠️ Every pair here was contrast-checked to AA (4.5:1) and the values are load-bearing:**
  - `blush` is deliberately a shade deeper than the mockup's own `#ff4f8b`, which only reaches
    **3.11:1** against white and would have made every gradient button label fail. Don't "restore"
    the mockup value.
  - `mint-ink`/`coral-ink` were darkened from the previous theme for the same reason — the naive
    mockup mapping put the customer dashboard's Committed-spend figure at **2.79:1**. It now
    measures 5.27:1 in the browser.
  - Purple is dark, so anything on `bg-gold` needs `text-white`, and purple TEXT is unreadable on
    the ink sections — on dark surfaces use `text-coral`; on light surfaces use `text-gold-dark`.
  - The signature gradient is `from-gold to-blush` (buttons, active nav, the wordmark chip).
  **Browse-map reveal:** `/map` fades up out of the cream page surface via the `.map-reveal` /
  `.is-revealed` pair in `index.css`, so arriving from the landing page reads as a crossfade. The
  class is flipped by a **`setTimeout`, deliberately not `requestAnimationFrame`** — rAF is paused
  in background tabs, and opening `/map` in one would otherwise leave the map stuck at `opacity: 0`
  until the tab was focused. It must fail visible, never blank. (This replaced a 5s radar-sweep
  intro, removed 2026-07-22.)
  **`map-dark:` variant** (defined in `index.css`) styles the browse map's floating UI —
  `MapSearchBar` and `FilterPanel` — when the map's own style picker is set to **Dark**. It keys off
  `data-map-theme` on `MapBrowsePage`'s root, **not** the OS colour scheme, because those panels sit
  on top of the tiles. Satellite is deliberately not included yet; add
  `[data-map-theme='satellite']` to the variant to cover it.
  **Hex literals** that can't reference a token (Leaflet `pathOptions`, SVG `stopColor`, CSS
  `conic-gradient`, `accent-[…]`) live in `admin/OverviewPanel`, `customer/ui.jsx`,
  `CustomerOverviewPage`, `CustomerPaymentsPage`, `CustomerProfilePage`, `MapBrowsePage`,
  `OwnerDashboardPage`, `partner/BookingUpdatesModal` and `PartnerOverviewPage#PIN_STATES` —
  **grep for the old hex when re-skinning, they don't follow the tokens.**
  **Type:** `font-display`/`font-serif` are **Archivo** (headlines heavy at `font-extrabold`/
  `font-black`, `-0.03em` tracking); `font-sans` and `.font-editorial` are **Inter**. This theme
  has no serif, so `.font-editorial` now reads as ordinary body text. The signature move is the
  giant lowercase wordmark with the trailing "aa" in *italic* Archivo — see `.wordmark-display`
  in `index.css`, used by the landing hero and the outlined "book" display type.
  House style otherwise unchanged: 11px bold uppercase `tracking-[0.12em]` eyebrow labels, flat
  sentence-case pill buttons, hairline borders over drop shadows.
  **Keep `api/resources/views/components/mail/*` and `documents/*` in step** — the email and PDF
  templates hardcode the same palette (they can't use Tailwind), and were updated with this theme.
  **History:** replaced "Vesper Editorial" (`#fff5ea`/`#362d21`/`#7f30c3`, Epilogue + Newsreader,
  2026-07-20), which replaced forest-green + gold with Cormorant/DM Sans (2026-07-18). Note
  Archivo/Inter were previously retired and are now **deliberately back** — that older
  "don't reintroduce" note no longer applies. Lovable `violet-*`, Playfair and charcoal+brass are
  still gone.
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
- **Routes:** `/` is the public marketing landing page (`LandingPage`), `/map` is the actual
  map-browse experience (what used to live at `/`). Internal links that mean "go look at
  billboards" point to `/map`, not `/` — don't conflate the two.
- **Landing page (rebuilt 2026-07-21)** from the *Tangazaa Landing Page* mockup in the
  claude.ai/design project (imported via `DesignSync`). Sections: photo hero + giant italic
  wordmark → philosophy w/ phone mockup → verified-boards trio → "one platform" w/ outlined
  `book` display type → 3-column footer. It pulls a live billboard count from `/api/billboards`
  for the "N verified boards live across Nairobi" caption.
  - **Photography lives in `tangaza/public/`, named for the slot it fills:**
    `Nairobi Skyine at dusk.jpg` (hero — **the filename is misspelled on disk; that's the real
    path, don't "fix" it**), `Broad daylight.jpg` (verified boards), `site walk.jpg` (site walk),
    `map-billboard.jpg` (inside the phone mockup). They're referenced via `process.env.PUBLIC_URL`
    and the spaces are URL-encoded by the browser — verified serving 200 `image/jpeg`.
  - **⚠️ The hero photo is ~2.6 MB**, which is the page's LCP. It carries `fetchPriority="high"`
    (camelCase — React rejects `fetchpriority`), but it really wants compressing to ~300 KB or a
    `<picture>` with a WebP source. Not done yet.
  - The design's flat "Live map" / "Booking calendar" / "Reach analytics" colour blocks are
    rendered as **real things** — a non-interactive Leaflet map of live inventory, a real
    current-month grid, and a bar chart. The Leaflet instance is `pointer-events-none`; the
    browsable map is at `/map`.
  - The mockup's Pricing / Blog / Legal nav and footer links were **deliberately dropped** rather
    than shipped as dead ends; what remains anchors to `#about` / `#how-it-works` or real routes.
  - `App.test.js` asserts against this copy. Note the strapline "Outdoor advertising, booked in
    minutes" appears **twice by design** (hero eyebrow + footer), and both the footer and the
    header link to `/login` — tests must scope by role/count, not bare `getByText`.
  - An earlier hand-built SVG illustration (`BillboardScene`) and the old
    `src/assets/billboard-hero.jpg` hero treatment were replaced; `billboard-hero.jpg` is still
    used as the `AuthLayout` fallback, so don't delete it.
- **Customer workspace (`/dashboard/*`, role `customer`, restructured 2026-07-21):** nested routes
  under `components/customer/CustomerLayout.jsx` — the **same side-menu shell as Tangazaa Partner
  and the admin console** (obsidian sidebar on desktop, bottom tab bar on mobile, top band with the
  section title, `NotificationBell`), so all three sides of the marketplace navigate identically.
  Sections in `pages/customer/`: **Overview** (`CustomerOverviewPage` — stat cards, a "needs your
  attention" list of unpaid bookings and unanswered go-aheads, ending-soon campaigns, the Leaflet
  map, and the three most recent booking cards), **Campaigns** (`CustomerCampaignsPage` — all
  bookings with status filter chips), **Messages** (`CustomerMessagesPage`), **Payments**
  (`CustomerPaymentsPage` — outstanding balance + full transaction table), **Documents**
  (`CustomerDocumentsPage` — contract/receipt PDF downloads), **Profile** (`CustomerProfilePage` —
  details, verification state, per-topic email toggles). `BookingProgressPage` is now nested too, at
  `/dashboard/bookings/:id/progress`.
  - **Bookings are fetched once in `CustomerLayout` and shared via `<Outlet context>`**
    (`useCustomerData()`), which also owns the `PaymentModal` and the pay/cancel handlers — so
    switching sections is instant and paying updates every view at once. New sections should read
    from that context rather than calling `fetchMyBookings` again.
  - The old flat URLs `/messages` and `/bookings/:id/progress` are **kept as redirects** — they're
    linked from already-sent emails and in-app notifications. Don't delete them.
  - **The signed-in user object is raw snake_case** (`/api/user` returns the model, so it's
    `company_name`, `email_verified_at`, `phone`). Two pages previously read `user.companyName`,
    which silently fell through to `user.name`; fixed in the restructure. `AuthContext` now also
    exposes `refreshUser()` and `setUser` (the verification banner needs the former, because
    confirming happens in another tab).
  - Shared primitives are in `components/customer/ui.jsx` and `components/customer/BookingCard.jsx`
    (the card is shared by Overview and Campaigns so the two can't drift).
  The book-and-pay entry point is still on `BillboardDetailPage`
  (`createBooking` returns the booking + an open `payment` → same `PaymentModal`).
- **Booking checkout (`/billboards/:id`, rebuilt 2026-07-22)** from the *Tangazaa Booking Checkout
  Page* mockup: listing on the left (hero + type chip, spec cards with the weekly rate on the
  signature gradient, About, site details), sticky checkout on the right (calendar → price
  breakdown → pay-method picker → gradient Confirm & Pay). Two mockup elements were **deliberately
  not carried over — don't "restore" them**:
  - **Its 5% service fee.** `CreateBooking` charges exactly days × `price_per_day`, so a fee in the
    UI would put the checkout total at odds with the payment, the receipt PDF and the contract.
    The line now reads "No booking fee"; `PaymentChannelTest` pins subtotal == total == amount.
  - **Its blanket green "Verified" badge.** There's no verification field, so every listing would
    show it. Replaced with "Listed by ⟨company⟩" from the owner account — the real per-listing fact
    behind the platform's trust claim. (`BillboardResource` exposes `owner` `whenLoaded`, and the
    public `show` route eager-loads it.)
  The mockup's second photo slot became a **Site details** panel (road/lighting/orientation/traffic/
  visibility/amenities from the ERP fields, hidden when empty) rather than repeating the same
  placeholder image — real billboard photo uploads still don't exist. `AvailabilityCalendar` already
  renders its own Selected/Booked legend, so the mockup's separate one was dropped as a duplicate.
- **Payment channel (2026-07-22):** `App\Enums\PaymentChannel` (`mpesa`/`card`) — M-Pesa is the
  dominant method in Kenya and Paystack supports both, so the picker writes a real value to
  `payments.channel` rather than being decorative. Optional `channel` on `POST /bookings` and
  `POST /bookings/{booking}/pay`, **defaulting to `card`** so existing callers are unaffected.
  Resuming an unfinished checkout updates the channel on the existing pending payment instead of
  opening a second transaction. The gateway itself is still simulated.
- **Dashboards:** `OwnerDashboardPage` (`/owner`, role
  `owner`/`admin`) lists/creates/edits/deletes
  the current user's billboards (`components/owner/BillboardForm.jsx` — includes the **Available
  from** field), shows a Leaflet map of their billboards plus a "next available" badge per card,
  and opens an availability view per billboard (`components/owner/BookingsModal.jsx` — a read-only
  `AvailabilityCalendar` + the bookings list). `AdminDashboardPage` (`/admin`, role `admin`)
  was **remodelled on 2026-07-21 from the "2a — floating-panel" mockup** in the
  `claude.ai/design` project *"Tangazaa admin dashboard mockups"* (imported via the `DesignSync`
  tool). It no longer shares Partner's shell: the console is now **rounded panels floating on a
  warm `bg-sand` canvas** — an obsidian sidebar *card* (sticky, gradient active state and CTA),
  white `rounded-3xl` panels, and no dark top band. Consequences worth knowing:
  - **`/admin` is deliberately NOT in `Header`'s `darkBackdropRoutes`** — the console opens on a
    light canvas, so the wordmark must stay dark. Don't "fix" its absence.
  - The mockup's own palette (Archivo/Inter, purple→pink `#7b3ce0`→`#ee5586`, pink/maroon chips)
    was **adapted to the existing Vesper tokens**, not imported: gradients run `gold`→`coral-ink`,
    chips use `coral`/`mint`/`sustain` with their ink variants, headings are Epilogue `font-black`.
    CLAUDE.md's rule that Archivo/Inter stay retired still holds.
  - The mockup's "+ New Booking" CTA became **Review security** (admins don't create bookings),
    and its agenda/calendar panels became the real login feed and a 7-day activity strip.
  - Partner and customer keep their own shells (`PartnerLayout`, `CustomerLayout`) and are
    untouched — the floating-panel language is admin-only for now.
  sections: **Overview** (`components/admin/OverviewPanel.jsx` — greeting hero, stat pills,
  booking-activity wave, "needs review" queue, revenue bars + approval ring, and a right column
  with the admin card / activity strip / recent signups / login feed; every panel is real data,
  and the queue items navigate to the tab that can action them), **Users**
  (`components/admin/UsersPanel.jsx` — search/role-filter,
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
  navigation. Guests see a "SIGN IN" link instead. `Header`'s `darkBackdropRoutes` is an exact-match
  list plus **prefix** checks for `/partner`, `/dashboard` and `/bookings/` — nested shells need the
  prefix, so adding a `/dashboard/*` section requires no Header change.
- **Tangazaa Partner (`/partner/*`, roles owner/admin/staff, as of 2026-07-14):** the ERP
  workspace, nested react-router routes under `components/partner/PartnerLayout.jsx` — a
  forest-deep sidebar on desktop and a **bottom tab bar on mobile** (the installer-in-the-field
  view), plus a top bar with `components/partner/NotificationBell.jsx` (polls
  `/api/notifications` every 60s, unread badge, mark-one/mark-all read). `Header` treats
  `/partner*` as a dark-backdrop route, and **guests see a PARTNER button next to SIGN IN**
  linking to `/partner/login` (`pages/partner/PartnerLoginPage.jsx` — the Partner-branded door
  for company teams; same `/api/login` underneath, routes owner/admin/staff to `/partner` and
  anyone else to their own dashboard). Unauthenticated visits to `/partner/*` redirect to
  `/partner/login` (via `RequireRole`'s `loginPath` prop); staff land on `/partner` after any
  login (`dashboardPathForRole('staff')`). Pages in `pages/partner/`: `PartnerOverviewPage`
  (stat cards + **live occupancy map** — gold marker = occupied, emerald = vacant, popup shows
  advertiser + end date; the revenue card renders only when the backend sends it, i.e. not for
  staff), `PartnerAvailabilityPage` (board picker + read-only `AvailabilityCalendar`),
  `PartnerCrmPage` (client book, debounced search, inline add/edit form), `PartnerArtworkPage`
  (status-filter chips + per-card stage dropdown), `PartnerJobsPage` (print/install work orders
  with one-tap "next step" buttons: pending → scheduled → in progress → completed, plus
  cancel/reopen), `PartnerSyncPage` (record offline deals — billboard + CRM contact + dates +
  optional negotiated price — and a unified app/offline bookings list with source badges), and
  `PartnerTeamPage` (owner/admin only — create/remove staff logins; the nav item is hidden for
  staff and the route double-gated by a nested `RequireRole`). Shared primitives live in
  `components/partner/ui.jsx`. All Partner API calls are in `api.js` under the
  "Tangazaa Partner" section.
- **Campaign progress tracker UI (as of 2026-07-17):** the customer dashboard's booking cards
  have a **Track progress** link (hidden on cancelled bookings) showing the latest stage label,
  or a pulsing gold **Action needed** badge when `pending_approvals > 0`. It goes to the
  **full page** `pages/customer/BookingProgressPage.jsx`, nested in the customer shell at
  `/dashboard/bookings/:id/progress` (started as a modal, became a page the same day, moved into
  the sidebar shell on 2026-07-21) — a booking summary card, the assigned campaign manager's
  contact details when there is one, then `components/progress/CampaignTimeline.jsx`: a Glovo-style
  vertical timeline of the four fixed stages (`components/progress/stages.js`, mirrors
  `CampaignStage`) with the company's updates, install photos, an inline **Yes — go ahead / Request
  changes** answer card on approval requests, and **👍 Love it / Request changes** feedback on
  ordinary updates. There is no single-booking API endpoint — the page fetches `/my/bookings` and
  picks its booking; the dashboard's badge refreshes naturally on remount when the user navigates
  back. The company posts updates from `PartnerSyncPage` —
  each booking row has a **Progress** button opening
  `components/partner/BookingUpdatesModal.jsx` (stage select, message, ≤4 photo uploads with
  previews, "ask the client to approve" checkbox, client-reaction badges, delete). `apiFetch`
  now skips the JSON `Content-Type` header for `FormData` bodies — don't "fix" that, multipart
  needs its own boundary.
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
  Render currently runs **neither** — it sets `QUEUE_CONNECTION=sync`, so queued Mailables send
  inline on the request instead. That's fine at demo scale; if a worker is ever added, flip that
  back to `database`. Locally the connection *is* `database`, so mail needs `php artisan queue:work`.
- **Mail is not actually delivered anywhere yet** — both local `.env` and `render.yaml` set
  `MAIL_MAILER=log`, so every transactional email is written to `storage/logs/laravel.log` rather
  than sent. Point `MAIL_*` at a real provider (Resend/Postmark/Mailgun/SMTP) to go live; the
  Mailables, templates and send points need no changes.
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
- **`api.js#resolveApiBase` now hard-guards this (as of 2026-07-23):** whenever the SPA is served
  from a non-`localhost`/`127.0.0.1` host it returns `''` (relative paths) **regardless of whether
  `REACT_APP_API_URL` is set** — the env var is only honoured in local dev. This was added after a
  real incident: `REACT_APP_API_URL` had been set to `https://tangaza-api.onrender.com` in Vercel,
  so the build baked that cross-origin base into the bundle, the SPA called Render directly instead
  of the proxy, and the browser couldn't read the `XSRF-TOKEN` cookie across domains → every login
  `419`'d with a **CSRF token mismatch**. The guard means a stray Vercel value can no longer
  resurrect the bug, but you should **still remove `REACT_APP_API_URL` from Vercel's env** (it's
  misleading and only the guard is saving it). Symptom to recognise: login 419s in the real app but
  works when you hit `/api/login` with a relative path — that gap means the bundle is using an
  absolute API base.
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
