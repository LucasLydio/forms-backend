import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { formsController } from "./forms.controller.js";
import {
  addOptionSchema,
  addQuestionSchema,
  createFormSchema,
  publishFormSchema,
  updateFormSchema,
  updateOptionSchema,
  updateQuestionSchema,
  uuidParamSchema,
} from "./forms.schemas.js";
import { z } from "zod";

export const formsRoutes = Router();

const questionIdParamSchema = z.object({ id: z.string().uuid() }).strict(); 
const optionIdParamSchema = z.object({ id: z.string().uuid() }).strict(); 

const formIdParamSchema = uuidParamSchema;


formsRoutes.use(requireAuth);


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


formsRoutes.post(
  "/:id/questions",
  validate(formIdParamSchema, "params"),
  validate(addQuestionSchema),
  formsController.addQuestion
);


formsRoutes.post(
  "/questions/:id/options",
  validate(questionIdParamSchema, "params"),
  validate(addOptionSchema),
  formsController.addOption
);


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

