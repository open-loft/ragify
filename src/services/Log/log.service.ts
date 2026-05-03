import createHttpError from "http-errors";
import { getDb } from "../../db/db";

class LogService {
  async fetchLogs(query: any, page: number, limit: number) {
    const db = await getDb();

    try {
      const logs = await db
        .collection("logs")
        .find(query)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      return logs;
    } catch (_err) {
      throw createHttpError(500, "Failed to fetch logs");
    }
  }
}

export default LogService;
