/**
 * Authentication routes.
 * Validation runs before controller handlers, and async handlers are wrapped
 * so all exceptions flow into centralized error middleware.
 */
const express = require("express");
const {
  getCurrentUser,
  getCurrentUserPermissions,
  login,
  logout,
  register,
  refreshSession,
  signup,
} = require("../controllers/authController");
const { authenticateAccessToken } = require("../middleware/authenticateAccessToken");
const asyncHandler = require("../middleware/asyncHandler");
const validate = require("../middleware/validate");
const { loginSchema, logoutSchema, refreshSchema, registerSchema, signupSchema } = require("../validation/authSchemas");

const router = express.Router();

router.post("/register", validate(registerSchema), asyncHandler(register));
router.post("/signup", validate(signupSchema), asyncHandler(signup));
router.post("/login", validate(loginSchema), asyncHandler(login));
router.post("/refresh", validate(refreshSchema), asyncHandler(refreshSession));
router.post("/logout", validate(logoutSchema), asyncHandler(logout));
router.get("/me", authenticateAccessToken, asyncHandler(getCurrentUser));
router.get("/permissions", authenticateAccessToken, asyncHandler(getCurrentUserPermissions));

module.exports = router;
