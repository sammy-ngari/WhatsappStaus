const createHttpError = require("../utils/createHttpError");
const { hasPermission } = require("../utils/permissionService");
const { logSecurityEvent } = require("../utils/securityLogger");

/**
 * Route-guard middleware factory for module/tab/action authorization.
 * This guard is intentionally server-side and authoritative; client guards should only mirror UX visibility.
 *
 * @param {string} moduleName - `modules.title` target.
 * @param {string} tabName - `tabs.title` target within the module.
 * @param {string} action - `permissions.action` value required for access.
 * @returns {import("express").RequestHandler} Express middleware enforcing RBAC.
 */
const authorize = (moduleName, tabName, action) => async (req, _res, next) => {
  try {
    if (!req.auth?.userId) {
      return next(createHttpError(401, "Authentication required"));
    }

    const allowed = await hasPermission(req.auth.userId, moduleName, tabName, action);

    if (!allowed) {
      logSecurityEvent("authorization_denied", {
        userId: req.auth.userId,
        roleId: req.auth.roleId,
        moduleName,
        tabName,
        action,
        path: req.originalUrl,
        method: req.method,
      });
      return next(createHttpError(403, "Forbidden"));
    }

    req.authorization = {
      moduleName,
      tabName,
      action,
      granted: true,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  authorize,
};
