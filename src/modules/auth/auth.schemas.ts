import { z } from "zod";

const email = z
  .string()
  .min(1)
  .email()
  .transform((v) => v.trim().toLowerCase());

const password = z.string().min(8, "Password must be at least 8 characters").max(200);

const name = z.string().min(2).max(120).transform((v) => v.trim());

export const registerSchema = z
  .object({
    name,
    email,
    password,
  })
  .strict();

export const loginSchema = z
  .object({
    email,
    password,
  })
  .strict();

export const googleAuthSchema = z
  .object({
    // Prefer idToken from frontend (Google One Tap / Google Identity Services)
    idToken: z.string().min(1).optional(),
    // Optional: OAuth authorization code (PKCE/code flow)
    code: z.string().min(1).optional(),
  })
  .strict()
  .refine((v) => Boolean(v.idToken || v.code), {
    message: "Either idToken or code is required",
    path: ["idToken"],
  });

/**
 * By default we use httpOnly cookie for refresh token,
 * so body can be empty. Still allow optional refreshToken in body
 * for clients that don't use cookies.
 */
export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1).optional(),
  })
  .strict();

export const logoutSchema = z
  .object({
    refreshToken: z.string().min(1).optional(),
  })
  .strict();

export type RegisterDTO = z.infer<typeof registerSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
export type GoogleAuthDTO = z.infer<typeof googleAuthSchema>;
export type RefreshDTO = z.infer<typeof refreshSchema>;
export type LogoutDTO = z.infer<typeof logoutSchema>;
