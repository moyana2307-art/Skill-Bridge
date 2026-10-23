// Validation middleware.
//
// Takes a map of request parts to zod schemas, for example:
//
//   validate({ body: createSkillBody, params: { id: idParam } })
//
// If anything fails, the request is rejected with a 400 that lists each
// problem. If it passes, the cleaned-up values are placed on `req.validated`
// (the original req.body / req.query are left untouched).
const ApiError = require('../utils/ApiError');

function formatIssues(issues) {
  return issues.map((issue) => {
    // Zod reports unknown keys on the root object with an empty path, so we
    // pull the key names out of the issue itself.
    let field = issue.path.join('.');

    if (!field && Array.isArray(issue.keys)) field = issue.keys.join(', ');
    if (!field) field = '(body)';

    return { field, message: issue.message, code: issue.code };
  });
}

function validate(schemas = {}) {
  return (req, res, next) => {
    const validated = { ...(req.validated || {}) };

    for (const [source, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(req[source] ?? {});

      if (!result.success) {
        return next(ApiError.validation('Validation failed', formatIssues(result.error.issues)));
      }

      validated[source] = result.data;
    }

    req.validated = validated;

    return next();
  };
}

module.exports = validate;
