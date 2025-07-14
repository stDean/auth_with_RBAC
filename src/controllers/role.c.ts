import { Request, Response } from "express";
import { db } from "../db";
import { permissions, rolePermissions, roles, userRoles } from "../db/schema";
import { eq } from "drizzle-orm";
import { updateRolePermissions } from "../middleware/admin.m";

export const RoleCtrl = {
  createRole: async (req: Request, res: Response) => {
    const { name, description } = req.body;

    if (!name || !description)
      return res
        .status(400)
        .json({ msg: "Name and Description are required", status: "failed" });

    try {
      const [newRole] = await db.insert(roles).values({
        name,
        description,
      });

      res.status(201).json({ newRole, status: "success" });
    } catch (error) {
      res.status(500).json({ error: "Failed to create role" });
    }
  },

  getRoles: async (req: Request, res: Response) => {
    try {
      const roleList = await db.select().from(roles);

      res.status(200).json({ roleList, status: "success" });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  },

  updateRole: async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description } = req.body;

    try {
      const [updatedRole] = await db
        .update(roles)
        .set({ name, description })
        .where(eq(roles.id, parseInt(id)));

      if (!updatedRole)
        return res.status(404).json({ error: "Role not found" });

      res.status(200).json({ updatedRole, status: "success" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update role" });
    }
  },

  deleteRole: async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      await db.transaction(async (tx) => {
        // Remove role permissions
        await tx
          .delete(rolePermissions)
          .where(eq(rolePermissions.roleId, parseInt(id)));

        // Remove user assignments
        await tx.delete(userRoles).where(eq(userRoles.roleId, parseInt(id)));

        // Delete role
        const [deletedRole] = await tx
          .delete(roles)
          .where(eq(roles.id, parseInt(id)));

        if (!deletedRole) throw new Error("Role not found");
      });

      res
        .status(200)
        .json({ status: "success", msg: "Role Deleted Successfully." });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete role" });
    }
  },

  updateRolePermissions: async (req: Request, res: Response) => {
    const { id: roleId } = req.params;
    const { permissionIds } = req.body;

    try {
      await updateRolePermissions(req.user?.id!, Number(roleId), permissionIds);
      res.status(200).json({
        status: "success",
        msg: "Permissions for this role has been updated",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to update permissions" });
    }
  },

  // ...other role-related methods can be added here
};

// eventually move this to a separate file
export const PermissionCtrl = {
  getPermissions: async (req: Request, res: Response) => {
    try {
      const permissionList = await db.select().from(permissions);

      res.status(200).json({ permissionList, status: "success" });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  },

  getRolePermissions: async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const permissionList = await db
        .select({
          id: permissions.id,
          description: permissions.description,
          category: permissions.category,
        })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, parseInt(id)))
        .innerJoin(
          permissions,
          eq(rolePermissions.permissionId, permissions.id)
        );

      res.json(permissionList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch role permissions" });
    }
  },

  // ...other permission-related methods can be added here
};
