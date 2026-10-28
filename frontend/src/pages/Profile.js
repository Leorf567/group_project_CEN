import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import FormField from '../components/FormField';
import { CheckIcon, LogoutIcon, ShieldIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

export default function Profile() {
  const { user, isAdmin, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: user.name, bio: user.bio || '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = form.name !== user.name || form.bio !== (user.bio || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="page page--narrow">
      <section className="card profile-head">
        <Avatar name={user.name} size={72} />
        <div className="profile-head__info">
          <h1>{user.name}</h1>
          <p className="muted">@{user.username} · {user.email}</p>
          <div className="profile-head__meta">
            <span className={`role role--${user.role}`}>
              {isAdmin && <ShieldIcon width={14} height={14} />} {user.role}
            </span>
            <span className="muted">Member since {formatDate(user.createdAt)}</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Edit profile</h2>
        <form className="form" onSubmit={handleSubmit} noValidate>
          <FormField
            label="Display name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            error={error}
          />
          <div className="field">
            <label className="field__label" htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              className="field__input field__textarea"
              rows={3}
              maxLength={160}
              placeholder="What are you working toward?"
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            />
            <p className="field__hint">{form.bio.length}/160</p>
          </div>
          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={!dirty || saving}>
              {saving ? <><span className="spinner" /> Saving…</> : saved ? <><CheckIcon /> Saved</> : 'Save changes'}
            </button>
          </div>
        </form>
      </section>

      <section className="card card--row">
        <div>
          <h2>Sign out</h2>
          <p className="muted">End your session on this device.</p>
        </div>
        <button className="btn btn--danger" onClick={handleLogout}>
          <LogoutIcon /> Log out
        </button>
      </section>
    </div>
  );
}
