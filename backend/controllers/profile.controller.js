// The logged-in user's profile. The user id always comes from the token,
// never from the URL, so users cannot request somebody else's profile.
const profileService = require('../services/profile.service');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

// GET /api/profile
async function get(req, res) {
  const data = await profileService.getProfile(req.user.id);

  if (!data) throw ApiError.notFound('Profile not found');

  return sendSuccess(res, { data });
}

// PATCH /api/profile
async function update(req, res) {
  const data = await profileService.updateProfile(req.user.id, req.validated.body);

  return sendSuccess(res, { data, message: 'Profile updated' });
}

module.exports = { get, update };
