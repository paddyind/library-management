# Architecture Documentation

> **v3.0.0:** Runtime is **Keycloak (OIDC) + Firebase Firestore**. SQLite remains an optional local legacy path via `DATA_STORAGE=legacy`. Migration runbook: **[TECH-MIGRATION.md](TECH-MIGRATION.md)** (archive after cutover verification).

## System Overview

```
Next.js :3300  ──OIDC──►  identity-platform Keycloak :3510  (realm: library)
      │
      └── Bearer token ──►  NestJS :3301  ──►  Firestore personal-apps-dev (library__*)
```

| Layer | Technology |
|-------|------------|
| IAM | Workspace [identity-platform](../identity-platform) — realm `library`, port **3510** |
| Data | Firebase `personal-apps-dev` / `personal-apps-prod` + `library__*` collections |
| API | NestJS — Keycloak JWKS validation (`AppAuthGuard`) + Firebase Admin SDK |
| Optional legacy | SQLite when `DATA_STORAGE=legacy` + `IAM_PROVIDER=legacy` |

## Feature flags

```env
IAM_PROVIDER=keycloak          # legacy | keycloak
DATA_STORAGE=firebase          # legacy | firebase
```

## Technology Stack

### Frontend
- **Framework**: Next.js (Pages Router)
- **Styling**: Tailwind CSS
- **Auth**: `keycloak-js` (PKCE) when `NEXT_PUBLIC_IAM_PROVIDER=keycloak`
- **HTTP**: Axios with Bearer access token

### Backend
- **Framework**: NestJS (TypeScript)
- **Data**: Firestore (primary) / SQLite (legacy)
- **Auth**: Keycloak JWT (JWKS) or legacy custom JWT
- **API docs**: Swagger at `/api-docs`

## Related docs

| Document | Role |
|----------|------|
| [TECH-MIGRATION.md](TECH-MIGRATION.md) | Migration phases 0–6 |
| [docs/firestore_collections.md](docs/firestore_collections.md) | Collection field definitions |
| [identity-platform/docs/DATA-PLATFORM.md](../identity-platform/docs/DATA-PLATFORM.md) | Shared Firestore conventions |
| [DATABASE.md](DATABASE.md) | Legacy SQLite notes + Firestore pointer |
