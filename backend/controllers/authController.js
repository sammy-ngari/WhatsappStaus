const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const prisma = require("../prisma");
const createHttpError = require("../utils/createHttpError");
const { clearAuthCookies, readAuthCookies, setAuthCookies } = require("../utils/authCookies");
const { listPermissionsForUser } = require("../utils/permissionService");
const { logSecurityEvent } = require("../utils/securityLogger");
const {
  createSession,
  invalidateSessionById,
  invalidateSessionByRefreshToken,
  rotateSessionTokenPair,
} = require("../utils/sessionService");
const { issueAuthTokenPair, verifyRefreshToken } = require("../utils/tokenService");

/**
 * Authentication controller module.
 * Responsibilities:
 * - credential authentication lifecycle (register/login/refresh/logout)
 * - secure session issuance and cookie transport
 * - authenticated identity + permission bootstrap endpoints
 * Security considerations:
 * - password hashing is mandatory before persistence
 * - duplicate identities are rejected deterministically
 * - refresh token replay/verification events are logged for investigation
 */

const BCRYPT_REGISTER_SALT_ROUNDS = 10;
const EMPTY_OTHERNAMES_FALLBACK = "";
const DASHBOARD_MODULE_TITLE = "Campaigns";
const DASHBOARD_TAB_TITLE = "Overview";
const REGISTER_FLOW_ROLE_DEFINITIONS = Object.freeze({
  affiliate: Object.freeze({
    id: "system_role_affiliate",
    title: "Affiliate",
    description: "System-generated affiliate role",
  }),
  advertiser: Object.freeze({
    id: "system_role_advertiser",
    title: "Advertiser",
    description: "System-generated advertiser role",
  }),
});
const REGISTER_FLOW_PERMISSION_ACTIONS = Object.freeze({
  affiliate: Object.freeze(["read"]),
  advertiser: Object.freeze(["read", "write"]),
});

/**
 * Resolves role provisioning metadata from a validated registration flow value.
 *
 * @param {"affiliate" | "advertiser"} flow - Registration flow selected at landing-page entry.
 * @returns {{ id: string, title: string, description: string } | undefined} Role metadata.
 */
const resolveRoleDefinitionFromFlow = (flow) => REGISTER_FLOW_ROLE_DEFINITIONS[flow];

/**
 * Resolves required dashboard permission actions from the validated registration flow.
 *
 * @param {"affiliate" | "advertiser"} flow - Registration flow selected at landing-page entry.
 * @returns {readonly string[]} Required dashboard actions for the flow role.
 */
const resolvePermissionActionsFromFlow = (flow) => REGISTER_FLOW_PERMISSION_ACTIONS[flow] || ["read"];

/**
 * Resolves a role for registration flow and auto-creates it when missing.
 * Auto-provisioning keeps production registration resilient when seed data was not applied.
 *
 * @param {"affiliate" | "advertiser"} flow - Registration flow selected at landing-page entry.
 * @returns {Promise<{ id: string, title: string } | undefined>} Existing or created role identity.
 */
const resolveOrCreateRoleForFlow = async (flow) => {
  const roleDefinition = resolveRoleDefinitionFromFlow(flow);
  if (!roleDefinition) {
    return undefined;
  }

  const existingRole = await prisma.roles.findFirst({
    where: {
      title: {
        equals: roleDefinition.title,
        mode: "insensitive",
      },
      deleted_at: null,
    },
    select: { id: true, title: true },
  });

  if (existingRole) {
    return existingRole;
  }

  const existingSystemRole = await prisma.roles.findUnique({
    where: { id: roleDefinition.id },
    select: { id: true },
  });

  const provisionedRole = await prisma.roles.upsert({
    where: { id: roleDefinition.id },
    update: {
      title: roleDefinition.title,
      description: roleDefinition.description,
      deleted_at: null,
      updated_at: new Date(),
    },
    create: {
      id: roleDefinition.id,
      title: roleDefinition.title,
      description: roleDefinition.description,
    },
    select: { id: true, title: true },
  });

  if (!existingSystemRole) {
    logSecurityEvent("register_role_auto_created", {
      flow,
      roleId: provisionedRole.id,
      roleTitle: provisionedRole.title,
    });
  }

  return provisionedRole;
};

/**
 * Ensures registration role has baseline dashboard permissions required by frontend route guards.
 * This keeps newly provisioned roles operational without relying on manual RBAC seed execution.
 *
 * @param {{
 *   transactionClient: typeof prisma,
 *   flow: "affiliate" | "advertiser",
 *   roleId: string,
 *   actorUserId: string
 * }} args - Permission bootstrap context.
 * @returns {Promise<void>}
 */
