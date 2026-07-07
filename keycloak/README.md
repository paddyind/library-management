# Keycloak (moved)

IAM is provided by the **workspace shared** [identity-platform](../../identity-platform) stack (port **3510**), not this repo.

| Item | Location |
|------|----------|
| Keycloak Docker compose | `identity-platform/docker-compose.yml` |
| Library realm import | `identity-platform/realms/library-realm.json` |
| Setup / recreate | `identity-platform/docs/ARCHITECTURE.md` |
| Library migration phases | [TECH-MIGRATION.md](../TECH-MIGRATION.md) |

Start shared Keycloak:

```bash
cd ../identity-platform && docker compose up -d
```
