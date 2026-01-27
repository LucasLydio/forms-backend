export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_ERROR"
  | "BAD_REQUEST";

export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(params: { statusCode: number; code: ErrorCode; message: string; details?: unknown }) {
    super(params.message);
    this.name = "HttpError";
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.details = params.details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError({ statusCode: 400, code: "BAD_REQUEST", message, details });

export const unauthorized = (message = "Unauthorized", details?: unknown) =>
  new HttpError({ statusCode: 401, code: "UNAUTHORIZED", message, details });

export const forbidden = (message = "Forbidden", details?: unknown) =>
  new HttpError({ statusCode: 403, code: "FORBIDDEN", message, details });

export const notFound = (message = "Not Found", details?: unknown) =>
  new HttpError({ statusCode: 404, code: "NOT_FOUND", message, details });

export const conflict = (message = "Conflict", details?: unknown) =>
  new HttpError({ statusCode: 409, code: "CONFLICT", message, details });

export const tooManyRequests = (message = "Too Many Requests", details?: unknown) =>
  new HttpError({ statusCode: 429, code: "TOO_MANY_REQUESTS", message, details });
