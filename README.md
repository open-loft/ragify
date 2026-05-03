# Ragify

[![Release](https://img.shields.io/github/v/release/open-loft/ragify?display_name=tag)](https://github.com/open-loft/ragify/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

Production-oriented Express + TypeScript backend for Ragify, a retrieval-augmented chatbot. It accepts document uploads, ingests them asynchronously through BullMQ workers, stores chunks in MongoDB and vectors in Qdrant, then answers questions through retrieval-grounded OpenAI responses streamed back to clients.

## Why this project exists

This service is designed for teams that want a simple RAG backend they can run locally, self-host with Docker, and extend safely. The repository now includes contributor-focused tooling, CI quality gates, hardened production containers, and documentation that maps directly to the current implementation.

## Features

- Streaming chat responses over HTTP using server-sent event semantics.
- Async ingestion pipeline with Redis + BullMQ for uploads and pasted text.
- Token-based chunking with configurable overlap and optional paragraph mode.
- Retrieval grounded in Qdrant with optional lightweight reranking.
- Startup config validation, upload limits, CORS allowlisting, and rate limiting.
- Structured JSON logging for request tracing and operational debugging.

## Architecture

```text
Client UI / API consumer
      |
      v
Express API (chat, upload, health, logs)
      |
      +--> MongoDB (documents, chunks, logs)
      |
      +--> Redis / BullMQ (ingestion queue)
      |
      +--> Qdrant (vector search)
      |
      +--> OpenAI API (embeddings + chat completions)
              ^
              |
         Ingestion Worker
```

Detailed diagrams and flow descriptions live in `docs/architecture.md` and `docs/operations.md`.

## Request Flow

1. A client uploads text or files to `/api/v1/upload/upload`.
2. The API stores the raw document metadata in MongoDB and enqueues an ingestion job.
3. The worker chunks the text, creates embeddings, and upserts vectors into Qdrant.
4. A client sends a question to `/api/v1/chat/message`.
5. The API embeds the query, retrieves relevant chunks, calls OpenAI with grounded context, and streams the answer.

## Prerequisites

- Node.js 20.11+ and npm 10+
- MongoDB 7.x recommended
- Redis 7.x recommended
- Qdrant 1.13.x recommended
- OpenAI API key with access to embeddings and chat models
- Docker Desktop or Docker Engine + Compose (optional, for containerized setup)

## Quick Start (local)

1. Clone and install dependencies:

```bash
git clone https://github.com/open-loft/ragify.git
cd ragify/server
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Set at least the required values in `.env`:

```dotenv
OPENAI_API_KEY=your-key
MONGODB_URI=mongodb://localhost:27017/rag-chatbot
REDIS_URL=redis://localhost:6379/0
QDRANT_URL=http://localhost:6333
```

4. Start infrastructure (locally or via Docker Compose).

5. Run the API and worker in separate terminals:

```bash
npm run dev
npm run worker:ts
```

6. Verify health:

```bash
curl http://localhost:8000/
curl http://localhost:8000/ready
```

## Docker Setup

Production-style stack:

```bash
docker compose up --build
```

Development stack with bind mounts:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Notes:

- The production compose file overrides service URLs so containers talk to `mongo`, `redis`, and `qdrant` correctly even if your local `.env` uses `localhost`.
- The production compose file only publishes the API on `8000`; MongoDB, Redis, and Qdrant stay private to the compose network by default.
- Uploaded files live in `/app/uploads` in containers and are backed by a persistent volume in production compose.
- The production image runs as a non-root `node` user.
- Use `docker-compose.dev.yml` if you need direct host access to MongoDB, Redis, or Qdrant during development.

## Environment Variables

All supported variables are documented in `.env.example`. The most important groups are:

- **Core runtime**: `PORT`, `NODE_ENV`, `LOG_LEVEL`, `MONGODB_URI`, `REDIS_URL`, `QDRANT_URL`, `OPENAI_API_KEY`
- **Model selection**: `EMBEDDING_MODEL`, `LLM_MODEL`, `ALLOWED_EXTERNAL_SEARCH_SOURCES`
- **API hardening**: `ALLOWED_ORIGINS`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`, `REQUEST_BODY_LIMIT_BYTES`
- **Upload limits**: `UPLOAD_MAX_FILE_SIZE_BYTES`, `UPLOAD_MAX_FILES`, `UPLOAD_ALLOWED_MIME_TYPES`, `UPLOAD_ALLOWED_EXTENSIONS`
- **RAG tuning**: `RAG_TOP_K`, `RAG_RERANK_ENABLED`, `RAG_RERANK_TOP_N`, `CHUNK_MAX_TOKENS`, `CHUNK_OVERLAP_TOKENS`

See `docs/deployment.md` for recommended environment profiles.

## API Overview

- `GET /` - liveness check
- `GET /ready` - readiness check for MongoDB and Redis
- `GET /api/v1/rag/rag?deep=true` - deep RAG dependency verification
- `POST /api/v1/upload/upload` - upload files or send a `text` field for ingestion
- `POST /api/v1/chat/message` - stream a grounded response
- `GET /api/v1/logs/logs` - inspect stored logs

Copy-paste request examples live in `docs/api-examples.md`.

## Worker and Queue Model

- Uploads are acknowledged by the API once the document is stored and the job is queued.
- BullMQ handles retries with exponential backoff.
- The worker is horizontally scalable as long as services share the same Redis, MongoDB, and Qdrant instances.
- Job IDs are deterministic per document (`ingest:<docId>`) to reduce duplicate ingestion.

## Quality Gates

This repository now ships with:

- ESLint + Prettier configuration
- Husky + lint-staged pre-commit validation
- GitHub Actions CI for format, lint, build, test, and security audit
- Dependabot for dependency maintenance
- issue / PR templates and security reporting guidance

Core local commands:

```bash
npm run lint
npm run format:check
npm run build
npm run test
npm run audit:security
```

## Container and Self-Hosting Notes

- Place the API behind a reverse proxy with TLS termination.
- Restrict CORS to trusted UI origins.
- Keep Redis, MongoDB, and Qdrant off the public internet when possible.
- Back up MongoDB, Qdrant storage, and uploaded files together.
- Rotate log files externally if you deploy long-lived containers.

More guidance: `docs/deployment.md` and `docs/troubleshooting.md`.

## Support Matrix

- Node.js: 20.11+
- npm: 10+
- MongoDB: 7.x recommended
- Redis: 7.x recommended
- Qdrant: 1.13.x recommended

## Known Limitations

- File ingestion currently supports text-based formats only.
- Chat streaming uses raw response writes rather than typed SSE event envelopes.
- There is no built-in authentication/authorization layer yet.
- Retrieval quality depends on the configured OpenAI embedding and chat models.

## Roadmap

- Add richer document parsers (PDF/HTML) behind explicit content extraction stages.
- Add authenticated multi-tenant document scopes.
- Expand test coverage around ingestion and streaming edge cases.
- Add observability integrations for metrics and tracing.

## Contributing

See `CONTRIBUTING.md` for local workflow, checks, and review expectations.

## License

This project is released under the MIT License. See `LICENSE`.
