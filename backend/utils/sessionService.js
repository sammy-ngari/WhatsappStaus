const prisma = require("../prisma");
const { hashToken } = require("./tokenService");

/**
 * Persists a newly issued authentication session.
 * Tokens are stored as hashes so database access alone cannot be used to replay a session.
 *
 * @param {{
 *   sessionId: string,
 *   userId: string,
 *   refreshToken: string,
 *   accessToken: string,
 *   refreshTokenExpiresAt: Date
 * }} args - Session persistence payload.
 * @returns {Promise<void>}
 */
const createSession = async (args) => {
  await prisma.sessions.create({
    data: {
      id: args.sessionId,
      user_id: args.userId,
      expires: args.refreshTokenExpiresAt,
      session_token: hashToken(args.refreshToken),
      access_token: hashToken(args.accessToken),
      updated_at: new Date(),
    },
  });
};

/**
 * Rotates refresh and access token hashes atomically using optimistic constraints.
 * The update condition includes the presented refresh hash; if it no longer matches, the token is stale/replayed.
 *
 * @param {{
 *   sessionId: string,
 *   userId: string,
 *   presentedRefreshToken: string,
 *   nextRefreshToken: string,
 *   nextAccessToken: string,
 *   nextRefreshTokenExpiresAt: Date
 * }} args - Rotation payload.
 * @returns {Promise<"rotated" | "expired" | "missing" | "replay_detected">} Rotation result.
 */
const rotateSessionTokenPair = async (args) => {
  const now = new Date();
  const presentedRefreshHash = hashToken(args.presentedRefreshToken);

  const updateResult = await prisma.sessions.updateMany({
    where: {
      id: args.sessionId,
      user_id: args.userId,
      session_token: presentedRefreshHash,
      expires: { gt: now },
    },
    data: {
      session_token: hashToken(args.nextRefreshToken),
      access_token: hashToken(args.nextAccessToken),
      expires: args.nextRefreshTokenExpiresAt,
      updated_at: now,
    },
  });

  if (updateResult.count === 1) {
    return "rotated";
  }

  const existingSession = await prisma.sessions.findUnique({
    where: { id: args.sessionId },
    select: { id: true, user_id: true, expires: true, session_token: true },
  });

  if (!existingSession || existingSession.user_id !== args.userId) {
    return "missing";
  }

  if (existingSession.expires <= now) {
    await prisma.sessions.deleteMany({ where: { id: args.sessionId } });
    return "expired";
  }

  if (existingSession.session_token !== presentedRefreshHash) {
    await prisma.sessions.deleteMany({ where: { id: args.sessionId } });
    return "replay_detected";
  }

  return "missing";
};

/**
 * Verifies that an access token is still bound to an active server-side session.
 * This enables immediate revocation after rotation/logout instead of waiting for JWT expiration.
 *
 * @param {{ sessionId: string, userId: string, accessToken: string }} args - Lookup input.
 * @returns {Promise<boolean>} True when an active matching session exists.
 */
const hasActiveSessionForAccessToken = async (args) => {
  const session = await prisma.sessions.findFirst({
    where: {
      id: args.sessionId,
      user_id: args.userId,
      access_token: hashToken(args.accessToken),
      expires: { gt: new Date() },
    },
    select: { id: true },
  });

  return Boolean(session);
};

/**
 * Invalidates sessions by presented refresh token.
 * Hash-based lookup avoids any dependence on JWT verification for cleanup operations.
 *
 * @param {string | undefined} refreshToken - Raw refresh token from cookie/body.
 * @returns {Promise<number>} Number of revoked sessions.
 */
const invalidateSessionByRefreshToken = async (refreshToken) => {
  if (!refreshToken) {
    return 0;
  }

  const result = await prisma.sessions.deleteMany({
    where: { session_token: hashToken(refreshToken) },
  });

  return result.count;
};

/**
 * Invalidates a single session by identifier.
 *
 * @param {string | undefined} sessionId - Session id carried in token payload.
 * @returns {Promise<number>} Number of revoked sessions.
 */
const invalidateSessionById = async (sessionId) => {
  if (!sessionId) {
    return 0;
  }

  const result = await prisma.sessions.deleteMany({
    where: { id: sessionId },
  });

  return result.count;
};

module.exports = {
  createSession,
  hasActiveSessionForAccessToken,
  invalidateSessionById,
  invalidateSessionByRefreshToken,
  rotateSessionTokenPair,
};
