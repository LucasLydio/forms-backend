import { z } from "zod";

export const formIdParamSchema = z
  .object({
    formId: z.string().uuid(),
  })
  .strict();

export const submissionIdParamSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();


export const upsertAnswerSchema = z
  .object({
    questionId: z.string().uuid(),
    textValue: z.string().max(10000).optional(),
    selectedOptionIds: z.array(z.string().uuid()).optional(),
  })
  .strict()
  .refine((v) => !(v.textValue !== undefined && v.selectedOptionIds !== undefined), {
    message: "Provide either textValue OR selectedOptionIds (not both)",
    path: ["textValue"],
  });

export const upsertAnswersSchema = z.array(upsertAnswerSchema).min(1);

export type UpsertAnswersDTO = z.infer<typeof upsertAnswersSchema>;

export type UpsertAnswerDTO = z.infer<typeof upsertAnswerSchema>;
