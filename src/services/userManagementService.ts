/**
 * User Management Service — Supabase-backed
 * Sectore 360 — Production
 */
import type { UserRole } from '@/types/auth';
import { usersApi, auditApi } from '@/lib/api';
import { hashPassword } from '@/services/authService';

export interface ManagedUser {
  id: string;
  employeeCode: string;
  username: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  department?: string;
  designation?: string;
  status: 'Active' | 'Inactive';
  profilePhoto?: string;
  requirePasswordChange: boolean;
  createdAt: string;
  lastLogin?: string;
  /** Set for role=customer users — links to customers.id */
  customerId?: string | null;
}

export type CreateUserData = {
  username: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  department?: string;
  designation?: string;
  status: 'Active' | 'Inactive';
  profilePhoto?: string;
  requirePasswordChange: boolean;
  /** SHA-256 hash of the chosen password */
  passwordHash: string;
};

function dbToManaged(u: Awaited<ReturnType<typeof usersApi.getById>>): ManagedUser {
  if (!u) throw new Error('User not found');
  return {
    id:                    u.id,
    employeeCode:          u.employee_code,
    username:              u.username,
    name:                  u.name,
    email:                 u.email ?? '',
    mobile:                u.mobile ?? '',
    role:                  u.role as UserRole,
    department:            u.department ?? undefined,
    designation:           u.designation ?? undefined,
    status:                u.status,
    profilePhoto:          u.profile_photo ?? u.avatar_url ?? undefined,
    requirePasswordChange: u.require_password_change,
    createdAt:             u.created_at,
    lastLogin:             u.last_login ?? undefined,
    customerId:            u.customer_id ?? undefined,
  };
}

export const userManagementService = {
  async getAll(): Promise<ManagedUser[]> {
    const users = await usersApi.getAll();
    return users.map(dbToManaged);
  },

  async getById(id: string): Promise<ManagedUser | null> {
    const u = await usersApi.getById(id);
    return u ? dbToManaged(u) : null;
  },

  async isUsernameTaken(username: string, excludeId?: string): Promise<boolean> {
    return usersApi.isUsernameTaken(username, excludeId);
  },

  async isEmailTaken(email: string, excludeId?: string): Promise<boolean> {
    return usersApi.isEmailTaken(email, excludeId);
  },

  async create(data: CreateUserData, actorName = 'System', actorId = 'system'): Promise<ManagedUser> {
    const employeeCode = await usersApi.generateCode(data.role);
    const created = await usersApi.create({
      id:                     crypto.randomUUID(),
      username:               data.username.toLowerCase().trim(),
      email:                  data.email,
      name:                   data.name,
      role:                   data.role as UserRole,
      employee_code:          employeeCode,
      password_hash:          data.passwordHash,
      status:                 data.status,
      department:             data.department ?? null,
      designation:            data.designation ?? null,
      mobile:                 data.mobile,
      profile_photo:          data.profilePhoto ?? null,
      avatar_url:             null,
      require_password_change: data.requirePasswordChange,
      last_login:             null,
      company_id:             'sectore-001',
    });
    auditApi.log({
      eventType:   'UserCreated',
      userId:       actorId,
      userName:     actorName,
      userRole:     'admin',
      resource:     'User',
      resourceId:   created.id,
      description:  `Created user ${data.name} (${data.username}) [${employeeCode}]`,
    }).catch(console.error);
    return dbToManaged(created);
  },

  async update(id: string, fields: Partial<ManagedUser>, actorName = 'System', actorId = 'system'): Promise<ManagedUser | null> {
    const updated = await usersApi.update(id, {
      name:                    fields.name,
      email:                   fields.email,
      mobile:                  fields.mobile,
      role:                    fields.role,          // ← was missing: role never sent to DB
      department:              fields.department ?? null,
      designation:             fields.designation ?? null,
      profile_photo:           fields.profilePhoto ?? null,
      require_password_change: fields.requirePasswordChange,
      ...(fields.status ? { status: fields.status } : {}),
    });
    auditApi.log({
      eventType:   'UserEdited',
      userId:       actorId,
      userName:     actorName,
      userRole:     'admin',
      resource:     'User',
      resourceId:   id,
      description:  `Updated user profile for ${updated.name} (${updated.username})`,
    }).catch(console.error);
    return dbToManaged(updated);
  },

  async setStatus(id: string, status: 'Active' | 'Inactive', actorName = 'System', actorId = 'system'): Promise<ManagedUser | null> {
    await usersApi.setStatus(id, status);
    auditApi.log({
      eventType:   status === 'Active' ? 'UserActivated' : 'UserDeactivated',
      userId:       actorId,
      userName:     actorName,
      userRole:     'admin',
      resource:     'User',
      resourceId:   id,
      description:  `${status === 'Active' ? 'Activated' : 'Deactivated'} user`,
    }).catch(console.error);
    return this.getById(id);
  },

  async resetPassword(id: string, newPlainPassword: string, actorName = 'System', actorId = 'system'): Promise<boolean> {
    const newHash = await hashPassword(newPlainPassword);
    await usersApi.updatePasswordHash(id, newHash);
    auditApi.log({
      eventType:   'PasswordReset',
      userId:       actorId,
      userName:     actorName,
      userRole:     'admin',
      resource:     'User',
      resourceId:   id,
      description:  `Admin reset password for user`,
    }).catch(console.error);
    return true;
  },

  /** Used by UserManagementPage when it already has the hash */
  async resetPasswordHash(id: string, newHash: string, actorName = 'System', actorId = 'system'): Promise<boolean> {
    await usersApi.updatePasswordHash(id, newHash);
    auditApi.log({
      eventType:   'PasswordReset',
      userId:       actorId,
      userName:     actorName,
      userRole:     'admin',
      resource:     'User',
      resourceId:   id,
      description:  `Admin reset password for user`,
    }).catch(console.error);
    return true;
  },

  async changePassword(id: string, newHash: string, actorName = 'System'): Promise<boolean> {
    await usersApi.updatePasswordHash(id, newHash);
    auditApi.log({
      eventType:   'PasswordChanged',
      userId:       id,
      userName:     actorName,
      userRole:     'user',
      resource:     'User',
      resourceId:   id,
      description:  `${actorName} changed their password`,
    }).catch(console.error);
    return true;
  },

  async delete(id: string, actorName = 'System', actorId = 'system'): Promise<boolean> {
    const u = await usersApi.getById(id);
    if (!u) return false;
    // Protect primary super admin — never deletable
    if (u.role === 'superadmin') {
      const allSuperAdmins = await usersApi.getAll({ role: 'superadmin' });
      if (allSuperAdmins.length <= 1) throw new Error('Cannot delete the last Super Admin.');
    }
    // Soft-delete: set status to Deleted so historical data is preserved
    await usersApi.update(id, {
      status: 'Inactive' as 'Active' | 'Inactive',
      updated_at: new Date().toISOString(),
    });
    auditApi.log({
      eventType:   'UserDeleted',
      userId:       actorId,
      userName:     actorName,
      userRole:     'admin',
      resource:     'User',
      resourceId:   id,
      description:  `Soft-deleted user ${u.name} (${u.username}) [${u.employee_code}]`,
    }).catch(console.error);
    return true;
  },

  async updateLastLogin(id: string): Promise<void> {
    await usersApi.updateLastLogin(id);
  },
};
