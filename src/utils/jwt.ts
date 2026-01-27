import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import { unauthorized } from "./httpError.js";

// Keep this aligned with prisma/schema.prisma enum UserRole
export type UserRole = "admin" | "creator" | "common";

export type AccessTokenPayload = {
  sub: string; // user id
  role: UserRole;
};

type VerifiedAccessToken = AccessTokenPayload & {
  iat: number;
  exp: number;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {};

  // with exactOptionalPropertyTypes, only set if defined
  if (env.JWT_ACCESS_EXPIRES_IN) {
    options.expiresIn = env.JWT_ACCESS_EXPIRES_IN as NonNullable<SignOptions["expiresIn"]>;
  }

  return jwt.sign(payload, env.JWT_ACCESS_SECRET as jwt.Secret, options);
}

export function verifyAccessToken(token: string): VerifiedAccessToken {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET as jwt.Secret) as JwtPayload;

    const sub = decoded.sub;
    const role = (decoded as any).role as UserRole | undefined;

    if (typeof sub !== "string" || !role) {
      throw unauthorized("Invalid token payload");
    }

    // basic role guard (optional but nice)
    if (role !== "admin" && role !== "creator" && role !== "common") {
      throw unauthorized("Invalid role in token");
    }

    return {
      sub,
      role,
      iat: decoded.iat ?? 0,
      exp: decoded.exp ?? 0,
    };
  } catch {
    throw unauthorized("Invalid or expired token");
  }
}

export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}
