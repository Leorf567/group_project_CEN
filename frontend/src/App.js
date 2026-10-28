import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import AppLayout from './components/AppLayout';
import { GuestOnly, RequireAuth } from './components/RouteGuards';
import { AuthProvider } from './context/AuthContext';
import { ROLES } from './api/authService';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Profile from './pages/Profile';
import Register from './pages/Register';

// Opt in to v7 behavior now so the upgrade is painless (and the console stays quiet).
export const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true };

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route element={<GuestOnly />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route element={<RequireAuth role={ROLES.ADMIN} />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={ROUTER_FUTURE}>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
