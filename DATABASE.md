# Database Guide (v3.0.0)

## Primary: Firebase Firestore

Shared workspace project with app prefix:

```env
FIREBASE_PROJECT_ID=personal-apps-dev
APP_FIRESTORE_PREFIX=library
GOOGLE_APPLICATION_CREDENTIALS=../identity-platform/secrets/firebase-dev.json
DATA_STORAGE=firebase
```

Collections: `library__profiles`, `library__books`, `library__transactions`, …  
Schema: [docs/firestore_collections.md](docs/firestore_collections.md)  
Platform: [identity-platform/docs/DATA-PLATFORM.md](../identity-platform/docs/DATA-PLATFORM.md)

### Seed / migrate

```bash
docker compose exec backend npm run db:seed:firestore
docker compose exec backend npm run db:backup
docker compose exec backend npm run migrate:keycloak-firestore -- --dry-run
```

## Legacy: SQLite

Optional when `DATA_STORAGE=legacy` (local/dev only).

```bash
SQLITE_PATH=./data/library.sqlite
# Schema reference: data/schema/sqlite_complete_schema.sql
```

## Archived: Supabase

Supabase Postgres/Auth was removed in **Phase 6**. Schema archived at:

`data/schema/legacy/supabase_complete_schema.sql`

Do not configure `NEXT_PUBLIC_SUPABASE_*` — those variables are no longer used.
