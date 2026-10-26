import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';
import { opportunitiesApi } from '../api/client';

const mockAuthState = { user: null };

jest.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

jest.mock('../api/client', () => ({
  opportunitiesApi: {
    list: jest.fn(),
  },
}));

const PREVIEW = [
  {
    id: 1,
    title: 'Junior Web Developer',
    organisation: 'Example Zimbabwe',
    opportunity_type: 'job',
    location: 'Harare',
    is_remote: false,
    application_deadline: '2026-12-01',
  },
];

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockAuthState.user = null;
  opportunitiesApi.list.mockReset();
  opportunitiesApi.list.mockResolvedValue({
    data: PREVIEW,
    meta: { total: 7 },
  });
});

test('renders real opportunity previews from the public feed', async () => {
  renderHome();

  expect(
    await screen.findByRole('heading', { name: 'Junior Web Developer' })
  ).toBeInTheDocument();
  expect(screen.getByText('7 listings available.')).toBeInTheDocument();
  expect(opportunitiesApi.list).toHaveBeenCalledWith({
    limit: 3,
    sort: 'newest',
    order: 'desc',
  });
});

test('shows a fallback when live opportunities cannot load', async () => {
  opportunitiesApi.list.mockRejectedValue(new Error('Network unavailable'));

  renderHome();

  expect(
    await screen.findByRole('heading', {
      name: /live listings could not load right now/i,
    })
  ).toBeInTheDocument();
});

test('points logged-in visitors back to their workspace', async () => {
  mockAuthState.user = { name: 'Tariro Moyo' };

  renderHome();

  const links = await screen.findAllByRole('link', {
    name: /open your workspace/i,
  });

  expect(links).toHaveLength(2);
  expect(links[0]).toHaveAttribute('href', '/profile');
});