const ensureDashboardPermissionsForFlowRole = async (args) => {
  const requiredActions = resolvePermissionActionsFromFlow(args.flow);

  const moduleRecord = await args.transactionClient.modules.findFirst({
    where: {
      title: { equals: DASHBOARD_MODULE_TITLE, mode: "insensitive" },
      deleted_at: null,
    },
    select: { id: true, title: true },
  });

  if (!moduleRecord?.id) {
    logSecurityEvent("register_failed_missing_dashboard_module", {
      flow: args.flow,
      roleId: args.roleId,
      moduleTitle: DASHBOARD_MODULE_TITLE,
    });
    throw createHttpError(500, "Registration is temporarily unavailable");
  }

  const tabRecord = await args.transactionClient.tabs.findFirst({
    where: {
      module_id: moduleRecord.id,
      title: { equals: DASHBOARD_TAB_TITLE, mode: "insensitive" },
      deleted_at: null,
    },
    select: { id: true, title: true },
  });

  if (!tabRecord?.id) {
    logSecurityEvent("register_failed_missing_dashboard_tab", {
      flow: args.flow,
      roleId: args.roleId,
      moduleTitle: DASHBOARD_MODULE_TITLE,
      tabTitle: DASHBOARD_TAB_TITLE,
    });
    throw createHttpError(500, "Registration is temporarily unavailable");
  }

  for (const action of requiredActions) {
    const existingPermission = await args.transactionClient.permissions.findFirst({
      where: {
        role_id: args.roleId,
        module_id: moduleRecord.id,
        tab_id: tabRecord.id,
        action: { equals: action, mode: "insensitive" },
      },
      select: {
        role_id: true,
        deleted_at: true,
      },
    });

    if (existingPermission?.deleted_at) {
      await args.transactionClient.permissions.updateMany({
        where: {
          role_id: args.roleId,
          module_id: moduleRecord.id,
          tab_id: tabRecord.id,
          action: { equals: action, mode: "insensitive" },
        },
        data: {
          deleted_at: null,
          deleted_by: null,
          updated_at: new Date(),
          updated_by: args.actorUserId,
        },
      });
      continue;
    }

    if (existingPermission) {
      continue;
    }

    await args.transactionClient.permissions.create({
      data: {
        role_id: args.roleId,
        module_id: moduleRecord.id,
        tab_id: tabRecord.id,
        action,
        created_by: args.actorUserId,
      },
    });
  }
};

/**
 * Detects Prisma unique-constraint errors for `users.email` collisions.
 *
 * @param {unknown} error - Thrown persistence error.
 * @returns {boolean} True when the error represents a duplicate email write race.
 */
const isDuplicateEmailWriteError = (error) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const prismaCode = String(error.code || "");
  const target = Array.isArray(error.meta?.target) ? error.meta.target : [];

  return prismaCode === "P2002" && target.includes("email");
};

/**
 * Reads refresh token from the preferred HttpOnly cookie, with body fallback for controlled migrations.
 *
 * @param {import("express").Request} req - Express request object.
 * @returns {string | undefined} Refresh token if present.
 */
const getRefreshTokenFromRequest = (req) => {
  const { refreshToken: cookieRefreshToken } = readAuthCookies(req);
  const bodyRefreshToken =
    typeof req.validated?.body?.refreshToken === "string"
      ? req.validated.body.refreshToken
      : typeof req.body?.refreshToken === "string"
        ? req.body.refreshToken
        : undefined;

  return cookieRefreshToken || bodyRefreshToken;
};

/**
 * Registers a new user account and immediately authenticates the created identity.
 *
 * Responsibilities:
 * - validate payload from request validation middleware
 * - enforce unique email identity
 * - hash password before persistence
 * - map flow to role and resolve role id from database
 * - create server-side session and issue JWT cookie pair
 *
 * Security considerations:
 * - never stores plaintext passwords
 * - logs duplicate-email and success events without leaking secrets
 * - uses HttpOnly cookies via existing auth cookie utility
 *
 * @param {import("express").Request} req - Express request with validated registration payload.
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<void>}
 */
