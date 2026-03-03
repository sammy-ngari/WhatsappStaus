/**
 * 404 handler for unmatched routes.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route ${req.method} ${req.originalUrl} not found`);
  error.statusCode = 404;
  next(error);
};

/**
 * Global API error formatter.
 * Output contract:
 * {
 *   success: false,
 *   message: string,
 *   errors?: [{ path, message }]
 * }
 */
const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = Number(error.statusCode || error.status || 500);
  const safeStatusCode = Number.isInteger(statusCode) ? statusCode : 500;

  const payload = {
    success: false,
    message: safeStatusCode >= 500 ? "Internal server error" : error.message || "Request failed",
  };

  if (Array.isArray(error.errors) && error.errors.length > 0) {
    payload.errors = error.errors;
  }

  if (safeStatusCode >= 500) {
    // Preserve stack traces in server logs while returning safe client messages.
    console.error(error);
  }

  res.status(safeStatusCode).json(payload);
};

module.exports = {
  errorHandler,
  notFound,
};
