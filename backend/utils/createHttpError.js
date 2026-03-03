/**
 * Helper for attaching HTTP semantics to thrown errors.
 *
 * @param {number} statusCode - HTTP status to be returned by error middleware.
 * @param {string} message - Human-readable error message.
 * @param {Array<{path: string, message: string}>} [errors] - Optional field-level details.
 */
const createHttpError = (statusCode, message, errors) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  if (errors) {
    error.errors = errors;
  }

  return error;
};

module.exports = createHttpError;
