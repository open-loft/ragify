import createHttpError from "http-errors";
import serviceLogger from "../../utils/serviceLogger";
import embedTexts from "../../utils/embed";
import { searchVector, type QdrantFilter } from "../../utils/qdrant-client";
import axios from "axios";
import settings from "../../config/settings";
import config from "../../config";
import ROUTES from "../../config/routes";
import { getDb } from "../../db/db";

type ChatSendOptions = {
  docId?: string;
  docIds?: string[];
  requestId?: string;
};

type RetrievalSnippet = {
  score: number;
  text: string;
  docId?: string;
  fileName?: string;
  chunkIndex?: number;
  uploadedAt?: string;
  sourceLabel?: string;
};

const tokenize = (value: string): Set<string> =>
  new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((x) => x.length > 2)
  );

const lexicalScore = (query: string, text: string) => {
  const q = tokenize(query);
  const t = tokenize(text);
  if (!q.size || !t.size) return 0;
  let overlap = 0;
  q.forEach((token) => {
    if (t.has(token)) overlap += 1;
  });
  return overlap / q.size;
};

const buildQdrantFilter = (
  docId?: string,
  docIds?: string[]
): QdrantFilter | undefined => {
  const allDocIds = [docId, ...(docIds || [])].filter((item): item is string =>
    Boolean(item)
  );
  if (!allDocIds.length) return undefined;

  if (allDocIds.length === 1) {
    return {
      must: [{ key: "docId", match: { value: allDocIds[0] } }],
    };
  }

  return {
    should: allDocIds.map((item) => ({ key: "docId", match: { value: item } })),
    min_should: 1,
  };
};

class ChatService {
  private openaiKey: string;

  constructor() {
    if (!config.OPENAI_API_KEY) throw createHttpError(500, "OPENAI_API_KEY missing");

    this.openaiKey = config.OPENAI_API_KEY;
  }

  async sendMessage(
    message: string,
    res: any,
    options: ChatSendOptions = {}
  ): Promise<void> {
    /**
     * sendMessage - send a message to the chatbot
     * @param message - the message to send
     * @param res - the response object
     * @returns void
     */

    if (!message) throw createHttpError(400, "Message is required");

    const db = await getDb();
    const start = Date.now();

    try {
      // Embed user query
      const embedStart = Date.now();
      const embeddings = await embedTexts([message]);
      const qVec = embeddings[0];
      const embeddingMs = Date.now() - embedStart;

      // RAG vector search
      const searchStart = Date.now();
      const qRes = await searchVector(qVec, {
        limit: config.RAG_TOP_K,
        filter: buildQdrantFilter(options.docId, options.docIds),
      });
      const vectorSearchMs = Date.now() - searchStart;

      const snippets: RetrievalSnippet[] = (qRes.result || [])
        .map((r: any) => ({
          score: Number(r.score || 0),
          text: String(r.payload?.text || "").trim(),
          docId: r.payload?.docId,
          fileName: r.payload?.fileName,
          chunkIndex: r.payload?.chunkIndex,
          uploadedAt: r.payload?.uploadedAt,
          sourceLabel: r.payload?.sourceLabel,
        }))
        .filter((r: RetrievalSnippet) => Boolean(r.text));

      const reranked = config.RAG_RERANK_ENABLED
        ? snippets
            .map((item) => ({
              item,
              score: item.score * 0.7 + lexicalScore(message, item.text) * 0.3,
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, config.RAG_RERANK_TOP_N)
            .map((x) => x.item)
        : snippets;

      const topScore = reranked[0]?.score ?? 0;
      const hasContext = reranked.length > 0;
      const lowConfidence = hasContext && topScore < 0.35;

      const snippetLines = reranked.map((snippet, index) => {
        const source = `${snippet.fileName || snippet.docId || "unknown"}#${
          snippet.chunkIndex ?? index
        }`;
        return `[${index + 1}] (${source})\n${snippet.text}`;
      });

      // Assemble context or fallback
      const context = hasContext
        ? snippetLines.join("\n---\n")
        : "No relevant context found.";

      const retrievalHint = !hasContext
        ? "No indexed context was found for this query."
        : lowConfidence
          ? "Retrieved context confidence is low. Answer cautiously and say confidence is low."
          : "Retrieved context confidence is acceptable.";

      // OpenAI streaming request via axios
      const chatResp = await axios.post(
        ROUTES.OPENAI.CHAT_COMPLETIONS,
        {
          model: config.LLM_MODEL!,
          messages: [
            {
              role: "system",
              content: config.ALLOWED_EXTERNAL_SEARCH_SOURCES
                ? settings.CHAT_SYSTEM_PROMPT_WITH_EXTERNAL_SEARCH
                : settings.CHAT_SYSTEM_PROMPT_WITHOUT_EXTERNAL_SEARCH,
            },
            {
              role: "user",
              content: `Retrieval status: ${retrievalHint}\n\nContext:\n${context}\n\nUser question:\n${message}`,
            },
          ],
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${this.openaiKey}`,
            "Content-Type": "application/json",
          },
          responseType: "stream",
          timeout: config.REQUEST_TIMEOUT_MS,
        }
      );

      if (!chatResp.data || typeof chatResp.data.on !== "function") {
        await serviceLogger(db, "error", "chat_fetch", "No stream from LLM");
        throw createHttpError(500, "No stream from LLM");
      }

      // SSE headers
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.flushHeaders?.();

      let fullAnswer = "";
      const stream = chatResp.data;

      // Parse each chunk
      let buffer = "";
      stream.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        for (const line of buffer.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.replace(/^data: /, "");
          if (dataStr === "[DONE]") return;

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullAnswer += delta;
              res.write(delta);
            }
          } catch (_err) {
            // incomplete JSON, wait for next chunk
            continue;
          }
        }
        // Remove processed lines from buffer
        buffer = buffer.split("\n").pop() || "";
      });

      // Handle end of stream
      stream.on("end", async () => {
        const references = reranked
          .map((snippet, idx) => {
            const sourceId = snippet.docId || "unknown-doc";
            const location = `${snippet.fileName || "unknown-file"}#${
              snippet.chunkIndex ?? 0
            }`;
            return `[${idx + 1}] ${location} (docId: ${sourceId})`;
          })
          .join("\n");

        if (references && !res.writableEnded) {
          res.write(`\n\nReferences:\n${references}`);
        }

        await serviceLogger(db, "info", "chat_full_answer", fullAnswer);

        await serviceLogger(db, "info", "chat_metrics", "Chat request completed", {
          requestId: options.requestId || null,
          retrievalCount: reranked.length,
          topScore,
          lowConfidence,
          hasContext,
          embeddingMs,
          vectorSearchMs,
          totalMs: Date.now() - start,
        });

        if (!res.writableEnded) res.end();
      });

      stream.on("error", async (e: any) => {
        await serviceLogger(
          db,
          "error",
          "chat_stream_error",
          "Streaming failed",
          e?.message || e
        );
        if (!res.writableEnded) res.end();
      });

      await serviceLogger(db, "info", "chat_query", message);
    } catch (err: any) {
      await serviceLogger(
        db,
        "error",
        "chat_error",
        "Chat endpoint failed",
        err?.message || err
      );
      throw err;
    }
  }
}

export default ChatService;
