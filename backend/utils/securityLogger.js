/**
 * Emits security-relevant events in a structured, token-safe format.
 * The log payload intentionally excludes raw secrets/tokens to avoid turning logs into a secondary leak vector.
 *
 * @param {string} eventName - Stable machine-readable event identifier.
 * @param {Record<string, unknown>} [metadata] - Non-sensitive context values useful for investigations.
 * @returns {void}
 */
const logSecurityEvent = (eventName, metadata = {}) => {
  const payload = {
    event: eventName,
    metadata,
    timestamp: new Date().toISOString(),
  };

  console.warn("[security-event]", JSON.stringify(payload));
};

module.exports = {
  logSecurityEvent,
};
