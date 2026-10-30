// Employability analytics endpoints.
const analyticsService = require('../services/analytics.service');
const { sendSuccess } = require('../utils/response');

async function employability(req, res) {
  const analytics = await analyticsService.getEmployability(req.user.id);
  return sendSuccess(res, { data: { analytics } });
}

module.exports = { employability };
