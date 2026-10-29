// The single place where errors become HTTP responses.
//
// Rules:
//   - Errors we raised on purpose (ApiError) are shown to the client as-is.
//   - Known database / body-parser errors are translated into friendly
//     messages without exposing SQL or driver internals.
//   - Anything else is a bug: it is logged in full on the server and the
//     client only receives a generic 500 message.
const ApiError = require('../utils/ApiError');
const { sendError } = require('../utils/response');

// PostgreSQL SQLSTATE codes we can explain safely to the user.
const POSTGRES_ERRORS = {
  '23505': { statusCode: 409, code: 'CONFLICT', message: 'A record with those details already exists.' },
  '23503': { statusCode: 400, code: 'INVALID_REFERENCE', message: 'One of the referenced records does not exist.' },
  '23502': { statusCode: 400, code: 'BAD_REQUEST', message: 'A required value was missing.' },
  '22001': { statusCode: 400, code: 'BAD_REQUEST', message: 'One of the values is longer than the database allows.' },
};

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'Something went wrong on our side. Please try again.';
  let details = null;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'The request body is not valid JSON.';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'The request body is too large.';
  } else if (err.type === 'charset.unsupported') {
    statusCode = 415;
    code = 'UNSUPPORTED_MEDIA_TYPE';
    message = 'That content type is not supported. Send application/json.';
  } else if (err.code && POSTGRES_ERRORS[err.code]) {
    const mapped = POSTGRES_ERRORS[err.code];
    statusCode = mapped.statusCode;
    code = mapped.code;
    message = mapped.message;
  } else if (err.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed.';
    details = err.issues;
  }

  if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  } else {
    console.warn(`[warn] ${req.method} ${req.originalUrl} -> ${statusCode} ${code}`);
  }

  return sendError(res, { statusCode, message, code, details });
}

module.exports = errorHandler;
