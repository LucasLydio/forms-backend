import { prisma } from "../../config/prisma.js";
import type { UserRole } from "../../utils/jwt.js";
import { badRequest, forbidden, notFound } from "../../utils/httpError.js";
import type {
  AddOptionDTO,
  AddQuestionDTO,
  CreateFormDTO,
  PublishFormDTO,
  UpdateFormDTO,
  UpdateOptionDTO,
  UpdateQuestionDTO,
} from "./forms.schemas.js";
import { cacheData, getCachedData, deleteCacheKeys, deleteCacheByPattern } from "../../utils/redis.js";
import { normalizeQuestionUpdate } from "./helpers/normalizeQuestionUpdate.js";
import { addQuestionOptions } from "./helpers/addQuestionOptions.js";

type PageArgs = { skip: number; take: number; page: number; pageSize: number };

const formSelect = {
  id: true,
  ownerUserId: true,
  title: true,
  description: true,
  isPublished: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

function canManageForm(role: UserRole): boolean {
  return role === "admin" || role === "creator";
}

async function assertCanAccessForm(params: {
  formId: string;
  userId: string;
  role: UserRole;
  requireOwnerForCreator?: boolean;
}) {
  const form = await prisma.form.findUnique({
    where: { id: params.formId },
    select: formSelect,
  });

  if (!form) throw notFound("Form not found");

  if (params.role === "admin") return form;

  if (params.role === "creator") {
    if (params.requireOwnerForCreator !== false && form.ownerUserId !== params.userId) {
      throw forbidden("You can only manage your own forms");
    }
    return form;
  }

  // common
  if (!form.isPublished) throw forbidden("Form is not published");
  return form;
}

export class FormsService {
  async create(userId: string, role: UserRole, dto: CreateFormDTO) {
    if (!canManageForm(role)) throw forbidden("Only admin/creator can create forms");

    const form = await prisma.form.create({
      data: {
        ownerUserId: userId,
        title: dto.title,
        description: dto.description ?? null,
        isPublished: false,
        publishedAt: null,
      },
      select: formSelect,
    });
    
    await deleteCacheByPattern("forms:list:*");

    return form;
  }

  async listForUser(userId: string, role: UserRole, pageArgs: PageArgs) {
    const { skip, take, page, pageSize } = pageArgs;

    let cacheKey = `forms:list:role=${role}:p${page}:s${pageSize}`;
    if (role === "creator") cacheKey += `:user=${userId}`;

    const cached = await getCachedData(cacheKey);
    if (cached) return cached as { data: any[]; total: number };

    const where =
      role === "creator"
        ? { ownerUserId: userId }
        : role === "common"
          ? { isPublished: true }
          : {}; 

    const orderBy =
      role === "common"
        ? [{ publishedAt: "desc" as const }]
        : [{ createdAt: "desc" as const }];

    const [data, total] = await Promise.all([
      prisma.form.findMany({
        where,
        skip,
        take,
        orderBy,
        select: formSelect,
      }),
      prisma.form.count({ where }),
    ]);

    const result = { data, total };
    await cacheData(cacheKey, result, 160);

    return result;
  }



  async getById(formId: string, userId: string, role: UserRole) {
    const form = await assertCanAccessForm({ formId, userId, role });

    const includeAllForManager = role === "admin" || (role === "creator" && form.ownerUserId === userId);

    const cacheKey = `form:${formId}`;

    const cachedForm = await getCachedData(cacheKey);
    if (cachedForm && cacheKey && cacheKey != ``) {
      return cachedForm;
    }

    const full = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        id: true,
        ownerUserId: true,
        title: true,
        description: true,
        isPublished: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        questions: {
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            prompt: true,
            type: true,
            isRequired: true,
            orderIndex: true,
            minChoices: true,
            maxChoices: true,
            createdAt: true,
            updatedAt: true,
            options: {
              orderBy: { orderIndex: "asc" },
              select: {
                id: true,
                label: true,
                value: true,
                orderIndex: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (!full) throw notFound("Form not found");
    
    await cacheData(cacheKey, full);
    

    return includeAllForManager ? full : full;
  }

  async update(formId: string, userId: string, role: UserRole, dto: UpdateFormDTO) {
    if (!canManageForm(role)) throw forbidden("Only admin/creator can update forms");

    const form = await assertCanAccessForm({ formId, userId, role });

    const updated = await prisma.form.update({
      where: { id: form.id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
      },
      select: {
        id: true,
        ownerUserId: true,
        title: true,
        description: true,
        isPublished: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await deleteCacheKeys([`form:${formId}`]);
    await deleteCacheByPattern("forms:list:*");

    return updated;
  }

  async publish(formId: string, userId: string, role: UserRole, dto: PublishFormDTO) {
    if (!canManageForm(role)) throw forbidden("Only admin/creator can publish forms");

    const form = await assertCanAccessForm({ formId, userId, role });

    const isPublished = dto.isPublished;
    const publishedAt = isPublished ? new Date() : null;

    const updated = await prisma.form.update({
      where: { id: form.id },
      data: { isPublished, publishedAt },
      select: {
        id: true,
        ownerUserId: true,
        title: true,
        description: true,
        isPublished: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await deleteCacheKeys([`form:${formId}`]);
    await deleteCacheByPattern("forms:list:*");

    return updated;
  }


  async remove(formId: string, userId: string, role: UserRole) {
    if (!canManageForm(role)) throw forbidden("Only admin/creator can delete forms");

    const form = await assertCanAccessForm({ formId, userId, role });

    await prisma.form.delete({ where: { id: form.id } });



    await deleteCacheKeys([`form:${formId}`]);
    await deleteCacheByPattern("forms:list:*");

    return { id: form.id };
  }

  async addQuestion(formId: string, userId: string, role: UserRole, dto: AddQuestionDTO) {
    if (!canManageForm(role)) throw forbidden("Only admin/creator can add questions");

    const form = await assertCanAccessForm({ formId, userId, role });

    const isText = dto.type === "text";
    const optionsToAdd = dto.optionsToAdd ?? [];

    if (isText && optionsToAdd.length) {
      throw badRequest("Text questions do not have options");
    }

    const created = await prisma.$transaction(async (tx) => {
      const q = await tx.question.create({
        data: {
          formId: form.id,
          prompt: dto.prompt,
          type: dto.type,
          isRequired: dto.isRequired ?? false,
          orderIndex: dto.orderIndex ?? 0,
          minChoices: isText ? null : (dto.minChoices ?? null),
          maxChoices: isText ? null : (dto.maxChoices ?? null),
        },
        select: {
          id: true,
          formId: true,
          prompt: true,
          type: true,
          isRequired: true,
          orderIndex: true,
          minChoices: true,
          maxChoices: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!isText && optionsToAdd.length) {
        await tx.questionOption.createMany({
          data: optionsToAdd.map((o) => ({
            questionId: q.id,
            label: o.label,
            value: o.value,
            orderIndex: o.orderIndex,
          })),
          skipDuplicates: true,
        });
      }

      // return with options (same shape as updateQuestion)
      const full = await tx.question.findUnique({
        where: { id: q.id },
        select: {
          id: true,
          formId: true,
          prompt: true,
          type: true,
          isRequired: true,
          orderIndex: true,
          minChoices: true,
          maxChoices: true,
          createdAt: true,
          updatedAt: true,
          options: {
            orderBy: { orderIndex: "asc" },
            select: {
              id: true,
              questionId: true,
              label: true,
              value: true,
              orderIndex: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
      
      return full!;
    });

    await deleteCacheKeys([`form:${formId}`]);
    await deleteCacheByPattern("forms:list:*");

    return created;
  }


  async addOption(questionId: string, userId: string, role: UserRole, dto: AddOptionDTO) {
    if (!canManageForm(role)) throw forbidden("Only admin/creator can add options");

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, type: true, formId: true },
    });
    if (!question) throw notFound("Question not found");

    if (question.type === "text") throw badRequest("Text questions cannot have options");

    await assertCanAccessForm({ formId: question.formId, userId, role });

    const opt = await prisma.questionOption.create({
      data: {
        questionId: question.id,
        label: dto.label,
        value: dto.value,
        orderIndex: dto.orderIndex,
      },
      select: {
        id: true,
        questionId: true,
        label: true,
        value: true,
        orderIndex: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    

    await deleteCacheKeys([`form:${question.formId}`]);
    await deleteCacheByPattern("forms:list:*");

    return opt;
  }


  async updateQuestion(questionId: string, userId: string, role: UserRole, dto: UpdateQuestionDTO) {
    if (!canManageForm(role)) throw forbidden("Only admin/creator can edit questions");
    if (!dto || Object.keys(dto).length === 0) throw badRequest("No fields provided to update");

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, formId: true, type: true },
    });
    if (!question) throw notFound("Question not found");

    await assertCanAccessForm({ formId: question.formId, userId, role });

    const { nextType, data, shouldDeleteOptions } = normalizeQuestionUpdate(question.type, dto);

    const optionsToAdd = dto.optionsToAdd ?? [];
    if (nextType === "text" && optionsToAdd.length) {
      throw badRequest("Text questions do not have options");
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (shouldDeleteOptions) {
        await tx.questionOption.deleteMany({ where: { questionId } });
      }

      if (!shouldDeleteOptions && optionsToAdd.length) {
        await addQuestionOptions(tx, questionId, optionsToAdd);
      }

      const q = await tx.question.update({
        where: { id: questionId },
        data,
        select: {
          id: true,
          formId: true,
          prompt: true,
          type: true,
          isRequired: true,
          orderIndex: true,
          minChoices: true,
          maxChoices: true,
          createdAt: true,
          updatedAt: true,
          options: {
            orderBy: { orderIndex: "asc" },
            select: {
              id: true,
              questionId: true,
              label: true,
              value: true,
              orderIndex: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });


    await deleteCacheKeys([`form:${question.formId}`]);
    await deleteCacheByPattern("forms:list:*");

      return q;
    });

    return updated;
  }


  async deleteQuestion(questionId: string, userId: string, role: UserRole) {
    if (!canManageForm(role)) throw forbidden("Only admin/creator can delete questions");

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, formId: true },
    });
    if (!question) throw notFound("Question not found");

    await assertCanAccessForm({ formId: question.formId, userId, role });

    await prisma.question.delete({ where: { id: questionId } });



    await deleteCacheKeys([`form:${question.formId}`]);
    await deleteCacheByPattern("forms:list:*");

    return { id: questionId };
  }

  async updateOption(optionId: string, userId: string, role: UserRole, dto: UpdateOptionDTO) {
    if (!canManageForm(role)) throw forbidden("Only admin/creator can edit options");
    if (!dto || Object.keys(dto).length === 0) throw badRequest("No fields provided to update");

    const opt = await prisma.questionOption.findUnique({
      where: { id: optionId },
      select: {
        id: true,
        questionId: true,
        question: { select: { id: true, type: true, formId: true } },
      },
    });
    if (!opt) throw notFound("Option not found");

    if (opt.question.type === "text") throw badRequest("Text questions do not have options");

    await assertCanAccessForm({ formId: opt.question.formId, userId, role });

    try {
      const updated = await prisma.questionOption.update({
        where: { id: optionId },
        data: {
          ...(dto.label !== undefined ? { label: dto.label } : {}),
          ...(dto.value !== undefined ? { value: dto.value } : {}),
          ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
        },
        select: {
          id: true,
          questionId: true,
          label: true,
          value: true,
          orderIndex: true,
          createdAt: true,
          updatedAt: true,
        },
      });



    await deleteCacheKeys([`form:${opt.question.formId}`]);
    await deleteCacheByPattern("forms:list:*");

      return updated;
    } catch (e: any) {
      throw e;
    }
  }

  async deleteOption(optionId: string, userId: string, role: UserRole) {
    if (!canManageForm(role)) throw forbidden("Only admin/creator can delete options");

    const opt = await prisma.questionOption.findUnique({
      where: { id: optionId },
      select: {
        id: true,
        question: { select: { type: true, formId: true } },
      },
    });
    if (!opt) throw notFound("Option not found");

    if (opt.question.type === "text") throw badRequest("Text questions do not have options");

    await assertCanAccessForm({ formId: opt.question.formId, userId, role });

    await prisma.questionOption.delete({ where: { id: optionId } });

    await deleteCacheKeys([`form:${opt.question.formId}`]);
    await deleteCacheByPattern("forms:list:*");

    return { id: optionId };
  }
}

export const formsService = new FormsService();
