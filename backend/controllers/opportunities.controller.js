// Opportunity endpoints (jobs, internships, scholarships, training, courses).
const opportunitiesService = require('../services/opportunities.service');
const { syncOpportunities } = require('../services/opportunitySync.service');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

// GET /api/opportunities
async function list(req, res) {
  const filters = req.validated.query;
  const result = await opportunitiesService.listOpportunities(filters);

  return sendSuccess(res, {
    data: result.rows,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit) || 0,
    },
  });
}

// GET /api/opportunities/:id
async function getOne(req, res) {
  const { id } = req.validated.params;
  const opportunity = await opportunitiesService.getOpportunityById(id);

  if (!opportunity) throw ApiError.notFound(`Opportunity ${id} was not found`);

  return sendSuccess(res, { data: opportunity });
}

// POST /api/opportunities
async function create(req, res) {
  const opportunity = await opportunitiesService.createOpportunity(req.validated.body);

  return sendSuccess(res, {
    statusCode: 201,
    data: opportunity,
    message: 'Opportunity created',
  });
}

// PATCH /api/opportunities/:id
async function update(req, res) {
  const { id } = req.validated.params;
  const opportunity = await opportunitiesService.updateOpportunity(id, req.validated.body);

  if (!opportunity) throw ApiError.notFound(`Opportunity ${id} was not found`);

  return sendSuccess(res, { data: opportunity, message: 'Opportunity updated' });
}

// DELETE /api/opportunities/:id
async function remove(req, res) {
  const { id } = req.validated.params;
  const deleted = await opportunitiesService.deleteOpportunity(id);

  if (!deleted) throw ApiError.notFound(`Opportunity ${id} was not found`);

  return sendSuccess(res, { data: { id: Number(id) }, message: 'Opportunity deleted' });
}

// GET /api/opportunities/matches
async function matches(req, res) {
  const result = await opportunitiesService.listMatchingOpportunities(
    req.user.id,
    req.validated.query
  );

  return sendSuccess(res, {
    data: result.rows,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit) || 0,
    },
  });
}

// POST /api/opportunities/sync (admin)
async function sync(req, res) {
  const result = await syncOpportunities();

  return sendSuccess(res, {
    data: result,
    message: 'Opportunity sync finished',
  });
}

// GET /api/opportunities/saved
async function saved(req, res) {
  const opportunities = await opportunitiesService.listSavedOpportunities(
    req.user.id
  );

  return sendSuccess(res, { data: opportunities });
}

// POST /api/opportunities/:id/save
async function save(req, res) {
  const { id } = req.validated.params;
  const result = await opportunitiesService.saveOpportunity(req.user.id, id);

  if (result.status === 'not_found') {
    throw ApiError.notFound(`Opportunity ${id} was not found`);
  }

  return sendSuccess(res, {
    statusCode: result.status === 'created' ? 201 : 200,
    data: { opportunity: result.opportunity },
    message:
      result.status === 'created'
        ? 'Opportunity saved'
        : 'Opportunity was already saved',
  });
}

// DELETE /api/opportunities/:id/save
async function unsave(req, res) {
  const { id } = req.validated.params;
  const removed = await opportunitiesService.removeSavedOpportunity(
    req.user.id,
    id
  );

  if (!removed) {
    throw ApiError.notFound('That opportunity is not in your saved list');
  }

  return sendSuccess(res, {
    data: { opportunity_id: id },
    message: 'Opportunity removed from saved list',
  });
}

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
  matches,
  saved,
  save,
  unsave,
  sync,
};
