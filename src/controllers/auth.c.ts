import { and, eq } from "drizzle-orm";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { refreshTokens, users } from "../db/schema";
import { loginService, registerService } from "../services/auth.s";
import {
  generateToken,
  getUserRolesAndPermissions,
} from "../services/authHelper";

export const AuthCtrl = {
  register: async (req: Request, res: Response) => {
    const { email, password, name, userType } = req.body;

    try {
      // Validate user type
      const validTypes = ["teacher", "student", "parent", "admin"];
      if (!validTypes.includes(userType)) {
        return res.status(400).json({ error: "Invalid user type" });
      }

      // Check if user exists
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (existing) {
        return res.status(409).json({ error: "Email already registered" });
      }

      const user = await registerService({
        email,
        password,
        name,
        userType: userType as "teacher" | "student" | "parent" | "admin",
      });

      if (!user) {
        console.error("User registration failed");
        res.status(500).json({ error: "Registration failed" });
        return;
      }

      res.status(201).json({
        message: "User registered successfully",
        user,
        status: "success",
      });
    } catch (error) {
      console.error("Error during registration:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  },

  login: async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
      const { user, accessToken, refreshToken } = await loginService({
        email,
        password,
        ipAddress: req.ip || "",
      });

      res.status(200).json({
        message: "Login successful",
        user,
        accessToken,
        refreshToken,
        status: "success",
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ error: "Login failed" });
    }
  },

  refreshToken: async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const ipAddress = req.ip || "";

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    try {
      // Verify token
      const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET!) as {
        userId: string;
      };

      // Check if token exists in DB
      const [tokenRecord] = await db
        .select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.token, refreshToken),
            eq(refreshTokens.userId, payload.userId),
            eq(refreshTokens.ip_address, ipAddress)
          )
        );

      if (!tokenRecord) {
        return res.status(401).json({ error: "Invalid refresh token" });
      }

      // Get user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId));

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const { permissions } = await getUserRolesAndPermissions(user.id);

      // Delete old refresh token
      await db
        .delete(refreshTokens)
        .where(
          and(
            eq(refreshTokens.token, refreshToken),
            eq(refreshTokens.userId, user.id)
          )
        );

      // Generate new refresh token
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        generateToken(user, permissions);

      // Store new refresh token in DB
      await db.insert(refreshTokens).values({
        userId: user.id,
        token: newRefreshToken,
        ip_address: ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

      res.status(200).json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        status: "success",
      });
    } catch (error) {
      console.error("Error during token refresh:", error);

      // Handle specific JWT errors
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: "Refresh token expired" });
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: "Invalid refresh token" });
      }

      res.status(500).json({ error: "Token refresh failed" });
    }
  },

  logout: async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const ipAddress = req.ip || "";

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    try {
      // Delete refresh token from DB
      await db
        .delete(refreshTokens)
        .where(
          and(
            eq(refreshTokens.token, refreshToken),
            eq(refreshTokens.ip_address, ipAddress)
          )
        );

      res
        .status(200)
        .json({ message: "Logged out successfully", status: "success" });
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  },

  getProfile: async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

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
        .where(eq(users.id, req.user.id));

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.status(200).json({
        user,
        status: "success",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  },
};
