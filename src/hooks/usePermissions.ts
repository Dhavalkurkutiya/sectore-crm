/**
 * usePermissions Hook
 * Sectore 360 — Part 6 RBAC
 *
 * Returns helper functions scoped to the current user's role.
 */
import { useAuth } from '@/contexts/AuthContext';
import { can, hasPermission, hasAllPermissions, hasAnyPermission } from '@/lib/permissions';
import type { Permission, RBACAction, RBACResource } from '@/types/auth';

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role;

  return {
    /** Check if current user can perform action on resource */
    can: (action: RBACAction, resource: RBACResource): boolean => {
      if (!role) return false;
      return can(role, action, resource);
    },
    /** Check a raw permission string */
    has: (permission: Permission): boolean => {
      if (!role) return false;
      return hasPermission(role, permission);
    },
    hasAll: (permissions: Permission[]): boolean => {
      if (!role) return false;
      return hasAllPermissions(role, permissions);
    },
    hasAny: (permissions: Permission[]): boolean => {
      if (!role) return false;
      return hasAnyPermission(role, permissions);
    },
    /** Convenience role checks */
    isAdmin: role === 'admin' || role === 'superadmin',
    isSuperAdmin: role === 'superadmin',
    isManager: role === 'manager',
    isBackOffice: role === 'backoffice',
    isEngineer: role === 'engineer',
    isCustomer: role === 'customer',
    isStaff: ['superadmin', 'admin', 'manager', 'backoffice'].includes(role ?? ''),
    role,
  };
}
