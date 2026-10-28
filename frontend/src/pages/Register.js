import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import { AlertIcon, AtIcon, LockIcon, MailIcon, UserIcon } from '../components/Icons';
import PasswordStrength from '../components/PasswordStrength';
import { useAuth } from '../context/AuthContext';
import { validateRegister } from '../utils/validation';

const EMPTY = { name: '', username: '', email: '', password: '', confirmPassword: '' };

export default function Register() {
  const { register } = useAuth();

  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Validate live, but only show errors for fields the user has left.
  const clientErrors = validateRegister(form);
  const visibleError = (field) => serverErrors[field] || (touched[field] ? clientErrors[field] : undefined);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (serverErrors[field]) setServerErrors((errs) => ({ ...errs, [field]: undefined }));
    setFormError('');
  };
  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, true])));
    if (Object.keys(clientErrors).length) return;

    setSubmitting(true);
    try {
      await register(form); // <GuestOnly> redirects once the user is set
    } catch (err) {
      if (err.field) setServerErrors({ [err.field]: err.message });
      else setFormError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const field = (name) => ({
    name,
    value: form[name],
    onChange: update(name),
    onBlur: blur(name),
    error: visibleError(name),
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking goals with the people who keep you honest."
      footer={<>Already have an account? <Link to="/login">Sign in</Link></>}
    >
      {formError && (
        <div className="banner banner--error" role="alert">
          <AlertIcon /> {formError}
        </div>
      )}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="form__row">
          <FormField label="Full name" icon={UserIcon} autoComplete="name" placeholder="Jordan Lee" autoFocus {...field('name')} />
          <FormField label="Username" icon={AtIcon} autoComplete="username" placeholder="jordan.lee" {...field('username')} />
        </div>
        <FormField label="Email" icon={MailIcon} type="email" autoComplete="email" placeholder="you@example.com" {...field('email')} />
        <div>
          <FormField
            label="Password"
            icon={LockIcon}
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            {...field('password')}
          />
          <PasswordStrength password={form.password} />
        </div>
        <FormField
          label="Confirm password"
          icon={LockIcon}
          type="password"
          autoComplete="new-password"
          placeholder="Type it again"
          {...field('confirmPassword')}
        />

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? <><span className="spinner" /> Creating account…</> : 'Create account'}
        </button>
        <p className="form__fineprint">
          New accounts start as <strong>members</strong>. An admin can grant admin access later.
        </p>
      </form>
    </AuthLayout>
  );
}
