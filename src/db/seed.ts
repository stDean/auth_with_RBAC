// src/seed.ts
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import * as schema from "./schema";

const seedPermissions = [
  // Add wildcard permission first
  {
    id: "*:*", // Add this permission
    description: "Wildcard permission (allows all actions)",
    category: "System",
  },

  // User Management
  {
    id: "user:create",
    description: "Create new users",
    category: "User Management",
  },
  {
    id: "user:read",
    description: "View user information",
    category: "User Management",
  },
  {
    id: "user:update:type",
    description: "Modify user type (e.g., student, teacher)",
    category: "User Management",
  },
  {
    id: "user:update",
    description: "Modify user data",
    category: "User Management",
  },
  {
    id: "user:delete",
    description: "Delete users",
    category: "User Management",
  },

  // Role Management
  {
    id: "role:assign",
    description: "Assign roles to users",
    category: "Role Management",
  },
  {
    id: "role:update",
    description: "Modify role permissions",
    category: "Role Management",
  },

  // Courses
  {
    id: "course:create",
    description: "Create new courses",
    category: "Academic",
  },
  {
    id: "course:update",
    description: "Modify course details",
    category: "Academic",
  },
  { id: "course:delete", description: "Delete courses", category: "Academic" },

  // Grades
  { id: "grade:view", description: "View grades", category: "Academic" },
  {
    id: "grade:view:own",
    description: "View own grades",
    category: "Academic",
  },
  {
    id: "grade:view:child",
    description: "View child grades",
    category: "Academic",
  },

  // Others
  { id: "content:create", description: "Create content", category: "Academic" },
  { id: "content:read", description: "View content", category: "Academic" },
  {
    id: "assignment:submit",
    description: "Submit assignments",
    category: "Academic",
  },
  {
    id: "attendance:view:own",
    description: "View own attendance",
    category: "Academic",
  },
  {
    id: "attendance:view:child",
    description: "View child's attendance",
    category: "Academic",
  },
];

const seedRoles = [
  {
    id: schema.ROLE_IDS.SUPER_ADMIN,
    name: "super_admin",
    description: "Full system access",
  },
  {
    id: schema.ROLE_IDS.ADMIN,
    name: "admin",
    description: "Administrative access",
  },
  {
    id: schema.ROLE_IDS.TEACHER,
    name: "teacher",
    description: "Teacher access",
  },
  {
    id: schema.ROLE_IDS.STUDENT,
    name: "student",
    description: "Student access",
  },
  { id: schema.ROLE_IDS.PARENT, name: "parent", description: "Parent access" },
];

const rolePermissionsMap = {
  [schema.ROLE_IDS.SUPER_ADMIN]: ["*:*"],
  [schema.ROLE_IDS.ADMIN]: [
    "user:create",
    "user:read",
    "user:update",
    "user:update:type",
    "user:delete",
    "role:assign",
    "course:create",
    "course:update",
    "course:delete",
    "grade:view",
    "content:create",
  ],
  [schema.ROLE_IDS.TEACHER]: [
    "course:create",
    "course:update",
    "content:create",
    "content:read",
    "grade:view",
    "assignment:submit",
  ],
  [schema.ROLE_IDS.STUDENT]: [
    "content:read",
    "grade:view:own",
    "assignment:submit",
    "attendance:view:own",
  ],
  [schema.ROLE_IDS.PARENT]: ["grade:view:child", "attendance:view:child"],
};

export async function seedDatabase() {
  console.log("Starting database seeding...");

  // Insert permissions
  await db
    .insert(schema.permissions)
    .values(seedPermissions)
    .onDuplicateKeyUpdate({
      set: { description: sql`VALUES(description)` },
    });
  console.log("Permissions seeded.");

  // Insert roles
  await db
    .insert(schema.roles)
    .values(seedRoles)
    .onDuplicateKeyUpdate({
      set: { description: sql`VALUES(description)` },
    });
  console.log("Roles seeded.");

  // Insert role permissions
  for (const [roleId, permissions] of Object.entries(rolePermissionsMap)) {
    await db
      .delete(schema.rolePermissions)
      .where(eq(schema.rolePermissions.roleId, parseInt(roleId)));
    console.log(`Deleted existing permissions for roleId: ${parseInt(roleId)}`);

    if (permissions.length > 0) {
      await db.insert(schema.rolePermissions).values(
        permissions.map((permissionId) => ({
          roleId: parseInt(roleId),
          permissionId,
        }))
      );
    }
  }

  console.log("Role permissions seeded.");

  // Create initial super admin
  const superAdminEmail = "superadmin@example.com";
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, superAdminEmail));

  if (!existing) {
    const hashedPassword = await bcrypt.hash("SecurePassword123!", 12);
    const [user] = await db
      .insert(schema.users)
      .values({
        email: superAdminEmail,
        password: hashedPassword,
        name: "Super Admin",
        userType: "super_admin",
      })
      .$returningId();

    if (!user || typeof user.id === "undefined") {
      throw new Error("Failed to get super admin user ID after insertion.");
    }
    console.log("Super Admin created with ID:", user.id);

    await db.insert(schema.userRoles).values({
      userId: user.id,
      roleId: schema.ROLE_IDS.SUPER_ADMIN,
    });
  }

  console.log("Database seeding completed.");
}
