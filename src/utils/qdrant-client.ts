import config from "../config";
import axios from "axios";

type QdrantFilter = {
  must?: Array<{ key: string; match: { value: string | number | boolean } }>;
  should?: Array<{ key: string; match: { value: string | number | boolean } }>;
  min_should?: number;
};

type SearchOptions = {
  limit?: number;
  filter?: QdrantFilter;
};

const collectionUrl = () =>
  `${config.QDRANT_URL}/collections/${config.QDRANT_COLLECTION_NAME}`;

const qdrantRequestConfig = {
  headers: { "Content-Type": "application/json" },
  timeout: config.QDRANT_TIMEOUT_MS,
};

const upsertPoints = async (points: any[]) => {
  /**
   * upsertPoints - upserts points into default collection
   * points: [{ id, vector, payload }]
   */
  const safePoints = points.map((p) => ({
    ...p,
    id: typeof p.id === "string" ? p.id.replace(/[^a-zA-Z0-9-]/g, "") : p.id,
  }));
  const url = `${collectionUrl()}/points`;
  try {
    const resp = await axios.put(url, { points: safePoints }, qdrantRequestConfig);
    return resp.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    throw new Error(
      `Qdrant upsert failed: ${status ?? "NO_STATUS"} ${JSON.stringify(data)}`
    );
  }
};

const searchVector = async (vector: number[], options: SearchOptions = {}) => {
  /**
   * searchVectors - search top K from default collection
   */
  const url = `${collectionUrl()}/points/search`;
  const limit = options.limit ?? 6;
  try {
    const resp = await axios.post(
      url,
      {
        vector,
        limit,
        with_payload: true,
        filter: options.filter,
      },
      qdrantRequestConfig
    );
    return resp.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    throw new Error(
      `Qdrant search failed: ${status ?? "NO_STATUS"} ${JSON.stringify(data)}`
    );
  }
};

const getCollectionInfo = async () => {
  const resp = await axios.get(collectionUrl(), qdrantRequestConfig);
  return resp.data;
};

const ensureCollection = async (vectorSize: number) => {
  /**
   * ensureCollection - ensures that the default collection exists in Qdrant
   * vectorSize: size of the vectors to be stored
   * If the collection does not exist, it will be created
   */
  const qUrl = config.QDRANT_URL!;
  try {
    try {
      const existing = await axios.get(collectionUrl(), qdrantRequestConfig);
      const existingSize = existing?.data?.result?.config?.params?.vectors?.size;

      if (typeof existingSize === "number" && existingSize !== vectorSize) {
        throw new Error(
          `Qdrant collection vector size mismatch. Collection has ${existingSize}, embedding produced ${vectorSize}`
        );
      }

      // collection exists; nothing to do
      return;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        // Create collection
        try {
          const createResp = await axios.put(
            `${qUrl}/collections/${config.QDRANT_COLLECTION_NAME}`,
            { vectors: { size: vectorSize, distance: "Cosine" } },
            qdrantRequestConfig
          );
          if (!(createResp.status >= 200 && createResp.status < 300)) {
            throw new Error(
              `Failed to create Qdrant collection: ${
                createResp.status
              } ${JSON.stringify(createResp.data)}`
            );
          }
          return;
        } catch (createErr: any) {
          throw new Error(
            `Failed to create Qdrant collection: ${
              createErr?.response?.status ?? "NO_STATUS"
            } ${JSON.stringify(createErr?.response?.data)}`
          );
        }
      } else {
        throw new Error(
          `Failed to fetch Qdrant collection: ${
            status ?? "NO_STATUS"
          } ${JSON.stringify(err?.response?.data)}`
        );
      }
    }
  } catch (err: any) {
    if (err.message.startsWith("Failed")) {
      throw err;
    }
    throw new Error(`Qdrant connection error: ${err.message}`);
  }
};

export {
  upsertPoints,
  searchVector,
  ensureCollection,
  getCollectionInfo,
  type QdrantFilter,
};
