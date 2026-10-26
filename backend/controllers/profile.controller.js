// The logged-in user's profile. The user id always comes from the token,
// never from the URL, so users cannot request somebody else's profile.
const profileService = require('../services/profile.service');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');
const { detectImageMime } = require('../utils/image');

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

// POST /api/profile/avatar
async function uploadAvatar(req, res) {
  if (!req.file) {
    throw ApiError.badRequest('Choose a profile picture to upload.');
  }

  const avatarMime = detectImageMime(req.file.buffer);

  if (!avatarMime) {
    throw ApiError.badRequest('Profile pictures must be a JPEG, PNG, or WebP image.');
  }

  const data = await profileService.updateAvatar(
    req.user.id,
    req.file.buffer,
    avatarMime
  );

  return sendSuccess(res, { data, message: 'Profile picture updated' });
}

// DELETE /api/profile/avatar
async function removeAvatar(req, res) {
  const data = await profileService.removeAvatar(req.user.id);

  return sendSuccess(res, { data, message: 'Profile picture removed' });
}

module.exports = { get, update, uploadAvatar, removeAvatar };
