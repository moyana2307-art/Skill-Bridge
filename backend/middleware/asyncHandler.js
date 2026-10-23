// Wraps an async route handler so that a rejected promise (a failed database
// query, for example) is passed to the error middleware instead of crashing
// the server with an unhandled rejection.
//
//   router.get('/skills', asyncHandler(skillsController.list));
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

module.exports = asyncHandler;
