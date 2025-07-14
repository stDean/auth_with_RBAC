import { eq } from "drizzle-orm";
import { db } from "../db";
import * as schema from "../db/schema";
import { checkContextualPermission } from "./permissions.m";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET) as {
      userId: string;
      permissions: string[];
      userType: string;
    };

    req.user = {
      id: payload.userId,
      permissions: payload.permissions,
      userType: payload.userType,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const updateRolePermissions = async (
  adminUserId: string,
  roleId: number,
  permissionIds: string[]
) => {
  const canUpdate = await checkContextualPermission(adminUserId, "role:update");
  if (!canUpdate) throw new Error("Forbidden");

  return db.transaction(async (tx) => {
    // Clear existing permissions
    await tx
      .delete(schema.rolePermissions)
      .where(eq(schema.rolePermissions.roleId, roleId));

    // Insert new permissions
    if (permissionIds.length > 0) {
      await tx
        .insert(schema.rolePermissions)
        .values(permissionIds.map((pid) => ({ roleId, permissionId: pid })));
    }
  });
};
