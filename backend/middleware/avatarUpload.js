// Reads one profile-picture upload into memory so it can be validated before
// being stored in MySQL. Files never touch the server's temporary disk.
const multer = require('multer');
const ApiError = require('../utils/ApiError');

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_AVATAR_BYTES,
    files: 1,
  },
});

function avatarUpload(req, res, next) {
  upload.single('avatar')(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          ApiError.badRequest('Profile pictures must be 2 MB or smaller.')
        );
      }

      return next(
        ApiError.badRequest(
          'Could not read that upload. Send one image using the "avatar" field.'
        )
      );
    }

    return next(err);
  });
}

module.exports = { avatarUpload, MAX_AVATAR_BYTES };
