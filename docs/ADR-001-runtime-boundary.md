# ADR-001 — Runtime Boundary for KPA-OS

## Decision

KPA-OS uses **Node 20 LTS** as the controlled application runtime while the V2 architecture is stabilized.

The web/PWA deployment is treated as the cloud application. The Tauri desktop application owns the local-first SQLite runtime. Native SQLite access must not become a browser/client concern.

## Why

The current application contains `better-sqlite3`, a native Node addon, because the Windows desktop build needs a durable offline database. The previous deployment failure occurred during production generation when the native module was loaded under an unsuitable Node runtime.

We will therefore:

1. Pin CI and Vercel-compatible development to Node 20 LTS.
2. Keep SQLite access behind server-only/local-runtime boundaries.
3. Never import `better-sqlite3` from client components.
4. Treat Supabase/PostgreSQL as the authoritative cloud data store.
5. Treat local SQLite as an offline operational replica, not a second independent source of truth.
6. Keep financial/reconciliation conflicts human-resolvable.

## Migration rule

Do **not** remove SQLite merely to make Vercel build. Offline desktop operation is a core product capability. Instead, isolate the native dependency and make the deployment boundary explicit.

## Next architecture gate

Before the V2 branch is merged to `main`, CI must prove:

- TypeScript passes.
- Production build passes under Node 20.
- No client bundle imports native SQLite.
- Local schema and migrations are repeatable.
- Sync conflict handling remains deterministic.
- Secrets are never exposed to client code.

## Future upgrade

After the application is stable on the controlled runtime, upgrade Next.js in a separate migration with its own CI gate. Framework modernization must not be mixed with the database/runtime migration.
