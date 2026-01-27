import pino from "pino";
import { pinoHttp } from "pino-http";
import type { Request, Response } from "express";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.refreshToken",
      "res.headers['set-cookie']",
    ],
    remove: true,
  },
});

export const httpLogger = pinoHttp<Request, Response>({
  logger,

  autoLogging: {
    ignore: (req) => req.url === "/health",
  },

  customProps: (req) => ({
    requestId: (req as any).id,
  }),

  // ✅ make it stop dumping all headers
  serializers: {
    req(req) {
      return {
        id: (req as any).id,
        method: req.method,
        url: req.url,
        ip: req.remoteAddress,
        // include user agent only if you want it
        // ua: req.headers["user-agent"],
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },

  // ✅ nicer one-line message
  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} -> ${res.statusCode}`,

  // ✅ sensible log levels
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
});
