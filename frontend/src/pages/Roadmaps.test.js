import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Roadmaps from './Roadmaps';
import { careerGoalsApi, roadmapsApi } from '../api/client';

jest.mock('../api/client', () => ({
  careerGoalsApi: {
    list: jest.fn(),
  },
  roadmapsApi: {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createTask: jest.fn(),
    updateTask: jest.fn(),
    removeTask: jest.fn(),
  },
}));

const roadmapSummary = {
  id: 1,
  title: 'Frontend path',
  summary: 'A practical path into frontend development.',
  status: 'active',
  career_goal_id: 3,
  career_title: 'Frontend Developer',
  task_count: 1,
  completed_task_count: 0,
  progress_percent: 0,
};

const task = {
  id: 11,
  title: 'Learn React',
  description: 'Complete the React fundamentals tutorial.',
  status: 'not_started',
  skills_to_develop: 'React',
  estimated_duration: '2 weeks',
  position: 1,
};

const roadmapDetail = {
  ...roadmapSummary,
  tasks: [task],
};

function renderRoadmaps() {
  return render(
    <MemoryRouter>
      <Roadmaps />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  careerGoalsApi.list.mockResolvedValue({
    data: {
      goals: [
        {
          id: 3,
          career_title: 'Frontend Developer',
          status: 'active',
          roadmap_count: 1,
        },
      ],
    },
  });
  roadmapsApi.list.mockResolvedValue({
    data: { roadmaps: [roadmapSummary] },
  });
  roadmapsApi.get.mockResolvedValue({ data: { roadmap: roadmapDetail } });
});

test('shows a roadmap and its tasks', async () => {
  renderRoadmaps();

  expect(
    await screen.findByRole('heading', { name: /frontend path/i, level: 2 })
  ).toBeInTheDocument();
  expect(await screen.findByText('Learn React')).toBeInTheDocument();
  expect(screen.getByText(/0 of 1 tasks completed/i)).toBeInTheDocument();
  expect(roadmapsApi.get).toHaveBeenCalledWith(1);
});

test('adds a task to the selected roadmap', async () => {
  roadmapsApi.createTask.mockResolvedValue({
    data: {
      task: {
        id: 12,
        title: 'Build a portfolio',
        status: 'not_started',
      },
    },
  });

  renderRoadmaps();

  fireEvent.click(
    await screen.findByRole('button', { name: /^add task$/i })
  );
  fireEvent.change(await screen.findByLabelText(/task title/i), {
    target: { value: 'Build a portfolio' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^add task$/i }));

  await waitFor(() => {
    expect(roadmapsApi.createTask).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ title: 'Build a portfolio' })
    );
  });
  expect(await screen.findByText(/task added/i)).toBeInTheDocument();
});

test('updates a task status', async () => {
  roadmapsApi.updateTask.mockResolvedValue({
    data: { task: { ...task, status: 'in_progress' } },
  });

  renderRoadmaps();

  fireEvent.change(
    await screen.findByLabelText(/status for learn react/i),
    { target: { value: 'in_progress' } }
  );

  await waitFor(() => {
    expect(roadmapsApi.updateTask).toHaveBeenCalledWith(1, 11, {
      status: 'in_progress',
    });
  });
  expect(
    await screen.findByText(/task progress updated/i)
  ).toBeInTheDocument();
});
