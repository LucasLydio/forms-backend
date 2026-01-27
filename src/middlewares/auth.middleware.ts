import type { NextFunction, Request, Response } from "express";
import { extractBearerToken, verifyAccessToken, type UserRole } from "../utils/jwt.js";
import { forbidden, unauthorized } from "../utils/httpError.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) return next(unauthorized("Missing access token"));

  const payload = verifyAccessToken(token);

  req.user = { id: payload.sub, role: payload.role };
  return next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized("Not authenticated"));
    if (!roles.includes(req.user.role)) return next(forbidden("Insufficient role"));
    return next();
  };
}
