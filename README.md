# Kingdom Passion Academy OS

Bilingual (FR/EN) school operations system for Kingdom Passion Academy, Douala PK17.
Built to handle Nursery + Primary, ~3,000 students, with role-based access for
Director, Accountant, Secretary-Bursar, and Teachers. All four core modules
complete: Foundation, Bursar/Cash, Attendance/Registrar, Communication.

## What's in this drop

- **Database schema** (`supabase/schema.sql`) — students, classes, parents, payments,
  daily cash reconciliation, attendance cross-checks, inventory, SMS log, generated
  documents, audit log. Full Row Level Security by role.
- **Auth + role routing** — login page, middleware that redirects each staff member
  to their own dashboard and blocks access to other roles' areas.
- **Dashboard shells** — Director (school-wide KPIs), Accountant (reconciliation
  approval queue), Secretary (daily task overview), Teacher (class roster).

## Setup

1. Create a free Supabase project at supabase.com
2. In the Supabase SQL Editor, run `supabase/schema.sql`
3. Copy `.env.example` to `.env.local` and fill in your Supabase URL + anon key
4. `npm install`
5. `npm run dev`
6. Create your first Director account: sign up via Supabase Auth, then manually
   insert a row into `staff` linking `auth_user_id` to that user with `role = 'director'`

## Windows desktop app (Tauri, local-first)

