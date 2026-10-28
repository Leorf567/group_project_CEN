import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import { AlertIcon, LockIcon, MailIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { validateLogin } from '../utils/validation';

const DEMO_ACCOUNTS = [
  { label: 'Admin', identifier: 'admin', password: 'Admin123!' },
  { label: 'Member', identifier: 'member', password: 'Member123!' },
];

export default function Login() {
  const { login } = useAuth();

  const [form, setForm] = useState({ identifier: '', password: '', remember: true });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((errs) => ({ ...errs, [field]: undefined }));
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validateLogin(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      await login(form); // <GuestOnly> redirects once the user is set
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={<>New to Momentum? <Link to="/register">Create an account</Link></>}
    >
      {formError && (
        <div className="banner banner--error" role="alert">
          <AlertIcon /> {formError}
        </div>
      )}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <FormField
          label="Email or username"
          icon={MailIcon}
          name="identifier"
          autoComplete="username"
          placeholder="you@example.com"
          value={form.identifier}
          onChange={update('identifier')}
          error={errors.identifier}
          autoFocus
        />
        <FormField
          label="Password"
          icon={LockIcon}
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          trailing={
            <button
              type="button"
              className="link-button"
              onClick={() => setFormError('Password reset will be available once the backend is live.')}
            >
              Forgot password?
            </button>
          }
        />

        <label className="checkbox">
          <input type="checkbox" checked={form.remember} onChange={update('remember')} />
          <span>Keep me signed in</span>
        </label>

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? <><span className="spinner" /> Signing in…</> : 'Sign in'}
        </button>
      </form>

      <div className="demo">
        <span className="demo__label">Try a demo account</span>
        <div className="demo__buttons">
          {DEMO_ACCOUNTS.map((acct) => (
            <button
              key={acct.label}
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setForm((f) => ({ ...f, identifier: acct.identifier, password: acct.password }));
                setErrors({});
                setFormError('');
              }}
            >
              {acct.label}
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}
