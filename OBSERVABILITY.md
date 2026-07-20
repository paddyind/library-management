# Observability for library-management

Shared stack: **observability-platform** (`obs_net`). Start it before library / identity if you want Grafana probes.

## Baseline (no app code)

| Signal | Where |
|--------|-------|
| HTTP up / latency | Grafana → **Service Health** (`library-management-*`, `identity-platform-*`) |
| CPU / memory | **Container CPU, Memory, Restarts** |
| Logs | `{container=~"library-management-.*|identity-platform-.*"}` |

## Bring-up

```bash
cd ../observability-platform && docker compose up -d
cd ../identity-platform && docker compose up -d
cd ../library-management && docker compose up -d
```

| Tool | URL |
|------|-----|
| Grafana | http://localhost:23001 (`admin` / `admin`) |
| Prometheus | http://localhost:23090 |

Keycloak metrics/health: see [identity-platform/OBSERVABILITY.md](../identity-platform/OBSERVABILITY.md).

## Mobile note

Local phone testing uses LAN URLs (`scripts/run-mobile-local.sh`). Observability still scrapes **container DNS** on `obs_net` (unchanged). Host Grafana stays on localhost.

## Traces (optional)

Compose sets OTEL env vars; Nest/Next need SDK instrumentation for Tempo traces. Promtail already ships container logs.
