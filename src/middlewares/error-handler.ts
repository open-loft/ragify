// Dependencies
import createError from "http-errors";
import { Request, Response, NextFunction } from "express";

const notFoundMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  next(createError.NotFound("Requested route not found"));
};
interface ErrorHandlerError extends Error {
  status?: number;
}

const defaultErrorHandler = (
  err: ErrorHandlerError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = String(res.getHeader("x-request-id") || "");
  res.status(err.status || 500);
  res.json({
    error: {
      status: err.status || 500,
      message: err.message || "Internal Server Error",
      requestId,
    },
  });
};

// Export module
export { notFoundMiddleware, defaultErrorHandler };
