import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { formsController } from "./forms.controller.js";
import {
  addOptionSchema,
  addQuestionSchema,
  createFormSchema,
  publishFormSchema,
  reorderOptionsSchema,
  reorderQuestionsSchema,
  updateFormSchema,
  updateOptionSchema,
  updateQuestionSchema,
  uuidParamSchema,
} from "./forms.schemas.js";
import { z } from "zod";

export const formsRoutes = Router();

const questionIdParamSchema = z.object({ id: z.string().uuid() }).strict(); // /questions/:id
const optionIdParamSchema = z.object({ id: z.string().uuid() }).strict(); // /options/:id

const formIdParamSchema = uuidParamSchema;

// All forms endpoints require auth (common users can still list published + view published)
formsRoutes.use(requireAuth);

// CRUD forms
formsRoutes.post("/", validate(createFormSchema), formsController.create);
formsRoutes.get("/", formsController.list);
formsRoutes.get("/:id", validate(formIdParamSchema, "params"), formsController.getById);
formsRoutes.patch("/:id", validate(formIdParamSchema, "params"), validate(updateFormSchema), formsController.update);
formsRoutes.patch(
  "/:id/publish",
  validate(formIdParamSchema, "params"),
  validate(publishFormSchema),
  formsController.publish
);
formsRoutes.delete("/:id", validate(formIdParamSchema, "params"), formsController.remove);

// Questions
formsRoutes.post(
  "/:id/questions",
  validate(formIdParamSchema, "params"),
  validate(addQuestionSchema),
  formsController.addQuestion
);

// Options (route in same router for convenience)
formsRoutes.post(
  "/questions/:id/options",
  validate(questionIdParamSchema, "params"),
  validate(addOptionSchema),
  formsController.addOption
);

// Reorder
formsRoutes.patch(
  "/:id/questions/reorder",
  validate(formIdParamSchema, "params"),
  validate(reorderQuestionsSchema),
  formsController.reorderQuestions
);

formsRoutes.patch(
  "/questions/:id/options/reorder",
  validate(questionIdParamSchema, "params"),
  validate(reorderOptionsSchema),
  formsController.reorderOptions
);

// Update/Delete Question
formsRoutes.patch(
  "/questions/:id",
  validate(questionIdParamSchema, "params"),
  validate(updateQuestionSchema),
  formsController.updateQuestion
);

formsRoutes.delete(
  "/questions/:id",
  validate(questionIdParamSchema, "params"),
  formsController.deleteQuestion
);

// Update/Delete Option
formsRoutes.patch(
  "/options/:id",
  validate(optionIdParamSchema, "params"),
  validate(updateOptionSchema),
  formsController.updateOption
);

formsRoutes.delete(
  "/options/:id",
  validate(optionIdParamSchema, "params"),
  formsController.deleteOption
);

