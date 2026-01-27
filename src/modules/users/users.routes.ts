import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { z } from "zod";
import { usersController } from "./users.controller.js";
import { idParamSchema, updateUserSchema } from "./users.schemas.js";

export const usersRoutes = Router();



usersRoutes.get("/me", requireAuth, usersController.me);

// Admin-only
usersRoutes.get("/", requireAuth, requireRole("admin"), usersController.list);

usersRoutes.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validate(idParamSchema, "params"),
  validate(updateUserSchema, "body"),
  usersController.update
);

usersRoutes.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validate(idParamSchema, "params"),
  usersController.delete
);
