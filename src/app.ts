import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { httpLogger } from "./utils/logger.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { formsRoutes } from "./modules/forms/forms.routes.js";
import { submissionsRoutes } from "./modules/submissions/submissions.routes.js";

export const app = express();

// ✅ Avoid 304/ETag issues for auth/session flows (safe for internal apps)
// If you prefer only per-route no-store, you can remove this and keep the middleware below.
app.disable("etag");

// Trust proxy (useful behind reverse proxies; required for secure cookies in some setups)
app.set("trust proxy", 1);

// Logging
app.use(httpLogger);

// Security headers
app.use(helmet());

// Body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Cookies
app.use(cookieParser());

const corsOrigins =
  env.CORS_ORIGIN?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const allowed = corsOrigins.includes(origin);
      return callback(allowed ? null : new Error("Not allowed by CORS"), allowed);
    },
    credentials: true,
  })
);

// ✅ Prevent browser caching on session/auth endpoints
app.use((req, res, next) => {
  // These endpoints should never be cached by browsers/proxies
  if (
    req.path === "/users/me" ||
    req.path.startsWith("/auth")
  ) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, data: { status: "ok" } });
});

// Routes
app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/forms", formsRoutes);
app.use("/", submissionsRoutes);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { message: "Route not found", code: "NOT_FOUND" },
  });
});

// Error handler (must be last)
app.use(errorMiddleware);
