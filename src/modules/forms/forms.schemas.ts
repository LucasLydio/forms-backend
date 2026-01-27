import { z } from "zod";

export const uuidParamSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export const createFormSchema = z
  .object({
    title: z.string().min(3).max(200).transform((v) => v.trim()),
    description: z.string().max(2000).optional().transform((v) => (v ? v.trim() : v)),
  })
  .strict();

export const updateFormSchema = z
  .object({
    title: z.string().min(3).max(200).optional().transform((v) => (v ? v.trim() : v)),
    description: z.string().max(2000).optional().transform((v) => (v ? v.trim() : v)),
  })
  .strict();

export const publishFormSchema = z
  .object({
    isPublished: z.boolean(),
  })
  .strict();

export const questionTypeSchema = z.enum(["text", "checkbox", "radio"]);

export const addQuestionSchema = z
  .object({
    prompt: z.string().min(1).max(2000).transform((v) => v.trim()),
    type: questionTypeSchema,
    isRequired: z.boolean().optional().default(false),
    orderIndex: z.number().int().min(0).optional().default(0),
    minChoices: z.number().int().min(0).optional(),
    maxChoices: z.number().int().min(0).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    // For text questions, min/max choices don't apply
    if (v.type === "text") {
      if (v.minChoices !== undefined || v.maxChoices !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "minChoices/maxChoices are not allowed for text questions",
          path: ["minChoices"],
        });
      }
      return;
    }

    // checkbox/radio: allow min/max but keep consistency
    if (v.minChoices !== undefined && v.maxChoices !== undefined && v.minChoices > v.maxChoices) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minChoices cannot be greater than maxChoices",
        path: ["minChoices"],
      });
    }

    if (v.type === "radio") {
      // radio should be exactly 1 choice effectively
      if (v.minChoices !== undefined && v.minChoices !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "radio questions must have minChoices = 1",
          path: ["minChoices"],
        });
      }
      if (v.maxChoices !== undefined && v.maxChoices !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "radio questions must have maxChoices = 1",
          path: ["maxChoices"],
        });
      }
    }
  });

export const addOptionSchema = z
  .object({
    label: z.string().min(1).max(500).transform((v) => v.trim()),
    value: z.string().min(1).max(200).transform((v) => v.trim()),
    orderIndex: z.number().int().min(0).optional().default(0),
  })
  .strict();

export const reorderQuestionsSchema = z
  .object({
    // array of question ids in the desired order (0..n-1)
    orderedQuestionIds: z.array(z.string().uuid()).min(1),
  })
  .strict();

export const reorderOptionsSchema = z
  .object({
    orderedOptionIds: z.array(z.string().uuid()).min(1),
  })
  .strict();

export const updateQuestionSchema = z
  .object({
    prompt: z.string().min(1).max(2000).optional().transform((v) => (v ? v.trim() : v)),
    type: z.enum(["text", "checkbox", "radio"]).optional(),
    isRequired: z.boolean().optional(),
    orderIndex: z.number().int().min(0).optional(),
    minChoices: z.number().int().min(0).optional(),
    maxChoices: z.number().int().min(0).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    // If type is explicitly "text", min/max must not be sent
    if (v.type === "text") {
      if (v.minChoices !== undefined || v.maxChoices !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "minChoices/maxChoices are not allowed for text questions",
          path: ["minChoices"],
        });
      }
    }

    // If both provided, min must be <= max
    if (v.minChoices !== undefined && v.maxChoices !== undefined && v.minChoices > v.maxChoices) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minChoices cannot be greater than maxChoices",
        path: ["minChoices"],
      });
    }

    // If type explicitly radio, min/max must be 1 if provided
    if (v.type === "radio") {
      if (v.minChoices !== undefined && v.minChoices !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "radio questions must have minChoices = 1",
          path: ["minChoices"],
        });
      }
      if (v.maxChoices !== undefined && v.maxChoices !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "radio questions must have maxChoices = 1",
          path: ["maxChoices"],
        });
      }
    }
  });

export const updateOptionSchema = z
  .object({
    label: z.string().min(1).max(500).optional().transform((v) => (v ? v.trim() : v)),
    value: z.string().min(1).max(200).optional().transform((v) => (v ? v.trim() : v)),
    orderIndex: z.number().int().min(0).optional(),
  })
  .strict();

export type UpdateQuestionDTO = z.infer<typeof updateQuestionSchema>;
export type UpdateOptionDTO = z.infer<typeof updateOptionSchema>;
export type CreateFormDTO = z.infer<typeof createFormSchema>;
export type UpdateFormDTO = z.infer<typeof updateFormSchema>;
export type PublishFormDTO = z.infer<typeof publishFormSchema>;
export type AddQuestionDTO = z.infer<typeof addQuestionSchema>;
export type AddOptionDTO = z.infer<typeof addOptionSchema>;
export type ReorderQuestionsDTO = z.infer<typeof reorderQuestionsSchema>;
export type ReorderOptionsDTO = z.infer<typeof reorderOptionsSchema>;
