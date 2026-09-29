/**
 * Role-Based Permission Definitions
 * Sectore 360 — Phase 1, Part 6
 *
 * Full RBAC matrix for all 6 roles.
 */
import type { Permission, RBACAction, RBACResource, RolePermissions, UserRole } from '@/types/auth';

/* ── Permission Matrix ──────────────────────────────────────── */
export const rolePermissions: RolePermissions = {
  superadmin: [
    'dashboard:view',
    'users:view', 'users:create', 'users:edit', 'users:delete', 'users:manage',
    'settings:view', 'settings:edit',
    'search:use',
    'customers:view', 'customers:create', 'customers:edit', 'customers:delete', 'customers:export',
    'assets:view', 'assets:create', 'assets:edit', 'assets:delete', 'assets:export',
    'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:delete', 'tasks:export',
    'amc:view', 'amc:create', 'amc:edit', 'amc:delete', 'amc:export',
    'engineers:view', 'engineers:create', 'engineers:edit', 'engineers:delete',
    'reports:view', 'reports:export',
    'audit:view', 'audit:export',
    'documents:view', 'documents:create', 'documents:delete',
  ],
  admin: [
    'dashboard:view',
    'users:view', 'users:create', 'users:edit', 'users:manage',
    'settings:view', 'settings:edit',
    'search:use',
    'customers:view', 'customers:create', 'customers:edit', 'customers:delete', 'customers:export',
    'assets:view', 'assets:create', 'assets:edit', 'assets:delete', 'assets:export',
    'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:delete', 'tasks:export',
    'amc:view', 'amc:create', 'amc:edit', 'amc:delete', 'amc:export',
    'engineers:view', 'engineers:create', 'engineers:edit', 'engineers:delete',
    'reports:view', 'reports:export',
    'audit:view', 'audit:export',
    'documents:view', 'documents:create', 'documents:delete',
  ],
  manager: [
    'dashboard:view',
    'search:use',
    'customers:view', 'customers:create', 'customers:edit', 'customers:export',
    'assets:view', 'assets:create', 'assets:edit', 'assets:export',
    'tasks:view', 'tasks:create', 'tasks:edit', 'tasks:export',
    'amc:view', 'amc:export',
    'engineers:view',
    'reports:view', 'reports:export',
    'documents:view',
  ],
  backoffice: [
    'dashboard:view',
    'search:use',
    'customers:view', 'customers:create', 'customers:edit',
    'assets:view',
    'tasks:view', 'tasks:create', 'tasks:edit',
    'documents:view', 'documents:create',
  ],
  engineer: [
    'dashboard:view',
    'search:use',
    'tasks:view', 'tasks:edit',
    'customers:view',
    'assets:view',
  ],
  customer: [
    'dashboard:view',
    'search:use',
    'tasks:view', 'tasks:create',
    'assets:view',
    'documents:view',
    'reports:view', 'reports:export',
  ],
};

/* ── RBAC action→permission map ─────────────────────────────── */
const resourceActionMap: Record<RBACResource, Partial<Record<RBACAction, Permission>>> = {
  dashboard:  { view: 'dashboard:view' },
  search:     { view: 'search:use' },
  customers:  { view: 'customers:view', create: 'customers:create', edit: 'customers:edit', delete: 'customers:delete', export: 'customers:export' },
  assets:     { view: 'assets:view', create: 'assets:create', edit: 'assets:edit', delete: 'assets:delete', export: 'assets:export' },
  tasks:      { view: 'tasks:view', create: 'tasks:create', edit: 'tasks:edit', delete: 'tasks:delete', export: 'tasks:export' },
  amc:        { view: 'amc:view', create: 'amc:create', edit: 'amc:edit', delete: 'amc:delete', export: 'amc:export' },
  engineers:  { view: 'engineers:view', create: 'engineers:create', edit: 'engineers:edit', delete: 'engineers:delete' },
  reports:    { view: 'reports:view', export: 'reports:export' },
  settings:   { view: 'settings:view', edit: 'settings:edit' },
  audit_log:  { view: 'audit:view', export: 'audit:export' },
  documents:  { view: 'documents:view', create: 'documents:create', delete: 'documents:delete' },
  users:      { view: 'users:view', create: 'users:create', edit: 'users:edit', delete: 'users:delete', manage: 'users:manage' },
};

/** Check if a role can perform an action on a resource */
export function can(role: UserRole, action: RBACAction, resource: RBACResource): boolean {
  const perm = resourceActionMap[resource]?.[action];
  if (!perm) return false;
  return rolePermissions[role]?.includes(perm) ?? false;
}

/** Check whether a given role has a specific permission */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/** Roles that have admin-level access */
export const ADMIN_ROLES: UserRole[] = ['superadmin', 'admin'];

/** Roles that can manage the system */
export const STAFF_ROLES: UserRole[] = ['superadmin', 'admin', 'manager', 'backoffice'];

/** Default dashboard redirect per role */
export function getDefaultRoute(role: UserRole): string {
  switch (role) {
    case 'engineer': return '/engineer/dashboard';
    case 'customer': return '/customer/dashboard';
    default: return '/dashboard';
  }
}
