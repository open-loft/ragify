import axios from "axios";
import config from "../config";

const QDRANT_URL = config.QDRANT_URL!;
const COLLECTION_NAME = "default";

async function clearQdrant() {
  try {
    console.log(`Deleting Qdrant collection: "${COLLECTION_NAME}"...`);

    const url = `${QDRANT_URL}/collections/${COLLECTION_NAME}`;
    const response = await axios.delete(url);

    if (response.status === 200) {
      console.log(`✅ Successfully deleted collection "${COLLECTION_NAME}".`);
    } else {
      console.log(`⚠️ Unexpected response:`, response.data);
    }
  } catch (err: any) {
    if (err.response?.status === 404) {
      console.log(`✅ Collection "${COLLECTION_NAME}" not found — nothing to delete.`);
    } else {
      console.error("❌ Failed to clear Qdrant:", err.message);
    }
  }
}

clearQdrant();

/**
 * Script to completely delete a Qdrant collection.
 * Use this when you want a full reset of your vector data.
 */
