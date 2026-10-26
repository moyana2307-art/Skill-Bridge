// The logged-in user's profile and skills.
//
//   GET    /api/profile                  read the current user's profile
//   PATCH  /api/profile                  update the current user's profile
//   POST   /api/profile/avatar           upload a profile picture
//   DELETE /api/profile/avatar           remove the profile picture
//   GET    /api/profile/skills           list the current user's skills
//   POST   /api/profile/skills           add a catalogue skill
//   PATCH  /api/profile/skills/:skillId  change proficiency
//   DELETE /api/profile/skills/:skillId  remove a skill
const express = require('express');
const profileController = require('../controllers/profile.controller');
const userSkillsController = require('../controllers/userSkills.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const { avatarUpload } = require('../middleware/avatarUpload');
const validate = require('../middleware/validate');
const { updateProfileBody } = require('../validators/profile.validator');
const {
  addUserSkillBody,
  updateUserSkillBody,
  userSkillParams,
} = require('../validators/userSkills.validator');

const router = express.Router();

// Every profile route requires a valid login.
router.use(requireAuth);

router.get('/', asyncHandler(profileController.get));
router.patch(
  '/',
  validate({ body: updateProfileBody }),
  asyncHandler(profileController.update)
);
router.post(
  '/avatar',
  avatarUpload,
  asyncHandler(profileController.uploadAvatar)
);
router.delete('/avatar', asyncHandler(profileController.removeAvatar));

router.get('/skills', asyncHandler(userSkillsController.list));
router.post(
  '/skills',
  validate({ body: addUserSkillBody }),
  asyncHandler(userSkillsController.add)
);
router.patch(
  '/skills/:skillId',
  validate({ params: userSkillParams, body: updateUserSkillBody }),
  asyncHandler(userSkillsController.update)
);
router.delete(
  '/skills/:skillId',
  validate({ params: userSkillParams }),
  asyncHandler(userSkillsController.remove)
);

module.exports = router;
