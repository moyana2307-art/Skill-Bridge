// ApiError: the one error type the API is allowed to send to clients.
// Anything thrown that is NOT an ApiError is treated as a bug and turned
// into a generic 500 so internal details never leak to the browser.

class ApiError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = options.code || 'ERROR';
    this.details = options.details || null;
    this.isOperational = true;
    Error.captureStackTrace(this, ApiError);
  }

  // 400 - the request itself is wrong
  static badRequest(message = 'Bad request', details = null) {
    return new ApiError(400, message, { code: 'BAD_REQUEST', details });
  }

  // 400 - input failed validation
  static validation(message = 'Validation failed', details = null) {
    return new ApiError(400, message, { code: 'VALIDATION_ERROR', details });
  }

  // 401 - no valid login
  static unauthorized(message = 'Authentication required', details = null) {
    return new ApiError(401, message, { code: 'UNAUTHORIZED', details });
  }

  // 403 - logged in but not allowed
  static forbidden(message = 'You do not have access to this resource', details = null) {
    return new ApiError(403, message, { code: 'FORBIDDEN', details });
  }

  // 404 - the thing asked for does not exist
  static notFound(message = 'Resource not found', details = null) {
    return new ApiError(404, message, { code: 'NOT_FOUND', details });
  }

  // 409 - it clashes with something that already exists
  static conflict(message = 'Resource already exists', details = null) {
    return new ApiError(409, message, { code: 'CONFLICT', details });
  }

  // 500 - something broke on our side
  static internal(message = 'Something went wrong on our side. Please try again.') {
    return new ApiError(500, message, { code: 'INTERNAL_SERVER_ERROR' });
  }
}

module.exports = ApiError;
