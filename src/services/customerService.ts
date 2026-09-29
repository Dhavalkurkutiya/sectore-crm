/**
 * Customer Service — Supabase-backed
 * Sectore 360 — Production
 * Cache: customers:all (5 min TTL), customers:active (5 min TTL)
 * Invalidated on create / update / softDelete / restore
 *
 * Customer ↔ User Sync Rules:
 *   create     → auto-create app_user (role=customer, username=mobile, force pw change)
 *   update     → sync name/mobile/email/status to linked user
 *   softDelete → deactivate linked user (do NOT delete)
 *   restore    → reactivate linked user
 */
import type { Customer, CustomerFormData } from '@/types/customer';
import { customersApi, usersApi } from '@/lib/api';
import { cached, invalidate, CK } from '@/lib/appCache';
import { hashPassword } from '@/services/authService';

/* ── Temp password generator ─────────────────────────────────────────── */
function generateTempPassword(): string {
  // Format: Sect@<6 random alphanumeric chars>
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `Sect@${rand}`;
}

/* ── Unique username from mobile ─────────────────────────────────────── */
async function resolveUsername(mobile: string, excludeId?: string): Promise<string> {
  const base = mobile.replace(/\D/g, ''); // digits only
  let candidate = base;
  let counter = 0;
  while (true) {
    const taken = await usersApi.isUsernameTaken(candidate, excludeId);
    if (!taken) return candidate;
    counter++;
    candidate = `${base}_${counter}`;
  }
}

/* ── Create the linked Customer User ─────────────────────────────────── */
async function createLinkedUser(customer: Customer, actorName: string): Promise<void> {
  try {
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const username     = await resolveUsername(customer.primaryMobile);
    const employeeCode = await usersApi.generateCode('customer');

    await usersApi.create({
      id:                      crypto.randomUUID(),
      username,
      email:                   customer.email ?? '',
      name:                    customer.contactPerson || customer.companyName,
      role:                    'customer',
      employee_code:           employeeCode,
      password_hash:           passwordHash,
      status:                  'Active',
      department:              null,
      designation:             customer.designation ?? null,
      mobile:                  customer.primaryMobile,
      profile_photo:           null,
      avatar_url:              null,
      require_password_change: true,
      last_login:              null,
      company_id:              'sectore-001',
      customer_id:             customer.id,
    });
  } catch (err) {
    // Non-fatal: log but don't fail the customer creation
    console.error('[customerService] Failed to create linked user:', err);
  }
}

/* ── Sync fields to linked User ──────────────────────────────────────── */
async function syncLinkedUser(customerId: string, patch: {
  name?: string; mobile?: string; email?: string; status?: 'Active' | 'Inactive';
}): Promise<void> {
  try {
    const linkedUser = await usersApi.getByCustomerId(customerId);
    if (!linkedUser) return;

    const fields: Partial<import('@/lib/api').AppUser> = {};
    if (patch.name   !== undefined) fields.name   = patch.name;
    if (patch.mobile !== undefined) fields.mobile = patch.mobile;
    if (patch.email  !== undefined) fields.email  = patch.email ?? '';
    if (patch.status !== undefined) fields.status = patch.status;

    if (Object.keys(fields).length > 0) {
      await usersApi.update(linkedUser.id, fields);
    }
  } catch (err) {
    console.error('[customerService] Failed to sync linked user:', err);
  }
}

export const customerService = {
  async list(includeInactive = false): Promise<Customer[]> {
    const all = await cached(CK.customers, () => customersApi.list(false));
    if (includeInactive) {
      return cached(CK.customers + ':all_inc', () => customersApi.list(true));
    }
    return all;
  },

  async getAll(): Promise<Customer[]> {
    return cached(CK.customers, () => customersApi.list(false));
  },

  async getById(id: string): Promise<Customer | null> {
    return customersApi.getById(id);
  },

  async checkDuplicateName(name: string, excludeId?: string): Promise<boolean> {
    return customersApi.checkDuplicateName(name, excludeId);
  },

  async create(data: CustomerFormData, createdBy: string): Promise<Customer> {
    const customer = await customersApi.create(data, createdBy);
    invalidate(CK.customers, CK.customers + ':all_inc');

    // Auto-create linked Customer User (fire and don't block UI)
    createLinkedUser(customer, createdBy).catch(console.error);

    return customer;
  },

  async update(id: string, data: Partial<CustomerFormData>, updatedBy = 'system'): Promise<Customer> {
    const customer = await customersApi.update(id, data, updatedBy);
    invalidate(CK.customers, CK.customers + ':all_inc');

    // Sync fields to linked user
    syncLinkedUser(id, {
      name:   data.contactPerson || (data as { companyName?: string }).companyName,
      mobile: data.primaryMobile,
      email:  data.email,
      status: data.status,
    }).catch(console.error);

    return customer;
  },

  async softDelete(id: string, _deletedBy?: string): Promise<void> {
    await customersApi.setStatus(id, 'Inactive');
    invalidate(CK.customers, CK.customers + ':all_inc');

    // Deactivate linked user (preserve for audit — do NOT delete)
    syncLinkedUser(id, { status: 'Inactive' }).catch(console.error);
  },

  async restore(id: string, _restoredBy?: string): Promise<void> {
    await customersApi.setStatus(id, 'Active');
    invalidate(CK.customers, CK.customers + ':all_inc');

    // Reactivate linked user
    syncLinkedUser(id, { status: 'Active' }).catch(console.error);
  },

  async search(query: string, limit = 20): Promise<Customer[]> {
    return customersApi.search(query, limit);
  },

  async getAssetCount(customerId: string): Promise<number> {
    return customersApi.getAssetCount(customerId);
  },
};
