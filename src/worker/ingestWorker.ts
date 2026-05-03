/**
 * Robust Ingest Worker
 * Handles:
 * - token-based chunking
 * - batch embeddings
 * - ensures Qdrant collection exists
 * - upserts vectors
 * - stores chunk metadata in Mongo
 * - full error logging
 */

import { Worker } from "bullmq";
import serviceLogger from "../utils/serviceLogger";
import { ensureCollection, upsertPoints } from "../utils/qdrant-client";

import { v5 as uuidv5 } from "uuid";
import { splitIntoChunksByTokens } from "../utils/chunking";
import embedTextsBatch from "../utils/embed-texts-batch";
import config, { validateWorkerConfig } from "../config";
import settings from "../config/settings";
import { getDb, closeDb, ensureDbIndexes } from "../db/db";
import { getRedisConnectionOptions } from "../db/redis";
import logger from "../utils/logger";
import { ObjectId } from "mongodb";

const NAMESPACE = settings.UUID_NAMESPACE;

validateWorkerConfig();

type IngestJob = {
  docId: string;
  forceReingest?: boolean;
  sourceLabel?: string;
};

// Worker listens to 'ingest' queue
const worker = new Worker(
  "ingest",
  async (job) => {
    const db = await getDb();
    await ensureDbIndexes();

    try {
      const { docId, forceReingest, sourceLabel } = job.data as IngestJob;

      const logMeta = {
        jobId: String(job.id),
        docId,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts,
      };

      await serviceLogger(db, "info", "ingest_start", `Start ingest ${docId}`, logMeta);

      const document = await db.collection("documents").findOne({
        _id: new ObjectId(docId),
      });

      if (!document) {
        throw new Error(`Document not found for docId=${docId}`);
      }

      const text = typeof document.text === "string" ? document.text : "";

      // Guard: skip empty text
      if (!text || !text.trim()) {
        await serviceLogger(db, "warn", "ingest_skipped", `Doc ${docId} has no text`);
        return;
      }

      const existingChunkCount = await db.collection("chunks").countDocuments({ docId });

      if (existingChunkCount > 0 && !forceReingest) {
        await serviceLogger(
          db,
          "info",
          "ingest_skipped_duplicate",
          `Skipping duplicate ingest for ${docId}`,
          {
            ...logMeta,
            existingChunkCount,
          }
        );
        return;
      }

      // 1) Token-based chunking
      const chunks = splitIntoChunksByTokens(text, {
        maxTokens: config.CHUNK_MAX_TOKENS,
        overlapTokens: config.CHUNK_OVERLAP_TOKENS,
        mode: config.CHUNKING_MODE,
      });
      if (!chunks.length) {
        await serviceLogger(
          db,
          "warn",
          "ingest_skipped",
          `Doc ${docId} produced no chunks`
        );
        return;
      }

      // 2) Batch embeddings
      const embeddings = await embedTextsBatch(chunks, config.EMBED_BATCH_SIZE);

      if (embeddings.length !== chunks.length) {
        throw new Error(
          `Embedding/chunk mismatch for ${docId}. chunks=${chunks.length}, embeddings=${embeddings.length}`
        );
      }

      // 3) Ensure Qdrant collection exists
      await ensureCollection(embeddings[0].length);

      // 4) Prepare points & upsert
      const uploadedAt =
        document.uploadedAt instanceof Date
          ? document.uploadedAt.toISOString()
          : new Date().toISOString();

      const points = chunks.map((c, idx) => ({
        id: uuidv5(`${docId}_${idx}`, NAMESPACE),
        vector: embeddings[idx],
        payload: {
          docId,
          chunkIndex: idx,
          fileName: document.fileName || "unknown",
          uploadedAt,
          sourceLabel: sourceLabel || "upload",
          text: c.slice(0, config.QDRANT_PAYLOAD_TEXT_MAX_CHARS),
        },
      }));
      await upsertPoints(points);

      // 5) Store chunk metadata in Mongo
      if (forceReingest) {
        await db.collection("chunks").deleteMany({ docId });
      }

      const now = new Date();
      const chunkWrites = chunks.map((c, idx) => ({
        updateOne: {
          filter: { docId, chunkIndex: idx },
          update: {
            $set: {
              docId,
              chunkIndex: idx,
              text: c,
              fileName: document.fileName || "unknown",
              uploadedAt: document.uploadedAt || now,
              sourceLabel: sourceLabel || "upload",
              updatedAt: now,
            },
            $setOnInsert: {
              createdAt: now,
            },
          },
          upsert: true,
        },
      }));

      if (chunkWrites.length) {
        await db.collection("chunks").bulkWrite(chunkWrites, { ordered: false });
      }

      await serviceLogger(
        db,
        "info",
        "ingest_completed",
        `Ingested ${docId} with ${chunks.length} chunks`,
        {
          ...logMeta,
          chunks: chunks.length,
          embeddings: embeddings.length,
        }
      );
    } catch (err: any) {
      await serviceLogger(db, "error", "ingest_failed", "IngestWorker error", {
        message: err.message,
        stack: err.stack,
        jobId: String(job.id),
        attemptsMade: job.attemptsMade,
      });
      throw err;
    }
  },
  {
    connection: getRedisConnectionOptions(),
    autorun: true,
    concurrency: config.INGEST_CONCURRENCY,
  }
);

logger.info("Ingest Worker started", {
  concurrency: config.INGEST_CONCURRENCY,
  attempts: config.INGEST_JOB_ATTEMPTS,
});
worker.on("completed", (job) => {
  logger.info("Ingest job completed", { jobId: String(job.id) });
});

worker.on("failed", (job, err) => {
  logger.error("Ingest job failed", {
    jobId: String(job?.id),
    attemptsMade: job?.attemptsMade,
    message: err.message,
  });
});

const shutdownWorker = async (signal: string) => {
  logger.info("Received worker shutdown signal", { signal });
  await worker.close();
  await closeDb();
  process.exit(0);
};

process.on("SIGINT", () => void shutdownWorker("SIGINT"));
process.on("SIGTERM", () => void shutdownWorker("SIGTERM"));
