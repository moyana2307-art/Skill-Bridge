import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Opportunities from './Opportunities';
import { aiApi, opportunitiesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

jest.mock('../api/client', () => ({
  aiApi: {
    opportunityInsight: jest.fn(),
  },
  opportunitiesApi: {
    list: jest.fn(),
    get: jest.fn(),
    matches: jest.fn(),
    saved: jest.fn(),
    save: jest.fn(),
    unsave: jest.fn(),
  },
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const user = { id: 7, name: 'Alex Student', role: 'user' };

const job = {
  id: 1,
  title: 'Junior Frontend Developer',
  organisation: 'Acme Studio',
  description: 'Build accessible interfaces with a small product team.',
  opportunity_type: 'job',
  required_skills: 'React, CSS, Git',
  location: 'Berlin',
  is_remote: true,
  eligibility: null,
  application_deadline: null,
  application_url: 'https://example.com/jobs/1',
  source_name: 'ReliefWeb',
  is_active: true,
};

function renderOpportunities() {
  return render(
    <MemoryRouter>
      <Opportunities />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user, loading: false });

  opportunitiesApi.list.mockResolvedValue({
    data: [job],
    meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
  });
  opportunitiesApi.saved.mockResolvedValue({ data: [] });
});

test('shows the public opportunity directory to logged-out visitors', async () => {
  useAuth.mockReturnValue({ user: null, loading: false });

  renderOpportunities();

  expect(
    await screen.findByRole('heading', { name: /^opportunities$/i })
  ).toBeInTheDocument();
  expect(
    await screen.findByText('Junior Frontend Developer')
  ).toBeInTheDocument();
  expect(screen.getByText('Acme Studio')).toBeInTheDocument();
  expect(screen.getByText(/remote · berlin/i)).toBeInTheDocument();
  expect(screen.queryByText('Demo')).not.toBeInTheDocument();
  expect(screen.getByText(/apply via source/i)).toHaveAttribute(
    'href',
    'https://example.com/jobs/1'
  );
  expect(screen.getByText(/log in/i)).toBeInTheDocument();
  expect(opportunitiesApi.saved).not.toHaveBeenCalled();
  expect(opportunitiesApi.list).toHaveBeenCalledWith(
    expect.objectContaining({ page: 1, limit: 12, sort: 'newest' })
  );
});

test('shows skill-based matches for a logged-in user', async () => {
  opportunitiesApi.matches.mockResolvedValue({
    data: [
      {
        ...job,
        match_score: 67,
        required_skills_list: ['React', 'CSS', 'Git'],
        matched_skills: ['React'],
        missing_skills: ['CSS', 'Git'],
        saved: false,
      },
    ],
    meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
  });

  renderOpportunities();

  await screen.findByText('Junior Frontend Developer');
  fireEvent.click(screen.getByRole('tab', { name: /for you/i }));

  await waitFor(() => {
    expect(opportunitiesApi.matches).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 12, sort: 'newest' })
    );
  });
  expect(await screen.findByText('67% match')).toBeInTheDocument();
  expect(screen.getByText('React')).toBeInTheDocument();
  expect(screen.getByText('CSS')).toBeInTheDocument();
});

test('saves an opportunity and updates the save button', async () => {
  opportunitiesApi.save.mockResolvedValue({
    data: {
      opportunity: {
        ...job,
        saved: true,
        saved_at: '2026-10-22T09:00:00.000Z',
      },
    },
  });

  renderOpportunities();

  fireEvent.click(
    await screen.findByRole('button', {
      name: /save junior frontend developer/i,
    })
  );

  await waitFor(() => {
    expect(opportunitiesApi.save).toHaveBeenCalledWith(1);
  });
  expect(
    await screen.findByText(/junior frontend developer saved/i)
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', {
      name: /remove junior frontend developer from saved opportunities/i,
    })
  ).toBeInTheDocument();
});

test('shows saved opportunities and allows removing them', async () => {
  opportunitiesApi.saved.mockResolvedValue({
    data: [{ ...job, saved: true, saved_at: '2026-10-22T09:00:00.000Z' }],
  });
  opportunitiesApi.unsave.mockResolvedValue({
    data: { opportunity_id: 1 },
  });

  renderOpportunities();

  await screen.findByText('Junior Frontend Developer');
  fireEvent.click(screen.getByRole('tab', { name: /^saved/i }));

  expect(
    await screen.findByText(/these are the opportunities you bookmarked/i)
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', {
      name: /remove junior frontend developer from saved opportunities/i,
    })
  );

  await waitFor(() => {
    expect(opportunitiesApi.unsave).toHaveBeenCalledWith(1);
  });
  expect(await screen.findByText(/nothing saved yet/i)).toBeInTheDocument();
});

test('shows an AI insight for a logged-in user', async () => {
  aiApi.opportunityInsight.mockResolvedValue({
    data: {
      opportunity: job,
      insight: {
        fit_level: 'strong',
        summary: 'Your React and CSS skills line up well with this role.',
        strengths: ['Hands-on React experience'],
        gaps: ['No professional Git workflow mentioned'],
        application_tips: ['Show a deployed React project'],
        questions_to_prepare: ['How is code review handled?'],
      },
    },
  });

  renderOpportunities();

  fireEvent.click(
    await screen.findByRole('button', { name: /why this fits/i })
  );

  await waitFor(() => {
    expect(aiApi.opportunityInsight).toHaveBeenCalledWith({
      opportunity_id: 1,
    });
  });
  expect(await screen.findByText(/strong fit/i)).toBeInTheDocument();
  expect(
    screen.getByText(/your react and css skills line up well/i)
  ).toBeInTheDocument();
  expect(screen.getByText('Hands-on React experience')).toBeInTheDocument();
});
