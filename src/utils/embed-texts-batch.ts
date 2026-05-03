import embedTexts from "./embed";
import config from "../config";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientEmbeddingError = (error: unknown): boolean => {
  const message = String((error as Error)?.message || "").toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("429") ||
    message.includes("rate") ||
    message.includes("tempor") ||
    message.includes("503")
  );
};

const embedWithRetry = async (inputs: string[], attempts = 3): Promise<number[][]> => {
  let lastError: unknown;

  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await embedTexts(inputs);
    } catch (error) {
      lastError = error;
      if (!isTransientEmbeddingError(error) || i === attempts) {
        break;
      }
      await wait(config.INGEST_JOB_BACKOFF_MS * i);
    }
  }

  throw lastError;
};

// Batch embeddings to avoid large API requests
const embedTextsBatch = async (
  chunks: string[],
  batchSize = config.EMBED_BATCH_SIZE
): Promise<number[][]> => {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize).filter((t) => t.trim().length > 0);
    if (!batch.length) continue;

    const batchChars = batch.reduce((sum, item) => sum + item.length, 0);
    if (batchChars > config.EMBED_BATCH_MAX_INPUT_CHARS) {
      for (const item of batch) {
        const single = await embedWithRetry([item]);
        allEmbeddings.push(single[0]);
      }
      continue;
    }

    try {
      const batchEmbeddings = await embedWithRetry(batch);
      allEmbeddings.push(...batchEmbeddings);
    } catch {
      for (const item of batch) {
        const single = await embedWithRetry([item]);
        allEmbeddings.push(single[0]);
      }
    }
  }

  return allEmbeddings;
};

export default embedTextsBatch;
