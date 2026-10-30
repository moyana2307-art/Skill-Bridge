// Advanced user dashboard.
const dashboardService = require('../services/dashboard.service');
const { sendSuccess } = require('../utils/response');

async function get(req, res) {
  const dashboard = await dashboardService.getDashboard(req.user.id);
  return sendSuccess(res, { data: { dashboard } });
}

module.exports = { get };
