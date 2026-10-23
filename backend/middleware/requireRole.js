// Allows the request only when the logged-in user has one of the given roles.
// Always place requireAuth before this middleware.
const ApiError = require('../utils/ApiError');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Please log in to continue'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden('You do not have permission to perform this action')
      );
    }

    return next();
  };
}

module.exports = requireRole;
