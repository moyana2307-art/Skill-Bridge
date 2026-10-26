import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppSidebar from './AppSidebar';

const mockLogout = jest.fn();

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Tariro Moyo', role: 'user' },
    logout: mockLogout,
  }),
}));

function renderSidebar(overrides = {}) {
  const props = {
    mobileOpen: false,
    onClose: jest.fn(),
    collapsed: false,
    onToggleCollapse: jest.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(
      <MemoryRouter initialEntries={['/goals']}>
        <AppSidebar {...props} />
      </MemoryRouter>
    ),
  };
}

beforeEach(() => {
  mockLogout.mockClear();
  mockLogout.mockResolvedValue();
});

test('shows the workspace links and marks the current page', () => {
  renderSidebar();

  expect(
    screen.getByRole('link', { name: 'Career goals' })
  ).toHaveClass('app-sidebar__link--active');
  expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute(
    'href',
    '/profile'
  );
  expect(screen.getByRole('link', { name: 'Roadmaps' })).toHaveAttribute(
    'href',
    '/roadmaps'
  );
});

test('lets the user collapse and expand the sidebar', () => {
  const { props, rerender } = renderSidebar();

  fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
  expect(props.onToggleCollapse).toHaveBeenCalledTimes(1);

  rerender(
    <MemoryRouter initialEntries={['/goals']}>
      <AppSidebar
        {...props}
        collapsed
      />
    </MemoryRouter>
  );

  expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Career goals' })).toHaveAttribute(
    'title',
    'Career goals'
  );
});

test('logs the user out from the sidebar', async () => {
  renderSidebar();

  fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

  await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
});
