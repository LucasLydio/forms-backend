import crypto from "crypto";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { signAccessToken, type UserRole } from "../../utils/jwt.js";
import { exchangeCodeForIdToken, verifyGoogleIdToken } from "../../utils/google.js";
import { badRequest, conflict, notFound, unauthorized } from "../../utils/httpError.js";
import type { RegisterDTO, LoginDTO, GoogleAuthDTO } from "./auth.schemas.js";

type AuthResult = {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    provider: "local" | "google";
    createdAt: Date;
    updatedAt: Date;
  };
  accessToken: string;
  refreshToken: string; 
};

function parseDurationToMs(input: string): number {
  // supports: 15m, 7d, 30d, 12h, 60s
  const m = /^(\d+)\s*([smhd])$/.exec(input.trim());
  if (!m) throw badRequest(`Invalid duration format: ${input} (expected 15m, 7d, 30d...)`);
  const value = Number(m[1]);
  const unit = m[2];

  const mult =
    unit === "s" ? 1000 :
    unit === "m" ? 60_000 :
    unit === "h" ? 3_600_000 :
    86_400_000; // d

  return value * mult;
}

function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

function hashRefreshToken(raw: string): string {
  
  return crypto
    .createHash("sha256")
    .update(raw)
    .update(env.JWT_REFRESH_SECRET)
    .digest("hex");
}

function buildAuthResult(user: {
  id: string;
  name: string;
  email: string;
  role: any;
  provider: any;
  createdAt: Date;
  updatedAt: Date;
}): AuthResult {
  const accessToken = signAccessToken({ sub: user.id, role: user.role as UserRole });

  const refreshToken = generateRefreshToken();
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      provider: user.provider as "local" | "google",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    accessToken,
    refreshToken,
  };
}

async function persistRefreshToken(userId: string, refreshTokenRaw: string) {
  const tokenHash = hashRefreshToken(refreshTokenRaw);
  const expiresMs = parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN);
  const expiresAt = new Date(Date.now() + expiresMs);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { tokenHash, expiresAt };
}

async function validateStoredRefreshToken(refreshTokenRaw: string) {
  const tokenHash = hashRefreshToken(refreshTokenRaw);

  const rt = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!rt) throw unauthorized("Invalid refresh token");
  if (rt.revokedAt) throw unauthorized("Refresh token revoked");
  if (rt.expiresAt.getTime() <= Date.now()) throw unauthorized("Refresh token expired");

  return { record: rt, tokenHash };
}

export class AuthService {
  async register(dto: RegisterDTO): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw conflict("Email already in use");

    const passwordHash = await hashPassword(dto.password);

    const user = await prisma.user.create({
      data: {
        name: dto.name,
        email,
        passwordHash,
        provider: "local",
        role: "common",
      },
    });

    const result = buildAuthResult(user);
    await persistRefreshToken(user.id, result.refreshToken);
    return result;
  }

  async login(dto: LoginDTO): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw unauthorized("Invalid credentials");

    if (!user.passwordHash) {
      
      throw unauthorized("Use Google sign-in for this account");
    }

    const ok = await verifyPassword(dto.password, user.passwordHash);
    if (!ok) throw unauthorized("Invalid credentials");

    const result = buildAuthResult(user);
    await persistRefreshToken(user.id, result.refreshToken);
    return result;
  }

  async googleAuth(dto: GoogleAuthDTO): Promise<AuthResult> {
    const idToken = dto.idToken ?? (dto.code ? await exchangeCodeForIdToken(dto.code) : null);
    if (!idToken) throw badRequest("Either idToken or code is required");

    const identity = await verifyGoogleIdToken(idToken);

    
    if (!identity.emailVerified) {
      throw unauthorized("Google account email is not verified");
    }

    const email = identity.email.trim().toLowerCase();

    
    let user = await prisma.user.findUnique({ where: { googleId: identity.googleId } });

    if (!user) {
      
      user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        
        if (user.googleId && user.googleId !== identity.googleId) {
          throw conflict("This email is already linked to another Google account");
        }

        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: identity.googleId,
            // Keep provider as-is if it was local; or set google if you prefer:
            // provider: "google",
          },
        });
      } else {
        
        user = await prisma.user.create({
          data: {
            email,
            name: identity.name,
            googleId: identity.googleId,
            provider: "google",
            passwordHash: null,
            role: "common",
          },
        });
      }
    }

    const result = buildAuthResult(user);
    await persistRefreshToken(user.id, result.refreshToken);
    return result;
  }

  /**
   * Refresh flow (token rotation):
   * - validate existing refresh token (hash lookup)
   * - revoke old token
   * - issue new refresh token + store hash
   * - issue new access token
   */
  async refresh(refreshTokenRaw: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshTokenRaw) throw unauthorized("Missing refresh token");

    const { record } = await validateStoredRefreshToken(refreshTokenRaw);

    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    const newRaw = generateRefreshToken();
    await persistRefreshToken(record.userId, newRaw);

    const accessToken = signAccessToken({
      sub: record.userId,
      role: record.user.role as UserRole,
    });

    return { accessToken, refreshToken: newRaw };
  }

  async logout(refreshTokenRaw: string): Promise<void> {
    if (!refreshTokenRaw) return;

    const tokenHash = hashRefreshToken(refreshTokenRaw);

    const rt = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!rt) return;

    if (!rt.revokedAt) {
      await prisma.refreshToken.update({
        where: { id: rt.id },
        data: { revokedAt: new Date() },
      });
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound("User not found");

    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export const authService = new AuthService();