This project is wrapped with [Tauri](https://tauri.app) to produce a real installable
`.exe`/`.msi`. As of Step 5, it no longer just points at the deployed web URL —
it spawns a bundled local Node server (with its own SQLite database) so the
whole app works offline. See "Step 5 — Local-first architecture" below for
how that works, and `scripts/package-local-server.js` for packaging it.

**One-time setup on the build machine:**
1. Install [Rust](https://rustup.rs) and the [Tauri prerequisites for Windows](https://tauri.app/start/prerequisites/) (Microsoft C++ Build Tools + WebView2 — WebView2 ships with Windows 11 by default).
2. `npm install`
3. `npm run build` (produces the standalone Next.js server)
4. `npm run package:local-server` (packages it as a Tauri sidecar — see script
   output for the manual native-runtime step)
5. Replace the placeholder icons in `src-tauri/icons/` with the real school crest
   (keep the same filenames/sizes), or run `npx tauri icon path/to/logo.png` to
   regenerate all sizes automatically from one source image.

**Build the installer:**
```
npm run desktop:build
```
This produces an `.msi` and `.exe` (NSIS) installer under
`src-tauri/target/release/bundle/`. Share that installer file with staff — double-click
to install, creates a Start Menu shortcut, runs like any Windows app, works offline.

**Test without building an installer:**
```
npm run desktop:dev
```

## Build roadmap (in progress)

- [x] **Step 1 — Foundation**: schema, auth, role dashboards
- [x] **Step 1b — Windows desktop wrapper**: Tauri `.exe`/`.msi` installer
- [x] **Step 2 — Bursar/Cash module**: payment collection, printable receipts,
      daily reconciliation with variance flagging, accountant approval workflow
- [x] **Step 3 — Attendance/Registrar module**: class creation, student
      enrollment, attendance cross-check, teacher daily attendance, inventory
      with resale flagging, fee regularization dashboard, audit log
- [x] **Step 4 — Communication module**: AI-assisted SMS to parents (fee
      reminders, event notices, appreciation), AI bilingual report-card
      comments, ID card/badge generator with QR code, certificate/attestation
      generator, AI-assisted flyer copy
- [x] **Step 5 — Local-first data layer**: local SQLite database, sync engine
      with conflict detection, local session caching for offline identity.
      All modules migrated: Payments, Reconciliation, Classes, Students,
      Attendance, Inventory, Documents, and SMS
- [x] **Step 6 — Android PWA support**: installable on Android home screen,
      app icon, splash screen, fast repeat loads, friendly offline page
- [x] **Step 7 — Gradebook, Parent Portal, Health/Incidents, Staff Attendance,
      Arrival/Departure**
- [x] **Step 8 — Gradebook→Report Card integration, Fee Structure management,
      Timetable/Scheduling**
- [x] **Step 9 — Backups, Year-End Promotion, Admissions/Waitlist**
- [x] **Step 10 — Analytics, CSV Export, Bulk Report Cards, Automated Fee
      Reminders**
- [x] **Step 11 — Staff Management, Expense Tracking, RLS bugfix**
- [x] **Step 12 — Sponsor/Grant tracking, School Settings, Offline PIN login**
- [x] **Step 13 — Full verification pass** — 5 real bugs found and fixed
- [x] **Step 14 — Mobile navigation fix, phone quick-actions, finished School
      Settings wiring, student photos** *(this drop)*

## Step 14 — New modules (and a real mobile bug fix)

- **Bug fix — mobile navigation was completely missing.** The sidebar was
  `hidden` below the `md` breakpoint with no replacement at all — phone users
  could not navigate anywhere except whatever page they landed on directly.
  Fixed with `components/MobileNav.tsx`: a sticky top bar + slide-out drawer
  menu, shown only below `md`.
- **Quick-actions bar for phone** (`components/QuickActionsBar.tsx`): a
  bottom tab bar with the 3-4 most common daily actions per role (Secretary:
  Payment / Arrival-Departure / Attendance / Students; Teacher: Attendance /
  Gradebook / Timetable; etc.) — one tap from the phone's home screen straight
  into the task, instead of drilling through menus.
- **Install prompt now handles iOS**: previously only listened for
  `beforeinstallprompt`, which iOS Safari never fires — iPhone/iPad users saw
  nothing. Now detects iOS and shows the manual "Share → Add to Home Screen"
  steps instead.
- **School Settings fully wired**: report cards, certificates, ID cards, and
  flyers now all pull the school name/address from Settings instead of the
  hardcoded "Kingdom Passion Academy" string. The browser tab title does too.
  (This closes the "first pass only" gap flagged back in Step 12.)
- **Student photos**: ID cards had a placeholder box since Step 4. Now there's
  a working upload (`components/PhotoUpload.tsx`) on the Students page —
  resizes/compresses client-side to a small JPEG before saving, stored as a
  data URL in the existing `photo_url` column (no new storage bucket needed,
  works identically in local and cloud mode). ID cards now show the real photo.
- **PWA app shortcuts**: long-pressing the home screen icon on Android now
  offers direct jumps to Payment, Arrival/Departure, Attendance, and
  Gradebook — the same shortcut menu a native app would have. (Manifest
  shortcuts are static per the Web App Manifest spec, not role-specific, but
  middleware still gracefully redirects if the wrong role taps one.)

## PWA status, full picture

Everything required for a real installable PWA is in place: `manifest.json`
linked in the layout, a registered service worker (`public/sw.js`) caching
static assets with an offline fallback page, theme-color, a full icon set
(192/512/512-maskable/apple-touch), an install prompt that handles both
Android (`beforeinstallprompt`) and iOS (manual Share-sheet instructions,
which iOS Safari requires since it never fires that event), and now app
shortcuts. Combined with the Step 14 mobile-nav fix, the phone experience is
now: install → home screen icon → long-press for shortcuts → usable
navigation throughout.

## Step 13 — Full Verification Report (IMPORTANT — read before deploying)

You asked for a complete correctness check. Here's exactly what that meant in
this environment and what it found. **Honest scope note first**: this sandbox
has no internet access, so I could not run `npm install`, `next build`, or
`tsc` — the real compiler. What I *could* do, and did, is execute the actual
SQL against a real SQLite engine, and run twelve targeted static-analysis
passes across all 121 source files. This is real verification, not a guess —
but it is not a substitute for `npm install && npm run build` on your end
before deploying, which I'd still recommend as the final gate.

**Real bugs found and fixed:**

1. **18 of 24 database tables were missing `updated_at` (some also
   `created_at`) in the Postgres schema**, even though the sync engine
   (built in Step 5) requires `updated_at` on every synced table to detect
   changes and resolve conflicts. Left unfixed, cloud sync would have simply
   failed — either erroring outright or silently missing changes — for
   almost every table. Fixed: added the columns to all 18 tables, plus a
   database trigger so `updated_at` stays accurate even on writes that come
   directly from the cloud app (not through the local-first sync path).
2. **7 tables had no Row Level Security enabled at all**: `classes`,
   `daily_attendance`, `documents_generated`, `fee_structure`,
   `inventory_items`, `parents`, `subjects`. This would have left them fully
   unrestricted to any authenticated user by default — notably `parents`,
   which holds phone numbers. Fixed with policies matching how the app
   actually uses each table.
3. **3 tables had RLS enabled but zero policies**: `attendance_checks`,
   `inventory_transactions`, `sms_log`. This is the opposite failure mode —
   it would have blocked ALL access, breaking attendance checks, inventory
   transactions, and SMS logging entirely in cloud mode. Fixed.
4. **A trigger-creation block referenced 11 tables before they were created**
   in the file (an ordering bug from how sections were appended over many
   build steps) — would have made the whole schema.sql script fail outright
   partway through. Fixed by moving it to the true end of the file, after
   verifying programmatically that every table it touches already exists by
   that point.
5. **Tauri window had no explicit `label`**, while `capabilities/default.json`
   scopes permissions to `"windows": ["main"]`. Tauri defaults the first
   window to label `"main"` so this worked, but relying on that implicit
   default was fragile — made it explicit.

**Verified clean (not just assumed) via 12 automated passes:**
- Every import in every file resolves to a real file and a real named/default
  export (121 files, zero broken imports)
- Every server-action call site passes at least as many arguments as the
  function requires
- The local SQLite schema was **actually executed** against a real SQLite
  engine (not just read) — it creates all 28 tables without error
- The local migration logic (`runMigrations()`) was simulated across two
  "app launches" to confirm it's genuinely idempotent (no error on restart)
- Every table referenced inside a SQL query string in the TypeScript code
  exists in the real, executed local schema
- Every `@namedParameter` in a SQLite query has a matching key in the object
  passed to `.run()` (checked the ones the script could resolve; the rest
  were spot-verified by hand)
- Schema structural integrity: balanced `$$` blocks, balanced parentheses,
  enum types defined before use, every foreign key references an
  already-defined table, no duplicate RLS policy names
- All 6 JSON config files parse correctly
- Every dynamic route folder (e.g. `[documentId]`) is actually used inside
  its page
- Every `page.tsx` has a default export
- Every `lib/actions/*.ts` file has `"use server"`; every interactive
  component has `"use client"`

**What I could NOT verify without network access** (flagging rather than
guessing): the actual TypeScript type-checking (`tsc --noEmit`), whether
`npm install` resolves cleanly with no version conflicts, and a real Next.js
production build (`next build`). Please run these three yourself as the
final check before shipping — if anything surfaces, bring it back here.

## Step 12 — New modules

- **Sponsors / Institutional Support** (`/dashboard/secretary/sponsors`):
  directly from your original contract — "send sponsoring letters to
  institutions & follow up for assistance." Tracks organizations through
  identified → letter sent → following up → committed → received/declined,
  with follow-up dates and amounts.
- **School Settings** (`/dashboard/director/settings`, Director only): school
  name, address, phone, email, and current academic year, wired into the
  login screen and payment receipts as a first pass. Report cards,
  certificates, ID cards, and the desktop window title still say "Kingdom
  Passion Academy" directly — say the word and I'll finish wiring the rest.
- **Offline PIN Login** (desktop app only): closes the limitation flagged
  since Step 5 — the very first login of the day no longer strictly needs
  internet. After one normal online login, a staff member can set a 4-6
  digit PIN (prompted automatically on their dashboard); from then on they
  can start a fresh session fully offline by picking their name and entering
  the PIN. Uses a signed session cookie (not a database check) so it works
  even if the app's page-routing layer can't reach the local database at that
  moment. Expires after 12 hours — meant for "start my day," not permanent
  passwordless access. The PIN hash is stored locally (and synced to Supabase
  like any other staff field) using salted scrypt hashing, not reversible.

## Step 11 — New modules (and a real bug fix)

- **Bug fix**: the `staff` table had Row Level Security *enabled* since Step 1
  but was never given any policies — meaning every staff-table read in cloud
  mode (login, sidebar nav, name lookups, teacher assignment dropdowns) would
  have silently returned nothing once actually deployed to Supabase. Local
  mode never hit this (SQLite has no RLS), which is exactly why it hadn't
  surfaced yet. Fixed: authenticated staff can read the directory; only the
  Director can create/edit staff records.
- **Staff Management** (`/dashboard/director/staff`): there was previously no
  in-app way to add a Secretary, Teacher, or Accountant — the README told you
  to do it by hand in the Supabase dashboard. Now the Director can create a
  login (creates both the Supabase Auth account and the staff record),
  change someone's role, and activate/deactivate accounts, all from the app.
  Requires `SUPABASE_SERVICE_ROLE_KEY` in your environment (creating an Auth
  user needs admin privileges) — the very first Director account still has
  to be created manually per the Setup instructions above; this feature is
  for every login after that.
- **Expense Tracking** (`/dashboard/accountant/expenses`, Director/Accountant):
  records what the school spends (salaries, utilities, supplies, maintenance,
  etc.), alongside a monthly income-vs-expense summary using the fee payments
  already being collected. CSV export included.

## Step 10 — New modules

- **Analytics** (`/dashboard/director/analytics`): 30-day payment collection
  trend, attendance rate trend, and enrollment-by-class bar chart. Built with
  recharts (already a dependency, previously unused).
- **CSV Export**: Students (with fee balances), Payments, and Audit Log each
  now have an "Export CSV" button — opens/downloads directly in the browser,
  no server storage involved.
- **Bulk Report Cards** (`/dashboard/secretary/documents`): generate report
  cards for an entire class in one action instead of one student at a time.
  Each student's own grades are still pulled in individually — only the
  starting comment context is shared across the class.
- **Automated Weekly Fee Reminders** (cloud only): a Vercel Cron job
  (`vercel.json`, `/api/cron/fee-reminders`) runs every Monday morning and
  texts every parent with an outstanding balance automatically — the
  "automation reducing manual work" piece for fee collection. Requires
  `CRON_SECRET` set in your Vercel environment variables. This is cloud-only:
  the local desktop app has no persistent background process to run a
  schedule from, so this specific feature only fires on the deployed web app.

## Step 9 — New modules

- **Backups** (`/dashboard/director/backups`, Director/Accountant): one-click
  backup of the local database using SQLite's own backup API (crash-safe,
  unlike a raw file copy), a restore flow with a safety copy taken
  automatically before restoring, and a silent once-per-day auto-backup
  triggered from the sync cycle. Keeps the most recent 20 manual backups.
  Cloud/web deployment doesn't need this — Supabase handles that.
- **Year-End Promotion** (`/dashboard/director/promotion`): select a class,
  select students (defaults to everyone), then promote them to another class,
  graduate them, or mark as dropped out — in bulk or individually. Logs to
  the audit trail.
- **Admissions/Waitlist** (`/dashboard/secretary/admissions`): log inquiries,
  move them through inquiry → visit → applied → waitlisted → accepted →
  enrolled/declined, and one click converts an accepted applicant straight
  into a real enrolled student (creates the student + parent record, same as
  manual enrollment).

## Step 8 — New modules

- **Report cards now include grades**: generating a report card automatically
  pulls that student's grades for the selected term from the Gradebook and
  freezes them into the document (`documents_generated.grades_snapshot`) —
  so the printed report card shows a real grades table + term average
  alongside the AI-written comment, and it won't change retroactively if
  grades are edited later.
- **Fee Structure** (`/dashboard/director/fee-structure`, Director only): set
  school/exam/party fees per level for the academic year, then "Apply to
  Unpaid Students in This Level" sets the starting balance for every active
  student at that level who hasn't made a school-fee payment yet (won't touch
  students already paying). This is what `total_fee_due` should be driven by
  going forward, rather than typing it in by hand at enrollment.
