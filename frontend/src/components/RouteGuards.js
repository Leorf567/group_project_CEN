import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function FullPageSpinner() {
  return (
    <div className="full-page-center" role="status" aria-label="Loading">
      <span className="spinner spinner--lg" />
    </div>
  );
}

// Only signed-in users; optionally restricted to one role.
export function RequireAuth({ role }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

// Login/register pages: bounce signed-in users to the app. This is also what
// redirects after a successful login/register, back to where they were headed.
export function GuestOnly() {
  const { user, initializing } = useAuth();
  const location = useLocation();
  if (initializing) return <FullPageSpinner />;
  if (user) return <Navigate to={location.state?.from?.pathname || '/dashboard'} replace />;
  return <Outlet />;
}
