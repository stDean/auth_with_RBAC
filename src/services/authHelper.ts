// src/services/authHelper.ts
import { eq, inArray } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "../db";
import * as schema from "../db/schema";

/**
 * Fetches user roles and permissions
 *
 * @param userId - User ID to fetch permissions for
 * @returns Object containing:
 *   - roles: Array of role IDs
 *   - permissions: Array of permission IDs
 */
export const getUserRolesAndPermissions = async (userId: string) => {
  // Get user's role IDs
  const userRoles = await db
    .select({ roleId: schema.userRoles.roleId })
    .from(schema.userRoles)
    .where(eq(schema.userRoles.userId, userId));

  const roleIds = userRoles.map((ur) => ur.roleId);

  // Get permissions from all roles
  const permissionRecords =
    roleIds.length > 0
      ? await db
          .select({ permissionId: schema.rolePermissions.permissionId })
          .from(schema.rolePermissions)
          .where(inArray(schema.rolePermissions.roleId, roleIds))
      : [];

  return {
    roles: roleIds,
    permissions: permissionRecords.map((p) => p.permissionId),
  };
};

/**
 * Generates JWT token for user
 *
 * @param user - User object containing id and email
 * @returns Signed JWT token
 */
export const generateToken = (
  user: { id: string; email: string; userType: string },
  permissions: string[]
) => {
  /**
   * ACCESS TOKEN GENERATION
   *
   * Contains:
   * - userId: User identifier
   * - permissions: List of granted permissions
   * - userType: User's role type
   *
   * Security: Signed with JWT_SECRET
   * Expires in 15 minutes (short-lived)
   */
  const accessToken = jwt.sign(
    {
      userId: user.id,
      permissions,
      userType: user.userType,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  /**
   * REFRESH TOKEN GENERATION
   *
   * Contains:
   * - userId: User identifier only
   *
   * Security: Signed with separate REFRESH_SECRET
   * Expires in 7 days (long-lived)
   * Stored in database for validation
   */
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};
