/**
 * Authentication Context
 * Sectore 360 — Production (Supabase-backed)
 * Username-based auth with SHA-256 hashing via app_users table.
 */
import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { AuthState, AuthTokens, LoginCredentials, User } from '@/types/auth';
import {
  loginWithCredentials,
  logout as authLogout,
  validateToken,
  hashPassword,
} from '@/services/authService';
import { usersApi, auditApi } from '@/lib/api';

const TOKEN_KEY = 'sectore360_tokens';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (userId: string, currentHash: string, newHash: string) => Promise<boolean>;
  requirePasswordChange: boolean;
  dismissPasswordChange: () => void;
}

const _hot = import.meta.hot;
const AuthContext: React.Context<AuthContextType | undefined> =
  (_hot?.data?.AuthContext as React.Context<AuthContextType | undefined>) ??
  createContext<AuthContextType | undefined>(undefined);
if (_hot) { _hot.data.AuthContext = AuthContext; }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, tokens: null, isAuthenticated: false, isLoading: true, error: null,
  });
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);

  const persistTokens = useCallback((tokens: AuthTokens | null) => {
    if (tokens) localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
    else localStorage.removeItem(TOKEN_KEY);
  }, []);

  const setAuth = useCallback((user: User, tokens: AuthTokens) => {
    persistTokens(tokens);
    setState({ user, tokens, isAuthenticated: true, isLoading: false, error: null });
  }, [persistTokens]);

  const clearAuth = useCallback(() => {
    persistTokens(null);
    setState({ user: null, tokens: null, isAuthenticated: false, isLoading: false, error: null });
    setRequirePasswordChange(false);
  }, [persistTokens]);

  useEffect(() => {
    const restoreSession = async () => {
      const raw = localStorage.getItem(TOKEN_KEY);
      if (!raw) { setState((s) => ({ ...s, isLoading: false })); return; }
      try {
        const tokens: AuthTokens = JSON.parse(raw);
        if (new Date(tokens.expiresAt) <= new Date()) { clearAuth(); return; }
        const user = await validateToken(tokens.accessToken);
        if (user) setAuth(user, tokens);
        else clearAuth();
      } catch { clearAuth(); }
    };
    restoreSession();
  }, [setAuth, clearAuth]);

  const login = async (credentials: LoginCredentials) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const { user, tokens, requirePasswordChange: pwChange } = await loginWithCredentials(credentials);
      setAuth(user, tokens);
      setRequirePasswordChange(!!pwChange);
      toast.success(`Welcome back, ${user.name}!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed.';
      setState((s) => ({ ...s, isLoading: false, error: msg }));
      toast.error(msg);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loginGoogle = async () => {
    toast.error('Google sign-in is disabled. Please use your username and password.');
  };

  const logout = async () => {
    if (state.user) {
      auditApi.log({
        eventType: 'Logout',
        userId: state.user.id,
        userName: state.user.name,
        userRole: state.user.role,
        resource: 'Auth',
        description: `${state.user.name} (${state.user.username}) logged out`,
      });
    }
    await authLogout();
    clearAuth();
    toast.success('You have been signed out.');
  };

  const changePassword = async (userId: string, currentPassword: string, newPassword: string): Promise<boolean> => {
    const currentHash = await hashPassword(currentPassword);
    const newHash     = await hashPassword(newPassword);

    // Verify against DB
    const dbUser = await usersApi.getById(userId);
    if (!dbUser || dbUser.password_hash !== currentHash) {
      toast.error('Current password is incorrect.');
      return false;
    }

    await usersApi.updatePasswordHash(userId, newHash);
    setRequirePasswordChange(false);
    setState((s) => s.user ? { ...s, user: { ...s.user, requirePasswordChange: false } } : s);
    auditApi.log({
      eventType: 'PasswordChanged',
      userId,
      userName: state.user?.name ?? '',
      userRole: state.user?.role ?? 'admin',
      resource: 'User',
      resourceId: userId,
      description: `${state.user?.name} changed their password`,
    });
    toast.success('Password changed successfully.');
    return true;
  };

  const dismissPasswordChange = () => setRequirePasswordChange(false);

  return (
    <AuthContext.Provider value={{ ...state, login, loginGoogle, logout, changePassword, requirePasswordChange, dismissPasswordChange }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
