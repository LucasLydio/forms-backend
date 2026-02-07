import type { Request, Response } from "express";
import { usersService } from "./users.service.js";
import { SuccessResponse } from "../../utils/response.js";
import { pagination } from "../../utils/pagination.js";

export class UsersController {
  me = async (req: Request, res: Response) => {
    const userId = req.user?.id as string;
    const user = await usersService.getById(userId);

    const payload: SuccessResponse<typeof user> = {
      success: true,
      data: user,
    };

    return res.status(200).json(payload);
  };

list = async (req: Request, res: Response) => {
  const { page, pageSize, skip, take } = pagination(req.query.page, req.query.pageSize);

  const { data, total } = await usersService.listUsers({ skip, take, page, pageSize });

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


  update = async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const updated = await usersService.update(id, req.body);

    const payload: SuccessResponse<typeof updated> = {
      success: true,
      data: updated, 
      message: "User updated",
    };

    return res.status(200).json(payload);
  };

  delete = async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const deleted = await usersService.delete(id);

    const payload: SuccessResponse<typeof deleted> = {
      success: true,
      data: deleted,
      message: "User deleted",
    };

    return res.status(200).json(payload);
  };
}

export const usersController = new UsersController();
