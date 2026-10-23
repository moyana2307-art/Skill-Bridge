// Every response the API sends uses the same JSON shape, so the frontend
// only ever has to check `success` once.
//
//   success: { success: true,  data: {...}, meta: {...}, message: "..." }
//   error:   { success: false, error: { message, code, details } }

function sendSuccess(res, { data = null, message = null, statusCode = 200, meta = null } = {}) {
  const body = { success: true, data };

  if (message) body.message = message;
  if (meta) body.meta = meta;

  return res.status(statusCode).json(body);
}

function sendError(res, { statusCode = 500, message = 'Something went wrong on our side. Please try again.', code = 'ERROR', details = null } = {}) {
  const error = { message, code };

  if (details) error.details = details;

  return res.status(statusCode).json({ success: false, error });
}

module.exports = { sendSuccess, sendError };
