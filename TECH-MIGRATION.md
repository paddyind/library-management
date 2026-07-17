# Technical Migration: Keycloak + Firebase (v3.0.0)

> **Temporary document:** Keep this file in the repo until **all phases (0–6) are complete** and v3.0.0 is released. Then remove it (or archive off-repo). It is the single runbook for multi-iteration migration work.
>
> **Status:** Phase 1.5 — workspace **identity-platform** (shared Keycloak); library is first consumer  
> **Workspace IAM:** [identity-platform](../identity-platform) — port **3510**, realm-per-app  
> **Workspace data:** Firebase `personal-apps-dev` + `library__*` collections — see [DATA-PLATFORM.md](../identity-platform/docs/DATA-PLATFORM.md)

---

## Phase progress tracker

| Phase | Name | Status | App impact |
|-------|------|--------|------------|
| **0** | Documentation | ✅ Complete | None |
| **1** | Keycloak (library-local :3310) | ✅ Superseded | Removed from library compose |
| **1.5** | Workspace identity-platform (:3510) | ✅ **Complete** | None — shared IAM stack |
| **2** | Firebase + NestJS (`library__*`) | ✅ Complete | None until `DATA_STORAGE=firebase` |
| **3** | Migrate backups | ✅ Complete | None — opt-in migration script |
| **4** | Backend cutover (flags) | ✅ Complete | `IAM_PROVIDER=keycloak` + `DATA_STORAGE=firebase` |
| **5** | Frontend OIDC | ✅ Complete | Keycloak login when flags enabled |
| **6** | Decommission Supabase | ✅ Complete | Supabase removed; Firestore + Keycloak are runtime |

**Last updated:** 2026-07-17 — Phase 6 complete; v3.0.0 cutover

> **Resume here:** [identity-platform/STATUS.md](../identity-platform/STATUS.md) · [SETUP-VALIDATION.md](../identity-platform/docs/SETUP-VALIDATION.md)

---

## Decisions (confirmed)

| # | Topic | Decision |
|---|--------|----------|
| 1 | Password migration | **A — Force password reset** after user import into Keycloak |
| 2 | Firebase | **SaaS from day 1** — workspace projects `personal-apps-dev` / `personal-apps-prod` + `APP_FIRESTORE_PREFIX` per app |
| 3 | Data path during migration | **Option B — Separate paths** until explicit cutover (no dual-write); fallback to legacy Supabase/SQLite via flags |
| 4 | Registration | **Self-service** — users register and log in through Keycloak (OIDC) |
| 5 | Keycloak | **3510** — workspace `identity-platform`; **realm per app** (local: 1 server; prod: may split per app) |
| 6 | IAM isolation | **Realm per app** — never mix apps in one realm; extra clients only within same app realm |

---

## Workspace platform strategy (brainstorm → adopted)

Same pattern as **observability-platform**: one shared stack on Docker Desktop, many apps as consumers.

| Platform | Repo | Port block | Purpose |
|----------|------|------------|---------|
| observability-platform | `observability-platform/` | 230xx | Logs, metrics, traces |
| **identity-platform** | `identity-platform/` | **350x** | Keycloak IAM (all apps) |
| **Firebase SaaS** | Google Cloud | — | Shared Firestore per env (`personal-apps-dev` / `-prod`) |

### IAM: one Keycloak (local), realm per app — confirmed

```
identity-platform :3510     ← one Keycloak on Docker Desktop
├── realm library           ← library-management only
├── realm portfolio         ← my-portfolio (planned)
├── realm campus            ← campus-circle (planned)
└── realm photobooth        ← photo-booth (planned)
```

