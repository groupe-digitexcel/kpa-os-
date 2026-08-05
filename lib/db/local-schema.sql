-- ============================================================
-- KINGDOM PASSION ACADEMY OS — LOCAL SQLITE SCHEMA
-- Runs on the staff computer inside the Tauri desktop app.
-- Mirrors supabase/schema.sql. Differences from Postgres version:
--   - No RLS (single-machine, app enforces role via session + audit_log)
--   - No native enums -> CHECK constraints
--   - No gen_random_uuid()/generated columns -> computed in application code
--   - Every syncable table has: synced_at, updated_at, deleted (soft delete)
--     so the sync engine can diff local vs cloud.
-- ============================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  auth_user_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('director','accountant','secretary','teacher','auditor')),
  phone TEXT,
  email TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subsystem TEXT NOT NULL CHECK (subsystem IN ('anglophone','francophone')),
  level TEXT NOT NULL,
  academic_year TEXT NOT NULL DEFAULT '2026-2027',
  teacher_id TEXT REFERENCES staff(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS parents (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone_primary TEXT NOT NULL,
  phone_secondary TEXT,
  email TEXT,
  address TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  age INTEGER,
  sex TEXT CHECK (sex IN ('M','F')),
  class_id TEXT REFERENCES classes(id),
  parent_id TEXT REFERENCES parents(id),
  photo_url TEXT,
  qr_code TEXT UNIQUE,
  enrolled_date TEXT DEFAULT (date('now')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','dropped_out','graduated','transferred')),
  total_fee_due REAL DEFAULT 0,
  academic_year TEXT NOT NULL DEFAULT '2026-2027',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_parent ON students(parent_id);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  collected_by TEXT NOT NULL REFERENCES staff(id),
  amount REAL NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN
    ('school_fee','xmas_party','end_of_year_party','exam_fee','uniform','sportswear','other')),
  method TEXT NOT NULL CHECK (method IN ('cash','momo','orange_money','other')),
  receipt_number TEXT UNIQUE NOT NULL,
  notes TEXT,
  paid_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(paid_at);

-- Daily cash reconciliation: NEVER auto-resolved by sync (see sync.ts) — always
-- flagged for manual review if both a local and cloud version exist and differ.
CREATE TABLE IF NOT EXISTS daily_reconciliation (
  id TEXT PRIMARY KEY,
  reconciliation_date TEXT NOT NULL,
  submitted_by TEXT NOT NULL REFERENCES staff(id),
  approved_by TEXT REFERENCES staff(id),
  expected_cash REAL NOT NULL,
  expected_momo REAL NOT NULL,
  declared_cash REAL NOT NULL,
  declared_momo REAL NOT NULL,
  variance_cash REAL NOT NULL,
  variance_momo REAL NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','submitted','approved','flagged')),
  handed_to_accountant_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0,
  UNIQUE(reconciliation_date, submitted_by)
);

CREATE TABLE IF NOT EXISTS attendance_checks (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id),
  checked_by TEXT NOT NULL REFERENCES staff(id),
  check_date TEXT NOT NULL DEFAULT (date('now')),
  register_count INTEGER NOT NULL,
  physical_count INTEGER NOT NULL,
  discrepancy INTEGER NOT NULL,
  new_students_found TEXT, -- JSON string
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_attendance (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  attendance_date TEXT NOT NULL DEFAULT (date('now')),
  present INTEGER DEFAULT 1,
  marked_by TEXT REFERENCES staff(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0,
  UNIQUE(student_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('uniform','sportswear','stationery','equipment','other')),
  unit TEXT DEFAULT 'pcs',
  quantity_on_hand INTEGER DEFAULT 0,
  reorder_threshold INTEGER DEFAULT 10,
  unit_price REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES inventory_items(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN
    ('stock_in','issued_free','sold','damaged','adjustment')),
  quantity INTEGER NOT NULL,
  student_id TEXT REFERENCES students(id),
  authorized_by TEXT NOT NULL REFERENCES staff(id),
  payment_id TEXT REFERENCES payments(id),
  flagged_resale INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sms_log (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES parents(id),
  student_id TEXT REFERENCES students(id),
  phone TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN
    ('fee_reminder','event_notice','appreciation','report_card_ready','general')),
  message_body TEXT NOT NULL,
  language TEXT DEFAULT 'fr' CHECK (language IN ('fr','en')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  sent_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS documents_generated (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id),
  doc_type TEXT NOT NULL CHECK (doc_type IN
    ('report_card','certificate','attestation','id_card','badge','flyer')),
  academic_year TEXT DEFAULT '2026-2027',
  term TEXT,
  file_url TEXT,
  generated_by TEXT REFERENCES staff(id),
  ai_generated_comment TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES staff(id),
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  details TEXT, -- JSON string
  created_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT
);

CREATE TABLE IF NOT EXISTS fee_structure (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  academic_year TEXT NOT NULL DEFAULT '2026-2027',
  school_fee REAL NOT NULL,
  exam_fee REAL DEFAULT 0,
  xmas_party_fee REAL DEFAULT 0,
  end_of_year_fee REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS school_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  school_name TEXT NOT NULL DEFAULT 'Kingdom Passion Academy',
  address TEXT DEFAULT 'PK17, Douala, Cameroon',
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  current_academic_year TEXT NOT NULL DEFAULT '2026-2027',
  updated_by TEXT REFERENCES staff(id),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT
);
INSERT OR IGNORE INTO school_settings (id) VALUES (1);

CREATE TABLE IF NOT EXISTS sponsors (
  id TEXT PRIMARY KEY,
  organization_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  purpose TEXT,
  amount_requested REAL,
  amount_received REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'identified' CHECK (status IN
    ('identified','letter_sent','follow_up','committed','received','declined')),
  letter_sent_date TEXT,
  last_follow_up_date TEXT,
  next_follow_up_date TEXT,
  notes TEXT,
  created_by TEXT REFERENCES staff(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN
    ('salaries','utilities','supplies','maintenance','food','transport','marketing','other')),
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  expense_date TEXT DEFAULT (date('now')),
  recorded_by TEXT REFERENCES staff(id),
  receipt_note TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS admissions (
  id TEXT PRIMARY KEY,
  child_full_name TEXT NOT NULL,
  age INTEGER,
  sex TEXT CHECK (sex IN ('M','F')),
  desired_level TEXT,
  desired_subsystem TEXT CHECK (desired_subsystem IN ('anglophone','francophone')),
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  status TEXT NOT NULL DEFAULT 'inquiry' CHECK (status IN
    ('inquiry','visit_scheduled','applied','waitlisted','accepted','enrolled','declined')),
  inquiry_date TEXT DEFAULT (date('now')),
  notes TEXT,
  enrolled_student_id TEXT REFERENCES students(id),
  created_by TEXT REFERENCES staff(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS timetable_periods (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id),
  subject_id TEXT REFERENCES subjects(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  teacher_id TEXT REFERENCES staff(id),
  room TEXT,
  academic_year TEXT DEFAULT '2026-2027',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0
);

-- ============================================================
-- STEP 7 ADDITIONS — Gradebook, Parent Portal, Health/Incidents,
-- Staff Attendance, Arrival/Departure logging
-- ============================================================

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id),
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  title TEXT NOT NULL,
  term TEXT NOT NULL,
  max_score REAL NOT NULL DEFAULT 20,
  weight REAL DEFAULT 1,
  assessment_date TEXT DEFAULT (date('now')),
  created_by TEXT REFERENCES staff(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  assessment_id TEXT NOT NULL REFERENCES assessments(id),
  score REAL NOT NULL,
  entered_by TEXT REFERENCES staff(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0,
  UNIQUE(student_id, assessment_id)
);

CREATE TABLE IF NOT EXISTS health_records (
  id TEXT PRIMARY KEY,
  student_id TEXT UNIQUE REFERENCES students(id),
  allergies TEXT,
  conditions TEXT,
  medications TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  blood_type TEXT,
  immunizations TEXT, -- JSON string
  notes TEXT,
  updated_by TEXT REFERENCES staff(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  reported_by TEXT NOT NULL REFERENCES staff(id),
  incident_date TEXT DEFAULT (date('now')),
  severity TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor','moderate','serious')),
  category TEXT,
  description TEXT NOT NULL,
  action_taken TEXT,
  parent_notified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS staff_attendance (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  attendance_date TEXT NOT NULL DEFAULT (date('now')),
  clock_in TEXT,
  clock_out TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,
  deleted INTEGER DEFAULT 0,
  UNIQUE(staff_id, attendance_date)
);

-- Arrival/departure + parent access code extend existing tables.
-- NOTE: these ALTER TABLEs are NOT run from here (ALTER ADD COLUMN isn't
-- idempotent in SQLite and would error on the 2nd app launch). See the
-- runMigrations() function in lib/db/local.ts, which adds them defensively.

-- ---------- SYNC BOOKKEEPING ----------
-- Tracks pending local changes that haven't reached Supabase yet, and any
-- conflicts the sync engine couldn't auto-resolve.
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('insert','update','delete')),
  payload TEXT NOT NULL, -- JSON snapshot of the row at queue time
  created_at TEXT DEFAULT (datetime('now')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  local_payload TEXT NOT NULL,
  remote_payload TEXT NOT NULL,
  resolution TEXT DEFAULT 'pending' CHECK (resolution IN ('pending','kept_local','kept_remote','merged')),
  created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
INSERT OR IGNORE INTO sync_meta (key, value) VALUES ('last_pull_at', NULL);
INSERT OR IGNORE INTO sync_meta (key, value) VALUES ('last_push_at', NULL);
INSERT OR IGNORE INTO sync_meta (key, value) VALUES ('current_staff_id', NULL);
