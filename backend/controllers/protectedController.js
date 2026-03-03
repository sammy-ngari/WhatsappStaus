/**
 * Example protected endpoint payload.
 * This demonstrates server-authoritative RBAC enforcement after both authentication and permission checks pass.
 *
 * @param {import("express").Request} req - Authorized request with `req.auth` and `req.authorization`.
 * @param {import("express").Response} res - Express response object.
 * @returns {Promise<void>}
 */
const getCampaignOverview = async (req, res) => {
  res.json({
    success: true,
    message: "Authorized campaign overview access granted",
    data: {
      userId: req.auth.userId,
      roleId: req.auth.roleId,
      permissionContext: req.authorization,
    },
  });
};

module.exports = {
  getCampaignOverview,
};
