// Runs after every route. If no route matched the request, we turn that into
// a clean 404 instead of Express's default HTML error page.
const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = notFound;
