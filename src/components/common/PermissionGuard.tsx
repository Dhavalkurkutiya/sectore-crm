/**
 * PermissionGuard Component
 * Sectore 360 — Part 6 RBAC
 *
 * Renders children only if the current user has permission.
 * Renders fallback (or null) otherwise.
 *
 * Usage:
 *   <PermissionGuard action="delete" resource="customers">
 *     <Button>Delete</Button>
 *   </PermissionGuard>
 */
import type { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import type { RBACAction, RBACResource } from '@/types/auth';

interface PermissionGuardProps {
  action: RBACAction;
  resource: RBACResource;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({ action, resource, children, fallback = null }: PermissionGuardProps) {
  const { can } = usePermissions();
  return can(action, resource) ? <>{children}</> : <>{fallback}</>;
}
