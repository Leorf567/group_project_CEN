const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_RE = /^[a-zA-Z0-9_.]{3,20}$/;

export const isEmail = (value) => EMAIL_RE.test(value.trim());

// Returns { score: 0-4, label, checks } for the strength meter.
export function passwordStrength(password) {
  const checks = {
    length: password.length >= 8,
    mixedCase: /[a-z]/.test(password) && /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
  const score = password ? Object.values(checks).filter(Boolean).length : 0;
  const label = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score];
  return { score, label, checks };
}

export function validateLogin({ identifier, password }) {
  const errors = {};
  if (!identifier.trim()) errors.identifier = 'Enter your email or username.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

export function validateRegister({ name, username, email, password, confirmPassword }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Tell us your name.';
  else if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';

  if (!username.trim()) errors.username = 'Pick a username.';
  else if (!USERNAME_RE.test(username.trim()))
    errors.username = '3–20 characters: letters, numbers, dots or underscores.';

  if (!email.trim()) errors.email = 'Enter your email.';
  else if (!isEmail(email)) errors.email = "That doesn't look like a valid email.";

  const { checks } = passwordStrength(password);
  if (!password) errors.password = 'Create a password.';
  else if (!checks.length) errors.password = 'Use at least 8 characters.';
  else if (!checks.number && !checks.symbol) errors.password = 'Add a number or symbol.';

  if (!confirmPassword) errors.confirmPassword = 'Confirm your password.';
  else if (confirmPassword !== password) errors.confirmPassword = "Passwords don't match.";

  return errors;
}
