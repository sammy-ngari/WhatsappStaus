const createHttpError = require("../utils/createHttpError");

/**
 * Request validation middleware factory.
 * Expects a Zod schema with { body, params, query } shape.
 * On success, parsed values are attached to req.validated.
 */
const validate = (schema) => (req, res, next) => {
  const parsed = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (!parsed.success) {
    // Normalize Zod issues to a compact client-friendly error list.
    const errors = parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));

    return next(createHttpError(400, "Validation failed", errors));
  }

  req.validated = parsed.data;
  return next();
};

module.exports = validate;
