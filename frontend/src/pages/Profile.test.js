import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Profile from './Profile';
import { aiApi, profileApi } from '../api/client';
import { prepareAvatarFile } from '../utils/avatar';

const mockUpdateUser = jest.fn();

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ updateUser: mockUpdateUser }),
}));

jest.mock('../api/client', () => ({
  profileApi: {
    get: jest.fn(),
    update: jest.fn(),
    uploadAvatar: jest.fn(),
    removeAvatar: jest.fn(),
  },
  aiApi: {
    latestProfileReview: jest.fn(),
    profileReview: jest.fn(),
  },
}));

jest.mock('../utils/avatar', () => {
  const actual = jest.requireActual('../utils/avatar');

  return {
    ...actual,
    prepareAvatarFile: jest.fn(),
  };
});

const PROFILE = {
  education_level: null,
  location: null,
  career_interests: null,
  learning_preferences: null,
  work_experience: null,
  updated_at: null,
};

const USER = {
  id: 1,
  name: 'Tariro Moyo',
  email: 'tariro@example.com',
  role: 'user',
  avatar: null,
};

const USER_WITH_AVATAR = {
  ...USER,
  avatar: 'data:image/jpeg;base64,YXZhdGFy',
};

function mockProfile(user = USER) {
  profileApi.get.mockResolvedValue({
    data: { user, profile: PROFILE },
  });
}

beforeEach(() => {
  mockUpdateUser.mockReset();
  profileApi.get.mockReset();
  profileApi.update.mockReset();
  profileApi.uploadAvatar.mockReset();
  profileApi.removeAvatar.mockReset();
  aiApi.latestProfileReview.mockReset().mockResolvedValue({
    data: { review: null, generated_at: null },
  });
  aiApi.profileReview.mockReset();
  prepareAvatarFile.mockReset();
});

test('removes an existing profile picture', async () => {
  mockProfile(USER_WITH_AVATAR);
  profileApi.removeAvatar.mockResolvedValue({
    data: { user: USER, profile: PROFILE },
  });

  render(<Profile />);

  expect(
    await screen.findByRole('img', { name: 'Tariro Moyo' })
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

  expect(await screen.findByText('Profile picture removed.')).toBeInTheDocument();
  expect(profileApi.removeAvatar).toHaveBeenCalledTimes(1);
  expect(mockUpdateUser).toHaveBeenCalledWith(USER);
  expect(screen.getByText('TM')).toBeInTheDocument();
});

test('compresses and uploads a chosen profile picture', async () => {
  mockProfile();
  const sourceFile = new File(['source'], 'photo.png', {
    type: 'image/png',
  });
  const preparedFile = new File(['prepared'], 'profile-picture.jpg', {
    type: 'image/jpeg',
  });

  prepareAvatarFile.mockResolvedValue(preparedFile);
  profileApi.uploadAvatar.mockResolvedValue({
    data: { user: USER_WITH_AVATAR, profile: PROFILE },
  });

  render(<Profile />);

  await screen.findByRole('button', { name: 'Add picture' });

  fireEvent.change(document.querySelector('input[type="file"]'), {
    target: { files: [sourceFile] },
  });

  await waitFor(() =>
    expect(prepareAvatarFile).toHaveBeenCalledWith(sourceFile)
  );
  expect(profileApi.uploadAvatar).toHaveBeenCalledWith(preparedFile);
  expect(
    await screen.findByRole('img', { name: 'Tariro Moyo' })
  ).toBeInTheDocument();
  expect(screen.getByText('Profile picture updated.')).toBeInTheDocument();
});

test('shows a validation message when the chosen file is not an image', async () => {
  mockProfile();
  prepareAvatarFile.mockRejectedValue(
    new Error('Choose a JPEG, PNG, or WebP image.')
  );

  render(<Profile />);

  await screen.findByRole('button', { name: 'Add picture' });

  fireEvent.change(document.querySelector('input[type="file"]'), {
    target: {
      files: [new File(['notes'], 'notes.txt', { type: 'text/plain' })],
    },
  });

  expect(
    await screen.findByText('Choose a JPEG, PNG, or WebP image.')
  ).toBeInTheDocument();
  expect(profileApi.uploadAvatar).not.toHaveBeenCalled();
});
