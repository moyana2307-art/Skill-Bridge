import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authApi, subscriptionsApi } from '../api/client';

const AuthContext = createContext(null);

// Holds the logged-in user and their plan entitlements for the whole app.
// On a page reload it asks the backend who is logged in using the httpOnly
// cookie.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [entitlements, setEntitlements] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshEntitlements = useCallback(async () => {
    try {
      const response = await subscriptionsApi.me();
      setEntitlements(response.data.entitlements);
      return response.data.entitlements;
    } catch (err) {
      return null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.me();
      setUser(response.data.user);
      setEntitlements(response.data.entitlements || null);
      return response.data.user;
    } catch (err) {
      setUser(null);
      setEntitlements(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    authApi
      .me()
      .then((response) => {
        if (!active) return;
        setUser(response.data.user);
        setEntitlements(response.data.entitlements || null);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setEntitlements(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await authApi.login(credentials);
    setUser(response.data.user);
    setEntitlements(response.data.entitlements || null);
    return response.data.user;
  }, []);

  const register = useCallback(async (details) => {
    const response = await authApi.register(details);
    setUser(response.data.user);
    setEntitlements(response.data.entitlements || null);
    return response.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if the network call fails, clear the user locally. The cookie
      // will either be cleared by the server or expire on its own.
    } finally {
      setUser(null);
      setEntitlements(null);
    }
  }, []);

  const updateUser = useCallback((changes) => {
    setUser((current) => (current ? { ...current, ...changes } : current));
  }, []);

  const value = useMemo(
    () => ({
      user,
      entitlements,
      loading,
      login,
      register,
      logout,
      updateUser,
      refreshUser,
      refreshEntitlements,
    }),
    [
      user,
      entitlements,
      loading,
      login,
      register,
      logout,
      updateUser,
      refreshUser,
      refreshEntitlements,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }

  return context;
}
