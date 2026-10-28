import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes, ROUTER_FUTURE } from './App';
import { AuthProvider } from './context/AuthContext';
import { passwordStrength, validateRegister } from './utils/validation';

function renderAt(path) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]} future={ROUTER_FUTURE}>
        <AppRoutes />
      </MemoryRouter>
    </AuthProvider>
  );
}

async function signIn(identifier, password) {
  renderAt('/login');
  userEvent.type(await screen.findByLabelText(/email or username/i), identifier);
  userEvent.type(screen.getByLabelText(/^password$/i), password);
  userEvent.click(screen.getByRole('button', { name: /sign in/i }));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

test('signed-out visitors are sent to the login page', async () => {
  renderAt('/dashboard');
  expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
});

test('login shows field errors when submitted empty', async () => {
  renderAt('/login');
  userEvent.click(await screen.findByRole('button', { name: /sign in/i }));
  expect(screen.getByText(/enter your email or username/i)).toBeInTheDocument();
  expect(screen.getByText(/enter your password/i)).toBeInTheDocument();
});

test('login rejects a wrong password', async () => {
  await signIn('member', 'nope');
  expect(await screen.findByText(/incorrect email\/username or password/i)).toBeInTheDocument();
});

test('members can sign in and do not see the admin link', async () => {
  await signIn('member', 'Member123!');
  expect(await screen.findByText(/good to see you, max/i, {}, { timeout: 2000 })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /^admin$/i })).not.toBeInTheDocument();
});

test('admins see the admin link and the user list', async () => {
  await signIn('admin', 'Admin123!');
  userEvent.click(await screen.findByRole('link', { name: /^admin$/i }, { timeout: 2000 }));
  expect(await screen.findByText('admin@momentum.dev', {}, { timeout: 2000 })).toBeInTheDocument();
  expect(screen.getByText('member@momentum.dev')).toBeInTheDocument();
});

test('a new user can register and lands on the dashboard', async () => {
  renderAt('/register');
  userEvent.type(await screen.findByLabelText(/full name/i), 'Jordan Lee');
  userEvent.type(screen.getByLabelText(/username/i), 'jordan');
  userEvent.type(screen.getByLabelText(/^email$/i), 'jordan@example.com');
  userEvent.type(screen.getByLabelText(/^password$/i), 'Sup3rSecret!');
  userEvent.type(screen.getByLabelText(/confirm password/i), 'Sup3rSecret!');
  userEvent.click(screen.getByRole('button', { name: /create account/i }));
  expect(await screen.findByText(/welcome aboard, jordan/i, {}, { timeout: 2000 })).toBeInTheDocument();
  await waitFor(() => expect(localStorage.getItem('momentum.users')).toMatch(/jordan@example.com/));
});

test('registering with a taken email shows the error on that field', async () => {
  renderAt('/register');
  userEvent.type(await screen.findByLabelText(/full name/i), 'Copy Cat');
  userEvent.type(screen.getByLabelText(/username/i), 'copycat');
  userEvent.type(screen.getByLabelText(/^email$/i), 'member@momentum.dev');
  userEvent.type(screen.getByLabelText(/^password$/i), 'Sup3rSecret!');
  userEvent.type(screen.getByLabelText(/confirm password/i), 'Sup3rSecret!');
  userEvent.click(screen.getByRole('button', { name: /create account/i }));
  expect(await screen.findByText(/already exists/i, {}, { timeout: 2000 })).toBeInTheDocument();
});

describe('validation', () => {
  test('flags mismatched passwords and bad emails', () => {
    const errors = validateRegister({
      name: 'A B', username: 'ab_c', email: 'nope', password: 'abcdefg1', confirmPassword: 'x',
    });
    expect(errors.email).toBeDefined();
    expect(errors.confirmPassword).toBeDefined();
    expect(errors.password).toBeUndefined();
  });

  test('scores password strength', () => {
    expect(passwordStrength('').score).toBe(0);
    expect(passwordStrength('Sup3rSecret!').score).toBe(4);
  });
});

test('after signing in, users return to the page they originally asked for', async () => {
  renderAt('/profile');
  userEvent.type(await screen.findByLabelText(/email or username/i), 'member');
  userEvent.type(screen.getByLabelText(/^password$/i), 'Member123!');
  userEvent.click(screen.getByRole('button', { name: /sign in/i }));
  expect(await screen.findByRole('heading', { name: /edit profile/i }, { timeout: 2000 })).toBeInTheDocument();
});
