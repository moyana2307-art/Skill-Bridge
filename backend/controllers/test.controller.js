// Development-only diagnostic endpoints.
// They confirm that JSON parsing, validation, and the shared response format
// work before real features depend on them. routes/index.js hides these in
// production.
const { sendSuccess } = require('../utils/response');

// GET /api/test
function ping(req, res) {
  return sendSuccess(res, {
    data: {
      message: 'pong',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    },
  });
}

// POST /api/test/echo
function echo(req, res) {
  return sendSuccess(res, {
    data: {
      youSent: req.validated.body,
      receivedAt: new Date().toISOString(),
    },
  });
}

module.exports = { ping, echo };
