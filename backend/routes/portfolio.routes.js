// Shareable digital portfolio. Settings require a login; the public view is
// available to anyone with the link.
const express = require('express');
const controller = require('../controllers/projects.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const { updatePortfolioBody, slugParams } = require('../validators/portfolio.validator');

const router = express.Router();

router.get('/settings', requireAuth, asyncHandler(controller.getPortfolioSettings));
router.patch(
  '/settings',
  requireAuth,
  validate({ body: updatePortfolioBody }),
  asyncHandler(controller.updatePortfolioSettings)
);

router.get('/:slug', validate({ params: slugParams }), asyncHandler(controller.publicPortfolio));

module.exports = router;
