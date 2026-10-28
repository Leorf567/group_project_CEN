import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../api/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [justRegistered, setJustRegistered] = useState(false);

  // Restore an existing session on first load.
  useEffect(() => {
    let cancelled = false;
    authService
      .getCurrentUser()
      .then((current) => !cancelled && setUser(current))
      .finally(() => !cancelled && setInitializing(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const loggedIn = await authService.login(credentials);
    setJustRegistered(false);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const register = useCallback(async (details) => {
    const created = await authService.register(details);
    setJustRegistered(true);
    setUser(created);
    return created;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setJustRegistered(false);
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (changes) => {
      const updated = await authService.updateProfile(user.id, changes);
      setUser(updated);
      return updated;
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      initializing,
      justRegistered,
      isAdmin: user?.role === authService.ROLES.ADMIN,
      login,
      register,
      logout,
      updateProfile,
    }),
    [user, initializing, justRegistered, login, register, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
