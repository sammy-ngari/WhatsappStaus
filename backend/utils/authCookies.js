const { getAccessTokenTtlMs, getRefreshTokenTtlMs } = require("./tokenService");

const ACCESS_TOKEN_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME || "access_token";
const REFRESH_TOKEN_COOKIE_NAME = process.env.REFRESH_TOKEN_COOKIE_NAME || "refresh_token";

/**
 * Normalizes SameSite input to values accepted by Express cookies.
 * Rejecting unknown values prevents silent cookie misconfiguration across environments.
 *
 * @param {string | undefined} value - Raw `AUTH_COOKIE_SAME_SITE` value from environment.
 * @returns {"strict" | "lax" | "none"} Valid SameSite mode.
 */
const resolveSameSiteMode = (value) => {
  const normalized = String(value || "lax").trim().toLowerCase();

  if (normalized === "strict" || normalized === "lax" || normalized === "none") {
    return normalized;
  }

  return "lax";
};

const cookieSameSite = resolveSameSiteMode(process.env.AUTH_COOKIE_SAME_SITE);
const isProduction = process.env.NODE_ENV === "production";
const isSecureCookie = isProduction;

if (cookieSameSite === "none" && !isSecureCookie) {
  throw new Error("AUTH_COOKIE_SAME_SITE=none requires HTTPS (NODE_ENV=production)");
}

/**
 * Applies authentication cookies with restrictive defaults.
 * Access and refresh tokens are scoped separately so refresh cookies only travel to `/auth` endpoints.
 *
 * @param {import("express").Response} res - Express response object.
 * @param {{
 *   accessToken: string,
 *   refreshToken: string,
 *   accessTokenExpiresAt: Date,
 *   refreshTokenExpiresAt: Date
 * }} tokenBundle - Tokens and absolute expiry metadata.
 * @returns {void}
 */
const setAuthCookies = (res, tokenBundle) => {
  const baseOptions = {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: cookieSameSite,
  };

  res.cookie(ACCESS_TOKEN_COOKIE_NAME, tokenBundle.accessToken, {
    ...baseOptions,
    path: "/",
    maxAge: getAccessTokenTtlMs(),
    expires: tokenBundle.accessTokenExpiresAt,
  });

  res.cookie(REFRESH_TOKEN_COOKIE_NAME, tokenBundle.refreshToken, {
    ...baseOptions,
    path: "/auth",
    maxAge: getRefreshTokenTtlMs(),
    expires: tokenBundle.refreshTokenExpiresAt,
  });
};

/**
 * Removes authentication cookies by mirroring their original scope and security attributes.
 * Cookie clearing must match original options (path/samesite/secure) to reliably invalidate browser state.
 *
 * @param {import("express").Response} res - Express response object.
 * @returns {void}
 */
const clearAuthCookies = (res) => {
  const baseOptions = {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: cookieSameSite,
  };

  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, {
    ...baseOptions,
    path: "/",
  });

  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    ...baseOptions,
    path: "/auth",
  });
};

/**
 * Reads access/refresh tokens from request cookies.
 *
 * @param {import("express").Request} req - Express request object.
 * @returns {{ accessToken?: string, refreshToken?: string }} Extracted cookie tokens.
 */
const readAuthCookies = (req) => ({
  accessToken: req.cookies?.[ACCESS_TOKEN_COOKIE_NAME],
  refreshToken: req.cookies?.[REFRESH_TOKEN_COOKIE_NAME],
});

module.exports = {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  clearAuthCookies,
  readAuthCookies,
  setAuthCookies,
};
