import { useEffect, useState } from 'react';
import { listUsers, ROLES, setUserRole } from '../api/authService';
import Avatar from '../components/Avatar';
import { AlertIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';

export default function Admin() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState(null);

  useEffect(() => {
    listUsers().then(setUsers).catch((err) => setError(err.message));
  }, []);

  const toggleRole = async (u) => {
    setPendingId(u.id);
    setError('');
    try {
      const updated = await setUserRole(u.id, u.role === ROLES.ADMIN ? ROLES.MEMBER : ROLES.ADMIN);
      setUsers((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingId(null);
    }
  };

  const admins = users?.filter((u) => u.role === ROLES.ADMIN).length ?? 0;

  return (
    <div className="page">
      <section className="hero">
        <p className="eyebrow">Admin</p>
        <h1>Users</h1>
        <p className="muted">
          {users ? `${users.length} accounts · ${admins} admin${admins === 1 ? '' : 's'}` : 'Loading…'}
        </p>
      </section>

      {error && <div className="banner banner--error" role="alert"><AlertIcon /> {error}</div>}

      <section className="card card--flush">
        {!users ? (
          <div className="full-page-center"><span className="spinner spinner--lg" /></div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>User</th><th>Email</th><th>Role</th><th aria-label="Actions" /></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="table__user">
                        <Avatar name={u.name} size={32} />
                        <div>
                          <strong>{u.name}</strong>
                          <span className="muted">@{u.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="muted">{u.email}</td>
                    <td><span className={`role role--${u.role}`}>{u.role}</span></td>
                    <td className="table__actions">
                      {u.id !== me.id && (
                        <button className="btn btn--ghost btn--sm" disabled={pendingId === u.id} onClick={() => toggleRole(u)}>
                          {u.role === ROLES.ADMIN ? 'Make member' : 'Make admin'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
