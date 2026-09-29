/**
 * Authentication & Authorization Types
 * Sectore 360 — Phase 1
 */

/** All roles in Sectore 360 */
export type UserRole = 'superadmin' | 'admin' | 'manager' | 'backoffice' | 'engineer' | 'customer';

/** Permission keys available across the system */
export type Permission =
  | 'dashboard:view'
  | 'users:view' | 'users:create' | 'users:edit' | 'users:delete' | 'users:manage'
  | 'settings:view' | 'settings:edit'
  | 'search:use'
  | 'customers:view' | 'customers:create' | 'customers:edit' | 'customers:delete' | 'customers:export'
  | 'assets:view' | 'assets:create' | 'assets:edit' | 'assets:delete' | 'assets:export'
  | 'tasks:view' | 'tasks:create' | 'tasks:edit' | 'tasks:delete' | 'tasks:export'
  | 'amc:view' | 'amc:create' | 'amc:edit' | 'amc:delete' | 'amc:export'
  | 'engineers:view' | 'engineers:create' | 'engineers:edit' | 'engineers:delete'
  | 'reports:view' | 'reports:export'
  | 'audit:view' | 'audit:export'
  | 'documents:view' | 'documents:create' | 'documents:delete';

/** RBAC action type */
export type RBACAction = 'view' | 'create' | 'edit' | 'delete' | 'manage' | 'export';

/** RBAC resource type */
export type RBACResource =
  | 'customers' | 'assets' | 'tasks' | 'amc' | 'engineers'
  | 'reports' | 'settings' | 'audit_log' | 'documents' | 'users'
  | 'dashboard' | 'search';

/** User object returned by auth — extended with all profile fields */
export interface User {
  id: string;
  /** Unique login identifier — lowercase alphanumeric + dot/underscore */
  username: string;
  email: string;
  name: string;
  role: UserRole;
  /** Auto-generated immutable code e.g. SA-0001, ADM-0001, ENG-0001 */
  employeeCode: string;
  mobile?: string;
  department?: string;
  designation?: string;
  /** Base64 data URL */
  profilePhoto?: string;
  /** Force change password dialog after next login */
  requirePasswordChange?: boolean;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  companyId?: string;
  /**
   * For role=customer only: the customers.id this user is linked to.
   * Used for data isolation — all customer queries must filter by this value.
   */
  customerId?: string;
}

/** Auth token payload stored in memory/localStorage */
export interface AuthTokens {
  accessToken: string;
  expiresAt: string;
}

/** Full authentication state */
export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/** Login form payload — username based */
export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

/** Role → Permission mapping */
export type RolePermissions = Record<UserRole, Permission[]>;
