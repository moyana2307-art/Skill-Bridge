// Skills catalogue endpoints.
//
//   GET    /api/skills      list + filters
//   GET    /api/skills/:id  one skill
//   POST   /api/skills      create
//   PATCH  /api/skills/:id  update
//   DELETE /api/skills/:id  delete
const express = require('express');
const skillsController = require('../controllers/skills.controller');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  listSkillsQuery,
  skillIdParams,
  createSkillBody,
  updateSkillBody,
} = require('../validators/skills.validator');

const router = express.Router();

router.get('/', validate({ query: listSkillsQuery }), asyncHandler(skillsController.list));
router.get('/:id', validate({ params: skillIdParams }), asyncHandler(skillsController.getOne));

// The shared skills catalogue is admin-managed.
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  validate({ body: createSkillBody }),
  asyncHandler(skillsController.create)
);
router.patch(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validate({ params: skillIdParams, body: updateSkillBody }),
  asyncHandler(skillsController.update)
);
router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validate({ params: skillIdParams }),
  asyncHandler(skillsController.remove)
);

module.exports = router;
