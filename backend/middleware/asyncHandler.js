/**
 * Wrap async Express handlers so rejected promises are forwarded to `next`.
 * This removes repetitive try/catch blocks in controllers.
 */
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

module.exports = asyncHandler;
