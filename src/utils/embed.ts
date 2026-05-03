import config from "../config";
import axios from "axios";
import ROUTES from "../config/routes";

let expectedEmbeddingDimension: number | null = null;

const getExpectedEmbeddingDimension = () => expectedEmbeddingDimension;

const setExpectedEmbeddingDimension = (dimension: number) => {
  expectedEmbeddingDimension = dimension;
};

const embedTexts = async (texts: string[]): Promise<number[][]> => {
  /**
   * embedTexts - call OpenAI embeddings endpoint for an array of strings.
   * Returns embeddings: number[][]
   */
  if (!config.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

  if (!texts || !texts.length) throw new Error("embedTexts: input array is empty");

  // Remove empty strings
  const cleanTexts = texts.map((t) => t.trim()).filter((t) => t.length > 0);
  if (!cleanTexts.length) throw new Error("embedTexts: all input strings are empty");

  try {
    const { data } = await axios.post(
      ROUTES.OPENAI.EMBEDDINGS,
      {
        model: config.EMBEDDING_MODEL!,
        input: cleanTexts,
      },
      {
        headers: {
          Authorization: `Bearer ${config.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: config.OPENAI_TIMEOUT_MS,
      }
    );
    if (!data || !data.data) throw new Error("Invalid embedding response");
    const embeddings = data.data.map((d: any) => d.embedding as number[]);
    const firstDimension = embeddings[0]?.length;
    if (!firstDimension) {
      throw new Error("Embedding response has no vectors");
    }

    if (expectedEmbeddingDimension === null) {
      expectedEmbeddingDimension = firstDimension;
    } else if (expectedEmbeddingDimension !== firstDimension) {
      throw new Error(
        `Embedding dimension mismatch. Expected ${expectedEmbeddingDimension}, got ${firstDimension}`
      );
    }

    return embeddings;
  } catch (err: any) {
    const msg =
      err?.response?.data?.error?.message || err?.message || "Failed to fetch embeddings";
    throw new Error(msg);
  }
};

export { getExpectedEmbeddingDimension, setExpectedEmbeddingDimension };
export default embedTexts;
