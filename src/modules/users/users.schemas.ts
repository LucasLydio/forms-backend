import { z } from "zod";

export const idParamSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export const updateUserSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    email: z.string().email().transform((v) => v.trim().toLowerCase()).optional(),
    role: z.enum(["admin", "creator", "common"]).optional(),
  })
  .strict();
  
  
  export type idParamsDTO = z.infer<typeof idParamSchema>;
  export type UpdateUserDTO = z.infer<typeof updateUserSchema>;