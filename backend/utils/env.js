/**
 * Minimal environment contract required for backend startup.
 */
const REQUIRED_ENV_VARS = ["DATABASE_URL", "ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"];

/**
 * Throws on missing/empty required environment variables.
 * Use at startup so misconfiguration is caught immediately.
 */
const ensureRequiredEnv = () => {
  const missingVars = REQUIRED_ENV_VARS.filter((name) => {
    const value = process.env[name];
    return typeof value !== "string" || value.trim() === "";
  });

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
  }
};

module.exports = {
  ensureRequiredEnv,
  REQUIRED_ENV_VARS,
};
