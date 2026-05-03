import dotenv from "dotenv";

dotenv.config();

const parseBoolean = (value: string | undefined, defaultValue = false) => {
  if (value === undefined || value === "") return defaultValue;
  return value.toLowerCase() === "true";
};

const parseNumber = (
  value: string | undefined,
  fallback: number,
  name: string,
  min = 1,
  max?: number
) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < min || (max !== undefined && parsed > max)) {
    if (max !== undefined) {
      throw new Error(`${name} must be a number between ${min} and ${max}`);
    }
    throw new Error(`${name} must be a number >= ${min}`);
  }
  return Math.floor(parsed);
};

const parseCsv = (value: string | undefined, fallback: string[]) => {
  if (!value) return fallback;
  const list = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return list.length ? list : fallback;
};

type Config = {
  PORT: number;
  NODE_ENV: string;
  LOG_LEVEL: string;
  MONGODB_URI?: string;
  REDIS_URL?: string;
  QDRANT_URL?: string;
  STORAGE_PATH: string;
  OPENAI_API_KEY: string;
  MONGODB_DB_NAME: string;
  EMBEDDING_MODEL: string;
  LLM_MODEL: string;
  ALLOWED_EXTERNAL_SEARCH_SOURCES: boolean;
  ALLOWED_ORIGINS: string[];
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  REQUEST_BODY_LIMIT_BYTES: number;
  UPLOAD_MAX_FILE_SIZE_BYTES: number;
  UPLOAD_MAX_FILES: number;
  UPLOAD_ALLOWED_MIME_TYPES: string[];
  UPLOAD_ALLOWED_EXTENSIONS: string[];
  INGEST_CONCURRENCY: number;
  INGEST_JOB_ATTEMPTS: number;
  INGEST_JOB_BACKOFF_MS: number;
  EMBED_BATCH_SIZE: number;
  EMBED_BATCH_MAX_INPUT_CHARS: number;
  RAG_TOP_K: number;
  RAG_RERANK_ENABLED: boolean;
  RAG_RERANK_TOP_N: number;
  REQUEST_TIMEOUT_MS: number;
  OPENAI_TIMEOUT_MS: number;
  QDRANT_TIMEOUT_MS: number;
  CHUNK_MAX_TOKENS: number;
  CHUNK_OVERLAP_TOKENS: number;
  CHUNKING_MODE: "sentence" | "paragraph";
  QDRANT_COLLECTION_NAME: string;
  QDRANT_PAYLOAD_TEXT_MAX_CHARS: number;
};

