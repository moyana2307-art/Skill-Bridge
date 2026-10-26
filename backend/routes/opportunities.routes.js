// Opportunity endpoints.
//
//   GET    /api/opportunities            list + filters
//   GET    /api/opportunities/matches    skill-based matches (protected)
//   GET    /api/opportunities/saved      saved list (protected)
//   POST   /api/opportunities/:id/save   save (protected)
//   DELETE /api/opportunities/:id/save   unsave (protected)
//   GET    /api/opportunities/:id        one opportunity
//   POST   /api/opportunities            create (admin)
//   PATCH  /api/opportunities/:id        update (admin)
//   DELETE /api/opportunities/:id        delete (admin)
const express = require('express');
const opportunitiesController = require('../controllers/opportunities.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  listOpportunitiesQuery,
  opportunityIdParams,
  createOpportunityBody,
  updateOpportunityBody,
} = require('../validators/opportunities.validator');

const router = express.Router();

router.get(
  '/',
  validate({ query: listOpportunitiesQuery }),
  asyncHandler(opportunitiesController.list)
);
// These must come before /:id so "matches" and "saved" are not treated as ids.
router.get(
  '/matches',
  requireAuth,
  validate({ query: listOpportunitiesQuery }),
  asyncHandler(opportunitiesController.matches)
);
router.get('/saved', requireAuth, asyncHandler(opportunitiesController.saved));
// Admin-only: pull fresh listings from the configured public APIs.
router.post(
  '/sync',
  requireAuth,
  requireRole('admin'),
  asyncHandler(opportunitiesController.sync)
);
router.post(
  '/:id/save',
  requireAuth,
  validate({ params: opportunityIdParams }),
  asyncHandler(opportunitiesController.save)
);
router.delete(
  '/:id/save',
  requireAuth,
  validate({ params: opportunityIdParams }),
  asyncHandler(opportunitiesController.unsave)
);
router.get(
  '/:id',
  validate({ params: opportunityIdParams }),
  asyncHandler(opportunitiesController.getOne)
);
// Opportunities are admin-managed; listing and detail pages stay public.
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  validate({ body: createOpportunityBody }),
  asyncHandler(opportunitiesController.create)
);
router.patch(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validate({ params: opportunityIdParams, body: updateOpportunityBody }),
  asyncHandler(opportunitiesController.update)
);
router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validate({ params: opportunityIdParams }),
  asyncHandler(opportunitiesController.remove)
);

module.exports = router;
