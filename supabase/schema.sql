-- ============================================================
-- KINGDOM PASSION ACADEMY OS — CORE SCHEMA (Foundation Layer)
-- Bilingual FR/EN | Douala PK17 | Nursery + Primary subsystem
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------- ROLES ----------
create type user_role as enum ('director','accountant','secretary','teacher','auditor');
create type payment_method as enum ('cash','momo','orange_money','other');
create type payment_type as enum ('school_fee','xmas_party','end_of_year_party','exam_fee','uniform','sportswear','other');
create type reconciliation_status as enum ('open','submitted','approved','flagged');

-- ---------- STAFF / USERS ----------
create table staff (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) unique,
  full_name text not null,
  role user_role not null,
  phone text,
  email text,
  active boolean default true,
  pin_hash text, -- for offline PIN login on the desktop app only; never used for cloud auth
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- CLASSES ----------
create table classes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,               -- e.g. "Nursery 2", "Primaire 6 / CM2"
  subsystem text not null check (subsystem in ('anglophone','francophone')),
  level text not null,              -- Nursery1, Nursery2, CP, CE1, CE2, CM1, CM2, Class1..Class6
  academic_year text not null default '2026-2027',
  teacher_id uuid references staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- PARENTS ----------
create table parents (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  phone_primary text not null,
  phone_secondary text,
  email text,
  address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- STUDENTS ----------
create table students (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  age int,
  sex text check (sex in ('M','F')),
  class_id uuid references classes(id),
  parent_id uuid references parents(id),
  photo_url text,
  qr_code text unique default encode(gen_random_bytes(8), 'hex'),
  enrolled_date date default current_date,
  status text default 'active' check (status in ('active','dropped_out','graduated','transferred')),
  total_fee_due numeric(12,2) default 0,
  academic_year text not null default '2026-2027',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_students_class on students(class_id);
create index idx_students_parent on students(parent_id);

-- ---------- FEE STRUCTURE ----------
create table fee_structure (
  id uuid primary key default uuid_generate_v4(),
  level text not null,
  academic_year text not null default '2026-2027',
  school_fee numeric(12,2) not null,
  exam_fee numeric(12,2) default 0,
  xmas_party_fee numeric(12,2) default 0,
  end_of_year_fee numeric(12,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- PAYMENTS ----------
create table payments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) not null,
  collected_by uuid references staff(id) not null,
  amount numeric(12,2) not null,
  payment_type payment_type not null,
  method payment_method not null,
  receipt_number text unique not null default ('RCPT-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  notes text,
  paid_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_payments_student on payments(student_id);
create index idx_payments_date on payments(paid_at);

-- ---------- DAILY CASH RECONCILIATION (core anti-fraud control) ----------
create table daily_reconciliation (
  id uuid primary key default uuid_generate_v4(),
  reconciliation_date date not null default current_date,
  submitted_by uuid references staff(id) not null,
  approved_by uuid references staff(id),
  expected_cash numeric(12,2) not null,      -- system-computed sum of cash payments
  expected_momo numeric(12,2) not null,
  declared_cash numeric(12,2) not null,      -- what secretary counted physically
  declared_momo numeric(12,2) not null,
  variance_cash numeric(12,2) generated always as (declared_cash - expected_cash) stored,
  variance_momo numeric(12,2) generated always as (declared_momo - expected_momo) stored,
  status reconciliation_status default 'open',
  handed_to_accountant_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(reconciliation_date, submitted_by)
);

-- ---------- ATTENDANCE / ROSTER CROSS-CHECK ----------
create table attendance_checks (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references classes(id) not null,
  checked_by uuid references staff(id) not null,
  check_date date not null default current_date,
  register_count int not null,      -- what secretary's register shows
  physical_count int not null,      -- headcount during class visit
  discrepancy int generated always as (physical_count - register_count) stored,
  new_students_found jsonb,         -- array of {name, age, sex} not yet in system
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table daily_attendance (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) not null,
  attendance_date date not null default current_date,
  present boolean default true,
  marked_by uuid references staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(student_id, attendance_date)
);

-- ---------- INVENTORY (uniforms, stationery, sportswear) ----------
create table inventory_items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null check (category in ('uniform','sportswear','stationery','equipment','other')),
  unit text default 'pcs',
  quantity_on_hand int default 0,
  reorder_threshold int default 10,
  unit_price numeric(12,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table inventory_transactions (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid references inventory_items(id) not null,
  transaction_type text not null check (transaction_type in ('stock_in','issued_free','sold','damaged','adjustment')),
  quantity int not null,
  student_id uuid references students(id),        -- if issued/sold to a specific student
  authorized_by uuid references staff(id) not null,
  payment_id uuid references payments(id),         -- links to payment if sold
  flagged_resale boolean default false,             -- flags suspicious uniform resale per contract policy
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- SMS / COMMUNICATION LOG ----------
create table sms_log (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid references parents(id),
  student_id uuid references students(id),
  phone text not null,
  message_type text check (message_type in ('fee_reminder','event_notice','appreciation','report_card_ready','general')),
  message_body text not null,
  language text default 'fr' check (language in ('fr','en')),
  status text default 'pending' check (status in ('pending','sent','failed')),
  sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- GENERATED DOCUMENTS (report cards, certificates, ID cards, flyers) ----------
create table documents_generated (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id),
  doc_type text not null check (doc_type in ('report_card','certificate','attestation','id_card','badge','flyer')),
  academic_year text default '2026-2027',
  term text,
  file_url text,
  generated_by uuid references staff(id),
  ai_generated_comment text,
  grades_snapshot jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- AUDIT LOG ----------
create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references staff(id),
  action text not null,
  entity text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table staff enable row level security;
alter table students enable row level security;
alter table payments enable row level security;
alter table daily_reconciliation enable row level security;
alter table attendance_checks enable row level security;
alter table inventory_transactions enable row level security;
alter table sms_log enable row level security;
alter table audit_log enable row level security;

-- Helper: get current staff role
create or replace function current_staff_role() returns user_role as $$
  select role from staff where auth_user_id = auth.uid();
$$ language sql stable security definer;

-- Staff: every authenticated staff member can read the staff directory
-- (needed for name lookups, nav, teacher assignment dropdowns, etc.);
-- only the Director can create/edit/deactivate staff records.
create policy "staff_read_all_authenticated" on staff for select
  using (auth.uid() is not null);
create policy "staff_director_insert" on staff for insert
  with check (current_staff_role() = 'director');
create policy "staff_director_update" on staff for update
  using (current_staff_role() = 'director');

-- Director & Accountant: full read access
create policy "director_accountant_full_read" on students for select
  using (current_staff_role() in ('director','accountant','auditor'));

-- ============================================================
-- STEP 7 ADDITIONS — Gradebook, Parent Portal, Health/Incidents,
-- Staff Attendance, Arrival/Departure logging
-- ============================================================

create type incident_severity as enum ('minor','moderate','serious');

-- ---------- SUBJECTS ----------
create table subjects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,          -- e.g. "Mathematics", "English", "French"
  level text,                  -- optional: restrict to a level, null = all levels
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- ASSESSMENTS ----------
create table assessments (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references classes(id) not null,
  subject_id uuid references subjects(id) not null,
  title text not null,          -- e.g. "Mid-Term Test", "Continuous Assessment 1"
  term text not null,
  max_score numeric(6,2) not null default 20,
  weight numeric(4,2) default 1,  -- for weighted averages later
  assessment_date date default current_date,
  created_by uuid references staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- GRADES ----------
create table grades (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) not null,
  assessment_id uuid references assessments(id) not null,
  score numeric(6,2) not null,
  entered_by uuid references staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(student_id, assessment_id)
);

-- ---------- PARENT PORTAL ACCESS ----------
alter table parents add column if not exists access_code text unique;

-- Security-definer function: lets the anon key look up ONLY what a parent
-- should see, without opening broad RLS on students/payments/documents to
-- the public. The access code is the only credential (phone number acts as
-- a light second factor for the lookup).
create or replace function get_parent_portal_data(p_access_code text, p_phone text)
returns json as $$
declare
  v_parent_id uuid;
  v_result json;
begin
  select id into v_parent_id from parents
    where access_code = p_access_code and phone_primary = p_phone;

  if v_parent_id is null then
    return json_build_object('error', 'not_found');
  end if;

  select json_build_object(
    'parent', (select json_build_object('full_name', full_name) from parents where id = v_parent_id),
    'children', (
      select json_agg(json_build_object(
        'id', s.id,
        'full_name', s.full_name,
        'class_name', c.name,
        'total_fee_due', s.total_fee_due,
        'recent_payments', (
          select json_agg(json_build_object('amount', p.amount, 'paid_at', p.paid_at, 'payment_type', p.payment_type, 'receipt_number', p.receipt_number))
          from (select * from payments where student_id = s.id order by paid_at desc limit 10) p
        ),
        'attendance_last_30_days', (
          select json_agg(json_build_object('date', da.attendance_date, 'present', da.present))
          from (select * from daily_attendance where student_id = s.id order by attendance_date desc limit 30) da
        ),
        'report_cards', (
          select json_agg(json_build_object('term', d.term, 'comment', d.ai_generated_comment, 'created_at', d.created_at))
          from documents_generated d where d.student_id = s.id and d.doc_type = 'report_card'
        ),
        'grades', (
          select json_agg(json_build_object('subject', sub.name, 'title', a.title, 'term', a.term, 'score', g.score, 'max_score', a.max_score))
          from grades g
          join assessments a on a.id = g.assessment_id
          join subjects sub on sub.id = a.subject_id
          where g.student_id = s.id
        )
      ))
      from students s left join classes c on c.id = s.class_id
      where s.parent_id = v_parent_id and s.status = 'active'
    )
  ) into v_result;

  return v_result;
end;
$$ language plpgsql security definer;

-- ---------- HEALTH RECORDS ----------
create table health_records (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid unique references students(id),
  allergies text,
  conditions text,             -- ongoing medical conditions
  medications text,
  emergency_contact_name text,
  emergency_contact_phone text,
  blood_type text,
  immunizations jsonb,          -- array of {vaccine, date}
  notes text,
  updated_by uuid references staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- INCIDENTS (safeguarding / behavior) ----------
create table incidents (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) not null,
  reported_by uuid references staff(id) not null,
  incident_date date default current_date,
  severity incident_severity not null default 'minor',
  category text,                -- e.g. "behavior", "injury", "safeguarding", "attendance"
  description text not null,
  action_taken text,
  parent_notified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- SCHOOL SETTINGS (singleton) ----------
create table school_settings (
  id int primary key default 1 check (id = 1), -- enforces a single row
  school_name text not null default 'Kingdom Passion Academy',
  address text default 'PK17, Douala, Cameroon',
  phone text,
  email text,
  logo_url text,
  current_academic_year text not null default '2026-2027',
  updated_by uuid references staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
insert into school_settings (id) values (1) on conflict (id) do nothing;

-- ---------- SPONSORS / GRANTS / INSTITUTIONAL FUNDING ----------
create type sponsor_status as enum ('identified','letter_sent','follow_up','committed','received','declined');

create table sponsors (
  id uuid primary key default uuid_generate_v4(),
  organization_name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  purpose text,                    -- what the letter/request is for
  amount_requested numeric(12,2),
  amount_received numeric(12,2) default 0,
  status sponsor_status not null default 'identified',
  letter_sent_date date,
  last_follow_up_date date,
  next_follow_up_date date,
  notes text,
  created_by uuid references staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- EXPENSES ----------
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  category text not null check (category in ('salaries','utilities','supplies','maintenance','food','transport','marketing','other')),
  description text not null,
  amount numeric(12,2) not null,
  expense_date date default current_date,
  recorded_by uuid references staff(id),
  receipt_note text, -- reference to a physical receipt/invoice number if any
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_expenses_date on expenses(expense_date);

-- ---------- ADMISSIONS / WAITLIST ----------
create type admission_status as enum ('inquiry','visit_scheduled','applied','waitlisted','accepted','enrolled','declined');

create table admissions (
  id uuid primary key default uuid_generate_v4(),
  child_full_name text not null,
  age int,
  sex text check (sex in ('M','F')),
  desired_level text,
  desired_subsystem text check (desired_subsystem in ('anglophone','francophone')),
  parent_name text not null,
  parent_phone text not null,
  parent_email text,
  status admission_status not null default 'inquiry',
  inquiry_date date default current_date,
  notes text,
  enrolled_student_id uuid references students(id),
  created_by uuid references staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- TIMETABLE ----------
create table timetable_periods (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references classes(id) not null,
  subject_id uuid references subjects(id),
  day_of_week int not null check (day_of_week between 1 and 7), -- 1=Sunday..7=Saturday (matches recurrence convention used elsewhere)
  start_time text not null,  -- "08:00"
  end_time text not null,    -- "08:45"
  teacher_id uuid references staff(id),
  room text,
  academic_year text default '2026-2027',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_timetable_class on timetable_periods(class_id);

-- ---------- STAFF ATTENDANCE ----------
create table staff_attendance (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid references staff(id) not null,
  attendance_date date not null default current_date,
  clock_in timestamptz,
  clock_out timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(staff_id, attendance_date)
);

-- ---------- ARRIVAL / DEPARTURE (extends daily_attendance) ----------
alter table daily_attendance add column if not exists arrival_time timestamptz;
alter table daily_attendance add column if not exists departure_time timestamptz;
alter table daily_attendance add column if not exists picked_up_by text; -- name/relation noted at pickup

-- ---------- RLS ----------
alter table grades enable row level security;
alter table assessments enable row level security;
alter table health_records enable row level security;
alter table incidents enable row level security;
alter table staff_attendance enable row level security;

create policy "teacher_manage_own_class_grades" on grades for all
  using (
    current_staff_role() in ('director','secretary')
    or (current_staff_role() = 'teacher' and assessment_id in (
      select a.id from assessments a join classes c on c.id = a.class_id
      where c.teacher_id = (select id from staff where auth_user_id = auth.uid())
    ))
  );

create policy "teacher_manage_own_class_assessments" on assessments for all
  using (
    current_staff_role() in ('director','secretary')
    or (current_staff_role() = 'teacher' and class_id in (
      select id from classes where teacher_id = (select id from staff where auth_user_id = auth.uid())
    ))
  );

create policy "health_records_staff_read" on health_records for select
  using (current_staff_role() in ('director','secretary','teacher','accountant'));
create policy "health_records_secretary_write" on health_records for all
  using (current_staff_role() in ('director','secretary'));

-- Incidents: director sees all; teacher/secretary see only what they reported
-- (protects safeguarding sensitivity — director is the escalation point)
create policy "incidents_director_full_read" on incidents for select
  using (current_staff_role() in ('director'));
create policy "incidents_own_reports" on incidents for select
  using (reported_by = (select id from staff where auth_user_id = auth.uid()));
create policy "incidents_insert" on incidents for insert
  using (current_staff_role() in ('director','secretary','teacher'));

create policy "staff_attendance_own_or_director" on staff_attendance for all
  using (
    staff_id = (select id from staff where auth_user_id = auth.uid())
    or current_staff_role() in ('director','accountant')
  );

alter table timetable_periods enable row level security;
create policy "timetable_read_all_staff" on timetable_periods for select using (true);
create policy "timetable_manage_director_secretary" on timetable_periods for insert with check (
  current_staff_role() in ('director','secretary')
);
create policy "timetable_update_director_secretary" on timetable_periods for update using (
  current_staff_role() in ('director','secretary')
);
create policy "timetable_delete_director_secretary" on timetable_periods for delete using (
  current_staff_role() in ('director','secretary')
);

alter table admissions enable row level security;
create policy "admissions_director_secretary" on admissions for all
  using (current_staff_role() in ('director','secretary'));

alter table expenses enable row level security;
create policy "expenses_director_accountant" on expenses for all
  using (current_staff_role() in ('director','accountant'));

alter table sponsors enable row level security;
create policy "sponsors_director_secretary" on sponsors for all
  using (current_staff_role() in ('director','secretary'));

alter table school_settings enable row level security;
create policy "school_settings_read_all" on school_settings for select using (auth.uid() is not null);
create policy "school_settings_director_write" on school_settings for update using (current_staff_role() = 'director');

-- Secretary: full read/write on students, payments, attendance
create policy "secretary_manage_students" on students for all
  using (current_staff_role() in ('secretary','director'));

create policy "secretary_manage_payments" on payments for all
  using (current_staff_role() in ('secretary','director','accountant'));

-- Teachers: read-only on their own class students
create policy "teacher_own_class_students" on students for select
  using (
    current_staff_role() = 'teacher'
    and class_id in (select id from classes where teacher_id = (select id from staff where auth_user_id = auth.uid()))
  );

-- Reconciliation: only accountant/director can approve; secretary can submit
create policy "reconciliation_secretary_submit" on daily_reconciliation for insert
  using (current_staff_role() in ('secretary'));
create policy "reconciliation_accountant_approve" on daily_reconciliation for update
  using (current_staff_role() in ('accountant','director'));
create policy "reconciliation_read" on daily_reconciliation for select
  using (current_staff_role() in ('secretary','accountant','director','auditor'));

-- Audit log: append-only, director/auditor read
create policy "audit_insert_all_staff" on audit_log for insert with check (true);
create policy "audit_read_director" on audit_log for select
  using (current_staff_role() in ('director','auditor'));

-- ============================================================
-- RLS GAPS FOUND DURING FULL AUDIT — fixed here rather than
-- scattered, so the full picture is easy to review in one place.
--
-- Category A: tables that never had RLS enabled at all (would be
-- fully unrestricted to any authenticated user by default):
--   classes, daily_attendance, documents_generated, fee_structure,
--   inventory_items, parents, subjects
--
-- Category B: tables with RLS enabled but ZERO policies (blocks
-- ALL access, breaking the feature entirely):
--   attendance_checks, inventory_transactions, sms_log
-- ============================================================

alter table classes enable row level security;
create policy "classes_read_all_staff" on classes for select using (auth.uid() is not null);
create policy "classes_director_write" on classes for insert with check (current_staff_role() = 'director');
create policy "classes_director_update" on classes for update using (current_staff_role() = 'director');

alter table daily_attendance enable row level security;
create policy "daily_attendance_read_all_staff" on daily_attendance for select using (auth.uid() is not null);
create policy "daily_attendance_write_staff" on daily_attendance for insert
  with check (current_staff_role() in ('director','secretary','teacher'));
create policy "daily_attendance_update_staff" on daily_attendance for update
  using (current_staff_role() in ('director','secretary','teacher'));

alter table documents_generated enable row level security;
create policy "documents_read_all_staff" on documents_generated for select using (auth.uid() is not null);
create policy "documents_write_staff" on documents_generated for insert
  with check (current_staff_role() in ('director','secretary'));

alter table fee_structure enable row level security;
create policy "fee_structure_read_all_staff" on fee_structure for select using (auth.uid() is not null);
create policy "fee_structure_director_write" on fee_structure for all
  using (current_staff_role() = 'director');

alter table inventory_items enable row level security;
create policy "inventory_items_read_all_staff" on inventory_items for select using (auth.uid() is not null);
create policy "inventory_items_manage" on inventory_items for insert
  with check (current_staff_role() in ('director','secretary'));
create policy "inventory_items_update" on inventory_items for update
  using (current_staff_role() in ('director','secretary'));

-- Parents contain PII (phone numbers) — deliberately more restrictive than
-- a blanket "any authenticated staff" read.
alter table parents enable row level security;
create policy "parents_read_staff" on parents for select
  using (current_staff_role() in ('director','secretary','accountant','teacher'));
create policy "parents_manage" on parents for insert
  with check (current_staff_role() in ('director','secretary'));
create policy "parents_update" on parents for update
  using (current_staff_role() in ('director','secretary'));

-- Subjects: teachers create these inline from the Gradebook UI, not just
-- Director/Secretary — the policy must allow that or grade entry breaks.
alter table subjects enable row level security;
create policy "subjects_read_all_staff" on subjects for select using (auth.uid() is not null);
create policy "subjects_write_staff" on subjects for insert
  with check (current_staff_role() in ('director','secretary','teacher'));

create policy "attendance_checks_read" on attendance_checks for select using (auth.uid() is not null);
create policy "attendance_checks_write" on attendance_checks for insert
  with check (current_staff_role() in ('director','secretary'));

create policy "inventory_transactions_read" on inventory_transactions for select using (auth.uid() is not null);
create policy "inventory_transactions_write" on inventory_transactions for insert
  with check (current_staff_role() in ('director','secretary'));

create policy "sms_log_read" on sms_log for select
  using (current_staff_role() in ('director','secretary'));
create policy "sms_log_write" on sms_log for insert
  with check (current_staff_role() in ('director','secretary'));

-- ============================================================
-- AUTO-UPDATE updated_at ON EVERY UPDATE
-- Placed at the very end of this script (after every table above already
-- exists) — required because the sync engine (lib/db/sync.ts) filters
-- pulled changes by `updated_at` and uses it for conflict detection. If a
-- cloud-direct write (e.g. from the web app, not through the local-first
-- desktop path) doesn't bump this column, sync would miss that change.
-- ============================================================
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  foreach t in array array[
    'staff','classes','parents','students','fee_structure','payments',
    'daily_reconciliation','attendance_checks','daily_attendance',
    'inventory_items','inventory_transactions','sms_log','documents_generated',
    'subjects','assessments','grades','health_records','incidents',
    'staff_attendance','timetable_periods','admissions','expenses','sponsors',
    'school_settings'
  ]
  loop
    execute format(
      'create trigger trg_set_updated_at before update on %I for each row execute function set_updated_at();',
      t
    );
  end loop;
end $$;
