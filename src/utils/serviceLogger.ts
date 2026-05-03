import { Db } from "mongodb";
import logger from "./logger";

type ServiceLogMeta = Record<string, unknown> | string | number | boolean | null;

async function serviceLogger(
  db: Db,
  level: "info" | "warn" | "error",
  context: string,
  message: string,
  extra?: ServiceLogMeta
) {
  const record = {
    timestamp: new Date(),
    service: "backend",
    tenant: null,
    level,
    context,
    message,
    extra: extra || null,
  };

  await db.collection("logs").insertOne(record);

  logger.log(level, message, {
    context,
    extra: extra || null,
  });
}

export default serviceLogger;
