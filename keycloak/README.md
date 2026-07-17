# Keycloak (external — do not run here)

IAM is provided only by the workspace **[identity-platform](../../identity-platform)** stack (port **3510**).

This app is a **consumer**: realm `library`, clients `library-frontend` / `library-backend`.  
There is **no** Keycloak service in this repo’s `docker-compose.yml`.

| Item | Location |
|------|----------|
| Shared Keycloak compose | `identity-platform/docker-compose.yml` |
| Library realm | `identity-platform/realms/library-realm.json` |
| **Onboard another app** | [identity-platform/docs/ONBOARDING.md](../../identity-platform/docs/ONBOARDING.md) |
| Architecture | [identity-platform/docs/ARCHITECTURE.md](../../identity-platform/docs/ARCHITECTURE.md) |

```bash
cd ../identity-platform && docker compose up -d
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3510/realms/library
```

If Docker Desktop still lists `library-management-keycloak*`, remove orphans:

```bash
cd ../library-management
docker compose up -d --remove-orphans
```
