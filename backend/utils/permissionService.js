const prisma = require("../prisma");

/**
 * Resolves whether a user has a specific action on a module/tab tuple.
 * This function enforces the inherited single-role RBAC model:
 * `users.role_id` -> `permissions.role_id` with scoped checks on `module_id`, `tab_id`, and `action`.
 *
 * @param {string} userId - User identifier from authenticated context.
 * @param {string} moduleName - Human-readable module title from `modules.title`.
 * @param {string} tabName - Human-readable tab title from `tabs.title`.
 * @param {string} action - Action string persisted in `permissions.action` (e.g. read, write, delete).
 * @returns {Promise<boolean>} True only when an active permission row exists.
 */
const hasPermission = async (userId, moduleName, tabName, action) => {
  const normalizedUserId = String(userId || "").trim();
  const normalizedModuleName = String(moduleName || "").trim();
  const normalizedTabName = String(tabName || "").trim();
  const normalizedAction = String(action || "").trim().toLowerCase();

  if (!normalizedUserId || !normalizedModuleName || !normalizedTabName || !normalizedAction) {
    return false;
  }

  const user = await prisma.users.findFirst({
    where: {
      id: normalizedUserId,
      deleted_at: null,
    },
    select: { id: true, role_id: true },
  });

  if (!user?.role_id) {
    return false;
  }

  const moduleRecord = await prisma.modules.findFirst({
    where: {
      title: { equals: normalizedModuleName, mode: "insensitive" },
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!moduleRecord?.id) {
    return false;
  }

  const tabRecord = await prisma.tabs.findFirst({
    where: {
      module_id: moduleRecord.id,
      title: { equals: normalizedTabName, mode: "insensitive" },
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!tabRecord?.id) {
    return false;
  }

  const permission = await prisma.permissions.findFirst({
    where: {
      role_id: user.role_id,
      module_id: moduleRecord.id,
      tab_id: tabRecord.id,
      action: { equals: normalizedAction, mode: "insensitive" },
      deleted_at: null,
    },
    select: { role_id: true },
  });

  return Boolean(permission);
};

/**
 * Returns a normalized permission list for the current user's role.
 * Only module/tab/action names are exposed so client consumers do not depend on internal table identifiers.
 *
 * @param {string} userId - User identifier from authenticated context.
 * @returns {Promise<Array<{ moduleName: string, tabName: string, action: string }>>} User-facing permission descriptors.
 */
const listPermissionsForUser = async (userId) => {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    return [];
  }

  const user = await prisma.users.findFirst({
    where: {
      id: normalizedUserId,
      deleted_at: null,
    },
    select: { role_id: true },
  });

  if (!user?.role_id) {
    return [];
  }

  const permissions = await prisma.permissions.findMany({
    where: {
      role_id: user.role_id,
      deleted_at: null,
      modules: { deleted_at: null },
      tabs: { deleted_at: null },
    },
    select: {
      action: true,
      modules: { select: { title: true } },
      tabs: { select: { title: true } },
    },
    orderBy: [{ modules: { title: "asc" } }, { tabs: { title: "asc" } }, { action: "asc" }],
  });

  return permissions.map((permission) => ({
    moduleName: permission.modules.title,
    tabName: permission.tabs.title,
    action: String(permission.action || "").toLowerCase(),
  }));
};

module.exports = {
  hasPermission,
  listPermissionsForUser,
};
