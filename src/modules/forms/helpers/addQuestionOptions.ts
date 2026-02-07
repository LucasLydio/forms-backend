import { Prisma } from "@prisma/client";
import { badRequest } from "../../../utils/httpError.js";

type Tx = Prisma.TransactionClient;

type NewOption = {
  label: string;
  value: string;
  orderIndex: number;
};

export async function addQuestionOptions(tx: Tx, questionId: string, options: NewOption[]) {
  if (!options.length) return;

  try {
    await tx.questionOption.createMany({
      data: options.map((o) => ({
        questionId,
        label: o.label,
        value: o.value,
        orderIndex: o.orderIndex,
      })),
      skipDuplicates: true, 
    });
  } catch (e: any) {
    // If you prefer strict behavior (error on duplicates), remove skipDuplicates and handle P2002
    throw badRequest("Failed to add options");
  }
}
