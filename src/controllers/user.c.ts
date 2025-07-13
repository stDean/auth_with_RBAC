import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import { db } from "../db";
import { roles, userRoles, users } from "../db/schema";

export const UserCtrl = {
  getUsers: async (req: Request, res: Response) => {
    try {
      const userList = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          userType: users.userType,
          createdAt: users.createdAt,
          roles: {
            id: roles.id,
            name: roles.name,
          },
        })
        .from(users)
        .leftJoin(userRoles, eq(users.id, userRoles.userId))
        .leftJoin(roles, eq(userRoles.roleId, roles.id));

      // Group roles by user
      const usersWithRoles = userList.reduce((acc, row) => {
        const userIndex = acc.findIndex((u) => u.id === row.id);

        if (userIndex === -1) {
          acc.push({
            ...row,
            roles: row.roles!.id ? [row.roles] : [],
          });
        } else if (row.roles!.id) {
          acc[userIndex].roles.push(row.roles);
        }

        return acc;
      }, [] as any[]);

      res.status(200).json(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  getUserById: async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          userType: users.userType,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, id));

      if (!user) return res.status(404).json({ error: "User not found" });

      // Get user roles
      const userRolesList = await db
        .select({
          id: roles.id,
          name: roles.name,
        })
        .from(userRoles)
        .where(eq(userRoles.userId, id))
        .leftJoin(roles, eq(userRoles.roleId, roles.id));

      res.status(200).json({ ...user, roles: userRolesList });
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  updateUser: async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, userType } = req.body;

    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    try {
      const [updatedUser] = await db
        .update(users)
        .set({ name, ...(userType && { userType }) })
        .where(eq(users.id, id));

      if (!updatedUser)
        return res.status(404).json({ error: "User not found" });

      res.status(200).json({
        message: "User type  updated successfully",
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  deleteUser: async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      await db.transaction(async (tx) => {
        // Delete user roles
        await tx.delete(userRoles).where(eq(userRoles.userId, id));

        // Delete user
        const [deletedUser] = await tx.delete(users).where(eq(users.id, id));

        if (!deletedUser)
          return res.status(404).json({ error: "User not found" });
      });

      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  },
};
