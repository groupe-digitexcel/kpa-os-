# KPA-OS V2 — Master Architecture

## 1. Product definition

KPA-OS V2 is a production-grade School Operating System designed for nursery and primary schools in Cameroon and other low-connectivity environments. It must work reliably on web, Android/PWA, and Windows desktop while preserving one coherent data model.

Primary product principles:

1. Offline-first for operational continuity.
2. Cloud-first for centralized governance and multi-device synchronization.
3. Financial integrity above convenience.
4. Strong role-based authorization.
5. Bilingual FR/EN from the foundation.
6. Mobile-first daily workflows.
7. Observable, testable, recoverable production software.
8. AI assists staff; AI never silently changes authoritative records.

## 2. Target architecture

```text
                    KPA-OS V2
                         |
       +-----------------+-----------------+
       |                 |                 |
     Web/PWA          Android          Windows/Tauri
       |                 |                 |
       +-----------------+-----------------+
                         |
                 Application Services
                         |
       +-----------------+-----------------+
       |                 |                 |
   Supabase/Postgres  Offline Store    Sync Engine
   Cloud system       Local SQLite     Queue + conflicts
   of record                           + retry/backoff
       |                 |                 |
       +-----------------+-----------------+
                         |
                 Domain Modules
                         |
  Identity | Students | Academics | Attendance | Finance
  Admissions | Inventory | Communication | HR | Reports
                         |
                   Intelligence Layer
             Analytics | Alerts | AI assistance
```

## 3. Runtime separation

### Cloud/Web runtime

The Vercel deployment must not require SQLite, Tauri, or any native Node addon merely to build or render cloud pages. Cloud data access uses Supabase/Postgres.

### Local runtime

The Tauri/local-server distribution may use `better-sqlite3`. It is a deployment-specific implementation detail and must stay behind a server-only adapter boundary.

### Shared domain layer

Business rules should not know whether data came from Supabase or SQLite. They consume typed repository/service interfaces.

## 4. Data architecture

### Cloud

Supabase/Postgres is authoritative for:
- identity and staff roles;
- students and guardians;
- classes and academic structure;
- fees and payments;
- attendance and grades;
- inventory;
- documents;
- audit records;
- school configuration;
- synchronization metadata.

### Local

SQLite is a durable operational cache and offline write store. Local writes are transactional and enter a durable sync queue in the same transaction.

### Synchronization

Every syncable record uses:
- stable UUID;
- `created_at`;
- `updated_at`;
- `synced_at`;
- soft-delete marker;
- deterministic conflict identity.

Sync requirements:
- idempotent push;
- retry with bounded backoff;
- pull cursor/checkpoint;
- duplicate protection;
- explicit conflict records;
- manual resolution for financial conflicts;
- audit trail for every resolution.

## 5. Security model

Roles are enforced server-side:

- Director: school-wide administration and governance.
- Accountant: finance, reconciliation, expenses, approved reports.
- Secretary/Bursar: admissions, registration, payments, attendance administration, communication.
- Teacher: assigned classes, attendance, grades, timetable.
- Auditor: read-only oversight and audit evidence.
- Parent: own children's permitted portal data only.

Security rules:
- Never trust role values supplied by the client.
- Never expose service-role credentials to browser code.
- Every sensitive mutation creates an audit event.
- Financial operations require immutable receipt identifiers and traceable actor identity.
- Health and child-protection information is restricted to explicitly authorized roles.

## 6. Core modules for V2

### Executive command center
- enrollment;
- fee collection;
- outstanding balances;
- attendance;
- academic performance;
- staff attendance;
- expenses;
- cash variance;
- alerts;
- operational trends.

### Student 360
One profile containing:
- identity;
- guardians;
- class/history;
- attendance;
- grades;
- fee ledger;
- documents;
- incidents;
- authorized health information;
- communication history.

### Finance
- fee structures;
- payment collection;
- receipts;
- payment methods including Mobile Money/Orange Money;
- daily reconciliation;
- expenses;
- outstanding balances;
- financial audit trail;
- exports.

### Academics
- classes;
- subjects;
- timetable;
- assessments;
- gradebook;
- report cards;
- promotion/year-end processing.

### Attendance & safeguarding
- student attendance;
- arrival/departure;
- staff attendance;
- incident records;
- parent notification history;
- controlled health information.

### Admissions & CRM
- inquiries;
- visits;
- applications;
- waitlist;
- acceptance;
- enrollment conversion;
- follow-up tasks.

### Communication
- FR/EN templates;
- fee reminders;
- event messages;
- report-card notifications;
- SMS/WhatsApp-ready message workflows;
- delivery logs.

### Documents
- report cards;
- certificates;
- attestations;
- ID cards;
- badges;
- school letters;
- exports and print-ready PDFs.

### Institutional support
- sponsors;
- grants;
- commitments;
- follow-ups;
- received funds;
- evidence/audit trail.

## 7. AI layer

AI is an assistant, not the system of record.

Safe AI use cases:
- bilingual message drafting;
- report-card comment suggestions;
- administrative summaries;
- anomaly explanations;
- enrollment trend summaries;
- document drafting;
- natural-language analytics over authorized aggregate data.

AI must never silently:
- alter grades;
- post payments;
- change student identity data;
- change permissions;
- delete records;
- resolve financial conflicts.

Any AI-generated operational change requires explicit human confirmation.

## 8. UX standard

The daily experience should follow a task-first model:

- Today dashboard;
- one-tap quick actions;
- global search;
- command palette;
- clear offline indicator;
- sync status with pending count;
- visible conflict alerts;
- responsive tables/cards;
- accessible forms;
- consistent FR/EN language switching.

A staff member should be able to complete the common daily tasks on a phone without opening desktop-only menus.

## 9. Reliability targets

V2 release gates:

- zero TypeScript errors;
- zero unresolved production build errors;
- clean dependency/security audit for production dependencies;
- successful clean-database migration;
- successful upgrade migration from an existing installation;
- offline write/read test;
- interrupted-sync recovery test;
- duplicate-push test;
- conflict-resolution test;
- payment/reconciliation integrity test;
- authorization test for every sensitive role boundary;
- mobile smoke test;
- Windows desktop smoke test;
- Vercel production smoke test.

## 10. Delivery sequence

### Phase A — Foundation hardening
- isolate native SQLite from cloud build;
- establish CI;
- upgrade supported framework/runtime versions;
- introduce typed repository interfaces;
- centralize authorization;
- add automated smoke tests.

### Phase B — Data integrity
- normalize shared identifiers;
- strengthen sync protocol;
- add idempotency keys;
- add migration versioning;
- strengthen audit events.

### Phase C — Product UX
- command center;
- Student 360;
- global search;
- mobile quick actions;
- unified notifications;
- consistent bilingual UX.

### Phase D — Intelligence
- analytics;
- alerts;
- AI-assisted communication and reporting;
- controlled natural-language insights.

### Phase E — Commercial readiness
- multi-school tenancy;
- school onboarding;
- subscription/entitlement model;
- backups and recovery;
- observability;
- documentation and support workflows.

## 11. Definition of done

KPA-OS V2 is not "done" when the pages compile. It is done when a real school can operate a full working day, lose internet connectivity, continue essential work, reconnect, synchronize safely, reconcile money, produce reports, and recover from an interrupted device without losing authoritative data.
