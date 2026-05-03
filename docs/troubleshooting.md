# Troubleshooting

## API starts but `GET /ready` returns 503

Possible causes:

- MongoDB is unreachable or misconfigured.
- Redis is unreachable or still starting.

Checks:

```bash
curl http://localhost:8000/ready
```

Verify `MONGODB_URI` and `REDIS_URL`, then inspect service/container logs.

## Docker Compose stack starts but API cannot reach dependencies

The most common cause is using `localhost` inside containers. The production compose file now overrides dependency URLs to container service names.

If you changed the compose file, ensure the API and worker use:

- `mongodb://mongo:27017/...`
- `redis://redis:6379/0`
- `http://qdrant:6333`

## Upload succeeds but chat does not reference documents

Possible causes:

- the worker is not running;
- the ingestion job failed;
- Qdrant is empty;
- the upload content was empty or unsupported.

Checks:

- inspect worker logs;
- verify the `chunks` collection in MongoDB;
- call `GET /api/v1/rag/rag`;
- verify `UPLOAD_ALLOWED_MIME_TYPES` and `UPLOAD_ALLOWED_EXTENSIONS`.

## `GET /api/v1/rag/rag` reports embedding mismatch

Your embedding model dimension does not match the current Qdrant collection.

Typical fix:

1. confirm `EMBEDDING_MODEL`;
2. clear and recreate vectors if you intentionally changed models;
3. re-ingest documents.

## OpenAI requests time out

Possible causes:

- network egress restrictions;
- an invalid or missing API key;
- low upstream timeout settings.

Checks:

- confirm `OPENAI_API_KEY` is set;
- increase `OPENAI_TIMEOUT_MS` or `REQUEST_TIMEOUT_MS` if needed;
- verify outbound access to `https://api.openai.com`.

## Lint or test failures after dependency updates

Run the full local validation sequence:

```bash
npm install
npm run format:check
npm run lint
npm run build
npm run test
```

If the failure only appears in CI, compare your Node.js version with the support matrix in the README.
