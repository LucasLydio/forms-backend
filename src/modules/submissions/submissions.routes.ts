import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { submissionsController } from "./submissions.controller.js";
import { formIdParamSchema, submissionIdParamSchema, upsertAnswerSchema, upsertAnswersSchema } from "./submissions.schemas.js";

export const submissionsRoutes = Router();

submissionsRoutes.use(requireAuth);

submissionsRoutes.post(
  "/forms/:formId/submissions/start",
  validate(formIdParamSchema, "params"),
  submissionsController.start
);

submissionsRoutes.get(
  "/forms/:formId/submissions",
  validate(formIdParamSchema, "params"),
  submissionsController.listByForm
);

submissionsRoutes.patch(
  "/submissions/:id/answers",
  validate(submissionIdParamSchema, "params"),
  validate(upsertAnswerSchema),
  submissionsController.upsertAnswer
);

submissionsRoutes.patch(
  "/submissions/:id/answers/batch",
  validate(submissionIdParamSchema, "params"),
  validate(upsertAnswersSchema),
  submissionsController.upsertAnswersBatch
);

submissionsRoutes.post(
  "/submissions/:id/submit",
  validate(submissionIdParamSchema, "params"),
  submissionsController.submit
);
