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
- Settings → Users syncs create/update/delete + roles to Keycloak; Groups are app-only
- Capacitor mobile shell (Android / iOS) for local Docker or public endpoint testing

---

## Quick Start (desktop)

### Prerequisites

- Docker Compose
- Ports **3300** (frontend), **3301** (API), **3510** (Keycloak)
- [identity-platform](https://github.com/paddyind/identity-platform) for IAM
- Firebase service account at `../identity-platform/secrets/firebase-dev.json`

### Run

```bash
# 1. Keycloak (+ optional observability)
cd ../identity-platform && docker compose up -d
# Optional: cd ../observability-platform && docker compose up -d

# 2. Library app
cd ../library-management
cp .env.example .env   # IAM_PROVIDER=keycloak, DATA_STORAGE=firebase
docker compose up -d
```

| URL | Purpose |
|-----|---------|
| http://localhost:3300 | App |
| http://localhost:3301/api | API |
| http://localhost:3300/login | Keycloak sign-in |
| http://localhost:23001 | Grafana (if observability is up) |

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

**Keycloak is not in this compose.** Onboard other apps: [identity-platform ONBOARDING](../identity-platform/docs/ONBOARDING.md).

---

## Mobile (local Docker → then public)

Photo-booth–style **local** testing: phone/tablet talks to Docker on your LAN (frontend, API, Keycloak login). Same Capacitor shell later points at **public** HTTPS for pre-external validation.

```bash
# One shot: LAN Keycloak + library + Capacitor sync
./scripts/run-mobile-local.sh

# When done with phone testing (restore localhost Keycloak hostname)
./scripts/stop-mobile-local.sh
```

| Piece | Path |
|-------|------|
| Full guide | [mobile/BUILD.md](mobile/BUILD.md) |
| Capacitor app | [`mobile/`](mobile/) |
| CI (APK + iOS sim / IPA) | [`.github/workflows/mobile-build.yml`](.github/workflows/mobile-build.yml) |

CI: Actions → **Mobile Build (APK + iOS)** → download artifacts → install on device / simulator.

---

## Docs map

| Doc | Topic |
|-----|-------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack overview |
| [DATABASE.md](DATABASE.md) / [docs/firestore_collections.md](docs/firestore_collections.md) | Data |
| [keycloak/README.md](keycloak/README.md) | IAM consumer notes |
| [OBSERVABILITY.md](OBSERVABILITY.md) | Grafana / probes |
| [mobile/BUILD.md](mobile/BUILD.md) | Android / iOS local & public |
| [TECH-MIGRATION.md](TECH-MIGRATION.md) | Supabase → Keycloak/Firestore |

---

## Useful commands

```bash
docker compose exec backend npm run db:backup
curl http://localhost:3301/api/platform/status
./scripts/lan-ip.sh
```

---

## License

UNLICENSED / private project.
