# API Examples

Set a base URL first:

```bash
BASE_URL=http://localhost:8000
```

## Liveness

```bash
curl "$BASE_URL/"
```

## Readiness

```bash
curl "$BASE_URL/ready"
```

## RAG health

```bash
curl "$BASE_URL/api/v1/rag/rag"
curl "$BASE_URL/api/v1/rag/rag?deep=true"
```

## Upload pasted text

```bash
curl -X POST "$BASE_URL/api/v1/upload/upload" \
  -F "text=The Apollo 11 mission landed the first humans on the Moon in 1969." \
  -F "forceReingest=true"
```

## Upload a text file

```bash
curl -X POST "$BASE_URL/api/v1/upload/upload" \
  -F "files=@./sample.txt;type=text/plain"
```

## Chat against all documents

```bash
curl -N -X POST "$BASE_URL/api/v1/chat/message" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Summarize the Apollo 11 mission milestones."
  }'
```

## Chat against one document

```bash
curl -N -X POST "$BASE_URL/api/v1/chat/message" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the key facts in this document?",
    "docId": "replace-with-document-id"
  }'
```

## Chat against multiple documents

```bash
curl -N -X POST "$BASE_URL/api/v1/chat/message" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Compare the uploaded documents.",
    "docIds": ["doc-id-1", "doc-id-2"]
  }'
```

## Response behavior

`POST /api/v1/chat/message` streams plain text chunks and appends a `References:` section near the end of the response.

## Log inspection

```bash
curl "$BASE_URL/api/v1/logs/logs"
```
