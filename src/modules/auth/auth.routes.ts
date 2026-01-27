import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../config/env.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { authController } from "./auth.controller.js";
import {
  googleAuthSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
} from "./auth.schemas.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const authRoutes = Router();

const authLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

authRoutes.post("/register", authLimiter, validate(registerSchema), authController.register);
authRoutes.post("/login", authLimiter, validate(loginSchema), authController.login);
authRoutes.post("/google", authLimiter, validate(googleAuthSchema), authController.google);

authRoutes.post("/refresh", authLimiter, validate(refreshSchema), asyncHandler(authController.refresh));
authRoutes.post("/logout", authLimiter, validate(logoutSchema), authController.logout);
