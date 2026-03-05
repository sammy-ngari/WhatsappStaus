const prisma = require("../prisma");
const createHttpError = require("../utils/createHttpError");
const { readAuthCookies } = require("../utils/authCookies");
const { logSecurityEvent } = require("../utils/securityLogger");
const { hasActiveSessionForAccessToken } = require("../utils/sessionService");
const { verifyAccessToken } = require("../utils/tokenService");

/**
 * Extracts bearer token from Authorization header.
 * Header fallback is retained to ease migration while HttpOnly cookies remain the primary transport.
 *
 * @param {import("express").Request} req - Express request object.
 * @returns {string | undefined} Access token when present.
 */
const getAccessTokenFromHeader = (req) => {
  const authorization = req.headers.authorization;
  if (!authorization || typeof authorization !== "string") {
    return undefined;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return undefined;
  }

  return token;
};

/**
 * Middleware that validates access token authenticity and active session binding.
 * Verifying JWT + session hash prevents use of revoked tokens after logout or refresh rotation.
 *
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} _res - Express response object.
 * @param {import("express").NextFunction} next - Express next callback.
 * @returns {Promise<void>}
 */
const authenticateAccessToken = async (req, _res, next) => {
  try {
    const { accessToken: cookieAccessToken } = readAuthCookies(req);
    const presentedAccessToken = cookieAccessToken || getAccessTokenFromHeader(req);

    if (!presentedAccessToken) {
      return next(createHttpError(401, "Authentication required"));
    }

    let accessPayload;
    try {
      accessPayload = verifyAccessToken(presentedAccessToken);
    } catch (error) {
      logSecurityEvent("access_token_verification_failed", {
        message: error.message,
        path: req.originalUrl,
        method: req.method,
      });
      return next(createHttpError(401, "Invalid or expired access token"));
    }

    const userId = String(accessPayload.sub || "").trim();
    const sessionId = String(accessPayload.sessionId || "").trim();

    if (!userId || !sessionId) {
      return next(createHttpError(401, "Invalid or expired access token"));
    }

    const sessionIsActive = await hasActiveSessionForAccessToken({
      sessionId,
      userId,
      accessToken: presentedAccessToken,
    });

    if (!sessionIsActive) {
      logSecurityEvent("inactive_session_access_attempt", {
        userId,
        sessionId,
        path: req.originalUrl,
        method: req.method,
      });
      return next(createHttpError(401, "Session is no longer valid"));
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
        firstname: true,
        othernames: true,
        email_verified: true,
      },
    });

    if (!user) {
      return next(createHttpError(401, "Authentication required"));
    }

    req.auth = {
      userId: user.id,
      roleId: user.role_id,
      sessionId,
      email: user.email,
    };
    req.user = user;

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  authenticateAccessToken,
};
