import { relations } from "drizzle-orm";
import {
  int,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

// 1. USERS TABLE
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  userType: varchar("userType", { length: 20 })
    .notNull()
    .$type<"super_admin" | "admin" | "teacher" | "student" | "parent">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

// 2. ROLES TABLE (Pre-defined roles)
export const roles = mysqlTable(
  "roles",
  {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 50 }).notNull().unique(),
    description: text("description"),
  },
  (table) => [uniqueIndex("name_idx").on(table.name)] // Unique index on name to enable quick lookups
);

// Pre-defined role IDs (for easy reference)
export const ROLE_IDS = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  TEACHER: 3,
  STUDENT: 4,
  PARENT: 5,
} as const;

// 3. PERMISSIONS TABLE (Fine-grained access controls)
export const permissions = mysqlTable("permissions", {
  id: varchar("id", { length: 50 }).primaryKey(), // e.g. "user:create"
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // e.g. "User Management"
});

// 4. ROLE_PERMISSIONS (Many-to-Many Join Table)
// pivot table for roles and permissions
export const rolePermissions = mysqlTable("role_permissions", {
  roleId: int("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  permissionId: varchar("permission_id", { length: 50 })
    .notNull()
    .references(() => permissions.id, { onDelete: "cascade" }),
});

// 5. USER_ROLES (Many-to-Many Join Table)
// pivot table for users and roles
export const userRoles = mysqlTable("user_roles", {
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  roleId: int("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
});

// 6. REFRESH TOKENS
export const refreshTokens = mysqlTable("refresh_tokens", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  ip_address: varchar("ip_address", { length: 45 }).notNull(), // IPv6 compatible
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// RELATIONSHIPS
// Define relationships between tables for easier querying

/**
 * Users can have multiple roles and refresh tokens.
 * User roles is a many-to-many relationship.
 * Refresh tokens is a one-to-many relationship.
 */
export const usersRelations = relations(users, ({ many }) => ({
  roles: many(userRoles),
  refreshTokens: many(refreshTokens),
}));

/**
 * Roles can have multiple users and permissions.
 * Role permissions is a many-to-many relationship.
 */
export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(userRoles),
  permissions: many(rolePermissions),
}));

/**
 * Permissions can be assigned to multiple roles.
 * Role permissions is a many-to-many relationship.
 */
export const permissionsRelations = relations(permissions, ({ many }) => ({
  roles: many(rolePermissions),
}));
