/**
 * Protected business routes.
 * Demonstrates route-level RBAC using module/tab/action constraints from inherited schema tables.
 */
const express = require("express");
const { getCampaignOverview } = require("../controllers/protectedController");
const { authenticateAccessToken } = require("../middleware/authenticateAccessToken");
const { authorize } = require("../middleware/authorize");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get(
  "/campaigns/overview",
  authenticateAccessToken,
  authorize("Campaigns", "Overview", "read"),
  asyncHandler(getCampaignOverview)
);

module.exports = router;
