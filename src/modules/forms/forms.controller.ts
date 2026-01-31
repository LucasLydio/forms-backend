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

type SuccessResponse<T> = { success: true; data: T; message?: string };

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

    const forms = await formsService.listForUser(userId, role);

    const payload: SuccessResponse<typeof forms> = { success: true, data: forms };
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
    const { id } = req.params as { id: string }; // question id
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
    const { id } = req.params as { id: string }; // questionId
    const dto = req.body as UpdateQuestionDTO;

    const updated = await formsService.updateQuestion(id, userId, role, dto);

    return res.status(200).json({
      success: true,
      data: updated,
      message: "Question updated",
    });
  };

  deleteQuestion = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role as UserRole;
    const { id } = req.params as { id: string }; 

    const removed = await formsService.deleteQuestion(id, userId, role);

    return res.status(200).json({
      success: true,
      data: removed,
      message: "Question deleted",
    });
  };

  updateOption = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role as UserRole;
    const { id } = req.params as { id: string }; 
    const dto = req.body as UpdateOptionDTO;

    const updated = await formsService.updateOption(id, userId, role, dto);

    return res.status(200).json({
      success: true,
      data: updated,
      message: "Option updated",
    });
  };

  deleteOption = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role as UserRole;
    const { id } = req.params as { id: string }; 

    const removed = await formsService.deleteOption(id, userId, role);

    return res.status(200).json({
      success: true,
      data: removed,
      message: "Option deleted",
    });
  };
}

export const formsController = new FormsController();
