// Route guard that checks the user's plan and monthly usage before an
// expensive or premium feature runs.
const subscriptionsService = require('../services/subscriptions.service');
const asyncHandler = require('./asyncHandler');

function requireFeature(feature) {
  return asyncHandler(async (req, res, next) => {
    const entitlements = await subscriptionsService.assertFeature(
      req.user.id,
      feature
    );
    req.entitlements = entitlements;
    return next();
  });
}

module.exports = requireFeature;
