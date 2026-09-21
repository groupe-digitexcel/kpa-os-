# KPA-OS Engineering Rules

## Product goal
KPA-OS is an offline-first, bilingual (FR/EN) school operating system. Production reliability, data integrity, security, and low-connectivity usability take priority over adding isolated features.

## Architecture boundaries
- Supabase/Postgres is the cloud system of record.
- Local SQLite is used only by the offline desktop/local-server runtime.
- Never make browser/client code depend directly on native Node modules.
- Keep local database adapters behind a server-only boundary.
- Cloud routes must remain deployable on Vercel without requiring a native SQLite runtime at build time.

## Data integrity
- Financial records are append-oriented and auditable.
- Never silently overwrite a synchronization conflict.
- Every syncable entity needs stable IDs, timestamps, soft-delete semantics, and explicit conflict handling.
- Permission checks belong server-side; UI hiding is not authorization.

## Next.js
- Prefer Server Components for data reads and Client Components only for interactive UI.
- Do not pass non-serializable values across Server/Client boundaries.
- Keep Node-only APIs out of Edge/browser code.
- Use the Node.js runtime for routes that require Node APIs.
- Treat build warnings and security advisories as release blockers when they affect production safety.

## UX
- Mobile-first for daily staff workflows.
- FR/EN must be first-class; do not hard-code user-facing strings when they belong in shared copy/i18n structures.
- Common actions should be reachable in one or two taps.
- Forms must preserve entered data when validation fails.
- Loading, empty, offline, permission-denied, and error states are part of the feature—not afterthoughts.

## Quality gate
Before production release:
1. Type-check.
2. Lint/static analysis.
3. Production build.
4. Exercise critical auth, payment, attendance, sync, and reporting flows.
5. Verify database migrations from a clean database and an existing database.
6. Verify the Vercel build does not require local-only native modules.

## Change discipline
- Prefer small, reversible commits.
- Do not rewrite working business logic merely for style.
- When changing schema, update both cloud and local representations plus migrations/tests.
- Document architectural decisions in `docs/`.