const config: Config = {
  PORT: parseNumber(process.env.PORT, 8000, "PORT"),
  NODE_ENV: process.env.NODE_ENV || "development",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  MONGODB_URI: process.env.MONGODB_URI,
  REDIS_URL: process.env.REDIS_URL,
  QDRANT_URL: process.env.QDRANT_URL,
  STORAGE_PATH: process.env.STORAGE_PATH || "./data",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || "rag",
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
  LLM_MODEL: process.env.LLM_MODEL || "gpt-4o-mini",
  ALLOWED_EXTERNAL_SEARCH_SOURCES: parseBoolean(
    process.env.ALLOWED_EXTERNAL_SEARCH_SOURCES,
    false
  ),
  ALLOWED_ORIGINS: parseCsv(process.env.ALLOWED_ORIGINS, ["http://localhost:3000"]),
  RATE_LIMIT_WINDOW_MS: parseNumber(
    process.env.RATE_LIMIT_WINDOW_MS,
    60000,
    "RATE_LIMIT_WINDOW_MS"
  ),
  RATE_LIMIT_MAX_REQUESTS: parseNumber(
    process.env.RATE_LIMIT_MAX_REQUESTS,
    60,
    "RATE_LIMIT_MAX_REQUESTS"
  ),
  REQUEST_BODY_LIMIT_BYTES: parseNumber(
    process.env.REQUEST_BODY_LIMIT_BYTES,
    1048576,
    "REQUEST_BODY_LIMIT_BYTES"
  ),
  UPLOAD_MAX_FILE_SIZE_BYTES: parseNumber(
    process.env.UPLOAD_MAX_FILE_SIZE_BYTES,
    5242880,
    "UPLOAD_MAX_FILE_SIZE_BYTES"
  ),
  UPLOAD_MAX_FILES: parseNumber(process.env.UPLOAD_MAX_FILES, 5, "UPLOAD_MAX_FILES"),
  UPLOAD_ALLOWED_MIME_TYPES: parseCsv(process.env.UPLOAD_ALLOWED_MIME_TYPES, [
    "text/plain",
    "text/markdown",
  ]),
  UPLOAD_ALLOWED_EXTENSIONS: parseCsv(process.env.UPLOAD_ALLOWED_EXTENSIONS, [
    ".txt",
    ".md",
    ".markdown",
  ]).map((ext) => ext.toLowerCase()),
  INGEST_CONCURRENCY: parseNumber(
    process.env.INGEST_CONCURRENCY,
    2,
    "INGEST_CONCURRENCY",
    1,
    32
  ),
  INGEST_JOB_ATTEMPTS: parseNumber(
    process.env.INGEST_JOB_ATTEMPTS,
    3,
    "INGEST_JOB_ATTEMPTS",
    1,
    10
  ),
  INGEST_JOB_BACKOFF_MS: parseNumber(
    process.env.INGEST_JOB_BACKOFF_MS,
    2000,
    "INGEST_JOB_BACKOFF_MS",
    100,
    120000
  ),
  EMBED_BATCH_SIZE: parseNumber(
    process.env.EMBED_BATCH_SIZE,
    50,
    "EMBED_BATCH_SIZE",
    1,
    256
  ),
  EMBED_BATCH_MAX_INPUT_CHARS: parseNumber(
    process.env.EMBED_BATCH_MAX_INPUT_CHARS,
    200000,
    "EMBED_BATCH_MAX_INPUT_CHARS",
    1000,
    2000000
  ),
  RAG_TOP_K: parseNumber(process.env.RAG_TOP_K, 6, "RAG_TOP_K", 1, 50),
  RAG_RERANK_ENABLED: parseBoolean(process.env.RAG_RERANK_ENABLED, false),
  RAG_RERANK_TOP_N: parseNumber(
    process.env.RAG_RERANK_TOP_N,
    3,
    "RAG_RERANK_TOP_N",
    1,
    20
  ),
  REQUEST_TIMEOUT_MS: parseNumber(
    process.env.REQUEST_TIMEOUT_MS,
    60000,
    "REQUEST_TIMEOUT_MS",
    1000,
    300000
  ),
  OPENAI_TIMEOUT_MS: parseNumber(
    process.env.OPENAI_TIMEOUT_MS,
    30000,
    "OPENAI_TIMEOUT_MS",
    1000,
    120000
  ),
  QDRANT_TIMEOUT_MS: parseNumber(
    process.env.QDRANT_TIMEOUT_MS,
    10000,
    "QDRANT_TIMEOUT_MS",
    500,
    120000
  ),
  CHUNK_MAX_TOKENS: parseNumber(
    process.env.CHUNK_MAX_TOKENS,
    2000,
    "CHUNK_MAX_TOKENS",
    100,
    8000
  ),
  CHUNK_OVERLAP_TOKENS: parseNumber(
    process.env.CHUNK_OVERLAP_TOKENS,
    200,
    "CHUNK_OVERLAP_TOKENS",
    0,
    4000
  ),
  CHUNKING_MODE: process.env.CHUNKING_MODE === "paragraph" ? "paragraph" : "sentence",
  QDRANT_COLLECTION_NAME: process.env.QDRANT_COLLECTION_NAME || "default",
  QDRANT_PAYLOAD_TEXT_MAX_CHARS: parseNumber(
    process.env.QDRANT_PAYLOAD_TEXT_MAX_CHARS,
    3000,
    "QDRANT_PAYLOAD_TEXT_MAX_CHARS",
    256,
    20000
  ),
};

const validateMongoUri = (uri: string) => {
  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    throw new Error("MONGODB_URI must start with mongodb:// or mongodb+srv://");
  }
};

const validateHttpUrl = (value: string, name: string) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`${name} must use http:// or https://`);
    }
  } catch {
    throw new Error(`${name} is not a valid URL`);
  }
};

const validateRedisUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
      throw new Error("REDIS_URL must use redis:// or rediss://");
    }
  } catch {
    throw new Error("REDIS_URL is not a valid URL");
  }
};

const validateRequired = () => {
  if (!config.MONGODB_URI) throw new Error("Missing required env: MONGODB_URI");
  if (!config.REDIS_URL) throw new Error("Missing required env: REDIS_URL");
  if (!config.QDRANT_URL) throw new Error("Missing required env: QDRANT_URL");
  if (!config.OPENAI_API_KEY) throw new Error("Missing required env: OPENAI_API_KEY");

  validateMongoUri(config.MONGODB_URI);
  validateRedisUrl(config.REDIS_URL);
  validateHttpUrl(config.QDRANT_URL, "QDRANT_URL");

  if (!config.STORAGE_PATH.trim()) {
    throw new Error("STORAGE_PATH must be a non-empty path");
  }

  const logLevels = ["error", "warn", "info", "http", "verbose", "debug", "silly"];
  if (!logLevels.includes(config.LOG_LEVEL)) {
    throw new Error(`LOG_LEVEL must be one of: ${logLevels.join(", ")}`);
  }

  if (config.CHUNK_OVERLAP_TOKENS >= config.CHUNK_MAX_TOKENS) {
    throw new Error("CHUNK_OVERLAP_TOKENS must be less than CHUNK_MAX_TOKENS");
  }

  if (config.RAG_RERANK_TOP_N > config.RAG_TOP_K) {
    throw new Error("RAG_RERANK_TOP_N must be <= RAG_TOP_K");
  }
};

export const validateAppConfig = () => {
  validateRequired();
};

export const validateWorkerConfig = () => {
  validateRequired();
};

export default config;
