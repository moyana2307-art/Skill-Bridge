import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import Register from './Register';

const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockAuthState = {
  user: null,
  login: mockLogin,
  register: mockRegister,
};

jest.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

function renderPage(page) {
  return render(<MemoryRouter>{page}</MemoryRouter>);
}

beforeEach(() => {
  mockAuthState.user = null;
  mockLogin.mockReset().mockResolvedValue({});
  mockRegister.mockReset().mockResolvedValue({});
});

test('lets the user reveal and hide the login password', () => {
  renderPage(<Login />);

  const password = screen.getByLabelText('Password');
  const toggle = screen.getByRole('button', { name: 'Show password' });

  fireEvent.click(toggle);

  expect(password).toHaveAttribute('type', 'text');
  expect(
    screen.getByRole('button', { name: 'Hide password' })
  ).toHaveAttribute('aria-pressed', 'true');

  fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));

  expect(password).toHaveAttribute('type', 'password');
});

test('submits the login credentials', async () => {
  renderPage(<Login />);

  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'tariro@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'StrongPass123!' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

  await waitFor(() =>
    expect(mockLogin).toHaveBeenCalledWith({
      email: 'tariro@example.com',
      password: 'StrongPass123!',
    })
  );
});

test('blocks registration when the passwords do not match', async () => {
  renderPage(<Register />);

  fireEvent.change(screen.getByLabelText('Full name'), {
    target: { value: 'Tariro Moyo' },
  });
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'tariro@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'StrongPass123!' },
  });
  fireEvent.change(screen.getByLabelText('Confirm password'), {
    target: { value: 'DifferentPass123!' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

  expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
  expect(mockRegister).not.toHaveBeenCalled();
});

test('submits a valid registration and reveals passwords independently', async () => {
  renderPage(<Register />);

  fireEvent.change(screen.getByLabelText('Full name'), {
    target: { value: 'Tariro Moyo' },
  });
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'tariro@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'StrongPass123!' },
  });
  fireEvent.change(screen.getByLabelText('Confirm password'), {
    target: { value: 'StrongPass123!' },
  });

  fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
  expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
  expect(screen.getByLabelText('Confirm password')).toHaveAttribute(
    'type',
    'password'
  );

  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

  await waitFor(() =>
    expect(mockRegister).toHaveBeenCalledWith({
      name: 'Tariro Moyo',
      email: 'tariro@example.com',
      password: 'StrongPass123!',
    })
  );
});
