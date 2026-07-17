# Library Management System

A modern, full-stack library management system with **anonymous book browsing** and administrative features. Built with Next.js, NestJS, Docker, **Keycloak**, and **Firebase Firestore**.

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/paddyind/library-management)

> **v3.0.0:** Keycloak (OIDC) + Firebase Firestore. See [CHANGELOG.md](CHANGELOG.md) and [TECH-MIGRATION.md](TECH-MIGRATION.md).

---

## Features

- Anonymous book browsing and search
- Member borrow / return / renew flows
- Reviews and ratings with admin approval
- Groups, reservations, book requests
- Role-based access (`admin`, `librarian`, `member`) via Keycloak realm roles

---

## Quick Start

### Prerequisites

- Docker Compose
- Ports **3300** (frontend), **3301** (API), **3510** (Keycloak)
- [identity-platform](https://github.com/paddyind/identity-platform) for IAM
- Firebase `personal-apps-dev` service account at `../identity-platform/secrets/firebase-dev.json`

### Run

```bash
# 1. Keycloak
cd ../identity-platform && docker compose up -d

# 2. Library app
cd ../library-management
cp .env.example .env
# Set IAM_PROVIDER=keycloak and DATA_STORAGE=firebase (see .env.example)

docker compose up -d
```

- App: http://localhost:3300  
- API: http://localhost:3301/api  
- Login: http://localhost:3300/login → **Sign in with Keycloak**  
- Status: http://localhost:3301/api/platform/status  

```bash
# Optional Firestore seed
docker compose exec backend npm run db:seed:firestore
```

---

## Architecture

```
Next.js :3300 ──OIDC──► Keycloak :3510 (realm library)   ← identity-platform only
      │
      └── Bearer ──► NestJS :3301 ──► Firestore (library__*)
```

| Flag | Values | Purpose |
|------|--------|---------|
| `IAM_PROVIDER` | `keycloak` \| `legacy` | OIDC vs custom JWT |
| `DATA_STORAGE` | `firebase` \| `legacy` | Firestore vs SQLite |

**Keycloak is not part of this compose.** Shared IAM: [identity-platform](https://github.com/paddyind/identity-platform) · onboard other apps: [ONBOARDING.md](../identity-platform/docs/ONBOARDING.md)

Docs: [ARCHITECTURE.md](ARCHITECTURE.md) · [DATABASE.md](DATABASE.md) · [docs/firestore_collections.md](docs/firestore_collections.md) · [keycloak/README.md](keycloak/README.md)

---

## Useful commands

```bash
docker compose exec backend npm run db:backup
docker compose exec backend npm run migrate:keycloak-firestore -- --dry-run
docker compose exec backend npm run migrate:keycloak-firestore
curl http://localhost:3301/api/platform/status
```

---

## License

UNLICENSED / private project.