- **Timetable** (`/dashboard/director/timetable` to edit, Director/Secretary;
  `/dashboard/teacher/timetable` to view, read-only): weekly schedule per
  class — day, time, subject, teacher, room. Requires at least one subject to
  exist first (create one from the Gradebook).

## Step 7 notes

- **Gradebook** (`/dashboard/teacher/gradebook`): teachers create subjects and
  assessments per term, enter scores per student. Term averages are computed
  on demand (`getStudentTermAverage`) for future use in report cards.
- **Parent Portal** (`/parent-portal`, separate from staff `/dashboard` — no
  staff login needed): parents sign in with their phone number + a short
  access code (issued by the Secretary from the Students page, "Give parent
  portal access" button) to see their own child's fee balance, recent
  payments, attendance, grades, and report card comments — read-only. On
  Supabase this is powered by a `SECURITY DEFINER` Postgres function
  (`get_parent_portal_data`) so the anon key can serve exactly one parent's
  data without opening broad RLS to the public; the local SQLite version
  mirrors the same query logic.
- **Health Records** (`/dashboard/secretary/health`): allergies, ongoing
  conditions, medications, emergency contact, blood type — visible to
  Director, Secretary, and Teachers (not Accountant).
- **Incidents** (`/dashboard/director/incidents`): behavior, injury, and
  safeguarding reports. Director sees everything; Secretary/Teacher only see
  what they personally reported (safeguarding sensitivity — Director is the
  escalation point).
- **Staff Attendance**: a Clock In/Clock Out widget now sits at the top of
  every dashboard (Director, Accountant, Secretary, Teacher). Director sees
  everyone's daily clock times at `/dashboard/director/staff-attendance`.
- **Arrival/Departure** (`/dashboard/secretary/arrivals`): logs exact
  drop-off/pickup times per student per day, with an optional "picked up by"
  field for basic safeguarding (who collected the child) — extends the
  existing `daily_attendance` table rather than duplicating it.

All of the above follow the same local-first pattern as Steps 2–5: works
offline in the Windows app, syncs to Supabase when online.

## Step 6 — Android / PWA support

The web app is now installable — on Android, visiting the deployed URL in
Chrome shows an "Install app" prompt (or the banner built into this app), and
it opens full-screen with its own icon, no browser bar, like a native app.

**Important — read this before assuming Android has the same offline power
as Windows:** this PWA layer makes the app *installable and fast*, and shows
a friendly offline page instead of a browser error when there's no signal.
It does **not** give Android the same full offline data entry (collecting
payments, marking attendance, etc. while fully offline) that the Windows
desktop app has — that runs on a real local SQLite database via Node, which
a phone browser can't execute. Building genuine offline data entry for
Android would mean a browser-compatible database (IndexedDB or a WASM build
of SQLite) with its own sync logic — a real, separate project, not a small
add-on. Worth doing if Bursar/staff regularly need the *phone* (not just the
office Windows computer) to keep working through outages — flag it if so.

**What's in this drop:**
- `public/manifest.json`, `public/icon-*.png` — app identity or Android
- `public/sw.js` — service worker: caches static assets for fast loads,
  network-first for pages (so data stays fresh), offline fallback page
- `components/InstallPrompt.tsx` — the "Install KPA Academy" banner
- `components/ServiceWorkerRegister.tsx` — registers the service worker

## Step 5 — Local-first architecture

The Windows desktop app now has a **local SQLite database** as its primary
store for every function in the app — not just payments. The Secretary,
Bursar, Teacher, Accountant, and Director dashboards all read and write
locally first, so the whole school can keep operating through an internet
outage: collecting payments, enrolling students, marking attendance, issuing
inventory, generating documents, drafting SMS. A background sync engine
pushes changes to Supabase (and pulls changes from other devices) whenever
the internet is available.

**How it works:**
- `lib/db/local-schema.sql` — SQLite schema mirroring the cloud one
- `lib/db/local.ts` — the SQLite connection + `writeWithSync()`, which writes
  a row locally AND queues it for upload in a single transaction (so a crash
  can never lose a write or half-sync it)
- `lib/db/sync.ts` — the sync engine: pushes the local queue to Supabase,
  pulls remote changes down, and detects conflicts
- `lib/data/mode.ts` — the switch. Set `DATA_MODE=local` and the app reads/
  writes SQLite; leave it unset (the normal Vercel deployment) and it behaves
  exactly as before, talking to Supabase directly
- `lib/data/currentStaff.ts` — identity works offline too: after the first
  online login, the staff record is cached locally so every subsequent action
  knows who's using the machine without a network round-trip
- **Conflict rule**: most tables use last-write-wins by timestamp. `payments`
  and `daily_reconciliation` — the money records — NEVER auto-resolve. If both
  a local and cloud version changed, it's queued at
  `/dashboard/director/sync-conflicts` for a human to pick, with both versions
  shown side by side
- **SMS while offline**: sending still needs internet (it's a message to a
  real phone), so an SMS attempted offline is logged as "queued offline"
  rather than failed, and automatically retried the next time the sync cycle
  detects a connection

**AI features** (report card comments, SMS drafting, flyer copy) still need
internet, since they call OpenRouter — offline, they fall back gracefully
(report cards use the teacher's raw notes; SMS/flyer show a friendly retry
message) rather than blocking the rest of the workflow.

**Honest limitation on offline login:** the very first login of the day still
needs internet (it authenticates against Supabase Auth once, then caches that
staff's identity locally). If someone needs to log in fresh while already
offline, that's a follow-up piece (a local PIN-based login) worth building —
flag it if that's a real scenario for you.

**Packaging note:** running this locally requires the Next.js server to run
*on the staff computer*, not on Vercel (Vercel's serverless functions have no
persistent disk for SQLite). Tauri spawns this as a bundled background
process ("sidecar"). See `scripts/package-local-server.js` for the packaging
steps — this is genuinely the most fiddly remaining piece since it involves
bundling a native SQLite addon with a Node runtime into a Windows executable;
happy to walk through it live once you're at that stage.

## Step 4 notes

- **AI is fully OpenRouter-routed** (`lib/ai/openrouter.ts`) per your standing
  rule — swap models in one place, never in UI code, and no provider/model name
  or raw error ever reaches the client. Without `OPENROUTER_API_KEY` set, AI
  drafting functions return `null` and the UI falls back gracefully (report
  cards use the teacher's raw notes; SMS/flyer show a friendly retry message).
- **SMS gateway is pluggable** (`lib/sms/gateway.ts`) — without
  `SMS_GATEWAY_API_KEY` set, sends are simulated and logged as sent so you can
  demo the full flow before picking a real Cameroon aggregator.
- **SMS composer** (`/dashboard/secretary/documents`): AI drafts a bilingual
  message from a short description, target all parents / one class / fee-owing
  parents only, every send logged to `sms_log`.
- **Report cards**: teacher jots strengths/areas to improve, AI writes a
  bilingual (FR/EN) comment, printable output.
- **ID cards**: printable badge with QR code (encodes the student's unique
  `qr_code` field) — photo slot is a placeholder until camera/upload is wired in.
- **Certificates/attestations**: printable formal document, works for the
  end-of-year attestations and awards mentioned in your contract.
- **Flyers**: AI drafts bilingual promotional copy, printable card layout.

## Step 3 notes

- **Classes** (`/dashboard/director/classes`, Director only): create classes by
  subsystem (Anglophone/Francophone) and level, assign a teacher.
- **Students** (`/dashboard/secretary/students`): enroll a student — automatically
  creates or reuses a parent record by phone number.
- **Attendance Check** (`/dashboard/secretary/attendance`): the contract's exact
  Monday/Tuesday workflow — enter physical headcount, system compares against the
  register automatically, capture any new children found for later enrollment.
- **Teacher daily attendance** (`/dashboard/teacher/attendance`): tap present/absent
  per student, one click to save.
- **Inventory** (`/dashboard/secretary/inventory`): add items, stock in, issue free
  or sell — selling uniforms can be flagged for review, matching the contract's
  explicit warning about unauthorized uniform resale.
- **Fee Regularization** (`/dashboard/director/fees`): live per-class and
  school-wide % paid, against the 80%-by-December / 100%-by-February targets.
- **Audit Log** (`/dashboard/director/audit`): every payment, reconciliation,
  enrollment, class creation, and flagged resale, timestamped.

## Standing technical rules

- All AI calls route through OpenRouter (`OPENROUTER_API_KEY`) — never call a
  provider directly from the client.
- Never expose provider names, model names, or raw errors in any user-facing UI.
- Every money-handling action writes to `audit_log`.
