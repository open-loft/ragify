import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import createHttpError from "http-errors";
import { closeDb, ensureDbIndexes, getDb, isDbHealthy } from "./db/db";
import redis from "./db/redis";
import { notFoundMiddleware, defaultErrorHandler } from "./middlewares/error-handler";
import chatRouter from "./routes/chat.route";
import uploadRouter from "./routes/upload.route";
import logRouter from "./routes/log.route";
import ragRouter from "./routes/health.route";
import ROUTES from "./config/routes";
import config, { validateAppConfig } from "./config";
import logger from "./utils/logger";

dotenv.config();

async function init() {
  try {
    validateAppConfig();

    const PORT = config.PORT;

    // Connect to MongoDB
    await getDb();
    await ensureDbIndexes();
    logger.info("MongoDB connected.");

    // Connect to Redis
    await redis.connect();

    await fs.promises.mkdir(path.resolve(config.STORAGE_PATH), {
      recursive: true,
    });

    // Initialize Express app
    const app = express();

    app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          if (config.ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true);
          }
          return callback(
            createHttpError(403, `Origin '${origin}' is not allowed by CORS`)
          );
        },
        credentials: false,
      })
    );
    app.use(express.json({ limit: config.REQUEST_BODY_LIMIT_BYTES }));
    app.use(
      express.urlencoded({
        extended: true,
        limit: config.REQUEST_BODY_LIMIT_BYTES,
      })
    );

    app.use((req, res, next) => {
      const requestId = String(req.headers["x-request-id"] || crypto.randomUUID());
      const startedAt = Date.now();

      res.setHeader("x-request-id", requestId);
      res.on("finish", () => {
        logger.info("request_completed", {
          requestId,
          method: req.method,
          route: req.originalUrl,
          status: res.statusCode,
          durationMs: Date.now() - startedAt,
        });
      });

      next();
    });

    // Health check
    app.get(ROUTES.HEALTH, (req, res) =>
      res.json({
        message: "I'm alive!",
        timestamp: new Date().toISOString(),
        status: "OK",
      })
    );

    app.get("/ready", async (req, res) => {
      const mongoHealthy = await isDbHealthy();
      const redisHealthy = redis.isConnected();

      const ready = mongoHealthy && redisHealthy;
      res.status(ready ? 200 : 503).json({
        status: ready ? "ready" : "degraded",
        checks: {
          mongo: mongoHealthy ? "ok" : "fail",
          redis: redisHealthy ? "ok" : "fail",
        },
        timestamp: new Date().toISOString(),
      });
    });

    // API routes
    app.use(ROUTES.CHAT.BASE, chatRouter);

    app.use(ROUTES.UPLOAD.BASE, uploadRouter);

    app.use(ROUTES.LOG.BASE, logRouter);

    app.use(ROUTES.RAG.BASE, ragRouter);

    // 404 + error handlers
    app.use(notFoundMiddleware);
    app.use(defaultErrorHandler);

    // Start server
    const server = app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      server.close(async () => {
        try {
          await Promise.all([redis.disconnect(), closeDb()]);
          logger.info("Shutdown complete");
          process.exit(0);
        } catch (error) {
          logger.error("Error during shutdown:", error);
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
  } catch (error) {
    logger.error("Failed to initialize server:", error);
    process.exit(1);
  }
}

init().catch((error) => {
  logger.error("Unhandled initialization error:", error);
  process.exit(1);
});
