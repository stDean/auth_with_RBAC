import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import * as schema from "../db/schema";
import { generateToken, getUserRolesAndPermissions } from "./authHelper";

type UserType = "super_admin" | "admin" | "teacher" | "student" | "parent";

/**
 * User Registration Service
 *
 * Creates a new user with hashed password and assigns default role
 *
 * Steps:
 * 1. Hash password for secure storage
 * 2. Start database transaction (atomic operation)
 * 3. Insert new user record
 * 4. Assign role based on user type
 * 5. Commit transaction
 */
export const registerService = async (userData: {
  email: string;
  password: string;
  name: string;
  userType: UserType;
}) => {
  // Hash password with bcrypt (12 rounds of salting)
  const hashedPassword = await bcrypt.hash(userData.password, 12);

  return db.transaction(async (tx) => {
    // Create user record
    const [user] = await tx
      .insert(schema.users)
      .values({
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        userType: userData.userType,
      })
      .$returningId();

    // Determine default role based on user type
    let roleId: (typeof schema.ROLE_IDS)[keyof typeof schema.ROLE_IDS] =
      schema.ROLE_IDS.STUDENT;
    if (userData.userType === "teacher") roleId = schema.ROLE_IDS.TEACHER;
    if (userData.userType === "parent") roleId = schema.ROLE_IDS.PARENT;
    if (userData.userType === "admin") roleId = schema.ROLE_IDS.ADMIN;
    if (userData.userType === "super_admin")
      roleId = schema.ROLE_IDS.SUPER_ADMIN;

    // Assign role to user
    await tx.insert(schema.userRoles).values({
      userId: user.id,
      roleId,
    });

    return user;
  });
};

/**
 * Login Service with JWT Token Generation
 *
 * Authenticates user and generates access/refresh tokens
 *
 * Security Flow:
 * 1. Verify credentials (email/password)
 * 2. Fetch user's roles and permissions
 * 3. Generate access token (short-lived) for API access
 * 4. Generate refresh token (long-lived) for token renewal
 * 5. Store refresh token securely in database
 *
 * Token Purposes:
 *
 * ACCESS TOKEN:
 * - Short-lived (15 minutes in this implementation)
 * - Contains user identity and permissions
 * - Used for authenticating API requests
 * - Minimizes exposure window if compromised
 *
 * REFRESH TOKEN:
 * - Long-lived (7 days in this implementation)
 * - Contains only user identity (no permissions)
 * - Stored securely in database (not in client-side storage)
 * - Used to obtain new access tokens when expired
 * - Allows persistent sessions without frequent logins
 */
export const loginService = async (logInData: {
  email: string;
  password: string;
  ipAddress: string;
}) => {
  // Find user by email
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, logInData.email));

  // Verify credentials
  if (!user || !(await bcrypt.compare(logInData.password, user.password))) {
    throw new Error("Invalid credentials");
  }

  const { permissions } = await getUserRolesAndPermissions(user.id);

  // Check for existing tokens from same IP
  const existingTokens = await db
    .select()
    .from(schema.refreshTokens)
    .where(
      and(
        eq(schema.refreshTokens.userId, user.id),
        eq(schema.refreshTokens.ip_address, logInData.ipAddress)
      )
    );

  // Revoke existing tokens from same IP
  if (existingTokens.length > 0) {
    await db
      .delete(schema.refreshTokens)
      .where(
        and(
          eq(schema.refreshTokens.userId, user.id),
          eq(schema.refreshTokens.ip_address, logInData.ipAddress)
        )
      );
  }

  const { accessToken, refreshToken } = generateToken(user, permissions);

  // Store refresh token in database
  await db.insert(schema.refreshTokens).values({
    userId: user.id,
    token: refreshToken,
    ip_address: logInData.ipAddress,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return { accessToken, refreshToken, user };
};

/**
 * TODO:
 * make a way to get location and ip address of where the user logged in
 * and store it in the database for security purposes
 * this can help in detecting suspicious logins and alerting the user
 * then send email to the user with the details
 * and also log the login attempt in the database
 */
