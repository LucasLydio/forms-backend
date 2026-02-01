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
import { cacheData, getCachedData, deleteCacheKeys } from "../../utils/redis.js";

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
    select: {
      id: true,
      ownerUserId: true,
      isPublished: true,
      publishedAt: true,
      title: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
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


    await deleteCacheKeys([
      "forms:list:role=admin",
      `forms:list:role=creator:user=${userId}`,
      "forms:list:role=common",
    ]);

    return form;
  }

async listForUser(userId: string, role: UserRole) {
  let cacheKey = `forms:list:role=${role}`;

  if (role === "creator") {
    cacheKey += `:user=${userId}`;
  }

  const cached = await getCachedData(cacheKey);
  if (cached) return cached;

  let forms: any[] = [];

  if (role === "admin") {
    forms = await prisma.form.findMany({
      orderBy: { createdAt: "desc" },
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
  } else if (role === "creator") {
    forms = await prisma.form.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: "desc" },
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
  } else {
    forms = await prisma.form.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
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
  }

  await cacheData(cacheKey, forms, 160);
  return forms;
}


  async getById(formId: string, userId: string, role: UserRole) {
    const form = await assertCanAccessForm({ formId, userId, role });

    const includeAllForManager = role === "admin" || (role === "creator" && form.ownerUserId === userId);

    const cacheKey = `form:${formId}`;

    const cachedForm = await getCachedData(cacheKey);
    if (cachedForm && cacheKey) {
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

    await deleteCacheKeys([
      "forms:list:role=admin",
      `forms:list:role=creator:user=${updated.ownerUserId}`,
      `form:${formId}`,
      "forms:list:role=common",
    ]);

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

    await deleteCacheKeys([
      "forms:list:role=admin",
      `forms:list:role=creator:user=${updated.ownerUserId}`,
      "forms:list:role=common",
      `form:${formId}`,
    ]);

    return updated;
  }


  async remove(formId: string, userId: string, role: UserRole) {
    if (!canManageForm(role)) throw forbidden("Only admin/creator can delete forms");

    const form = await assertCanAccessForm({ formId, userId, role });

    await prisma.form.delete({ where: { id: form.id } });

    await deleteCacheKeys([
      "forms:list:role=admin",
      `forms:list:role=creator:user=${userId}`,
      "forms:list:role=common",
      `form:${formId}`,
    ]);

    return { id: form.id };
  }

  async addQuestion(formId: string, userId: string, role: UserRole, dto: AddQuestionDTO) {
    if (!canManageForm(role)) throw forbidden("Only admin/creator can add questions");

    const form = await assertCanAccessForm({ formId, userId, role });

    if(dto.type === "text") {
      dto.maxChoices = undefined;
      dto.minChoices = undefined;
    }

    const q = await prisma.question.create({
      data: {
        formId: form.id,
        prompt: dto.prompt,
        type: dto.type,
        isRequired: dto.isRequired,
        orderIndex: dto.orderIndex,
        minChoices: dto.type === "text" ? null : (dto.minChoices ?? null),
        maxChoices: dto.type === "text" ? null : (dto.maxChoices ?? null),
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

    const n = await deleteCacheKeys([
      "forms:list:role=admin",
      `forms:list:role=creator:user=${userId}`,
      "forms:list:role=common",
      `form:${formId}`,
    ]);

    return q;
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

    await deleteCacheKeys([
      "forms:list:role=admin",
      `forms:list:role=creator:user=${userId}`,
      "forms:list:role=common",
      `forms:${question.formId}`,
    ]);

    return opt;
  }

  async updateQuestion(questionId: string, userId: string, role: UserRole, dto: UpdateQuestionDTO) {
    if (!canManageForm(role)) throw forbidden("Only admin/creator can edit questions");
    if (!dto || Object.keys(dto).length === 0) throw badRequest("No fields provided to update");

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        formId: true,
        type: true,
      },
    });
    if (!question) throw notFound("Question not found");

    await assertCanAccessForm({ formId: question.formId, userId, role });

    const nextType = dto.type ?? question.type;

    const isText = nextType === "text";

    if (nextType === "radio") {
      if (dto.minChoices !== undefined && dto.minChoices !== 1) throw badRequest("radio questions must have minChoices = 1");
      if (dto.maxChoices !== undefined && dto.maxChoices !== 1) throw badRequest("radio questions must have maxChoices = 1");
    }

    if (isText && (dto.minChoices !== undefined || dto.maxChoices !== undefined)) {
      throw badRequest("minChoices/maxChoices are not allowed for text questions");
    }

    const updated = await prisma.$transaction(async (tx) => {

      if (isText) {
        await tx.questionOption.deleteMany({ where: { questionId } });
      }

      const q = await tx.question.update({
        where: { id: questionId },
        data: {
          ...(dto.prompt !== undefined ? { prompt: dto.prompt } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.isRequired !== undefined ? { isRequired: dto.isRequired } : {}),
          ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
          ...(isText
            ? { minChoices: null, maxChoices: null }
            : {
                ...(dto.minChoices !== undefined ? { minChoices: dto.minChoices } : {}),
                ...(dto.maxChoices !== undefined ? { maxChoices: dto.maxChoices } : {}),
              }),
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

      await deleteCacheKeys([
        "forms:list:role=admin",
        `forms:list:role=creator:user=${userId}`,
        "forms:list:role=common",
        `forms:${question.formId}`,
      ]);

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

    await deleteCacheKeys([
      "forms:list:role=admin",
      `forms:list:role=creator:user=${userId}`,
      "forms:list:role=common",
      `forms:${question.formId}`,
    ]);

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

      await deleteCacheKeys([
        "forms:list:role=admin",
        `forms:list:role=creator:user=${userId}`,
        "forms:list:role=common",
        `forms:${opt.question.formId}`,
      ]);

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

    await deleteCacheKeys([
      "forms:list:role=admin",
      `forms:list:role=creator:user=${userId}`,
      "forms:list:role=common",
      `forms:${opt.question.formId}`,
    ]);

    return { id: optionId };
  }
}

export const formsService = new FormsService();
