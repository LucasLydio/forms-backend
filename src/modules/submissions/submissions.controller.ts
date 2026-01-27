import type { Request, Response } from "express";
import type { UserRole } from "../../utils/jwt.js";
import { submissionsService } from "./submissions.service.js";
import type { UpsertAnswerDTO, UpsertAnswersDTO } from "./submissions.schemas.js";

type SuccessResponse<T> = { success: true; data: T; message?: string };

export class SubmissionsController {
  start = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role as UserRole;
    const { formId } = req.params as { formId: string };

    const submission = await submissionsService.start(formId, userId, role);

    const payload: SuccessResponse<typeof submission> = {
      success: true,
      data: submission,
      message: "Submission started",
    };

    return res.status(201).json(payload);
  };

  listByForm = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role as UserRole;
    const { formId } = req.params as { formId: string };

    const submissions = await submissionsService.listByForm(formId, userId, role);

    const payload: SuccessResponse<typeof submissions> = {
      success: true,
      data: submissions,
      message: "Submissions retrieved",
    };

    return res.status(200).json(payload);
  };

  upsertAnswersBatch = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params as { id: string };
    const dtos = req.body as UpsertAnswersDTO;

    const updated = await submissionsService.upsertAnswersAndSubmit(id, userId, dtos);

    const payload: SuccessResponse<typeof updated> = {
      success: true,
      data: updated,
      message: "Submission saved and submitted",
    };

    return res.status(200).json(payload);
  };

  upsertAnswer = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params as { id: string };
    const dto = req.body as UpsertAnswerDTO;

    const answer = await submissionsService.upsertAnswer(id, userId, dto);

    const payload: SuccessResponse<typeof answer> = {
      success: true,
      data: answer,
      message: "Answer saved",
    };

    return res.status(200).json(payload);
  };

  submit = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params as { id: string };

    const updated = await submissionsService.submit(id, userId);

    const payload: SuccessResponse<typeof updated> = {
      success: true,
      data: updated,
      message: "Submission submitted",
    };

    return res.status(200).json(payload);
  };
} 

export const submissionsController = new SubmissionsController();
