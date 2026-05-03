# Deployment Guide

## Supported Topologies

### Local development

Use locally installed MongoDB, Redis, and Qdrant or start them with Docker Compose while running the API/worker from Node.js.

### Docker Compose

Use `docker-compose.yml` for a production-like stack:

```bash
docker compose up --build -d
```

Use `docker-compose.dev.yml` for bind-mounted development:

```bash
docker compose -f docker-compose.dev.yml up --build
```

## Environment Strategy

- `.env.example` contains local defaults.
- Production compose overrides `MONGODB_URI`, `REDIS_URL`, `QDRANT_URL`, and `STORAGE_PATH` so containers use service DNS names.
- Production compose exposes only the API port; MongoDB, Redis, and Qdrant stay on the internal compose network.
- Keep secrets in your deployment platform's secret store where possible.

If you need direct host access to the backing services for local debugging, use `docker-compose.dev.yml` instead.

## Persistent Storage Requirements

Persist all of the following together:

- MongoDB data directory
- Redis append-only data if you want queue durability across restarts
- Qdrant storage directory
- uploaded files directory

If you restore only one of these, retrieval references and upload records can drift out of sync.

## Recommended Reverse Proxy Setup

Place the API behind Nginx, Caddy, Traefik, or a cloud load balancer that provides:

- TLS termination
- request body limits aligned with upload settings
- idle timeouts that allow streaming responses
- optional IP allowlisting or authentication

## Production Hardening Checklist

- Run the provided production image as-is to keep the non-root runtime user.
- Do not expose MongoDB, Redis, or Qdrant directly to the public internet.
- Restrict `ALLOWED_ORIGINS` to trusted frontend domains.
- Set `NODE_ENV=production` and a sane `LOG_LEVEL`.
- Monitor API readiness through `GET /ready`.
- Monitor deeper dependency health through `GET /api/v1/rag/rag?deep=true`.

## Scaling Notes

### API scaling

You can scale the API horizontally if all instances share:

- the same MongoDB database;
- the same Redis instance or cluster;
- the same Qdrant deployment;
- the same uploaded file storage.

### Worker scaling

Worker concurrency can be increased through `INGEST_CONCURRENCY`, and multiple workers can run in parallel against the same Redis queue.

### Qdrant sizing

As document count grows, plan capacity around:

- embedding dimensionality;
- total chunk count;
- payload size after truncation with `QDRANT_PAYLOAD_TEXT_MAX_CHARS`.

## Backup Guidance

Back up these assets together on the same schedule:

- MongoDB
- Qdrant storage
- uploaded files
- deployment manifests and environment definitions

Redis persistence is optional for backups if you can tolerate re-enqueueing transient jobs.