- **Local:** one Keycloak, **separate realm per app** — no role collision across apps.
- **Avoid:** one realm with all apps as clients only.
- **Avoid:** one Keycloak container per app on Docker Desktop.
- **Production:** shared Keycloak with many realms **or** standalone Keycloak per app (import single realm JSON) — [ARCHITECTURE.md](../identity-platform/docs/ARCHITECTURE.md#local-vs-production-deployment).
- **Same app, multiple clients:** e.g. `library-frontend` + `library-mobile` in realm `library` only.

**Handoff:** [identity-platform/STATUS.md](../identity-platform/STATUS.md)

### Data: one Firebase project per env, prefix per app

Firestore has no SQL schemas. Use **`{appId}__{collection}`**:

- `library__books`, `library__transactions`, …
- `portfolio__learnings`, …

Campus-circle may **keep Postgres** for tenant schemas; IAM still uses realm `campus` when integrated.

### What stays per-app

- Docker compose (330x, 340x, …)
- Legacy Supabase/SQLite until that app's Phase 6
- `TECH-MIGRATION.md` in library-management (remove when v3.0.0 done)

Docs: [identity-platform/docs/ARCHITECTURE.md](../identity-platform/docs/ARCHITECTURE.md), [DATA-PLATFORM.md](../identity-platform/docs/DATA-PLATFORM.md).

---

## Goals

- Decommission **Supabase** (auth + Postgres) after successful cutover
- Move IAM to **Keycloak** (Docker Desktop, realm `library`)
- Move application data to **Firebase Firestore** (Google SaaS)
- Reuse existing **JSON backups** (`backend/backups/sqlite/`, `backend/backups/supabase/`) for migration
- Keep the app running on **Supabase/SQLite** throughout Phases 1–5

## Non-goals (Phase 0)

- No Docker Compose changes yet
- No NestJS or frontend auth refactors yet
- No Supabase removal

---

## Architecture

### Current (v2.x)

```
Next.js :3300  →  NestJS :3301  →  Supabase (primary) / SQLite (fallback)
                      ↑
              Custom JWT (JWT_SECRET)
              POST /api/auth/login
```

### Target (v3.0)

```
Next.js :3300  ──OIDC──►  identity-platform Keycloak :3510  (realm: library)
      │
      └── Bearer token ──►  NestJS :3301  ──►  Firestore personal-apps-dev
                                              (collections: library__*)
```

| Layer | Keycloak | Firestore |
|-------|----------|-----------|
| Email / password | Yes | No |
| Sessions | Yes | No |
| Roles (`admin`, `librarian`, `member`) | Realm roles (source of truth) | Optional mirror for queries |
| Profile (phone, address, preferences) | Minimal attributes | `profiles/{keycloakSub}` |
| Books, transactions, ratings, reviews, groups, etc. | No | Domain collections |

### OIDC and JWKS

- **OIDC (frontend):** User is redirected to Keycloak login → receives access token → frontend sends `Authorization: Bearer <token>` to NestJS.
- **JWKS (backend):** NestJS validates the token signature using Keycloak’s public keys:
  `http://localhost:3510/realms/library/protocol/openid-connect/certs`

Self-service registration is enabled on the Keycloak realm (`registrationAllowed: true`); new users receive the default `member` realm role.

---

## Port map

| Service | Host port | Container port | Notes |
|---------|-----------|----------------|-------|
| Frontend (Next.js) | 3300 | 3000 | Unchanged |
| Backend (NestJS) | 3301 | 4000 | Unchanged |
| Keycloak (identity-platform) | **3510** | 8080 | Shared workspace IAM |
| Keycloak DB | — | 5432 | `identity-platform` internal |

---

## Firebase SaaS: workspace data platform

**Adopted model:** one Firebase project per **environment**, collection **prefix per app** (`library__*`).

| Project | Purpose |
|---------|---------|
| `personal-apps-dev` | All workspace apps — development |
| `personal-apps-prod` | All workspace apps — production |

Full conventions, cost, campus-circle hybrid, recreate: **[identity-platform/docs/DATA-PLATFORM.md](../identity-platform/docs/DATA-PLATFORM.md)**.

### Setup checklist (before Phase 2)

| Step | Item | Status (2026-07-08) |
|------|------|---------------------|
| A1–A5 | Keycloak running, realm `library`, default `member` role | ✅ Verified |
| A6–A8 | Test user / token (optional) | ✅ User exists; token test manual |
| B1 | Firebase project `personal-apps-dev` | ✅ |
| B2 | Firestore enabled in console | ⏳ **You confirm in console** |
| B3 | Service account → `identity-platform/secrets/firebase-dev.json` | ✅ |
| B4 | Library `.env` + Docker mount | ✅ |
| B7 | Publish `firestore.rules` in console | ⏳ **Manual** |

Full commands: [identity-platform/docs/SETUP-VALIDATION.md](../identity-platform/docs/SETUP-VALIDATION.md)

---

## Feature flags (introduced in Phase 4)

```env
# Legacy (unchanged during migration)
AUTH_STORAGE=auto              # auto | supabase | sqlite

# New
IAM_PROVIDER=legacy            # legacy | keycloak
DATA_STORAGE=legacy            # legacy | firebase
```

| IAM_PROVIDER | DATA_STORAGE | Behaviour |
|--------------|--------------|-----------|
| `legacy` | `legacy` | **Current behaviour** — Supabase/SQLite + custom JWT |
| `keycloak` | `legacy` | Keycloak login; data still in Supabase/SQLite (Phase 4 testing) |
| `legacy` | `firebase` | Not supported long term |
| `keycloak` | `firebase` | **Target** — full cutover |

**Option B (no dual-write):** When `DATA_STORAGE=firebase`, all reads/writes go to Firestore only. When `legacy`, all go to Supabase/SQLite. No automatic sync between them except the one-time migration script (Phase 3).

**Rollback:** Set both flags back to `legacy` and restart backend.

---

## Password migration (decision A)

Imported users from JSON backups are created in Keycloak **without** portable passwords.

1. Migration script creates Keycloak users with `emailVerified: false` and `requiredActions: [UPDATE_PASSWORD]`.
2. User receives Keycloak “set password” / reset email (SMTP must be configured on Keycloak).
3. Until password is set, user cannot complete login.

Demo users (`demo_*@library.com`, `is_demo = true`) are **not** imported; recreate via seed + Keycloak dev realm or manual admin user.

---

## Data migration source

| Source | Location |
|--------|----------|
| SQLite backup | `backend/backups/sqlite/sqlite-backup-*.json` |
| Supabase backup | `backend/backups/supabase/supabase-backup-*.json` |
| Live SQLite | `data/library.sqlite` |

**Create backup before any migration work:**

```bash
docker compose exec backend npm run db:backup
```

### ID mapping

- Legacy `users.id` (UUID/TEXT) → Keycloak `sub` (new canonical user id)
- Migration script maintains `idMap: { oldId → keycloakSub }`
- All foreign keys (`memberId`, `owner_id`, `approvedBy`, …) rewritten during Firestore import

### Firestore collections (library prefix)

| Legacy table | Firestore collection |
|--------------|---------------------|
| users (profile) | `library__profiles/{keycloakSub}` |
| books | `library__books/{bookId}` |
| transactions | `library__transactions/{id}` |
| ratings | `library__ratings/{id}` |
| reviews | `library__reviews/{id}` |
| groups | `library__groups/{id}` |
| group_members | `library__groupMembers/{id}` |
| reservations | `library__reservations/{id}` |
| notifications | `library__notifications/{id}` |
| book_requests | `library__bookRequests/{id}` |
| subscriptions | `library__subscriptions/{id}` |

Detailed schema: to be added under `data/schema/` in Phase 2.

---

## Phased plan

### Phase 0 — Documentation ✅ Complete

- [x] `TECH-MIGRATION.md` created
- [x] `ARCHITECTURE.md` migration banner
- [x] `.env.example` placeholders
- [x] `CHANGELOG.md` Unreleased v3.0.0 entry
- [x] `README.md` pointer

**Exit:** No runtime changes; decisions recorded.

### Phase 1 — Keycloak in library compose ✅ Superseded

Library-local Keycloak on port 3310 was implemented then **moved** to workspace `identity-platform`. Library `docker-compose.yml` no longer runs Keycloak.

### Phase 1.5 — Workspace identity-platform ✅ Complete

- [x] New repo `../identity-platform` (compose, realms, docs)
- [x] Keycloak **3510** + Postgres volume `identity-platform-keycloak-db-data`
- [x] `realms/library-realm.json` (canonical copy)
- [x] `docs/realm-template.json.example` for future apps
- [x] Docs: `ARCHITECTURE.md`, `DATA-PLATFORM.md`
- [x] Library compose decommissioned Keycloak services
- [x] Library `.env.example` → `KEYCLOAK_URL=http://localhost:3510`

**Exit:** `cd ../identity-platform && docker compose up -d` → http://localhost:3510, realm `library`.

**Migrate from library-local Keycloak (if you used 3310):**

```bash
# Stop old library Keycloak
cd library-management && docker compose down keycloak keycloak-db 2>/dev/null || true
docker volume rm library-management-keycloak-db-data 2>/dev/null || true

# Start shared platform
cd ../identity-platform && docker compose up -d
```

### Phase 2 — Firebase Firestore (workspace + library) ✅ Complete

- [x] `FirebaseModule` + `FirestoreService` in NestJS (Admin SDK)
- [x] `APP_FIRESTORE_PREFIX=library` → `library__*` collections
- [x] `docs/firestore_collections.md` (library field definitions)
- [x] Firestore rules: `identity-platform/firestore/firestore.rules` (deny client SDK)
- [x] Seed script: `npm run db:seed:firestore`
- [x] `GET /api/platform/status` — Firestore connectivity diagnostic
- [x] Books CRUD via existing `/api/books` when `DATA_STORAGE=firebase`

**Exit:** Backend CRUD for `library__books` against `personal-apps-dev`. ✅ Verified 2026-07-08.

**Try Firestore mode (dev):**

```bash
# In library-management/.env
DATA_STORAGE=firebase

docker compose up -d --force-recreate backend
docker compose exec backend npm run db:seed:firestore
curl http://localhost:3301/api/platform/status
curl http://localhost:3301/api/books
```

### Phase 3 — Migrate backups ✅ Complete

- [x] `data/scripts/export-backup.ts` — JSON export from SQLite/Supabase (`npm run db:backup`)
- [x] `data/scripts/migrate-to-keycloak-firestore.ts` — Keycloak users + Firestore upserts
- [x] `--dry-run` mode
- [x] Idempotent upserts (re-run safe)
- [x] Report: `backend/backups/migration-report-{timestamp}.json`
- [x] Demo users skipped; books owned by demo users reassigned to first real admin
- [x] `KEYCLOAK_INTERNAL_URL` in Docker compose (backend → `host.docker.internal:3510`)

**Exit:** Dev Firebase + Keycloak match backup manifest counts. ✅ Verified 2026-07-08.

**Run migration:**

```bash
# 1. Export backup (optional — script falls back to live SQLite)
docker compose exec backend npm run db:backup

# 2. Dry run
docker compose exec backend npm run migrate:keycloak-firestore -- --dry-run

# 3. Live migration
docker compose exec backend npm run migrate:keycloak-firestore

# Report written to backend/backups/migration-report-*.json
```

**Expected skips:** `group_members` referencing demo-only users are not imported (recreate groups after Phase 5 or re-seed demo users in Keycloak manually).

### Phase 4 — Backend cutover (behind flags) ✅ Complete

- [x] `KeycloakTokenService` + `KeycloakAuthGuard` (JWKS validation)
- [x] `AppAuthGuard` — routes to Keycloak or legacy JWT based on `IAM_PROVIDER`
- [x] All controllers use `AppAuthGuard` (replaces mixed JWT/Supabase guards)
- [x] `MembersService` Firestore profiles + `ensureKeycloakProfile()`
- [x] `TransactionsFirestoreService` — borrow/return/renew/approve on Firestore
- [x] `BooksService` Firestore CRUD (Phase 2)
- [x] Legacy `/api/auth/login|register` returns 410 when `IAM_PROVIDER=keycloak`

**Exit:** Backend accepts Keycloak tokens + Firestore data when both flags enabled.

### Phase 5 — Frontend OIDC ✅ Complete

- [x] `keycloak-js` adapter (`src/lib/keycloak.js`)
- [x] `AuthContext` — Keycloak SSO when `NEXT_PUBLIC_IAM_PROVIDER=keycloak`
- [x] Login page — “Sign in with Keycloak” + PKCE
- [x] Register page — redirects to Keycloak self-registration
- [x] Logout — Keycloak session end
- [x] Docker compose passes `NEXT_PUBLIC_KEYCLOAK_*` env vars

**Exit:** End-to-end login via Keycloak; API calls use Keycloak access token.

**Enable full stack (dev):**

```env
# library-management/.env
IAM_PROVIDER=keycloak
DATA_STORAGE=firebase
```

```bash
docker compose up -d --force-recreate backend frontend
# Open http://localhost:3300/login → Sign in with Keycloak
```

### Phase 6 — Decommission Supabase ✅ Complete

- [x] Removed `@supabase/supabase-js`, `SupabaseModule`, `AUTH_STORAGE`
- [x] All Nest services use Firestore (`DATA_STORAGE=firebase`) or SQLite (`legacy`)
- [x] Archived schema: `data/schema/legacy/supabase_complete_schema.sql`
- [x] Updated `ARCHITECTURE.md`, `DATABASE.md`, `.env.example`
- [x] Released **v3.0.0** in `CHANGELOG.md`

**Exit:** App runs without Supabase credentials. ✅ Verified 2026-07-17.

---

## Decommission checklist (Phase 6)

- [ ] Migration report verified (user/book/transaction counts)
- [ ] Full regression: register, login, borrow, return, rate, review, admin approve
- [ ] Password reset flow tested (decision A)
- [ ] Prod Firebase project + Keycloak realm configured
- [ ] `IAM_PROVIDER=keycloak` and `DATA_STORAGE=firebase` in prod `.env`
- [ ] Legacy backups archived
- [ ] Supabase project cancelled (optional, after retention period)

---

## Rollback

At any time before Phase 6:

```env
IAM_PROVIDER=legacy
DATA_STORAGE=legacy
AUTH_STORAGE=auto
```

Restart backend and frontend. No Firestore data is read when `DATA_STORAGE=legacy`.

---

## Related documentation

| Document | Role during migration |
|----------|----------------------|
| [TECH-MIGRATION.md](TECH-MIGRATION.md) | This file — library-specific runbook (remove after v3.0.0) |
| [identity-platform](https://github.com/paddyind/identity-platform) | Workspace IAM — `STATUS.md` for pause/resume |
| [identity-platform/docs/ARCHITECTURE.md](../identity-platform/docs/ARCHITECTURE.md) | Keycloak setup / recreate |
| [identity-platform/docs/DATA-PLATFORM.md](../identity-platform/docs/DATA-PLATFORM.md) | Firestore conventions |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Current + target architecture |
| [DATABASE.md](DATABASE.md) | Legacy Supabase/SQLite until Phase 6 |
| [CHANGELOG.md](CHANGELOG.md) | v3.0.0 tracking |
| [.env.example](.env.example) | All env vars including new placeholders |

---

## Status log

| Date | Phase | Notes |
|------|-------|-------|
| 2026-06-05 | 0 | Decisions confirmed; Phase 0 docs created |
| 2026-06-05 | 1 | Keycloak in library compose (later superseded) |
| 2026-06-05 | 1.5 | Workspace identity-platform; shared IAM + Firestore conventions |

---

## External setup runbooks

Use these sections to **create or recreate** external dependencies from scratch. No need to remember one-off steps from chat history.

---

### External setup: Keycloak (identity-platform)

> **Canonical runbook:** [identity-platform/docs/ARCHITECTURE.md](../identity-platform/docs/ARCHITECTURE.md)  
> Library realm: `identity-platform/realms/library-realm.json`

#### Quick start (library app)

```bash
cd identity-platform
cp .env.example .env
docker compose up -d
```

| Item | URL / value |
|------|-------------|
| Admin console | http://localhost:3510 (`admin` / `admin`) |
| Library realm OIDC | http://localhost:3510/realms/library |
| JWKS | http://localhost:3510/realms/library/protocol/openid-connect/certs |

#### After fresh volume — assign default `member` role

Admin → realm **library** → Realm roles → **Default roles** → assign **member**.

#### Recreate IAM from scratch

```bash
cd identity-platform
docker compose down
docker volume rm identity-platform-keycloak-db-data
docker compose up -d
```

Re-assign default roles; re-imports all `realms/*-realm.json`.

#### Migrate off library-local Keycloak (port 3310)

```bash
cd library-management
docker compose down keycloak keycloak-db 2>/dev/null || true
docker volume rm library-management-keycloak-db-data 2>/dev/null || true
cd ../identity-platform && docker compose up -d
```

---

### External setup: Firebase (identity-platform data conventions)

> **Canonical runbook:** [identity-platform/docs/DATA-PLATFORM.md](../identity-platform/docs/DATA-PLATFORM.md)

Create **`personal-apps-dev`** before library Phase 2. Library uses prefix `library__*`.

---

### External setup: Legacy Supabase/SQLite (unchanged)

The main app still uses Supabase/SQLite until Phase 6:

- [DATABASE.md](DATABASE.md)
- [README.md](README.md) Quick Start
