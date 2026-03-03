const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");

const DEFAULT_ACCESS_TOKEN_TTL_MINUTES = 15;
const DEFAULT_REFRESH_TOKEN_TTL_DAYS = 7;
const TOKEN_KIND_ACCESS = "access";
const TOKEN_KIND_REFRESH = "refresh";

/**
 * Parses a positive integer environment variable while preserving a safe fallback.
 * This keeps deployment misconfiguration from silently resulting in infinite or invalid TTL values.
 *
 * @param {string | undefined} rawValue - Raw environment variable value.
 * @param {number} fallback - Safe default used when parsing fails.
 * @returns {number} A positive integer suitable for duration calculations.
 */
const parsePositiveIntegerEnv = (rawValue, fallback) => {
  const parsed = Number.parseInt(rawValue ?? "", 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const ACCESS_TOKEN_TTL_MINUTES = parsePositiveIntegerEnv(
  process.env.ACCESS_TOKEN_TTL_MINUTES,
  DEFAULT_ACCESS_TOKEN_TTL_MINUTES
);

const REFRESH_TOKEN_TTL_DAYS = parsePositiveIntegerEnv(
  process.env.REFRESH_TOKEN_TTL_DAYS,
  DEFAULT_REFRESH_TOKEN_TTL_DAYS
);

const ACCESS_TOKEN_TTL_MS = ACCESS_TOKEN_TTL_MINUTES * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Hashes a token before persistence so raw JWTs are never stored in the database.
 * If a database snapshot is exposed, token hashes materially reduce replayability compared to plaintext tokens.
 *
 * @param {string} token - Raw JWT string presented by a client.
 * @returns {string} SHA-256 hash encoded as hexadecimal.
 */
const hashToken = (token) => crypto.createHash("sha256").update(token, "utf8").digest("hex");

/**
 * Creates a short-lived access token bound to a specific session identifier.
 * Binding tokens to a session enables server-side revocation and strict validation of active sessions.
 *
 * @param {{ id: string, email: string, role_id: string }} user - Authenticated user record.
 * @param {string} sessionId - Session row identifier from the `sessions` table.
 * @returns {string} Signed JWT access token.
 */
const issueAccessToken = (user, sessionId) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      roleId: user.role_id,
      sessionId,
      tokenType: TOKEN_KIND_ACCESS,
      jti: crypto.randomUUID(),
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: `${ACCESS_TOKEN_TTL_MINUTES}m` }
  );

/**
 * Creates a long-lived refresh token used only for token rotation.
 * A unique `jti` is included to guarantee every refresh token is distinct even if issued within the same second.
 *
 * @param {{ id: string }} user - Authenticated user record.
 * @param {string} sessionId - Session row identifier from the `sessions` table.
 * @returns {string} Signed JWT refresh token.
 */
const issueRefreshToken = (user, sessionId) =>
  jwt.sign(
    {
      sub: user.id,
      sessionId,
      tokenType: TOKEN_KIND_REFRESH,
      jti: crypto.randomUUID(),
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d` }
  );

/**
 * Issues an access/refresh token pair plus absolute expiry timestamps.
 * Returning both timestamps keeps cookie expiry and session expiry aligned to token validity.
 *
 * @param {{ id: string, email: string, role_id: string }} user - Authenticated user record.
 * @param {string} sessionId - Session row identifier from the `sessions` table.
 * @returns {{
 *   accessToken: string,
 *   refreshToken: string,
 *   accessTokenExpiresAt: Date,
 *   refreshTokenExpiresAt: Date
 * }} Fresh token material and expiry metadata.
 */
const issueAuthTokenPair = (user, sessionId) => {
  const issuedAt = Date.now();
  const accessToken = issueAccessToken(user, sessionId);
  const refreshToken = issueRefreshToken(user, sessionId);

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: new Date(issuedAt + ACCESS_TOKEN_TTL_MS),
    refreshTokenExpiresAt: new Date(issuedAt + REFRESH_TOKEN_TTL_MS),
  };
};

/**
 * Verifies and validates an access token payload.
 * Token-type validation prevents misuse where a refresh token is accidentally or maliciously submitted as access.
 *
 * @param {string} token - JWT presented for access authentication.
 * @returns {{
 *   sub: string,
 *   email?: string,
 *   roleId?: string,
 *   sessionId: string,
 *   tokenType: string,
 *   jti: string,
 *   iat: number,
 *   exp: number
 * }} Decoded and verified JWT payload.
 */
const verifyAccessToken = (token) => {
  const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

  if (!payload || payload.tokenType !== TOKEN_KIND_ACCESS) {
    throw new jwt.JsonWebTokenError("Invalid access token type");
  }

  return payload;
};

/**
 * Verifies and validates a refresh token payload.
 * Explicit type checking avoids privilege confusion between access and refresh token channels.
 *
 * @param {string} token - JWT presented for refresh rotation.
 * @returns {{
 *   sub: string,
 *   sessionId: string,
 *   tokenType: string,
 *   jti: string,
 *   iat: number,
 *   exp: number
 * }} Decoded and verified JWT payload.
 */
const verifyRefreshToken = (token) => {
  const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

  if (!payload || payload.tokenType !== TOKEN_KIND_REFRESH) {
    throw new jwt.JsonWebTokenError("Invalid refresh token type");
  }

  return payload;
};

/**
 * Exposes computed access token TTL in milliseconds for cookie and cache alignment.
 *
 * @returns {number} Access token lifetime in milliseconds.
 */
const getAccessTokenTtlMs = () => ACCESS_TOKEN_TTL_MS;

/**
 * Exposes computed refresh token TTL in milliseconds for session persistence and cookie alignment.
 *
 * @returns {number} Refresh token lifetime in milliseconds.
 */
const getRefreshTokenTtlMs = () => REFRESH_TOKEN_TTL_MS;

module.exports = {
  getAccessTokenTtlMs,
  getRefreshTokenTtlMs,
  hashToken,
  issueAuthTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
};