exports.register = async (req, res) => {
  const payload = req.validated.body;
  const email = payload.email.toLowerCase();
  const firstname = payload.firstname.trim();
  const othernames = (payload.othernames || EMPTY_OTHERNAMES_FALLBACK).trim();
  const roleDefinition = resolveRoleDefinitionFromFlow(payload.flow);

  if (!roleDefinition) {
    throw createHttpError(400, "Invalid registration flow");
  }

  const existingUser = await prisma.users.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  if (existingUser) {
    logSecurityEvent("register_failed_duplicate_email", { email, flow: payload.flow });
    throw createHttpError(409, "An account with this email already exists");
  }

  const role = await resolveOrCreateRoleForFlow(payload.flow);

  if (!role) {
    logSecurityEvent("register_failed_role_not_found", {
      email,
      flow: payload.flow,
      roleTitle: roleDefinition.title,
    });
    throw createHttpError(500, "Registration is temporarily unavailable");
  }

  const passwordHash = await bcrypt.hash(payload.password, BCRYPT_REGISTER_SALT_ROUNDS);

  let user;
  try {
    user = await prisma.$transaction(async (transactionClient) => {
      const createdUser = await transactionClient.users.create({
        data: {
          id: crypto.randomUUID(),
          email,
          password: passwordHash,
          firstname,
          othernames,
          role_id: role.id,
        },
        select: {
          id: true,
          email: true,
          firstname: true,
          role_id: true,
        },
      });

      await ensureDashboardPermissionsForFlowRole({
        transactionClient,
        flow: payload.flow,
        roleId: role.id,
        actorUserId: createdUser.id,
      });

      return createdUser;
    });
  } catch (error) {
    if (isDuplicateEmailWriteError(error)) {
      logSecurityEvent("register_failed_duplicate_email", { email, flow: payload.flow });
      throw createHttpError(409, "An account with this email already exists");
    }
    throw error;
  }

  const sessionId = crypto.randomUUID();
  const tokenBundle = issueAuthTokenPair(user, sessionId);

  await createSession({
    sessionId,
    userId: user.id,
    refreshToken: tokenBundle.refreshToken,
    accessToken: tokenBundle.accessToken,
    refreshTokenExpiresAt: tokenBundle.refreshTokenExpiresAt,
  });

  setAuthCookies(res, tokenBundle);

  logSecurityEvent("register_success", {
    userId: user.id,
    roleId: user.role_id,
    flow: payload.flow,
  });

  res.status(201).json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstname: user.firstname,
      role_id: user.role_id,
    },
  });
};

/**
 * Register a user account.
 * Expects a validated request payload (see authSchemas).
 * Creates all required user fields from the inherited Prisma schema.
 *
 * @param {import("express").Request} req - Express request with validated signup payload.
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<void>}
 */
exports.signup = async (req, res) => {
  const payload = req.validated.body;
  const email = payload.email.toLowerCase();

  const exists = await prisma.users.findUnique({ where: { email } });
  if (exists) {
    throw createHttpError(409, "User already exists");
  }

  const hashedPassword = await bcrypt.hash(payload.password, 12);

  // Persist only schema-supported properties.
  const user = await prisma.users.create({
    data: {
      id: crypto.randomUUID(),
      role_id: payload.role_id,
      email,
      password: hashedPassword,
      image: payload.image ?? null,
      firstname: payload.firstname,
      othernames: payload.othernames,
      date_of_birth: payload.date_of_birth,
      gender: payload.gender,
      national_id: payload.national_id,
      phone: payload.phone,
      next_of_kin: payload.next_of_kin,
      next_of_kin_contacts: payload.next_of_kin_contacts,
      address: payload.address ?? null,
    },
    select: {
      id: true,
      email: true,
      firstname: true,
      othernames: true,
      role_id: true,
    },
  });

  res.status(201).json({
    success: true,
    message: "User created successfully",
    data: user,
  });
};

/**
 * Authenticates credentials, creates a server-side session, and sets HttpOnly auth cookies.
 * Tokens are never returned in response bodies to reduce XSS/token-exfiltration risk on the client.
 *
 * @param {import("express").Request} req - Express request with validated login payload.
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<void>}
 */
exports.login = async (req, res) => {
  const payload = req.validated.body;
  const email = payload.email.toLowerCase();

  const user = await prisma.users.findUnique({ where: { email } });
  if (!user || user.deleted_at) {
    logSecurityEvent("login_failed_user_not_found_or_deleted", { email });
    throw createHttpError(401, "Invalid credentials");
  }

  const isMatch = await bcrypt.compare(payload.password, user.password);
  if (!isMatch) {
    logSecurityEvent("login_failed_invalid_password", { userId: user.id, email });
    throw createHttpError(401, "Invalid credentials");
  }

  const sessionId = crypto.randomUUID();
  const tokenBundle = issueAuthTokenPair(user, sessionId);

  await createSession({
    sessionId,
    userId: user.id,
    refreshToken: tokenBundle.refreshToken,
    accessToken: tokenBundle.accessToken,
    refreshTokenExpiresAt: tokenBundle.refreshTokenExpiresAt,
  });

  setAuthCookies(res, tokenBundle);

  res.json({
    success: true,
    message: "Login successful",
    data: {
      user: {
        id: user.id,
        email: user.email,
        role_id: user.role_id,
      },
      accessTokenExpiresAt: tokenBundle.accessTokenExpiresAt.toISOString(),
      refreshTokenExpiresAt: tokenBundle.refreshTokenExpiresAt.toISOString(),
    },
  });
};

