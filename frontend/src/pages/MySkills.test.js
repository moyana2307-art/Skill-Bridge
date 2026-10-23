import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MySkills from './MySkills';
import { metaApi, skillsApi, userSkillsApi } from '../api/client';

jest.mock('../api/client', () => ({
  metaApi: { get: jest.fn() },
  skillsApi: { list: jest.fn() },
  userSkillsApi: {
    list: jest.fn(),
    add: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

const pythonSkill = {
  skill_id: 5,
  name: 'Python',
  category: 'Programming',
  proficiency: 'intermediate',
};

const javascriptSkill = {
  id: 4,
  name: 'JavaScript',
  category: 'Programming',
};

const originalConfirm = window.confirm;

beforeEach(() => {
  jest.clearAllMocks();

  metaApi.get.mockResolvedValue({
    data: { skill_categories: ['Programming', 'Design'] },
  });
  skillsApi.list.mockResolvedValue({
    data: [javascriptSkill],
    meta: { page: 1, total: 1, totalPages: 1 },
  });
  userSkillsApi.list.mockResolvedValue({
    data: { skills: [pythonSkill] },
  });
});

afterEach(() => {
  window.confirm = originalConfirm;
});

test('shows profile skills and matching catalogue skills', async () => {
  render(<MySkills />);

  expect(
    await screen.findByRole('heading', { name: /your skills/i })
  ).toBeInTheDocument();
  expect(await screen.findByText('Python')).toBeInTheDocument();
  expect(await screen.findByText('JavaScript')).toBeInTheDocument();
});

test('adds a catalogue skill with the selected level', async () => {
  userSkillsApi.add.mockResolvedValue({
    data: {
      skill: { ...javascriptSkill, skill_id: 4, proficiency: 'beginner' },
    },
  });

  render(<MySkills />);

  fireEvent.click(
    await screen.findByRole('button', {
      name: /add javascript to your skills/i,
    })
  );

  await waitFor(() => {
    expect(userSkillsApi.add).toHaveBeenCalledWith({
      skill_id: 4,
      proficiency: 'beginner',
    });
  });
  expect(
    await screen.findByText(/javascript added to your skills/i)
  ).toBeInTheDocument();
});

test('updates the proficiency of an existing skill', async () => {
  userSkillsApi.update.mockResolvedValue({
    data: { skill: { ...pythonSkill, proficiency: 'advanced' } },
  });

  render(<MySkills />);

  fireEvent.change(
    await screen.findByLabelText(/proficiency for python/i),
    { target: { value: 'advanced' } }
  );

  await waitFor(() => {
    expect(userSkillsApi.update).toHaveBeenCalledWith(5, {
      proficiency: 'advanced',
    });
  });
  expect(
    await screen.findByText(/python proficiency updated/i)
  ).toBeInTheDocument();
});

test('removes a skill after confirmation', async () => {
  window.confirm = jest.fn(() => true);
  userSkillsApi.remove.mockResolvedValue({ data: { skill_id: 5 } });

  render(<MySkills />);

  fireEvent.click(
    await screen.findByRole('button', {
      name: /remove python from your skills/i,
    })
  );

  await waitFor(() => {
    expect(userSkillsApi.remove).toHaveBeenCalledWith(5);
  });
  expect(
    await screen.findByText(/python removed from your skills/i)
  ).toBeInTheDocument();
});
