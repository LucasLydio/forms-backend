import { prisma } from "../../config/prisma.js";
import { badRequest, conflict, notFound } from "../../utils/httpError.js";
import type { UserRole } from "../../utils/jwt.js";
import { cacheData, deleteCacheKeys, getCachedData } from "../../utils/redis.js";

export type UpdateUserInput = {
  name?: string;
  email?: string;
  role?: UserRole;
};

export class UsersService {
  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        provider: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw notFound("User not found");
    return user;
  }

  async listUsers() {

    let cacheKey = `users:list`;
    
    const cached = await getCachedData(cacheKey);
    if (cached) return cached;

    let users;

    users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        provider: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    await cacheData(cacheKey, users, 160);
    return users;
  }

  async update(id: string, data: UpdateUserInput) {
    if (!data || Object.keys(data).length === 0) {
      throw badRequest("No fields provided to update");
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw notFound("User not found");

    // Normalize email if present
    const nextEmail = data.email?.trim().toLowerCase();

    if (nextEmail && nextEmail !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: nextEmail } });
      if (emailTaken) throw conflict("Email already in use");
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(nextEmail !== undefined ? { email: nextEmail } : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        provider: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    await deleteCacheKeys([
      "users:list",
    ]);

    return updated;
  }

  async delete(id: string) {
    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw notFound("User not found");

    // Cascade deletes refresh_tokens due to Prisma relation onDelete: Cascade
    await prisma.user.delete({ where: { id } });
    
    await deleteCacheKeys([
      "users:list",
    ]);

    return { id };
  }
}

export const usersService = new UsersService();
