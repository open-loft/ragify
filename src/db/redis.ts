import IORedis from "ioredis";
import type { RedisOptions } from "ioredis";
import logger from "../utils/logger";
import config from "../config";

type RedisConnectionOptions = RedisOptions;

interface RedisWrapper {
  client: IORedis | null;
  connect: () => Promise<IORedis>;
  isConnected: () => boolean;
  disconnect: () => Promise<void>;
}

const parseRedisUrlToOptions = (redisUrl: string): RedisConnectionOptions => {
  let parsed: URL;

  try {
    parsed = new URL(redisUrl);
  } catch {
    throw new Error("REDIS_URL is not a valid URL");
  }

  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
    throw new Error("REDIS_URL must use redis:// or rediss://");
  }

  if (!parsed.hostname) {
    throw new Error("REDIS_URL is missing hostname");
  }

  const dbFromPath = parsed.pathname.replace("/", "").trim();
  const db = dbFromPath ? Number(dbFromPath) : 0;
  if (!Number.isInteger(db) || db < 0) {
    throw new Error("REDIS_URL has invalid database index");
  }

  const options: RedisConnectionOptions = {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  };

  if (parsed.protocol === "rediss:") {
    options.tls = {};
  }

  return options;
};

const getRedisConnectionOptions = (): RedisConnectionOptions => {
  if (!config.REDIS_URL) {
    throw new Error("REDIS_URL is not defined in config");
  }
  return parseRedisUrlToOptions(config.REDIS_URL);
};

const redis: RedisWrapper = {
  client: null,

  async connect() {
    if (!this.client) {
      this.client = new IORedis(getRedisConnectionOptions());
      this.client.on("error", (err) => logger.error("Redis Error", err));
      this.client.on("connect", () => logger.info("Redis connected"));
    }
    return this.client;
  },

  isConnected() {
    return !!this.client && this.client.status === "ready";
  },

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  },
};

export { getRedisConnectionOptions };
export default redis;
