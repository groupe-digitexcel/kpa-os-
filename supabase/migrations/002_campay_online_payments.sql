-- ── KPA-OS — CamPay online fee payments (parent portal) ─────────────────────
-- Additive migration: run this against your existing Supabase project.
-- Do NOT re-run schema.sql — this only adds to what's already there.

-- Allow a new payment method for online MoMo/Orange Money collected via CamPay
alter type payment_method add value if not exists 'campay_online';

-- Online payments are initiated by the parent, not a staff member,
-- so collected_by can no longer be mandatory.
alter table payments alter column collected_by drop not null;

-- Track the CamPay lifecycle for each online payment. A row is inserted as
-- 'pending' the moment the parent requests it, and only flips to
-- 'successful' once we've confirmed with CamPay ourselves (webhook +
-- server-side status check) — the client/parent request alone never
-- decides this.
alter table payments add column if not exists campay_reference text unique;
alter table payments add column if not exists campay_status text
  check (campay_status in ('pending', 'successful', 'failed')) default null;
alter table payments add column if not exists initiated_by text
  check (initiated_by in ('staff', 'parent_portal')) not null default 'staff';

create index if not exists idx_payments_campay_reference on payments(campay_reference);

-- total_fee_due must only be decremented once campay_status = 'successful'.
-- Enforced in application code (see lib/actions/campayPayments.ts).
