# AGENTS.md

## MEMORY — READ FIRST
Before starting any session, read `C:\Users\taksh\Music\frd\MEMORY.md` to restore context from previous conversations. This is our shared memory — it contains project history, user preferences, and past decisions.

<!-- INSFORGE:START -->
## InsForge backend

This project uses [InsForge](https://insforge.dev): an all-in-one, open-source Postgres-based backend (BaaS) that gives this app a database, authentication, file storage, edge functions, realtime, an AI model gateway, and payments through one platform.

- **Project:** **studyforest** (API base `https://e29j97zj.us-east.insforge.app`)
- **Skills:** these InsForge skills are installed for supported coding agents. Reach for them before implementing any InsForge feature instead of guessing the API:
  - `insforge`: app code with the `@insforge/sdk` client (database CRUD, auth, storage, edge functions, realtime, AI, email, and Stripe payments).
  - `insforge-cli`: backend and infrastructure via the `insforge` CLI (projects, SQL, migrations, RLS policies, storage buckets, functions, secrets, payment setup, schedules, deploys).
  - `insforge-debug`: diagnosing failures (SDK/HTTP errors, RLS denials, auth and OAuth issues) and running security or performance audits.
  - `insforge-integrations`: wiring external auth providers (Clerk, Auth0, WorkOS, Better Auth, etc.) for JWT-based RLS, or the OKX x402 payment facilitator.
  - `find-skills`: discovering additional skills on demand.
- **Credentials:** app code reads keys from `.env.local`; the CLI reads `.insforge/project.json`. Never hardcode or commit keys.

> **Backend note:** `.env.local` currently points at **Supabase** (`VITE_SUPABASE_URL=…supabase.co`) and the app runs on `@supabase/supabase-js` directly. The InsForge sections above describe the originally-intended backend and are not yet the active path. Edge functions live under `supabase/functions/` (deployed via the Supabase CLI, see `supabase/config.toml`). If/when you migrate to InsForge, update this file and `.env.local` together.

Key patterns:

- Database inserts take an array: `insert([{ ... }])`.
- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- For storage uploads, persist both the returned `url` and `key`.
<!-- INSFORGE:END -->
