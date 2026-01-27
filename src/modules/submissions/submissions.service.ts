import { prisma } from "../../config/prisma.js";
import type { UserRole } from "../../utils/jwt.js";
import { badRequest, forbidden, notFound } from "../../utils/httpError.js";
import type { UpsertAnswerDTO } from "./submissions.schemas.js";

async function getSubmissionOrThrow(submissionId: string) {
  const submission = await prisma.formSubmission.findUnique({
    where: { id: submissionId },
    include: {
      form: { select: { id: true, isPublished: true, ownerUserId: true } },
    },
  });

  if (!submission) throw notFound("Submission not found");
  return submission;
}

function canStartUnpublishedForm(params: { role: UserRole; userId: string; ownerUserId: string }) {
  if (params.role === "admin") return true;
  if (params.role === "creator" && params.userId === params.ownerUserId) return true;
  return false;
}

export class SubmissionsService {

  async start(formId: string, userId: string, role: UserRole) {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { id: true, isPublished: true, ownerUserId: true, title: true },
    });

    if (!form) throw notFound("Form not found");

    if (!form.isPublished) {
      const allowed = canStartUnpublishedForm({ role, userId, ownerUserId: form.ownerUserId });
      if (!allowed) throw forbidden("Form is not published");
    }


    const existing = await prisma.formSubmission.findFirst({
      where: { formId, respondentUserId: userId, status: "in_progress" },
      select: {
        id: true,
        formId: true,
        respondentUserId: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (existing) return existing;

    const created = await prisma.formSubmission.create({
      data: {
        formId,
        respondentUserId: userId,
        status: "in_progress",
        startedAt: new Date(),
      },
      select: {
        id: true,
        formId: true,
        respondentUserId: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return created;
  }

  async listByForm(formId: string, userId: string, role: UserRole) {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { id: true, ownerUserId: true, isPublished: true },
    });

    if (!form) throw notFound("Form not found");

    if (role !== "admin" && form.ownerUserId !== userId) {
      throw forbidden("You are not allowed to view submissions for this form");
    }

    const submissions = await prisma.formSubmission.findMany({
      where: { formId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        formId: true,
        respondentUserId: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        createdAt: true,
        updatedAt: true,
        answers: {
          select: {
            questionId: true,
            textValue: true,
            selectedOptions: { select: { optionId: true } },
          },
        },
      },
    });

    return submissions;
  }

  async upsertAnswersAndSubmit(submissionId: string, userId: string, dtos: Array<any>) {
    const submission = await getSubmissionOrThrow(submissionId);

    if (submission.status !== "in_progress") throw forbidden("Submission is not in progress");
    if (submission.respondentUserId !== userId) throw forbidden("You can only answer your own submission");

    const questionIds = Array.from(new Set(dtos.map((d: any) => d.questionId)));

    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, formId: true, type: true, isRequired: true, minChoices: true, maxChoices: true },
    });

    if (questions.length !== questionIds.length) throw badRequest("One or more questions not found");

    for (const q of questions) {
      if (q.formId !== submission.formId) throw badRequest("Question does not belong to this form");
    }

    const optionIds = Array.from(new Set(dtos.flatMap((d: any) => d.selectedOptionIds ?? [])));
    if (optionIds.length > 0) {
      const foundOptions = await prisma.questionOption.findMany({ where: { id: { in: optionIds } }, select: { id: true, questionId: true } });
      if (foundOptions.length !== optionIds.length) throw badRequest("One or more selected options are invalid");
    }

    await prisma.$transaction(async (tx: any) => {
      for (const dto of dtos) {
        const question = questions.find((x) => x.id === dto.questionId)!;

        if (question.type === "text") {
          if (dto.selectedOptionIds && dto.selectedOptionIds.length > 0) throw badRequest("Text questions cannot have selectedOptionIds");
          if (dto.textValue === undefined) throw badRequest("textValue is required for text questions");
        } else {
          if (dto.textValue !== undefined) throw badRequest("Checkbox/Radio questions cannot have textValuey");
          const uniqueSelected = Array.from(new Set(dto.selectedOptionIds ?? []));
          if (question.type === "radio" && uniqueSelected.length > 1) throw badRequest("Radio questions allow only one selected option");
        }

        const answer = await tx.answer.upsert({
          where: { submissionId_questionId: { submissionId, questionId: question.id } },
          update: { textValue: question.type === "text" ? (dto.textValue ?? null) : null },
          create: { submissionId, questionId: question.id, textValue: question.type === "text" ? (dto.textValue ?? null) : null },
          select: { id: true },
        });

        if (question.type !== "text") {
          const selected = Array.from(new Set(dto.selectedOptionIds ?? []));
          await tx.answerSelectedOption.deleteMany({ where: { answerId: answer.id } });
          if (selected.length > 0) {
            await tx.answerSelectedOption.createMany({
              data: selected.map((optionId: any) => ({ answerId: answer.id, optionId })),
              skipDuplicates: true,
            });
          }
        } else {
          await tx.answerSelectedOption.deleteMany({ where: { answerId: answer.id } });
        }
      }
    });

    const result = await this.submit(submissionId, userId);
    return result;
  }


  async upsertAnswer(submissionId: string, userId: string, dto: UpsertAnswerDTO) {
    const submission = await getSubmissionOrThrow(submissionId);

    if (submission.status !== "in_progress") throw forbidden("Submission is not in progress");
    if (submission.respondentUserId !== userId) throw forbidden("You can only answer your own submission");

    const question = await prisma.question.findUnique({
      where: { id: dto.questionId },
      select: {
        id: true,
        formId: true,
        type: true,
        isRequired: true,
        minChoices: true,
        maxChoices: true,
      },
    });

    if (!question) throw notFound("Question not found");
    if (question.formId !== submission.formId) throw badRequest("Question does not belong to this form");


    if (question.type === "text") {
      if (dto.selectedOptionIds && dto.selectedOptionIds.length > 0) {
        throw badRequest("Text questions cannot have selectedOptionIds");
      }
      if (dto.textValue === undefined) {
        throw badRequest("textValue is required for text questions");
      }
    } else {
      if (dto.textValue !== undefined) {
        throw badRequest("Checkbox/Radio questions cannot have textValuey");
      }

      const selected = dto.selectedOptionIds ?? [];
      const uniqueSelected = Array.from(new Set(selected));

      if (question.type === "radio" && uniqueSelected.length > 1) {
        throw badRequest("Radio questions allow only one selected option");
      }

      if (uniqueSelected.length > 0) {
        const found = await prisma.questionOption.findMany({
          where: { id: { in: uniqueSelected }, questionId: question.id },
          select: { id: true },
        });

        if (found.length !== uniqueSelected.length) {
          throw badRequest("One or more selected options are invalid for this question");
        }
      }
    }


    const answer = await prisma.answer.upsert({
      where: {
        submissionId_questionId: {
          submissionId,
          questionId: question.id,
        },
      },
      update: {
        textValue: question.type === "text" ? (dto.textValue ?? null) : null,
      },
      create: {
        submissionId,
        questionId: question.id,
        textValue: question.type === "text" ? (dto.textValue ?? null) : null,
      },
      select: {
        id: true,
        submissionId: true,
        questionId: true,
        textValue: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (question.type !== "text") {
      const selected = Array.from(new Set(dto.selectedOptionIds ?? []));

      await prisma.$transaction(async (tx: any) => {
        await tx.answerSelectedOption.deleteMany({
          where: { answerId: answer.id },
        });

        if (selected.length > 0) {
          await tx.answerSelectedOption.createMany({
            data: selected.map((optionId) => ({
              answerId: answer.id,
              optionId,
            })),
            skipDuplicates: true,
          });
        }
      });
    } else {

      await prisma.answerSelectedOption.deleteMany({ where: { answerId: answer.id } });
    }

    const full = await prisma.answer.findUnique({
      where: { id: answer.id },
      select: {
        id: true,
        submissionId: true,
        questionId: true,
        textValue: true,
        createdAt: true,
        updatedAt: true,
        selectedOptions: {
          select: {
            id: true,
            optionId: true,
            createdAt: true,
            option: { select: { id: true, label: true, value: true } },
          },
        },
      },
    });

    return full!;
  }


  async submit(submissionId: string, userId: string) {
    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        status: true,
        respondentUserId: true,
        form: {
          select: {
            id: true,
            questions: {
              select: {
                id: true,
                type: true,
                isRequired: true,
                minChoices: true,
                maxChoices: true,
              },
            },
          },
        },
        answers: {
          select: {
            questionId: true,
            textValue: true,
            selectedOptions: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!submission) throw notFound("Submission not found");
    if (submission.status !== "in_progress") throw forbidden("Submission is not in progress");
    if (submission.respondentUserId !== userId) throw forbidden("You can only submit your own submission");

    const answersByQuestion = new Map<string, (typeof submission.answers)[number]>();
    for (const a of submission.answers) answersByQuestion.set(a.questionId, a);

    for (const q of submission.form.questions) {
      const ans = answersByQuestion.get(q.id);

      if (q.type === "text") {
        const hasText =
          ans?.textValue !== null &&
          ans?.textValue !== undefined &&
          ans.textValue.trim().length > 0;

        if (q.isRequired && !hasText) {
          throw badRequest("Missing required text answer", { questionId: q.id });
        }
      } else {
        const count = ans?.selectedOptions?.length ?? 0;

        if (q.isRequired && (q.minChoices ?? 1) > count) {
          throw badRequest("Not enough selected options", {
            questionId: q.id,
            minChoices: q.minChoices ?? 1,
          });
        }

        if (q.minChoices !== null && q.minChoices !== undefined && count < q.minChoices) {
          throw badRequest("Not enough selected options", { questionId: q.id, minChoices: q.minChoices });
        }
        if (q.maxChoices !== null && q.maxChoices !== undefined && count > q.maxChoices) {
          throw badRequest("Too many selected options", { questionId: q.id, maxChoices: q.maxChoices });
        }

        if (q.type === "radio") {
          if (q.isRequired && count !== 1) {
            throw badRequest("Radio question must have exactly one selected option", { questionId: q.id });
          }
          if (!q.isRequired && count > 1) {
            throw badRequest("Radio question must have at most one selected option", { questionId: q.id });
          }
        }
      }
    }

    const updated = await prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        status: "submitted",
        submittedAt: new Date(),
      },
      select: {
        id: true,
        formId: true,
        respondentUserId: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

}

export const submissionsService = new SubmissionsService();
