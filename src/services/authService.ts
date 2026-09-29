/**
 * Authentication Service
 * Sectore 360 — Production (Supabase-backed)
 *
 * Username-based login with SHA-256 password hashing.
 * Uses app_users table directly — no Supabase Auth involved.
 * Sessions are managed via a lightweight JWT-style token in localStorage.
 */
import type { AuthTokens, LoginCredentials, User, UserRole } from '@/types/auth';
import { usersApi, auditApi } from '@/lib/api';

/* ── Password hashing via Web Crypto API ─────────────────────── */
export async function hashPassword(plain: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(plain));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ── Token helpers ───────────────────────────────────────────── */
function generateToken(userId: string): string {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: userId,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000,
  }));
  return `${header}.${payload}.sectore-sig`;
}

function dbUserToUser(u: Awaited<ReturnType<typeof usersApi.getById>>): User {
  if (!u) throw new Error('User not found');
  return {
    id:                    u.id,
    username:              u.username,
    email:                 u.email ?? '',
    name:                  u.name,
    role:                  u.role as UserRole,
    employeeCode:          u.employee_code,
    mobile:                u.mobile ?? undefined,
    department:            u.department ?? undefined,
    designation:           u.designation ?? undefined,
    profilePhoto:          u.profile_photo ?? u.avatar_url ?? undefined,
    requirePasswordChange: u.require_password_change,
    lastLogin:             u.last_login ?? undefined,
    createdAt:             u.created_at,
    companyId:             u.company_id,
    // For customer-role users: the linked customers.id for data isolation
    customerId:            u.customer_id ?? undefined,
  };
}

interface LoginResult {
  user: User;
  tokens: AuthTokens;
  requirePasswordChange: boolean;
}

/* ── Login ───────────────────────────────────────────────────── */
export async function loginWithCredentials(credentials: LoginCredentials): Promise<LoginResult> {
  const hash  = await hashPassword(credentials.password);
  const match = await usersApi.getByUsername(credentials.username);

  if (!match || match.password_hash !== hash) {
    await auditApi.log({
      eventType: 'FailedLogin', userId: 'unknown',
      userName: credentials.username, userRole: 'unknown',
      resource: 'Auth',
      description: `Failed login attempt for username: ${credentials.username}`,
    });
    throw new Error('Invalid username or password. Please try again.');
  }
  if (match.status === 'Inactive') {
    throw new Error('Your account has been deactivated. Please contact the administrator.');
  }

  // Fire-and-forget last login update + audit
  usersApi.updateLastLogin(match.id);
  auditApi.log({
    eventType: 'Login', userId: match.id,
    userName: match.name, userRole: match.role,
    resource: 'Auth',
    description: `${match.name} (${match.username}) logged in`,
  });

  const user = dbUserToUser(match);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return {
    user,
    tokens: { accessToken: generateToken(user.id), expiresAt },
    requirePasswordChange: !!match.require_password_change,
  };
}

/* ── Token validation ────────────────────────────────────────── */
export async function validateToken(token: string): Promise<User | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp < Date.now()) return null;
    const match = await usersApi.getById(payload.sub);
    if (!match || match.status === 'Inactive') return null;
    return dbUserToUser(match);
  } catch {
    return null;
  }
}

/* ── Password operations ─────────────────────────────────────── */
export async function updateRuntimePasswordHash(userId: string, newHash: string): Promise<void> {
  await usersApi.updatePasswordHash(userId, newHash);
}

export async function verifyCurrentPassword(userId: string, currentHash: string): Promise<boolean> {
  const u = await usersApi.getById(userId);
  return u?.password_hash === currentHash;
}

/* ── Stubs kept for backward-compat (services that call these) ── */
export function registerRuntimeUser(_user: User, _hash: string, _status?: string): void { /* no-op: Supabase is source of truth */ }
export function setRuntimeUserStatus(_id: string, _status: string): void { /* no-op */ }
export function updateRuntimeUser(_id: string, _fields: Partial<User>): void { /* no-op */ }
export function isUsernameTaken(_username: string, _excludeId?: string): boolean { return false; }

// Keep RUNTIME_USERS as empty stub so old imports don't crash
export const RUNTIME_USERS: never[] = [];

export async function logout(): Promise<void> { /* nothing to clear server-side */ }
