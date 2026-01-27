import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodSchema } from "zod";
import { HttpError } from "../utils/httpError.js";

type ValidateTarget = "body" | "query" | "params";

export function validate(schema: ZodSchema, target: ValidateTarget = "body"): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse((req as any)[target]);

    if (!result.success) {
      const details = result.error.flatten();
      return next(
        new HttpError({
          statusCode: 422,
          code: "VALIDATION_ERROR",
          message: "Validation error",
          details,
        })
      );
    }

    // Replace with parsed (coerced) values
    (req as any)[target] = result.data;
    next();
  };
}
