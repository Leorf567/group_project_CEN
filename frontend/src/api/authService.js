// Mock auth service backed by localStorage.
//
// This stands in for the real backend until it exists. Every function is async
// and returns/throws the same shapes the real API should, so swapping this file
// for fetch() calls won't require touching any components.
//
// NOTE: passwords are stored in plain text here because this is a local mock.
// The real backend must hash them (bcrypt/argon2) and never send them back.

const USERS_KEY = 'momentum.users';
const SESSION_KEY = 'momentum.session';
const NETWORK_DELAY_MS = 450;

export const ROLES = { ADMIN: 'admin', MEMBER: 'member' };

const SEED_USERS = [
  {
    id: 'u_admin',
    name: 'Ada Admin',
    username: 'admin',
    email: 'admin@momentum.dev',
    password: 'Admin123!',
    role: ROLES.ADMIN,
    bio: 'Keeps the lights on.',
    createdAt: '2026-09-01T12:00:00.000Z',
  },
  {
    id: 'u_member',
    name: 'Max Member',
    username: 'member',
    email: 'member@momentum.dev',
    password: 'Member123!',
    role: ROLES.MEMBER,
    bio: 'Shipping one ticket at a time.',
    createdAt: '2026-09-15T12:00:00.000Z',
  },
];

export class AuthError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'AuthError';
    this.field = field; // form field the error belongs to, if any
  }
}

const delay = (ms = NETWORK_DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

function readJSON(storage, key) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJSON(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode); the session just won't persist.
  }
}

function loadUsers() {
  const users = readJSON(localStorage, USERS_KEY);
  if (Array.isArray(users)) return users;
  writeJSON(localStorage, USERS_KEY, SEED_USERS);
  return [...SEED_USERS];
}

const saveUsers = (users) => writeJSON(localStorage, USERS_KEY, users);

// Never hand the password to the UI.
function toPublicUser({ password, ...user }) {
  return user;
}

function readSession() {
  return readJSON(localStorage, SESSION_KEY) || readJSON(sessionStorage, SESSION_KEY);
}

function startSession(userId, remember) {
  const session = { userId, token: `mock.${userId}.${Date.now().toString(36)}` };
  writeJSON(remember ? localStorage : sessionStorage, SESSION_KEY, session);
  return session;
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export async function login({ identifier, password, remember = false }) {
  await delay();
  const needle = identifier.trim().toLowerCase();
  const user = loadUsers().find(
    (u) => u.email.toLowerCase() === needle || u.username.toLowerCase() === needle
  );
  if (!user || user.password !== password) {
    throw new AuthError('Incorrect email/username or password.');
  }
  startSession(user.id, remember);
  return toPublicUser(user);
}

export async function register({ name, username, email, password }) {
  await delay();
  const users = loadUsers();
  if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
    throw new AuthError('An account with this email already exists.', 'email');
  }
  if (users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
    throw new AuthError('That username is taken.', 'username');
  }
  const user = {
    id: `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    username: username.trim(),
    email: email.trim(),
    password,
    // Self-registration always creates members; admins are promoted by an admin.
    role: ROLES.MEMBER,
    bio: '',
    createdAt: new Date().toISOString(),
  };
  saveUsers([...users, user]);
  startSession(user.id, true);
  return toPublicUser(user);
}

export async function logout() {
  await delay(150);
  clearSession();
}

export async function getCurrentUser() {
  await delay(200);
  const session = readSession();
  if (!session) return null;
  const user = loadUsers().find((u) => u.id === session.userId);
  if (!user) {
    clearSession();
    return null;
  }
  return toPublicUser(user);
}

export async function updateProfile(userId, changes) {
  await delay();
  const users = loadUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) throw new AuthError('Your session has expired. Please sign in again.');
  const allowed = { name: changes.name?.trim(), bio: changes.bio?.trim() ?? '' };
  if (!allowed.name) throw new AuthError('Name is required.', 'name');
  users[index] = { ...users[index], ...allowed };
  saveUsers(users);
  return toPublicUser(users[index]);
}

// Admin-only in the real API (the server must check the role, not just the UI).
export async function listUsers() {
  await delay(300);
  return loadUsers().map(toPublicUser);
}

export async function setUserRole(userId, role) {
  await delay(300);
  const users = loadUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) throw new AuthError('User not found.');
  if (role === ROLES.MEMBER && user.role === ROLES.ADMIN &&
      users.filter((u) => u.role === ROLES.ADMIN).length === 1) {
    throw new AuthError('There must be at least one admin.');
  }
  user.role = role;
  saveUsers(users);
  return toPublicUser(user);
}
