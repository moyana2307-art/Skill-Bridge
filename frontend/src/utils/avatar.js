export const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_AVATAR_SOURCE_BYTES = 10 * 1024 * 1024;
const AVATAR_OUTPUT_SIZE = 512;
const AVATAR_OUTPUT_QUALITY = 0.86;

export function getInitials(user) {
  const label = user?.name || user?.email || 'SkillBridge';

  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error('That file could not be read as an image.'));
    image.src = url;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('That image could not be prepared for upload.'));
      },
      'image/jpeg',
      AVATAR_OUTPUT_QUALITY
    );
  });
}

// Crops the image to a centred square and compresses it in the browser. This
// keeps uploads small and removes camera metadata before anything is sent.
export async function prepareAvatarFile(file) {
  if (!file) {
    throw new Error('Choose a profile picture first.');
  }

  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    throw new Error('Choose a JPEG, PNG, or WebP image.');
  }

  if (file.size > MAX_AVATAR_SOURCE_BYTES) {
    throw new Error('Choose an image smaller than 10 MB.');
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);

    if (!sourceSize) {
      throw new Error('That image has no readable dimensions.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_OUTPUT_SIZE;
    canvas.height = AVATAR_OUTPUT_SIZE;

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Your browser cannot prepare that image.');
    }

    const sourceX = (image.naturalWidth - sourceSize) / 2;
    const sourceY = (image.naturalHeight - sourceSize) / 2;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      AVATAR_OUTPUT_SIZE,
      AVATAR_OUTPUT_SIZE
    );

    const blob = await canvasToBlob(canvas);

    return new File([blob], 'profile-picture.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
