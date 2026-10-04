/**
 * Centralized Error Handler Middleware
 * Catches all errors from route handlers and sends a consistent JSON response.
 */
function errorHandler(err, _req, res, _next) {
  // Don't leak internal errors to the client
  if (!err.status) {
    console.error('Unhandled error:', err);
  }

  const status = err.status || 500;
  const message = err.status
    ? err.message
    : 'An unexpected server error occurred.';

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
