import createHttpError from "http-errors";
import config from "../../config";
import embedTexts, {
  getExpectedEmbeddingDimension,
  setExpectedEmbeddingDimension,
} from "../../utils/embed";
import axios from "axios";
import { getDb } from "../../db/db";
import { getCollectionInfo } from "../../utils/qdrant-client";
import ROUTES from "../../config/routes";

class RagHealthService {
  constructor() {
    if (!config.QDRANT_URL) throw createHttpError(500, "QDRANT_URL missing");
  }

  async ragHealthCheck(req: any, res: any) {
    const startTotal = Date.now();
    const deep = req.query.deep === "true";

    const report: any = {
      status: "ok",
      checks: {},
      latency: {},
      deep,
      timestamp: new Date().toISOString(),
    };

    try {
      // -------------------------
      // 1️⃣ MongoDB + Chunks
      // -------------------------
      const db = await getDb();

      report.checks.mongo = "connected";

      const chunkCount = await db.collection("chunks").countDocuments();
      report.checks.chunksCount = chunkCount;

      if (chunkCount === 0) {
        throw new Error("No chunks found in MongoDB");
      }

      const sampleChunk = await db.collection("chunks").findOne({});
      if (!sampleChunk?.text) {
        throw new Error("Chunks exist but text field missing");
      }

      report.checks.chunkSample = "valid";

      // -------------------------
      // 2️⃣ Embedding Latency
      // -------------------------
      const embedStart = Date.now();
      const embedding = await embedTexts(["health check test"]);
      report.latency.embeddingMs = Date.now() - embedStart;

      const vector = embedding[0];
      report.checks.embeddingDimension = vector.length;

      const expectedDim = getExpectedEmbeddingDimension();
      if (!expectedDim) {
        setExpectedEmbeddingDimension(vector.length);
      }

      // -------------------------
      // 3️⃣ Qdrant Collection
      // -------------------------
      const collectionResp = await getCollectionInfo();

      report.checks.qdrantCollection = "exists";
      report.checks.qdrantVectorSize = collectionResp.result.config.params.vectors.size;

      if (report.checks.qdrantVectorSize !== vector.length) {
        throw new Error(
          `Embedding dimension ${vector.length} does not match Qdrant collection size ${report.checks.qdrantVectorSize}`
        );
      }

      // -------------------------
      // 4️⃣ Qdrant Points (Scroll)
      // -------------------------
      const scrollResp = await axios.post(
        `${config.QDRANT_URL}/collections/${config.QDRANT_COLLECTION_NAME}/points/scroll`,
        { limit: 1, with_payload: true },
        { timeout: config.QDRANT_TIMEOUT_MS }
      );

      const points = scrollResp.data.result?.points || [];
      if (!points.length) {
        throw new Error("Qdrant collection exists but has no points");
      }

      if (!points[0].payload?.text) {
        throw new Error("Qdrant points missing payload.text");
      }

      report.checks.qdrantPoints = points.length;
      report.checks.qdrantPayload = "valid";

      // -------------------------
      // 5️⃣ Retrieval Latency
      // -------------------------
      const searchStart = Date.now();
      const searchResp = await axios.post(
        `${config.QDRANT_URL}/collections/${config.QDRANT_COLLECTION_NAME}/points/search`,
        {
          vector,
          limit: 1,
          with_payload: true,
        },
        { timeout: config.QDRANT_TIMEOUT_MS }
      );
      report.latency.vectorSearchMs = Date.now() - searchStart;

      const results = searchResp.data.result || [];
      if (!results.length) {
        throw new Error("Vector search returned no results");
      }

      report.checks.retrieval = "working";
      report.checks.sampleScore = results[0].score;

      // -------------------------
      // 6️⃣ DEEP MODE → LLM DRY RUN
      // -------------------------
      if (deep) {
        const llmStart = Date.now();

        const llmResp = await axios.post(
          ROUTES.OPENAI.CHAT_COMPLETIONS,
          {
            model: config.LLM_MODEL,
            messages: [
              {
                role: "system",
                content: "Answer briefly for health check.",
              },
              {
                role: "user",
                content: "Reply with OK if you are reachable.",
              },
            ],
            max_tokens: 5,
          },
          {
            headers: {
              Authorization: `Bearer ${config.OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            timeout: config.OPENAI_TIMEOUT_MS,
          }
        );

        report.latency.llmMs = Date.now() - llmStart;

        const llmText = llmResp.data.choices?.[0]?.message?.content?.trim();

        if (!llmText) {
          throw new Error("LLM returned empty response");
        }

        report.checks.llm = "reachable";
        report.checks.llmSampleResponse = llmText;
      }

      // -------------------------
      // TOTAL TIME
      // -------------------------
      report.latency.totalMs = Date.now() - startTotal;

      res.status(200).json(report);
    } catch (err: any) {
      report.status = "unhealthy";
      report.error = err.message;
      report.latency.totalMs = Date.now() - startTotal;

      res.status(500).json(report);
    }
  }
}

export default RagHealthService;
