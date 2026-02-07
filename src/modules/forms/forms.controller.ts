import type { Request, Response } from "express";
import type { UserRole } from "../../utils/jwt.js";
import { formsService } from "./forms.service.js";
import type {
  AddOptionDTO,
  AddQuestionDTO,
  CreateFormDTO,
  PublishFormDTO,
  UpdateFormDTO,
  UpdateOptionDTO,
  UpdateQuestionDTO,
} from "./forms.schemas.js";
import { SuccessResponse } from "../../utils/response.js";
import { pagination } from "../../utils/pagination.js";


export class FormsController {
  create = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role as UserRole;
    const dto = req.body as CreateFormDTO;

    const form = await formsService.create(userId, role, dto);

    const payload: SuccessResponse<typeof form> = {
      success: true,
      data: form,
      message: "Form created",
    };
    return res.status(201).json(payload);
  };


  list = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role as UserRole;

    const { page, pageSize, skip, take } = pagination(req.query.page, req.query.pageSize);

    const { data, total } = await formsService.listForUser(userId, role, { skip, take, page, pageSize });

    const payload: SuccessResponse<typeof data> = {
      success: true,
      data,
      meta: {
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    };

    return res.status(200).json(payload);
  };

  getById = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role as UserRole;
    const { id } = req.params as { id: string };

    const form = await formsService.getById(id, userId, role);

    const payload: SuccessResponse<typeof form> = { success: true, data: form };
    return res.status(200).json(payload);
  };

  update = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role as UserRole;
    const { id } = req.params as { id: string };
    const dto = req.body as UpdateFormDTO;

    const updated = await formsService.update(id, userId, role, dto);

    const payload: SuccessResponse<typeof updated> = {
      success: true,
      data: updated,
      message: "Form updated",
    };
    return res.status(200).json(payload);
  };

  publish = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role as UserRole;
    const { id } = req.params as { id: string };
    const dto = req.body as PublishFormDTO;

    const updated = await formsService.publish(id, userId, role, dto);

    const payload: SuccessResponse<typeof updated> = {
      success: true,
      data: updated,
      message: dto.isPublished ? "Form published" : "Form unpublished",
    };
    return res.status(200).json(payload);
  };

  remove = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role as UserRole;
    const { id } = req.params as { id: string };

    const removed = await formsService.remove(id, userId, role);

    const payload: SuccessResponse<typeof removed> = {
      success: true,
      data: removed,
      message: "Form deleted",
    };
    return res.status(200).json(payload);
  };

  addQuestion = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role as UserRole;
    const { id } = req.params as { id: string };
    const dto = req.body as AddQuestionDTO;

    const q = await formsService.addQuestion(id, userId, role, dto);

    const payload: SuccessResponse<typeof q> = {
      success: true,
      data: q,
      message: "Question added",
    };
    return res.status(201).json(payload);
  };

  addOption = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role as UserRole;
    const { id } = req.params as { id: string };
    const dto = req.body as AddOptionDTO;

    const opt = await formsService.addOption(id, userId, role, dto);

    const payload: SuccessResponse<typeof opt> = {
      success: true,
      data: opt,
      message: "Option added",
    };
    return res.status(201).json(payload);
  };

  updateQuestion = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role as UserRole;
    const { id } = req.params as { id: string };
    const dto = req.body as UpdateQuestionDTO;

    const updated = await formsService.updateQuestion(id, userId, role, dto);

    const payload: SuccessResponse<typeof updated> = {
      success: true,
      data: updated,
      message: "Question updated",
    };

    return res.status(200).json(payload);
  };

  deleteQuestion = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role as UserRole;
    const { id } = req.params as { id: string };

    const removed = await formsService.deleteQuestion(id, userId, role);

    const payload: SuccessResponse<typeof removed> = {
      success: true,
      data: removed,
      message: "Question deleted",
    };

    return res.status(200).json(payload);
  };

  updateOption = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role as UserRole;
    const { id } = req.params as { id: string };
    const dto = req.body as UpdateOptionDTO;

    const updated = await formsService.updateOption(id, userId, role, dto);

    const payload: SuccessResponse<typeof updated> = {
      success: true,
      data: updated,
      message: "Option updated",
    };

    return res.status(200).json(payload);
  };

  deleteOption = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role as UserRole;
    const { id } = req.params as { id: string };

    const removed = await formsService.deleteOption(id, userId, role);

    const payload: SuccessResponse<typeof removed> = {
      success: true,
      data: removed,
      message: "Option deleted",
    };

    return res.status(200).json(payload);
  };
}

export const formsController = new FormsController();
