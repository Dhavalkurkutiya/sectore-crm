/**
 * RouteGuard Component
 * Sectore 360 — Phase 1, Part 6
 * Protects routes based on auth state and RBAC permissions.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/shared/Spinner';
import type { Permission, RBACAction, RBACResource } from '@/types/auth';
import { can, hasPermission, getDefaultRoute } from '@/lib/permissions';
import type { ReactNode } from 'react';

interface RouteGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  /** Legacy permission key check */
  requirePermission?: Permission;
  /** RBAC action + resource check */
  requireAction?: RBACAction;
  requireResource?: RBACResource;
  /** Redirect authenticated users away (for login page) */
  redirectIfAuth?: boolean;
}

export function RouteGuard({
  children,
  requireAuth = true,
  requirePermission,
  requireAction,
  requireResource,
  redirectIfAuth = false,
}: RouteGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader />;

  // Redirect authenticated users away from login page
  if (redirectIfAuth && isAuthenticated && user) {
    return <Navigate to={getDefaultRoute(user.role)} replace />;
  }

  // Redirect unauthenticated users to login
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // RBAC action + resource check → /403
  if (requireAction && requireResource && user) {
    if (!can(user.role, requireAction, requireResource)) {
      return <Navigate to="/403" replace />;
    }
  }

  // Legacy permission key check → /403
  if (requirePermission && user) {
    if (!hasPermission(user.role, requirePermission)) {
      return <Navigate to="/403" replace />;
    }
  }

  return <>{children}</>;
}
