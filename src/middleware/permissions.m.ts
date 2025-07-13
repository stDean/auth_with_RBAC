import { eq, inArray } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import { db } from "../db";
import * as schema from "../db/schema";

// 1 Permission Middleware
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    // Check for wildcard or specific permission
    if (
      !req.user.permissions.includes("*:*") &&
      !req.user.permissions.includes(permission)
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
};

// 2 Contextual Permission Checker (e.g., own resources)
export const checkContextualPermission = async (
  userId: string,
  permission: string,
  resourceOwnerId?: string
) => {
  // Get user permissions from DB (not JWT for fresh data)
  const roles = await db
    .select({ roleId: schema.userRoles.roleId })
    .from(schema.userRoles)
    .where(eq(schema.userRoles.userId, userId));

  const roleIds = roles.map((r) => r.roleId);

  const permissions = await db
    .select({ permissionId: schema.rolePermissions.permissionId })
    .from(schema.rolePermissions)
    .where(inArray(schema.rolePermissions.roleId, roleIds))
    .then((records) => records.map((r) => r.permissionId));

  // Check global permission
  if (permissions.includes("*:*") || permissions.includes(permission)) {
    return true;
  }

  // Check contextual permissions
  if (resourceOwnerId && userId === resourceOwnerId) {
    const contextualPermission = `${permission}:own`;
    if (permissions.includes(contextualPermission)) {
      return true;
    }
  }

  return false;
};

export const requireUserType = (types: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !types.includes(req.user.userType)) {
      return res.status(403).json({ error: "Access restricted" });
    }
    next();
  };
};
