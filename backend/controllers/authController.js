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