/**
 * Rotates refresh/access tokens using one-time refresh semantics.
 * Replay attempts revoke the affected session immediately to constrain attacker persistence.
 *
 * @param {import("express").Request} req - Express request containing refresh token cookie.
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<void>}
 */
exports.refreshSession = async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (!refreshToken) {
    clearAuthCookies(res);
    throw createHttpError(401, "Authentication required");
  }

  let refreshPayload;
  try {
    refreshPayload = verifyRefreshToken(refreshToken);
  } catch (error) {
    await invalidateSessionByRefreshToken(refreshToken);
    clearAuthCookies(res);
    logSecurityEvent("refresh_token_verification_failed", {
      message: error.message,
      path: req.originalUrl,
      method: req.method,
    });
    throw createHttpError(401, "Invalid or expired refresh token");
  }

  const userId = String(refreshPayload.sub || "").trim();
  const sessionId = String(refreshPayload.sessionId || "").trim();

  if (!userId || !sessionId) {
    clearAuthCookies(res);
    throw createHttpError(401, "Invalid or expired refresh token");
  }

  const user = await prisma.users.findFirst({
    where: {
      id: userId,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      role_id: true,
    },
  });

  if (!user) {
    await invalidateSessionById(sessionId);
    clearAuthCookies(res);
    throw createHttpError(401, "Session is no longer valid");
  }

  const nextTokenBundle = issueAuthTokenPair(user, sessionId);
  const rotationResult = await rotateSessionTokenPair({
    sessionId,
    userId: user.id,
    presentedRefreshToken: refreshToken,
    nextRefreshToken: nextTokenBundle.refreshToken,
    nextAccessToken: nextTokenBundle.accessToken,
    nextRefreshTokenExpiresAt: nextTokenBundle.refreshTokenExpiresAt,
  });

  if (rotationResult === "rotated") {
    setAuthCookies(res, nextTokenBundle);

    res.json({
      success: true,
      message: "Session refreshed successfully",
      data: {
        accessTokenExpiresAt: nextTokenBundle.accessTokenExpiresAt.toISOString(),
        refreshTokenExpiresAt: nextTokenBundle.refreshTokenExpiresAt.toISOString(),
      },
    });
    return;
  }

  clearAuthCookies(res);

  if (rotationResult === "replay_detected") {
    logSecurityEvent("refresh_token_replay_detected", { userId: user.id, sessionId });
  }

  throw createHttpError(401, "Session is no longer valid");
};

/**
 * Invalidates the current session and clears auth cookies.
 * Logout uses refresh-token hash matching to revoke server-side session state even if access token is expired.
 *
 * @param {import("express").Request} req - Express request containing refresh token cookie.
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<void>}
 */
exports.logout = async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  const revokedSessions = await invalidateSessionByRefreshToken(refreshToken);

  clearAuthCookies(res);

  logSecurityEvent("logout", {
    userId: req.auth?.userId || null,
    revokedSessions,
  });

  res.json({
    success: true,
    message: "Logged out successfully",
    data: { revokedSessions },
  });
};

/**
 * Returns the authenticated user profile from trusted server context.
 * This endpoint lets clients bootstrap auth state without ever reading HttpOnly cookies directly.
 *
 * @param {import("express").Request} req - Authenticated request (`authenticateAccessToken` required).
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<void>}
 */
exports.getCurrentUser = async (req, res) => {
  if (!req.user) {
    throw createHttpError(401, "Authentication required");
  }

  res.json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        role_id: req.user.role_id,
        firstname: req.user.firstname,
        othernames: req.user.othernames,
        email_verified: Boolean(req.user.email_verified),
        // Temporary compatibility flag until phone verification persistence is implemented.
        phone_verified: false,
      },
    },
  });
};

/**
 * Returns normalized permissions for the authenticated user.
 * Module/tab/action names are exposed instead of internal ids to keep client contracts stable and minimally privileged.
 *
 * @param {import("express").Request} req - Authenticated request (`authenticateAccessToken` required).
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<void>}
 */
exports.getCurrentUserPermissions = async (req, res) => {
  if (!req.auth?.userId) {
    throw createHttpError(401, "Authentication required");
  }

  const permissions = await listPermissionsForUser(req.auth.userId);

  res.json({
    success: true,
    data: {
      permissions,
    },
  });
};
