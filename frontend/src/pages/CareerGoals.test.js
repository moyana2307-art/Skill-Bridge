import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CareerGoals from './CareerGoals';
import { careerGoalsApi } from '../api/client';

jest.mock('../api/client', () => ({
  careerGoalsApi: {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

const activeGoal = {
  id: 1,
  career_title: 'Frontend Developer',
  status: 'active',
  roadmap_count: 2,
  updated_at: '2026-10-20T10:00:00.000Z',
};

function renderGoals() {
  return render(
    <MemoryRouter>
      <CareerGoals />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  careerGoalsApi.list.mockResolvedValue({ data: { goals: [activeGoal] } });
});

test('shows career goals with their status and roadmap count', async () => {
  renderGoals();

  expect(
    await screen.findByRole('heading', { name: /career goals/i })
  ).toBeInTheDocument();
  expect(await screen.findByText('Frontend Developer')).toBeInTheDocument();
  expect(screen.getByText('2 roadmaps')).toBeInTheDocument();
  expect(screen.getByText('1 shown')).toBeInTheDocument();
});

test('creates a new career goal', async () => {
  const createdGoal = {
    id: 2,
    career_title: 'Data Analyst',
    status: 'active',
    roadmap_count: 0,
    updated_at: '2026-10-21T10:00:00.000Z',
  };

  careerGoalsApi.create.mockResolvedValue({ data: { goal: createdGoal } });
  careerGoalsApi.list
    .mockResolvedValueOnce({ data: { goals: [activeGoal] } })
    .mockResolvedValue({ data: { goals: [createdGoal, activeGoal] } });

  renderGoals();

  await screen.findByText('Frontend Developer');
  fireEvent.change(screen.getByLabelText(/career title/i), {
    target: { value: 'Data Analyst' },
  });
  fireEvent.click(screen.getByRole('button', { name: /add goal/i }));

  await waitFor(() => {
    expect(careerGoalsApi.create).toHaveBeenCalledWith({
      career_title: 'Data Analyst',
      status: 'active',
    });
  });
  expect(
    await screen.findByText(/data analyst added to your goals/i)
  ).toBeInTheDocument();
  expect(await screen.findByText('Data Analyst')).toBeInTheDocument();
});

test('updates the status of a career goal', async () => {
  careerGoalsApi.update.mockResolvedValue({
    data: { goal: { ...activeGoal, status: 'completed' } },
  });

  renderGoals();

  fireEvent.change(await screen.findByLabelText('Status'), {
    target: { value: 'completed' },
  });

  await waitFor(() => {
    expect(careerGoalsApi.update).toHaveBeenCalledWith(1, {
      status: 'completed',
    });
  });
  expect(
    await screen.findByText(/status updated for frontend developer/i)
  ).toBeInTheDocument();
});
