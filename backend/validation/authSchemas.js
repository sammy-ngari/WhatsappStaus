const { z } = require("zod");

/**
 * Shared identity fields required by the existing `users` table.
 */
const userIdentitySchema = z.object({
  firstname: z.string().trim().min(1).max(50),
  othernames: z.string().trim().min(1).max(100),
  date_of_birth: z.string().trim().min(1).max(20),
  gender: z.string().trim().min(1).max(10),
  national_id: z.string().trim().min(1).max(20),
  phone: z.string().trim().min(1).max(20),
  next_of_kin: z.string().trim().min(1).max(100),
  next_of_kin_contacts: z.string().trim().min(1).max(100),
});

const signupSchema = z.object({
  body: z
    .object({
      email: z.string().trim().email().max(50),
      password: z.string().min(8).max(100),
      role_id: z.string().trim().min(1).max(50).optional(),
      image: z.string().trim().min(1).max(50).optional(),
      address: z.string().trim().min(1).max(255).optional(),
    })
    .merge(userIdentitySchema),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

/**
 * Login payload contract.
 */
const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email().max(50),
    password: z.string().min(1).max(100),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

/**
 * Logout payload contract.
 * Body token is optional because refresh tokens are primarily read from HttpOnly cookies.
 */
const logoutSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().trim().min(1).optional(),
    })
    .optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

/**
 * Refresh payload contract.
 * Refresh endpoint is cookie-driven and does not require request body fields.
 */
const refreshSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

module.exports = {
  loginSchema,
  logoutSchema,
  refreshSchema,
  signupSchema,
};
