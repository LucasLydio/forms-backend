import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

type ErrorResponse = {
  success: false;
  error: {
    message: string;
    code: string;
    details?: unknown;
    stack?: string;
  };
};

export function errorMiddleware(err: unknown, req: Request, res: Response<ErrorResponse>, _next: NextFunction) {
  // Known / typed errors
  if (err instanceof HttpError) {
    const payload: ErrorResponse = {
      success: false,
      error: {
        message: err.message,
        code: err.code,
        ...(err.details !== undefined ? { details: err.details } : {}),
        ...(env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
      },
    };

    return res.status(err.statusCode).json(payload);
  }

  // Prisma errors (avoid importing Prisma types everywhere; keep lightweight)
  const maybe = err as any;
  const prismaCode = typeof maybe?.code === "string" ? maybe.code : undefined;

  if (prismaCode) {
    // Common Prisma known errors:
    // P2002: Unique constraint failed
    if (prismaCode === "P2002") {
      const payload: ErrorResponse = {
        success: false,
        error: {
          message: "Unique constraint violation",
          code: "CONFLICT",
          ...(env.NODE_ENV !== "production" ? { details: maybe?.meta } : {}),
          ...(env.NODE_ENV !== "production" ? { stack: maybe?.stack } : {}),
        },
      };
      return res.status(409).json(payload);
    }
  }

  // Unknown errors
  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");

  const payload: ErrorResponse = {
    success: false,
    error: {
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      ...(env.NODE_ENV !== "production" ? { details: maybe?.message } : {}),
      ...(env.NODE_ENV !== "production" ? { stack: maybe?.stack } : {}),
    },
  };

  return res.status(500).json(payload);
}
