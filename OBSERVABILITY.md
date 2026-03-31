# Observability for library-management

## Baseline (works without code changes)
The shared `observability-platform` stack monitors service health via **blackbox probes**, container health via **cAdvisor**, and **container logs** via **Promtail → Loki** (no app code).

No `/metrics` or OTLP instrumentation is required for this baseline. Filter logs in Grafana with LogQL, e.g. `{container=~"library-management-.*"}`. Default Docker host ports: UI **`3300`**, API **`3301`** (`LIBRARY_HOST_*` in `.env`).

## What you already have
`library-management/docker-compose.yml` was updated to attach containers to the shared Docker network `obs_net` and to include OpenTelemetry env vars (for traces/logs if the app is instrumented).

## How to verify
1. Start `observability-platform` (Grafana `http://localhost:23001`; see `observability-platform/docs/ARCHITECTURE.md`).
2. Start `library-management` with Docker Compose.
3. In Grafana, open **Service Health, Latency, Error Rate** and check for:
   - `library-management-backend`
   - `library-management-frontend`

## Next level (distributed traces + OTLP logs)
**Promtail** already provides container logs in Loki. For trace IDs in logs and Tempo **distributed traces**, the app must emit OTLP telemetry (compose env vars are not enough without instrumentation).

