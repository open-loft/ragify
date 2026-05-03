import rateLimit from "express-rate-limit";
import config from "../config";

const createEndpointRateLimiter = (name: string) =>
  rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        status: 429,
        message: `Too many ${name} requests, please try again later.`,
      },
    },
  });

export { createEndpointRateLimiter };
