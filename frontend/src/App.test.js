import { render, screen } from '@testing-library/react';
import App from './App';

const originalFetch = global.fetch;

beforeEach(() => {
  window.history.pushState({}, '', '/');
  // The tests do not need a real backend. A failed session check means the
  // visitor is logged out, which is what these tests expect.
  global.fetch = jest.fn(() => Promise.reject(new Error('Network unavailable')));
});

afterEach(() => {
  global.fetch = originalFetch;
});

test('renders the SkillBridge AI brand in the navigation', async () => {
  render(<App />);
  await screen.findByRole('link', { name: /log in/i });
  const brandElements = screen.getAllByText(/SkillBridge AI/i);
  expect(brandElements.length).toBeGreaterThan(0);
});

test('renders the landing page headline', async () => {
  render(<App />);
  await screen.findByRole('link', { name: /log in/i });
  expect(screen.getByText(/Build skills/i)).toBeInTheDocument();
});

test('shows the login form', async () => {
  window.history.pushState({}, '', '/login');
  render(<App />);

  expect(
    await screen.findByRole('heading', { name: /welcome back/i })
  ).toBeInTheDocument();
});

test('redirects logged-out visitors from the profile page to login', async () => {
  window.history.pushState({}, '', '/profile');
  render(<App />);

  expect(
    await screen.findByRole('heading', { name: /welcome back/i })
  ).toBeInTheDocument();
});

test('redirects logged-out visitors from the skills page to login', async () => {
  window.history.pushState({}, '', '/skills');
  render(<App />);

  expect(
    await screen.findByRole('heading', { name: /welcome back/i })
  ).toBeInTheDocument();
});

test('redirects logged-out visitors from the goals page to login', async () => {
  window.history.pushState({}, '', '/goals');
  render(<App />);

  expect(
    await screen.findByRole('heading', { name: /welcome back/i })
  ).toBeInTheDocument();
});

test('redirects logged-out visitors from the roadmaps page to login', async () => {
  window.history.pushState({}, '', '/roadmaps');
  render(<App />);

  expect(
    await screen.findByRole('heading', { name: /welcome back/i })
  ).toBeInTheDocument();
});

test('shows the opportunities page to logged-out visitors', async () => {
  window.history.pushState({}, '', '/opportunities');
  render(<App />);

  expect(
    await screen.findByRole('heading', { name: /^opportunities$/i })
  ).toBeInTheDocument();
});
