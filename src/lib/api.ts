/**
 * API Data Layer — Sectore 360
 * All Supabase queries in one place.
 * Services delegate here; UI never calls Supabase directly.
 *
 * Table mapping (existing DB → TypeScript):
 *   app_users      → User / ManagedUser
 *   customers      → Customer
 *   assets         → Asset
 *   tasks          → Task
 *   amcs           → AMC
 *   audit_logs     → AuditLog
 *   company_profile → CompanyProfile
 *   application_config → { key, value }
 */
import { supabase } from '@/lib/supabase';
import type { Customer, Asset, AssetFormData, CustomerFormData } from '@/types/customer';
import type { Task, TaskFormData, TaskNote, TaskTimelineEvent, TaskActivity, TaskPhoto, TaskDocument, NoteType, PhotoCategory } from '@/types/task';
import type { AMC, AMCFormData, AMCVisitSchedule, AMCTimelineEvent, AMCDocument, AMCRenewal, AMCDocumentType } from '@/types/amc';
import type { UserRole } from '@/types/auth';
import type { CompanyProfile } from '@/services/companyProfileService';
import type { ManagedUser, CreateUserData } from '@/services/userManagementService';

// ── helpers ────────────────────────────────────────────────────────────────

function safeArray<T>(data: T[] | null): T[] {
  return Array.isArray(data) ? data : [];
}

function pg(table: string) {
  return supabase.from(table);
}

// =====================================================================
// AUTH / USERS
// =====================================================================

export interface AppUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  employee_code: string;
  password_hash: string;
  status: 'Active' | 'Inactive';
  department?: string | null;
  designation?: string | null;
  mobile?: string | null;
  profile_photo?: string | null;
  avatar_url?: string | null;
  require_password_change: boolean;
  last_login?: string | null;
  created_at: string;
  updated_at: string;
  company_id: string;
  /** Links to customers.id for role=customer users */
  customer_id?: string | null;
}

export const usersApi = {
  async getByUsername(username: string): Promise<AppUser | null> {
    const { data } = await pg('app_users')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .maybeSingle();
    return data as AppUser | null;
  },

  async getById(id: string): Promise<AppUser | null> {
    const { data } = await pg('app_users').select('*').eq('id', id).maybeSingle();
    return data as AppUser | null;
  },

  async getAll(opts?: { status?: string; role?: string }): Promise<AppUser[]> {
    let q = pg('app_users').select('*').order('name', { ascending: true });
    if (opts?.status) q = q.eq('status', opts.status);
    if (opts?.role)   q = q.eq('role', opts.role);
    const { data } = await q;
    return safeArray(data as AppUser[]);
  },

  async getEngineers(): Promise<AppUser[]> {
    const { data } = await pg('app_users')
      .select('id, name, employee_code, profile_photo, avatar_url, mobile, email')
      .eq('role', 'engineer')
      .eq('status', 'Active')
      .order('name');
    return safeArray(data as AppUser[]);
  },

  async generateCode(role: UserRole): Promise<string> {
    const { data } = await supabase.rpc('generate_user_code', { p_role: role });
    return (data as string) ?? `${role.toUpperCase()}-0001`;
  },

  async create(payload: Omit<AppUser, 'created_at' | 'updated_at'>): Promise<AppUser> {
    const now = new Date().toISOString();
    const { data, error } = await pg('app_users')
      .insert({ ...payload, created_at: now, updated_at: now })
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as AppUser;
  },

  async update(id: string, fields: Partial<AppUser>): Promise<AppUser> {
    const { data, error } = await pg('app_users')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as AppUser;
  },

  async updatePasswordHash(id: string, newHash: string): Promise<void> {
    const { error } = await pg('app_users')
      .update({ password_hash: newHash, require_password_change: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  async updateLastLogin(id: string): Promise<void> {
    await pg('app_users').update({ last_login: new Date().toISOString() }).eq('id', id);
  },

  async setStatus(id: string, status: 'Active' | 'Inactive'): Promise<void> {
    await pg('app_users').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  },

  async delete(id: string): Promise<void> {
    const { error } = await pg('app_users').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async isUsernameTaken(username: string, excludeId?: string): Promise<boolean> {
    let q = pg('app_users').select('id').eq('username', username.toLowerCase());
    if (excludeId) q = q.neq('id', excludeId);
    const { data } = await q.limit(1);
    return safeArray(data).length > 0;
  },

  async isEmailTaken(email: string, excludeId?: string): Promise<boolean> {
    if (!email) return false;
    let q = pg('app_users').select('id').eq('email', email.toLowerCase());
    if (excludeId) q = q.neq('id', excludeId);
    const { data } = await q.limit(1);
    return safeArray(data).length > 0;
  },

  /** Find the linked user account for a customer */
  async getByCustomerId(customerId: string): Promise<AppUser | null> {
    const { data } = await pg('app_users')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();
    return data as AppUser | null;
  },
};

// =====================================================================
// CUSTOMERS
// =====================================================================

/** Map DB row → Customer type */
function rowToCustomer(row: Record<string, unknown>): Customer {
  return {
    id:              row.id as string,
    code:            row.code as string,
    companyName:     row.company_name as string,
    customerType:    (row.customer_type as Customer['customerType']) ?? 'Call Based',
    amcStatus:       (row.amc_status as Customer['amcStatus']) ?? 'No AMC',
    leadSource:      row.lead_source as Customer['leadSource'],
    contactPerson:   row.contact_person as string,
    designation:     row.designation as string | undefined,
    primaryMobile:   row.primary_mobile as string,
    secondaryMobile: row.secondary_mobile as string | undefined,
    whatsappNumber:  row.whatsapp_number as string | undefined,
    email:           row.email as string,
    website:         row.website as string | undefined,
    gstNumber:       row.gst_number as string | undefined,
    address:         row.address as string,
    city:            row.city as string,
    state:           row.state as string,
    country:         row.country as string,
    pincode:         (row.pincode ?? '') as string,
    googleMapLink:   row.google_map_link as string | undefined,
    latitude:        row.latitude as number | undefined,
    longitude:       row.longitude as number | undefined,
    notes:           row.notes as string | undefined,
    status:          (row.status as Customer['status']) ?? 'Active',
    logoUrl:         row.logo_url as string | undefined,
    createdAt:       row.created_at as string,
    updatedAt:       row.updated_at as string,
    createdBy:       (row.created_by ?? '') as string,
  };
}

/** Map Customer/CustomerFormData → DB columns */
function customerToRow(data: Partial<CustomerFormData & Customer>) {
  const row: Record<string, unknown> = {};
  if (data.companyName    !== undefined) row.company_name     = data.companyName;
  if (data.customerType   !== undefined) row.customer_type    = data.customerType;
  if (data.amcStatus      !== undefined) row.amc_status       = data.amcStatus;
  if (data.leadSource     !== undefined) row.lead_source      = data.leadSource || null;
  if (data.contactPerson  !== undefined) row.contact_person   = data.contactPerson;
  if (data.designation    !== undefined) row.designation      = data.designation || null;
  if (data.primaryMobile  !== undefined) row.primary_mobile   = data.primaryMobile;
  if (data.secondaryMobile !== undefined) row.secondary_mobile = data.secondaryMobile || null;
  if (data.whatsappNumber !== undefined) row.whatsapp_number  = data.whatsappNumber || null;
  // NOT NULL cols in DB use '' as empty sentinel (column defaults are '')
  if (data.email          !== undefined) row.email            = data.email   ?? '';
  if (data.website        !== undefined) row.website          = data.website || null;
  if (data.gstNumber      !== undefined) row.gst_number       = data.gstNumber || null;
  if (data.address        !== undefined) row.address          = data.address ?? '';
  if (data.city           !== undefined) row.city             = data.city    ?? '';
  if (data.state          !== undefined) row.state            = data.state   ?? '';
  if (data.country        !== undefined) row.country          = data.country ?? 'India';
  if (data.pincode        !== undefined) row.pincode          = data.pincode ?? '';
  if (data.googleMapLink  !== undefined) row.google_map_link  = data.googleMapLink || null;
  if (data.latitude       !== undefined) row.latitude         = data.latitude ?? null;
  if (data.longitude      !== undefined) row.longitude        = data.longitude ?? null;
  if (data.notes          !== undefined) row.notes            = data.notes || null;
  if (data.status         !== undefined) row.status           = data.status;
  if (data.logoUrl        !== undefined) row.logo_url         = data.logoUrl || null;
  return row;
}

export const customersApi = {
  async list(includeInactive = false): Promise<Customer[]> {
    let q = pg('customers').select('*').order('company_name');
    if (!includeInactive) q = q.eq('status', 'Active');
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return safeArray(data as Record<string, unknown>[]).map(rowToCustomer);
  },

  async getById(id: string): Promise<Customer | null> {
    const { data } = await pg('customers').select('*').eq('id', id).maybeSingle();
    return data ? rowToCustomer(data as Record<string, unknown>) : null;
  },

  async search(query: string, limit = 20): Promise<Customer[]> {
    const q = query.trim();
    if (!q) {
      const { data } = await pg('customers').select('*').eq('status', 'Active').order('company_name').limit(limit);
      return safeArray(data as Record<string, unknown>[]).map(rowToCustomer);
    }
    const { data } = await pg('customers')
      .select('*')
      .eq('status', 'Active')
      .or(`company_name.ilike.%${q}%,contact_person.ilike.%${q}%,primary_mobile.ilike.%${q}%,code.ilike.%${q}%`)
      .order('company_name')
      .limit(limit);
    return safeArray(data as Record<string, unknown>[]).map(rowToCustomer);
  },

  async checkDuplicateName(name: string, excludeId?: string): Promise<boolean> {
    let q = pg('customers').select('id').ilike('company_name', name);
    if (excludeId) q = q.neq('id', excludeId);
    const { data } = await q.limit(1);
    return safeArray(data).length > 0;
  },

  async create(data: CustomerFormData, createdBy: string): Promise<Customer> {
    const now = new Date().toISOString();
    const code = await this.nextCode();
    const row = {
      ...customerToRow(data),
      id: crypto.randomUUID(),
      code,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
    };
    const { data: created, error } = await pg('customers').insert(row).select().maybeSingle();
    if (error) throw new Error(error.message);
    return rowToCustomer(created as Record<string, unknown>);
  },

  async update(id: string, data: Partial<CustomerFormData>, updatedBy: string): Promise<Customer> {
    const row = { ...customerToRow(data), updated_at: new Date().toISOString(), updated_by: updatedBy };
    const { data: updated, error } = await pg('customers').update(row).eq('id', id).select().maybeSingle();
    if (error) throw new Error(error.message);
    return rowToCustomer(updated as Record<string, unknown>);
  },

  async setStatus(id: string, status: 'Active' | 'Inactive'): Promise<void> {
    await pg('customers').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  },

  async nextCode(): Promise<string> {
    const { data } = await supabase.rpc('next_customer_code');
    return (data as string) ?? `CUST-${String(Date.now()).slice(-6)}`;
  },

  async getAssetCount(customerId: string): Promise<number> {
    const { count } = await pg('assets').select('id', { count: 'exact', head: true })
      .eq('customer_id', customerId).neq('status', 'Retired');
    return count ?? 0;
  },
};

// =====================================================================
// ASSETS
// =====================================================================

function rowToAsset(row: Record<string, unknown>): Asset {
  const specs = (row.specifications as Record<string, unknown>) ?? {};
  const ipAddress  = (specs.ip_address  ?? row.ip_address)  as string | undefined;
  const macAddress = (specs.mac_address ?? row.mac_address) as string | undefined;
  const configParts: string[] = [];
  const osType   = (specs.os_type   ?? row.os_type)  as string | undefined;
  const osVer    = (specs.os_version ?? row.os_version) as string | undefined;
  const proc     = (specs.processor  ?? row.processor)  as string | undefined;
  const ramGb    = (specs.ram_gb     ?? row.ram_gb)    as number | undefined;
  const storage  = (specs.storage    ?? row.storage)   as string | undefined;
  if (osType)  configParts.push(`OS: ${osType}${osVer ? ' ' + osVer : ''}`);
  if (proc)    configParts.push(`CPU: ${proc}`);
  if (ramGb)   configParts.push(`RAM: ${ramGb}GB`);
  if (storage) configParts.push(`Storage: ${storage}`);
  const configurationNotes = configParts.length ? configParts.join(', ') : (row.configuration_notes as string | undefined);

  return {
    id:               row.id as string,
    code:             row.code as string,
    assetNumber:      row.asset_number as string | undefined,
    customerId:       row.customer_id as string,
    category:         row.category as string,
    deviceType:       row.device_type as string,
    brand:            row.brand as string | undefined,
    model:            row.model as string | undefined,
    serialNumber:     row.serial_number as string,
    serviceTag:       (row.asset_tag ?? row.service_tag) as string | undefined,
    purchaseDate:     row.purchase_date as string | undefined,
    installationDate: row.installation_date as string | undefined,
    warrantyStart:    row.warranty_start as string | undefined,
    warrantyEnd:      (row.warranty_expiry ?? row.warranty_end) as string | undefined,
    vendor:           (row.vendor_name ?? row.vendor) as string | undefined,
    location:         row.location as string | undefined,
    floor:            (row.floor_building ?? row.floor) as string | undefined,
    department:       row.department as string | undefined,
    assignedUser:     row.assigned_user as string | undefined,
    ipAddress,
    macAddress,
    configurationNotes,
    remarks:          (row.notes ?? row.remarks) as string | undefined,
    status:           (row.status as Asset['status']) ?? 'Active',
    qrCode:           row.qr_code as string | undefined,
    barcode:          row.barcode as string | undefined,
    templateId:       row.template_id as string | undefined,
    parentId:         row.parent_id as string | undefined,
    customFields:     (row.custom_fields as Record<string, unknown>) ?? {},
    specifications:   specs,
    photoUrls:        row.photo_url ? [row.photo_url as string] : undefined,
    createdAt:        row.created_at as string,
    updatedAt:        row.updated_at as string,
    createdBy:        row.created_by as string,
  };
}

function assetToRow(data: Record<string, unknown>) {
  const row: Record<string, unknown> = {};
  if (data.customerId       !== undefined) row.customer_id       = data.customerId;
  if (data.category         !== undefined) row.category          = data.category;
  if (data.deviceType       !== undefined) row.device_type       = data.deviceType;
  if (data.brand            !== undefined) row.brand             = data.brand || null;
  if (data.model            !== undefined) row.model             = data.model || null;
  if (data.serialNumber     !== undefined) row.serial_number     = data.serialNumber;
  if (data.serviceTag       !== undefined) row.asset_tag         = data.serviceTag || null;
  if (data.purchaseDate     !== undefined) row.purchase_date     = data.purchaseDate || null;
  if (data.warrantyEnd      !== undefined) row.warranty_expiry   = data.warrantyEnd || null;
  if (data.warrantyStart    !== undefined) row.warranty_start    = data.warrantyStart || null;
  if (data.installationDate !== undefined) row.installation_date = data.installationDate || null;
  if (data.location         !== undefined) row.location          = data.location || null;
  if (data.floor            !== undefined) row.floor_building    = data.floor || null;
  if (data.department       !== undefined) row.department        = data.department || null;
  if (data.remarks          !== undefined) row.notes             = data.remarks || null;
  if (data.vendor           !== undefined) row.vendor_name       = data.vendor || null;
  if (data.status           !== undefined) row.status            = data.status;
  if (data.assetNumber      !== undefined) row.asset_number      = data.assetNumber || null;
  if (data.assignedUser     !== undefined) row.assigned_user     = data.assignedUser || null;
  if (data.templateId       !== undefined) row.template_id       = data.templateId || null;
  if (data.parentId         !== undefined) row.parent_id         = data.parentId || null;
  if (data.qrCode           !== undefined) row.qr_code           = data.qrCode || null;
  if (data.barcode          !== undefined) row.barcode           = data.barcode || null;
  if (data.customFields     !== undefined) row.custom_fields     = data.customFields;
  // Specs stored as jsonb — merge incoming specs with any existing
  const specs: Record<string, unknown> = {};
  if (data.ipAddress    !== undefined) specs.ip_address  = data.ipAddress  || null;
  if (data.macAddress   !== undefined) specs.mac_address = data.macAddress || null;
  if (data.specifications !== undefined) Object.assign(specs, data.specifications);
  if (Object.keys(specs).length > 0) row.specifications = specs;
  return row;
}

export const assetsApi = {
  async list(includeRetired = false): Promise<Asset[]> {
    let q = pg('assets').select('*').order('code');
    if (!includeRetired) q = q.neq('status', 'Retired');
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return safeArray(data as Record<string, unknown>[]).map(rowToAsset);
  },

  async getById(id: string): Promise<Asset | null> {
    const { data } = await pg('assets').select('*').eq('id', id).maybeSingle();
    return data ? rowToAsset(data as Record<string, unknown>) : null;
  },

  async getByCustomer(customerId: string, includeRetired = false): Promise<Asset[]> {
    let q = pg('assets').select('*').eq('customer_id', customerId).order('code');
    if (!includeRetired) q = q.neq('status', 'Retired');
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return safeArray(data as Record<string, unknown>[]).map(rowToAsset);
  },

  async checkDuplicateSerial(serial: string, excludeId?: string): Promise<boolean> {
    let q = pg('assets').select('id').ilike('serial_number', serial);
    if (excludeId) q = q.neq('id', excludeId);
    const { data } = await q.limit(1);
    return safeArray(data).length > 0;
  },

  async create(data: AssetFormData, createdBy: string): Promise<Asset> {
    const now = new Date().toISOString();
    const code = await this.nextCode();
    const row = {
      ...assetToRow(data as unknown as Record<string, unknown>),
      id: crypto.randomUUID(),
      code,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
    };
    const { data: created, error } = await pg('assets').insert(row).select().maybeSingle();
    if (error) throw new Error(error.message);
    return rowToAsset(created as Record<string, unknown>);
  },

  async update(id: string, data: Partial<AssetFormData>): Promise<Asset> {
    const row = { ...assetToRow(data as unknown as Record<string, unknown>), updated_at: new Date().toISOString() };
    const { data: updated, error } = await pg('assets').update(row).eq('id', id).select().maybeSingle();
    if (error) throw new Error(error.message);
    return rowToAsset(updated as Record<string, unknown>);
  },

  async setStatus(id: string, status: Asset['status']): Promise<void> {
    await pg('assets').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  },

  async nextCode(): Promise<string> {
    const { data } = await supabase.rpc('next_asset_code');
    return (data as string) ?? `ASSET-${String(Date.now()).slice(-6)}`;
  },

  search(assets: Asset[], query: string): Asset[] {
    const q = query.toLowerCase();
    return assets.filter((a) =>
      a.serialNumber.toLowerCase().includes(q) ||
      (a.model ?? '').toLowerCase().includes(q) ||
      (a.brand ?? '').toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q) ||
      a.deviceType.toLowerCase().includes(q)
    );
  },
};

// =====================================================================
// TASKS
// =====================================================================

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id:                 row.id as string,
    taskNumber:         row.task_number as string,
    customerId:         row.customer_id as string,
    assetId:            row.asset_id as string,
    taskType:           row.task_type as Task['taskType'],
    priority:           (row.priority as Task['priority']) ?? 'Medium',
    status:             (row.status as Task['status']) ?? 'Pending',
    issueDescription:   row.issue_description as string,
    engineerId:         row.engineer_id as string | undefined,
    engineerName:       row.engineer_name as string | undefined,
    expectedVisitDate:  row.expected_visit_date as string | undefined,
    expectedVisitTime:  row.expected_visit_time as string | undefined,
    remarks:            row.remarks as string | undefined,
    internalNotes:      row.internal_notes as string | undefined,
    customerNotes:      row.customer_notes as string | undefined,
    amcId:              row.amc_id as string | undefined,
    amcNumber:          row.amc_number as string | undefined,
    completedAt:        row.completed_at as string | undefined,
    rejectionReason:    row.rejection_reason as string | undefined,
    escalationReason:   row.escalation_reason as string | undefined,
    deletedAt:          row.deleted_at as string | undefined,
    serviceStartTime:   row.service_start_time as string | undefined,
    serviceEndTime:     row.service_end_time as string | undefined,
    siteTimeMinutes:    row.site_time_minutes as number | undefined,
    customerRemarks:    row.customer_remarks as string | undefined,
    customerFeedback:   row.customer_feedback as string | undefined,
    contactPerson:      row.contact_person as string | undefined,
    contactMobile:      row.contact_mobile as string | undefined,
    createdBy:          row.created_by as string,
    createdAt:          row.created_at as string,
    updatedAt:          row.updated_at as string,
  };
}

function taskToRow(data: Partial<TaskFormData & Task>) {
  const row: Record<string, unknown> = {};
  if (data.customerId        !== undefined) row.customer_id        = data.customerId;
  if (data.assetId           !== undefined) row.asset_id           = data.assetId;
  if (data.taskType          !== undefined) row.task_type          = data.taskType;
  if (data.priority          !== undefined) row.priority           = data.priority;
  if (data.status            !== undefined) row.status             = data.status;
  if (data.issueDescription  !== undefined) row.issue_description  = data.issueDescription;
  if (data.engineerId        !== undefined) row.engineer_id        = data.engineerId || null;
  if (data.engineerName      !== undefined) row.engineer_name      = data.engineerName || null;
  if (data.expectedVisitDate !== undefined) row.expected_visit_date = data.expectedVisitDate || null;
  if (data.expectedVisitTime !== undefined) row.expected_visit_time = data.expectedVisitTime || null;
  if (data.remarks           !== undefined) row.remarks            = data.remarks || null;
  if (data.internalNotes     !== undefined) row.internal_notes     = data.internalNotes || null;
  if (data.customerNotes     !== undefined) row.customer_notes     = data.customerNotes || null;
  if (data.amcId             !== undefined) row.amc_id             = data.amcId || null;
  if (data.amcNumber         !== undefined) row.amc_number         = data.amcNumber || null;
  if (data.completedAt       !== undefined) row.completed_at       = data.completedAt || null;
  if (data.serviceStartTime  !== undefined) row.service_start_time = data.serviceStartTime || null;
  if (data.serviceEndTime    !== undefined) row.service_end_time   = data.serviceEndTime || null;
  if (data.siteTimeMinutes   !== undefined) row.site_time_minutes  = data.siteTimeMinutes ?? null;
  if (data.customerRemarks   !== undefined) row.customer_remarks   = data.customerRemarks || null;
  if (data.customerFeedback  !== undefined) row.customer_feedback  = data.customerFeedback || null;
  if (data.contactPerson     !== undefined) row.contact_person     = data.contactPerson || null;
  if (data.contactMobile     !== undefined) row.contact_mobile     = data.contactMobile || null;
  if (data.createdBy         !== undefined) row.created_by         = data.createdBy;
  return row;
}

export const tasksApi = {
  async list(opts?: {
    status?: string[]; priority?: string[]; taskType?: string[];
    engineerId?: string; customerId?: string; assetId?: string;
    dateFrom?: string; dateTo?: string; includeCancelled?: boolean;
    search?: string; limit?: number; offset?: number;
  }): Promise<Task[]> {
    let q = pg('tasks').select('*').order('created_at', { ascending: false });
    if (!opts?.includeCancelled) q = q.neq('status', 'Cancelled');
    if (opts?.customerId)  q = q.eq('customer_id', opts.customerId);
    if (opts?.assetId)     q = q.eq('asset_id', opts.assetId);
    if (opts?.engineerId)  q = q.eq('engineer_id', opts.engineerId);
    if (opts?.status?.length)   q = q.in('status', opts.status);
    if (opts?.priority?.length) q = q.in('priority', opts.priority);
    if (opts?.taskType?.length) q = q.in('task_type', opts.taskType);
    if (opts?.dateFrom) q = q.gte('expected_visit_date', opts.dateFrom);
    if (opts?.dateTo)   q = q.lte('expected_visit_date', opts.dateTo);
    if (opts?.search) {
      const s = opts.search;
      q = q.or(`task_number.ilike.%${s}%,issue_description.ilike.%${s}%,engineer_name.ilike.%${s}%`);
    }
    q = q.limit(opts?.limit ?? 200);
    if (opts?.offset) q = q.range(opts.offset, opts.offset + (opts?.limit ?? 200) - 1);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return safeArray(data as Record<string, unknown>[]).map(rowToTask);
  },

  async getById(id: string): Promise<Task | null> {
    const { data } = await pg('tasks').select('*').eq('id', id).maybeSingle();
    return data ? rowToTask(data as Record<string, unknown>) : null;
  },

  async create(data: TaskFormData, createdBy: string): Promise<Task> {
    const now = new Date().toISOString();
    const taskNumber = await this.nextNumber();
    const row = {
      ...taskToRow(data),
      id: crypto.randomUUID(),
      task_number: taskNumber,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
    };
    const { data: created, error } = await pg('tasks').insert(row).select().maybeSingle();
    if (error) throw new Error(error.message);
    return rowToTask(created as Record<string, unknown>);
  },

  async update(id: string, data: Partial<TaskFormData>): Promise<Task> {
    const row = { ...taskToRow(data), updated_at: new Date().toISOString() };
    const { data: updated, error } = await pg('tasks').update(row).eq('id', id).select().maybeSingle();
    if (error) throw new Error(error.message);
    return rowToTask(updated as Record<string, unknown>);
  },

  async nextNumber(): Promise<string> {
    const { data } = await supabase.rpc('next_task_number');
    return (data as string) ?? `TASK-${String(Date.now()).slice(-6)}`;
  },

  async getStats(): Promise<{
    todayTotal: number; pending: number; completedToday: number;
    overdue: number; emergency: number; waitingParts: number; waitingCustomer: number;
  }> {
    // Global stats — Admin only (no filter)
    const { data, error } = await supabase.rpc('get_task_stats');
    if (error) throw new Error(error.message);
    const r = data as Record<string, number>;
    return {
      todayTotal:      r.today_total      ?? 0,
      pending:         r.pending          ?? 0,
      completedToday:  r.completed_today  ?? 0,
      overdue:         r.overdue          ?? 0,
      emergency:       r.emergency        ?? 0,
      waitingParts:    r.waiting_parts    ?? 0,
      waitingCustomer: r.waiting_customer ?? 0,
    };
  },

  /** Engineer-scoped stats: only tasks assigned to the given engineerId */
  async getStatsByEngineer(engineerId: string): Promise<{
    todayTotal: number; todayPending: number; todayWorking: number;
    todayCompleted: number; todayOverdue: number; todayEmergency: number;
    waitingParts: number;
  }> {
    const today = new Date().toISOString().slice(0, 10);
    const tasks = await tasksApi.list({ engineerId, includeCancelled: false });
    return {
      todayTotal:      tasks.length,
      todayPending:    tasks.filter((t) => t.status === 'Pending' || t.status === 'Assigned').length,
      todayWorking:    tasks.filter((t) => ['Accepted', 'On The Way', 'Reached Site', 'Working'].includes(t.status)).length,
      todayCompleted:  tasks.filter((t) => t.status === 'Completed' || t.status === 'Closed').length,
      todayOverdue:    tasks.filter((t) => t.expectedVisitDate && t.expectedVisitDate < today && !['Completed', 'Closed', 'Cancelled'].includes(t.status)).length,
      todayEmergency:  tasks.filter((t) => t.priority === 'Emergency' && !['Completed', 'Closed', 'Cancelled'].includes(t.status)).length,
      waitingParts:    tasks.filter((t) => t.status === 'Waiting Parts').length,
    };
  },

  /** Customer-scoped stats: only tasks belonging to the given customerId */
  async getStatsByCustomer(customerId: string): Promise<{
    openTickets: number; completedTickets: number; emergency: number; totalTickets: number;
  }> {
    const tasks = await tasksApi.list({ customerId, includeCancelled: true });
    return {
      totalTickets:     tasks.length,
      openTickets:      tasks.filter((t) => !['Completed', 'Closed', 'Cancelled'].includes(t.status)).length,
      completedTickets: tasks.filter((t) => t.status === 'Completed' || t.status === 'Closed').length,
      emergency:        tasks.filter((t) => t.priority === 'Emergency' && !['Completed', 'Closed', 'Cancelled'].includes(t.status)).length,
    };
  },

  /** Admin global counters — returns live counts for dashboard cards */
  async getAdminCounts(): Promise<{
    totalCustomers: number; totalEngineers: number; totalAssets: number;
    openTickets: number; inProgressTickets: number; completedTickets: number;
    activeAMC: number;
  }> {
    const [customers, engineers, assets, tasks, amcs] = await Promise.all([
      pg('customers').select('id', { count: 'exact', head: true }).neq('status', 'Inactive'),
      pg('app_users').select('id', { count: 'exact', head: true }).eq('role', 'engineer').eq('status', 'Active'),
      pg('assets').select('id', { count: 'exact', head: true }).neq('status', 'Retired'),
      pg('tasks').select('status', { count: 'exact' }).neq('status', 'Cancelled'),
      pg('amcs').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
    ]);
    const taskRows = (tasks.data ?? []) as { status: string }[];
    return {
      totalCustomers:     customers.count ?? 0,
      totalEngineers:     engineers.count ?? 0,
      totalAssets:        assets.count    ?? 0,
      openTickets:        taskRows.filter((t) => ['Pending', 'Assigned'].includes(t.status)).length,
      inProgressTickets:  taskRows.filter((t) => ['Accepted', 'On The Way', 'Reached Site', 'Working', 'Waiting Parts', 'Waiting Customer'].includes(t.status)).length,
      completedTickets:   taskRows.filter((t) => t.status === 'Completed' || t.status === 'Closed').length,
      activeAMC:          amcs.count      ?? 0,
    };
  },

  // ── Notes ────────────────────────────────────────────────────────

  async getNotes(taskId: string): Promise<TaskNote[]> {
    const { data } = await pg('task_notes').select('*').eq('task_id', taskId).order('created_at', { ascending: false });
    return safeArray(data as Record<string, unknown>[]).map((r) => ({
      id: r.id as string, taskId: r.task_id as string,
      noteType: (r.note_type as NoteType) ?? 'Internal',
      content: r.content as string,
      addedBy: r.added_by as string,
      addedById: r.added_by_id as string,
      createdAt: r.created_at as string, updatedAt: r.updated_at as string,
    }));
  },

  async addNote(taskId: string, noteType: NoteType, content: string, addedBy: string, addedById: string): Promise<TaskNote> {
    const now = new Date().toISOString();
    const { data, error } = await pg('task_notes')
      .insert({ id: crypto.randomUUID(), task_id: taskId, note_type: noteType, content, added_by: addedBy, added_by_id: addedById, created_at: now, updated_at: now })
      .select().maybeSingle();
    if (error) throw new Error(error.message);
    const r = data as Record<string, unknown>;
    return { id: r.id as string, taskId: r.task_id as string, noteType: r.note_type as NoteType, content: r.content as string, addedBy: r.added_by as string, addedById: r.added_by_id as string, createdAt: r.created_at as string, updatedAt: r.updated_at as string };
  },

  async deleteNote(noteId: string): Promise<void> {
    await pg('task_notes').delete().eq('id', noteId);
  },

  // ── Photos ───────────────────────────────────────────────────────

  async getPhotos(taskId: string): Promise<TaskPhoto[]> {
    const { data } = await pg('task_photos').select('*').eq('task_id', taskId).order('uploaded_at', { ascending: false });
    return safeArray(data as Record<string, unknown>[]).map((r) => ({
      id: r.id as string, taskId: r.task_id as string,
      category: (r.category as PhotoCategory) ?? 'Before',
      fileName: r.file_name as string, fileSize: r.file_size as number,
      url: r.url as string,
      uploadedBy: r.uploaded_by as string, uploadedById: r.uploaded_by_id as string,
      uploadedAt: r.uploaded_at as string,
    }));
  },

  async addPhoto(taskId: string, category: PhotoCategory, fileName: string, fileSize: number, url: string, uploadedBy: string, uploadedById: string): Promise<TaskPhoto> {
    const now = new Date().toISOString();
    const { data, error } = await pg('task_photos')
      .insert({ id: crypto.randomUUID(), task_id: taskId, category, file_name: fileName, file_size: fileSize, url, uploaded_by: uploadedBy, uploaded_by_id: uploadedById, uploaded_at: now })
      .select().maybeSingle();
    if (error) throw new Error(error.message);
    const r = data as Record<string, unknown>;
    return { id: r.id as string, taskId: r.task_id as string, category: r.category as PhotoCategory, fileName: r.file_name as string, fileSize: r.file_size as number, url: r.url as string, uploadedBy: r.uploaded_by as string, uploadedById: r.uploaded_by_id as string, uploadedAt: r.uploaded_at as string };
  },

  async deletePhoto(photoId: string): Promise<void> {
    await pg('task_photos').delete().eq('id', photoId);
  },

  // ── Documents ────────────────────────────────────────────────────

  async getDocuments(taskId: string): Promise<TaskDocument[]> {
    const { data } = await pg('task_documents').select('*').eq('task_id', taskId).order('uploaded_at', { ascending: false });
    return safeArray(data as Record<string, unknown>[]).map((r) => ({
      id: r.id as string, taskId: r.task_id as string,
      fileName: r.file_name as string, fileType: r.file_type as string, fileSize: r.file_size as number,
      url: r.url as string,
      uploadedBy: r.uploaded_by as string, uploadedById: r.uploaded_by_id as string,
      uploadedAt: r.uploaded_at as string,
    }));
  },

  async addDocument(taskId: string, fileName: string, fileType: string, fileSize: number, url: string, uploadedBy: string, uploadedById: string): Promise<TaskDocument> {
    const now = new Date().toISOString();
    const { data, error } = await pg('task_documents')
      .insert({ id: crypto.randomUUID(), task_id: taskId, file_name: fileName, file_type: fileType, file_size: fileSize, url, uploaded_by: uploadedBy, uploaded_by_id: uploadedById, uploaded_at: now })
      .select().maybeSingle();
    if (error) throw new Error(error.message);
    const r = data as Record<string, unknown>;
    return { id: r.id as string, taskId: r.task_id as string, fileName: r.file_name as string, fileType: r.file_type as string, fileSize: r.file_size as number, url: r.url as string, uploadedBy: r.uploaded_by as string, uploadedById: r.uploaded_by_id as string, uploadedAt: r.uploaded_at as string };
  },

  async deleteDocument(docId: string): Promise<void> {
    await pg('task_documents').delete().eq('id', docId);
  },

  // ── Timeline ─────────────────────────────────────────────────────

  async getTimeline(taskId: string): Promise<TaskTimelineEvent[]> {
    const { data } = await pg('task_timeline').select('*').eq('task_id', taskId).order('created_at', { ascending: false });
    return safeArray(data as Record<string, unknown>[]).map((r) => ({
      id: r.id as string, taskId: r.task_id as string,
      eventType: r.event_type as TaskTimelineEvent['eventType'],
      title: r.title as string, description: r.description as string | undefined,
      oldValue: r.old_value as string | undefined, newValue: r.new_value as string | undefined,
      performedBy: r.performed_by as string, performedById: r.performed_by_id as string | undefined,
      createdAt: r.created_at as string,
    }));
  },

  async addTimeline(taskId: string, eventType: string, title: string, performedBy: string, opts?: { description?: string; oldValue?: string; newValue?: string; performedById?: string }): Promise<void> {
    await pg('task_timeline').insert({
      id: crypto.randomUUID(), task_id: taskId, event_type: eventType, title,
      description: opts?.description, old_value: opts?.oldValue, new_value: opts?.newValue,
      performed_by: performedBy, performed_by_id: opts?.performedById,
      created_at: new Date().toISOString(),
    });
  },

  // ── Activity ─────────────────────────────────────────────────────

  async getActivity(taskId: string): Promise<TaskActivity[]> {
    const { data } = await pg('task_activity').select('*').eq('task_id', taskId).order('created_at', { ascending: false });
    return safeArray(data as Record<string, unknown>[]).map((r) => ({
      id: r.id as string, taskId: r.task_id as string,
      userId: r.user_id as string, userName: r.user_name as string,
      action: r.action as string, details: r.details as string | undefined,
      ipAddress: r.ip_address as string,
      createdAt: r.created_at as string,
    }));
  },
};

// =====================================================================
// AMC
// =====================================================================

function rowToAMC(row: Record<string, unknown>): AMC {
  return {
    id:                        row.id as string,
    amcNumber:                 row.amc_number as string,
    customerId:                row.customer_id as string,
    customerName:              row.customer_name as string,
    contractType:              row.contract_type as AMC['contractType'],
    startDate:                 row.start_date as string,
    endDate:                   row.end_date as string,
    status:                    (row.status as AMC['status']) ?? 'Active',
    visitFrequency:            row.visit_frequency as AMC['visitFrequency'],
    numberOfIncludedVisits:    row.number_of_included_visits as number,
    slaResponseTime:           row.sla_response_time as string,
    slaResolutionTime:         row.sla_resolution_time as string,
    workingHours:              row.working_hours as string | undefined,
    holidayRules:              row.holiday_rules as string | undefined,
    labourIncluded:            !!row.labour_included,
    travelIncluded:            !!row.travel_included,
    emergencySupportIncluded:  !!row.emergency_support_included,
    remoteSupportIncluded:     !!row.remote_support_included,
    includedServices:          row.included_services as string | undefined,
    excludedServices:          row.excluded_services as string | undefined,
    coveredParts:              row.covered_parts as string | undefined,
    excludedParts:             row.excluded_parts as string | undefined,
    coveredAssetIds:           (row.covered_asset_ids as string[]) ?? [],
    remarks:                   row.remarks as string | undefined,
    createdBy:                 row.created_by as string,
    createdAt:                 row.created_at as string,
    updatedAt:                 row.updated_at as string,
  };
}

export const amcApi = {
  async list(opts?: { customerId?: string; status?: string[] }): Promise<AMC[]> {
    let q = pg('amcs').select('*').order('created_at', { ascending: false });
    if (opts?.customerId) q = q.eq('customer_id', opts.customerId);
    if (opts?.status?.length) q = q.in('status', opts.status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return safeArray(data as Record<string, unknown>[]).map(rowToAMC);
  },

  async getById(id: string): Promise<AMC | null> {
    const { data } = await pg('amcs').select('*').eq('id', id).maybeSingle();
    return data ? rowToAMC(data as Record<string, unknown>) : null;
  },

  async create(data: AMCFormData & { customerName?: string }, createdBy: string): Promise<AMC> {
    const now = new Date().toISOString();
    const amcNumber = await this.nextNumber();
    const row: Record<string, unknown> = {
      id: crypto.randomUUID(),
      amc_number: amcNumber,
      customer_id: data.customerId,
      customer_name: data.customerName,
      contract_type: data.contractType,
      start_date: data.startDate,
      end_date: data.endDate,
      status: data.status ?? 'Active',
      visit_frequency: data.visitFrequency,
      number_of_included_visits: data.numberOfIncludedVisits,
      sla_response_time: data.slaResponseTime,
      sla_resolution_time: data.slaResolutionTime,
      working_hours: data.workingHours || null,
      holiday_rules: data.holidayRules || null,
      labour_included: data.labourIncluded,
      travel_included: data.travelIncluded,
      emergency_support_included: data.emergencySupportIncluded,
      remote_support_included: data.remoteSupportIncluded,
      included_services: data.includedServices || null,
      excluded_services: data.excludedServices || null,
      covered_parts: data.coveredParts || null,
      excluded_parts: data.excludedParts || null,
      covered_asset_ids: data.coveredAssetIds ?? [],
      remarks: data.remarks || null,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
    };
    const { data: created, error } = await pg('amcs').insert(row).select().maybeSingle();
    if (error) throw new Error(error.message);
    return rowToAMC(created as Record<string, unknown>);
  },

  async update(id: string, data: Partial<AMCFormData>): Promise<AMC> {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.contractType    !== undefined) row.contract_type    = data.contractType;
    if (data.startDate       !== undefined) row.start_date       = data.startDate;
    if (data.endDate         !== undefined) row.end_date         = data.endDate;
    if (data.status          !== undefined) row.status           = data.status;
    if (data.visitFrequency  !== undefined) row.visit_frequency  = data.visitFrequency;
    if (data.numberOfIncludedVisits !== undefined) row.number_of_included_visits = data.numberOfIncludedVisits;
    if (data.slaResponseTime !== undefined) row.sla_response_time = data.slaResponseTime;
    if (data.slaResolutionTime !== undefined) row.sla_resolution_time = data.slaResolutionTime;
    if (data.labourIncluded  !== undefined) row.labour_included  = data.labourIncluded;
    if (data.travelIncluded  !== undefined) row.travel_included  = data.travelIncluded;
    if (data.emergencySupportIncluded !== undefined) row.emergency_support_included = data.emergencySupportIncluded;
    if (data.remoteSupportIncluded !== undefined) row.remote_support_included = data.remoteSupportIncluded;
    if (data.includedServices !== undefined) row.included_services = data.includedServices || null;
    if (data.excludedServices !== undefined) row.excluded_services = data.excludedServices || null;
    if (data.coveredParts    !== undefined) row.covered_parts    = data.coveredParts || null;
    if (data.excludedParts   !== undefined) row.excluded_parts   = data.excludedParts || null;
    if (data.coveredAssetIds !== undefined) row.covered_asset_ids = data.coveredAssetIds;
    if (data.remarks         !== undefined) row.remarks          = data.remarks || null;
    const { data: updated, error } = await pg('amcs').update(row).eq('id', id).select().maybeSingle();
    if (error) throw new Error(error.message);
    return rowToAMC(updated as Record<string, unknown>);
  },

  async nextNumber(): Promise<string> {
    const { data } = await supabase.rpc('next_amc_number');
    return (data as string) ?? `AMC-${String(Date.now()).slice(-6)}`;
  },

  async getVisits(amcId: string): Promise<AMCVisitSchedule[]> {
    const { data } = await pg('amc_visits').select('*').eq('amc_id', amcId).order('scheduled_date');
    return safeArray(data as Record<string, unknown>[]).map((r) => ({
      id: r.id as string, amcId: r.amc_id as string,
      visitNumber: r.visit_number as number,
      scheduledDate: r.scheduled_date as string,
      status: (r.status as AMCVisitSchedule['status']) ?? 'Pending',
      taskId: r.task_id as string | undefined,
      engineerId: r.engineer_id as string | undefined,
      completedAt: r.completed_at as string | undefined,
      notes: r.notes as string | undefined,
      createdAt: r.created_at as string,
    }));
  },

  async getTimeline(amcId: string): Promise<AMCTimelineEvent[]> {
    const { data } = await pg('amc_timeline').select('*').eq('amc_id', amcId).order('created_at', { ascending: false });
    return safeArray(data as Record<string, unknown>[]).map((r) => ({
      id: r.id as string, amcId: r.amc_id as string,
      eventType: r.event_type as AMCTimelineEvent['eventType'],
      title: r.title as string, description: r.description as string | undefined,
      oldValue: r.old_value as string | undefined, newValue: r.new_value as string | undefined,
      performedBy: r.performed_by as string,
      createdAt: r.created_at as string,
    }));
  },

  async getDocuments(amcId: string): Promise<AMCDocument[]> {
    const { data } = await pg('amc_documents').select('*').eq('amc_id', amcId).order('created_at', { ascending: false });
    return safeArray(data as Record<string, unknown>[]).map((r) => ({
      id:           r.id as string,
      amcId:        r.amc_id as string,
      documentType: r.document_type as AMCDocumentType,
      fileName:     r.file_name as string,
      fileType:     r.file_type as string,
      fileSize:     r.file_size as number,
      url:          r.url as string,
      uploadedBy:   r.uploaded_by as string,
      uploadedAt:   (r.created_at ?? r.uploaded_at ?? new Date().toISOString()) as string,
    }));
  },

  async getRenewals(amcId: string): Promise<AMCRenewal[]> {
    const { data } = await pg('amc_renewals').select('*').eq('amc_id', amcId).order('renewed_at', { ascending: false });
    return safeArray(data as Record<string, unknown>[]).map((r) => ({
      id:              r.id as string,
      amcId:           r.amc_id as string,
      renewalDate:     (r.renewed_at ?? r.renewal_date ?? new Date().toISOString()) as string,
      previousEndDate: (r.old_end_date ?? '') as string,
      newEndDate:      (r.new_end_date ?? '') as string,
      renewedBy:       (r.renewed_by ?? '') as string,
      createdAt:       (r.created_at ?? new Date().toISOString()) as string,
    }));
  },
};

// =====================================================================
// COMPANY PROFILE
// =====================================================================

function rowToProfile(row: Record<string, unknown>): CompanyProfile {
  return {
    name:          row.name as string,
    tagline:       row.tagline as string,
    businessLine:  row.business_line as string,
    footerText:    row.footer_text as string,
    logoDataUrl:   row.logo_url as string | null,
    faviconDataUrl: row.favicon_url as string | null,
    address:       row.address as string,
    contactPerson: row.contact_person as string,
    primaryPhone:  row.primary_phone as string,
    secondaryPhone: row.secondary_phone as string,
    supportEmail:  row.support_email as string,
    emergencyPhone: row.emergency_phone as string,
    website:       row.website as string,
    gst:           row.gst as string,
    workingHours:  row.working_hours as string,
    updatedAt:     row.updated_at as string,
  };
}

export const companyApi = {
  async get(): Promise<CompanyProfile | null> {
    const { data } = await pg('company_profile').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle();
    return data ? rowToProfile(data as Record<string, unknown>) : null;
  },

  async update(patch: Partial<CompanyProfile>, updatedBy?: string): Promise<CompanyProfile> {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.name          !== undefined) row.name           = patch.name;
    if (patch.tagline       !== undefined) row.tagline        = patch.tagline;
    if (patch.businessLine  !== undefined) row.business_line  = patch.businessLine;
    if (patch.footerText    !== undefined) row.footer_text    = patch.footerText;
    if (patch.logoDataUrl   !== undefined) row.logo_url       = patch.logoDataUrl;
    if (patch.faviconDataUrl !== undefined) row.favicon_url   = patch.faviconDataUrl;
    if (patch.address       !== undefined) row.address        = patch.address;
    if (patch.contactPerson !== undefined) row.contact_person = patch.contactPerson;
    if (patch.primaryPhone  !== undefined) row.primary_phone  = patch.primaryPhone;
    if (patch.secondaryPhone !== undefined) row.secondary_phone = patch.secondaryPhone;
    if (patch.supportEmail  !== undefined) row.support_email  = patch.supportEmail;
    if (patch.emergencyPhone !== undefined) row.emergency_phone = patch.emergencyPhone;
    if (patch.website       !== undefined) row.website        = patch.website;
    if (patch.gst           !== undefined) row.gst            = patch.gst;
    if (patch.workingHours  !== undefined) row.working_hours  = patch.workingHours;
    if (updatedBy) row.updated_by = updatedBy;

    // Update the single existing row
    const { data: existing } = await pg('company_profile').select('id').limit(1).maybeSingle();
    let updated;
    if (existing) {
      const { data } = await pg('company_profile').update(row).eq('id', (existing as Record<string,unknown>).id).select().maybeSingle();
      updated = data;
    } else {
      const { data } = await pg('company_profile').insert({ id: crypto.randomUUID(), ...row }).select().maybeSingle();
      updated = data;
    }
    return rowToProfile(updated as Record<string, unknown>);
  },
};

// =====================================================================
// AUDIT LOGS
// =====================================================================

export const auditApi = {
  async log(event: {
    eventType: string; userId: string; userName: string; userRole: string;
    resource: string; resourceId?: string; description: string;
    oldValue?: string; newValue?: string; ipAddress?: string;
  }): Promise<void> {
    await pg('audit_logs').insert({
      id: crypto.randomUUID(),
      event_type: event.eventType,
      user_id: event.userId,
      user_name: event.userName,
      user_role: event.userRole,
      resource: event.resource,
      resource_id: event.resourceId || null,
      description: event.description,
      old_value: event.oldValue || null,
      new_value: event.newValue || null,
      ip_address: event.ipAddress || '—',
      timestamp: new Date().toISOString(),
    });
  },

  async list(opts?: {
    fromDate?: string; toDate?: string; eventType?: string;
    userId?: string; search?: string; limit?: number;
  }): Promise<Record<string, unknown>[]> {
    let q = pg('audit_logs').select('*').order('timestamp', { ascending: false }).limit(opts?.limit ?? 500);
    if (opts?.fromDate) q = q.gte('timestamp', opts.fromDate);
    if (opts?.toDate)   q = q.lte('timestamp', opts.toDate + 'T23:59:59Z');
    if (opts?.eventType && opts.eventType !== 'all') q = q.eq('event_type', opts.eventType);
    if (opts?.userId && opts.userId !== 'all') q = q.eq('user_id', opts.userId);
    if (opts?.search) {
      const s = opts.search;
      q = q.or(`description.ilike.%${s}%,user_name.ilike.%${s}%,resource.ilike.%${s}%`);
    }
    const { data } = await q;
    return safeArray(data as Record<string, unknown>[]);
  },
};

// =====================================================================
// APP CONFIG
// =====================================================================

// =====================================================================
// MASTER DATA API
// =====================================================================

import type { MasterItem, MasterItemFormData, AssetCustomField, AssetCustomFieldFormData, RecycleBinItem } from '@/types/master';

function rowToMasterItem(row: Record<string, unknown>): MasterItem {
  return {
    id:         row.id as string,
    masterType: row.master_type as string,
    value:      row.value as string,
    code:       row.code as string | undefined,
    parentId:   row.parent_id as string | undefined,
    sortOrder:  (row.sort_order as number) ?? 0,
    isActive:   (row.is_active as boolean) ?? true,
    metadata:   row.metadata as Record<string, unknown> | undefined,
    createdAt:  row.created_at as string,
    updatedAt:  row.updated_at as string,
    createdBy:  row.created_by as string,
  };
}

function rowToCustomField(row: Record<string, unknown>): AssetCustomField {
  return {
    id:           row.id as string,
    category:     row.category as string,
    fieldKey:     row.field_key as string,
    fieldLabel:   row.field_label as string,
    fieldType:    row.field_type as AssetCustomField['fieldType'],
    fieldOptions: row.field_options as string[] | undefined,
    isRequired:   (row.is_required as boolean) ?? false,
    sortOrder:    (row.sort_order as number) ?? 0,
    isActive:     (row.is_active as boolean) ?? true,
    createdAt:    row.created_at as string,
    updatedAt:    row.updated_at as string,
  };
}

function rowToRecycleBin(row: Record<string, unknown>): RecycleBinItem {
  return {
    id:           row.id as string,
    entityType:   row.entity_type as RecycleBinItem['entityType'],
    entityId:     row.entity_id as string,
    entityCode:   row.entity_code as string | undefined,
    entityName:   row.entity_name as string | undefined,
    snapshot:     row.snapshot as Record<string, unknown>,
    deletedBy:    row.deleted_by as string,
    deletedAt:    row.deleted_at as string,
    deleteReason: row.delete_reason as string | undefined,
    restoredAt:   row.restored_at as string | undefined,
    restoredBy:   row.restored_by as string | undefined,
  };
}

export const masterDataApi = {
  /** List all items of a given master_type */
  async listByType(masterType: string, includeInactive = false): Promise<MasterItem[]> {
    let q = pg('master_data').select('*').eq('master_type', masterType).order('sort_order').order('value');
    if (!includeInactive) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return safeArray(data as Record<string, unknown>[]).map(rowToMasterItem);
  },

  /** Search across a type */
  async search(masterType: string, query: string): Promise<MasterItem[]> {
    const { data, error } = await pg('master_data')
      .select('*')
      .eq('master_type', masterType)
      .ilike('value', `%${query}%`)
      .order('value')
      .limit(50);
    if (error) throw new Error(error.message);
    return safeArray(data as Record<string, unknown>[]).map(rowToMasterItem);
  },

  async create(data: MasterItemFormData, createdBy: string): Promise<MasterItem> {
    const now = new Date().toISOString();
    const row = {
      id:          'md_' + crypto.randomUUID(),
      master_type: data.masterType,
      value:       data.value.trim(),
      code:        data.code || null,
      parent_id:   data.parentId || null,
      sort_order:  data.sortOrder ?? 0,
      is_active:   data.isActive ?? true,
      metadata:    data.metadata ?? null,
      created_by:  createdBy,
      created_at:  now,
      updated_at:  now,
    };
    const { data: created, error } = await pg('master_data').insert(row).select().maybeSingle();
    if (error) throw new Error(error.message);
    return rowToMasterItem(created as Record<string, unknown>);
  },

  async update(id: string, data: Partial<MasterItemFormData>): Promise<MasterItem> {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.value      !== undefined) row.value       = data.value.trim();
    if (data.code       !== undefined) row.code        = data.code || null;
    if (data.sortOrder  !== undefined) row.sort_order  = data.sortOrder;
    if (data.isActive   !== undefined) row.is_active   = data.isActive;
    if (data.metadata   !== undefined) row.metadata    = data.metadata;
    const { data: updated, error } = await pg('master_data').update(row).eq('id', id).select().maybeSingle();
    if (error) throw new Error(error.message);
    return rowToMasterItem(updated as Record<string, unknown>);
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    await pg('master_data').update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id', id);
  },

  async delete(id: string): Promise<void> {
    const { error } = await pg('master_data').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  /** Quick-add: create and return item (used by SmartCombobox) */
  async quickAdd(masterType: string, value: string, createdBy: string): Promise<MasterItem> {
    return this.create({ masterType, value }, createdBy);
  },

  /** Get all distinct master_types (for dynamic listing) */
  async listTypes(): Promise<string[]> {
    const { data } = await pg('master_data').select('master_type');
    const all = safeArray(data as Record<string, unknown>[]).map((r) => r.master_type as string);
    return [...new Set(all)].sort();
  },

  /** Export a master type as CSV string */
  exportCsv(items: MasterItem[]): string {
    const header = 'value,code,sort_order,is_active';
    const rows = items.map((i) =>
      `"${i.value}","${i.code ?? ''}",${i.sortOrder},${i.isActive}`
    );
    return [header, ...rows].join('\n');
  },
};

// =====================================================================
// ASSET CUSTOM FIELDS API
// =====================================================================

export const assetCustomFieldsApi = {
  async listByCategory(category: string): Promise<AssetCustomField[]> {
    const { data, error } = await pg('asset_custom_fields')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw new Error(error.message);
    return safeArray(data as Record<string, unknown>[]).map(rowToCustomField);
  },

  async create(data: AssetCustomFieldFormData): Promise<AssetCustomField> {
    const now = new Date().toISOString();
    const row = {
      id:            'acf_' + crypto.randomUUID(),
      category:      data.category,
      field_key:     data.fieldKey,
      field_label:   data.fieldLabel,
      field_type:    data.fieldType,
      field_options: data.fieldOptions ?? null,
      is_required:   data.isRequired ?? false,
      sort_order:    data.sortOrder ?? 0,
      is_active:     true,
      created_at:    now,
      updated_at:    now,
    };
    const { data: created, error } = await pg('asset_custom_fields').insert(row).select().maybeSingle();
    if (error) throw new Error(error.message);
    return rowToCustomField(created as Record<string, unknown>);
  },

  async update(id: string, data: Partial<AssetCustomFieldFormData>): Promise<AssetCustomField> {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.fieldLabel   !== undefined) row.field_label   = data.fieldLabel;
    if (data.fieldType    !== undefined) row.field_type    = data.fieldType;
    if (data.fieldOptions !== undefined) row.field_options = data.fieldOptions;
    if (data.isRequired   !== undefined) row.is_required   = data.isRequired;
    if (data.sortOrder    !== undefined) row.sort_order    = data.sortOrder;
    const { data: updated, error } = await pg('asset_custom_fields').update(row).eq('id', id).select().maybeSingle();
    if (error) throw new Error(error.message);
    return rowToCustomField(updated as Record<string, unknown>);
  },

  async delete(id: string): Promise<void> {
    await pg('asset_custom_fields').delete().eq('id', id);
  },
};

// =====================================================================
// RECYCLE BIN API
// =====================================================================

export const recycleBinApi = {
  async list(entityType?: string): Promise<RecycleBinItem[]> {
    let q = pg('recycle_bin').select('*').is('restored_at', null).order('deleted_at', { ascending: false });
    if (entityType) q = q.eq('entity_type', entityType);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return safeArray(data as Record<string, unknown>[]).map(rowToRecycleBin);
  },

  async add(item: Omit<RecycleBinItem, 'id' | 'deletedAt' | 'restoredAt' | 'restoredBy'>): Promise<void> {
    const row = {
      id:            'rb_' + crypto.randomUUID(),
      entity_type:   item.entityType,
      entity_id:     item.entityId,
      entity_code:   item.entityCode ?? null,
      entity_name:   item.entityName ?? null,
      snapshot:      item.snapshot,
      deleted_by:    item.deletedBy,
      delete_reason: item.deleteReason ?? null,
      deleted_at:    new Date().toISOString(),
    };
    await pg('recycle_bin').upsert(row, { onConflict: 'entity_type,entity_id' });
  },

  async restore(id: string, restoredBy: string): Promise<RecycleBinItem> {
    const { data, error } = await pg('recycle_bin')
      .update({ restored_at: new Date().toISOString(), restored_by: restoredBy })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return rowToRecycleBin(data as Record<string, unknown>);
  },

  async permanentDelete(id: string): Promise<void> {
    await pg('recycle_bin').delete().eq('id', id);
  },
};

export const configApi = {
  async get(key: string): Promise<unknown> {
    const { data } = await pg('application_config').select('value').eq('key', key).maybeSingle();
    return data ? (data as Record<string, unknown>).value : null;
  },

  async set(key: string, value: unknown, group = 'general'): Promise<void> {
    await pg('application_config')
      .upsert({ key, value, group_name: group, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  },

  async isSetupCompleted(): Promise<boolean> {
    const val = await this.get('setup_completed');
    return val === true || val === 'true';
  },

  async markSetupCompleted(): Promise<void> {
    await this.set('setup_completed', true, 'setup');
  },
};

// =====================================================================
// ASSET TEMPLATES
// =====================================================================

export interface AssetTemplate {
  id: string;
  name: string;
  category: string;
  deviceType: string;
  brand?: string;
  model?: string;
  specifications?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
  notes?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AssetTemplateFormData {
  name: string;
  category: string;
  deviceType: string;
  brand?: string;
  model?: string;
  specifications?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
  notes?: string;
  isActive?: boolean;
}

function rowToTemplate(row: Record<string, unknown>): AssetTemplate {
  return {
    id:             row.id as string,
    name:           row.name as string,
    category:       row.category as string,
    deviceType:     row.device_type as string,
    brand:          row.brand as string | undefined,
    model:          row.model as string | undefined,
    specifications: (row.specifications as Record<string, unknown>) ?? {},
    customFields:   (row.custom_fields as Record<string, unknown>) ?? {},
    notes:          row.notes as string | undefined,
    isActive:       (row.is_active as boolean) ?? true,
    sortOrder:      (row.sort_order as number) ?? 0,
    createdAt:      row.created_at as string,
    updatedAt:      row.updated_at as string,
    createdBy:      row.created_by as string,
  };
}

export const assetTemplatesApi = {
  async list(category?: string): Promise<AssetTemplate[]> {
    let q = pg('asset_templates').select('*').eq('is_active', true).order('category').order('name');
    if (category) q = q.eq('category', category);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return safeArray(data as Record<string, unknown>[]).map(rowToTemplate);
  },

  async getById(id: string): Promise<AssetTemplate | null> {
    const { data } = await pg('asset_templates').select('*').eq('id', id).maybeSingle();
    return data ? rowToTemplate(data as Record<string, unknown>) : null;
  },

  async create(data: AssetTemplateFormData, createdBy: string): Promise<AssetTemplate> {
    const now = new Date().toISOString();
    const row = {
      id: 'at_' + crypto.randomUUID(),
      name: data.name,
      category: data.category,
      device_type: data.deviceType,
      brand: data.brand || null,
      model: data.model || null,
      specifications: data.specifications ?? {},
      custom_fields: data.customFields ?? {},
      notes: data.notes || null,
      is_active: data.isActive ?? true,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
    };
    const { data: created, error } = await pg('asset_templates').insert(row).select().maybeSingle();
    if (error) throw new Error(error.message);
    return rowToTemplate(created as Record<string, unknown>);
  },

  async update(id: string, data: Partial<AssetTemplateFormData>): Promise<AssetTemplate> {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name           !== undefined) row.name           = data.name;
    if (data.category       !== undefined) row.category       = data.category;
    if (data.deviceType     !== undefined) row.device_type    = data.deviceType;
    if (data.brand          !== undefined) row.brand          = data.brand || null;
    if (data.model          !== undefined) row.model          = data.model || null;
    if (data.specifications !== undefined) row.specifications = data.specifications;
    if (data.customFields   !== undefined) row.custom_fields  = data.customFields;
    if (data.notes          !== undefined) row.notes          = data.notes || null;
    if (data.isActive       !== undefined) row.is_active      = data.isActive;
    const { data: updated, error } = await pg('asset_templates').update(row).eq('id', id).select().maybeSingle();
    if (error) throw new Error(error.message);
    return rowToTemplate(updated as Record<string, unknown>);
  },

  async delete(id: string): Promise<void> {
    const { error } = await pg('asset_templates').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

// =====================================================================
// ASSET RELATIONSHIPS
// =====================================================================

export interface AssetRelationship {
  id: string;
  parentId: string;
  childId: string;
  relationship: string;
  createdAt: string;
  createdBy: string;
}

export const assetRelationshipsApi = {
  async getByParent(parentId: string): Promise<AssetRelationship[]> {
    const { data, error } = await pg('asset_relationships')
      .select('*').eq('parent_id', parentId);
    if (error) throw new Error(error.message);
    return safeArray(data as Record<string, unknown>[]).map((row) => ({
      id:           row.id as string,
      parentId:     row.parent_id as string,
      childId:      row.child_id as string,
      relationship: row.relationship as string,
      createdAt:    row.created_at as string,
      createdBy:    row.created_by as string,
    }));
  },

  async getByChild(childId: string): Promise<AssetRelationship[]> {
    const { data, error } = await pg('asset_relationships')
      .select('*').eq('child_id', childId);
    if (error) throw new Error(error.message);
    return safeArray(data as Record<string, unknown>[]).map((row) => ({
      id:           row.id as string,
      parentId:     row.parent_id as string,
      childId:      row.child_id as string,
      relationship: row.relationship as string,
      createdAt:    row.created_at as string,
      createdBy:    row.created_by as string,
    }));
  },

  async add(parentId: string, childId: string, relationship: string, createdBy: string): Promise<void> {
    const { error } = await pg('asset_relationships').insert({
      id: 'ar_' + crypto.randomUUID(),
      parent_id: parentId,
      child_id: childId,
      relationship,
      created_by: createdBy,
    });
    if (error) throw new Error(error.message);
  },

  async remove(id: string): Promise<void> {
    const { error } = await pg('asset_relationships').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

// =====================================================================
// ASSET TIMELINE
// =====================================================================

export interface AssetTimelineEvent {
  id: string;
  assetId: string;
  eventType: string;
  title: string;
  description?: string;
  performedBy?: string;
  eventDate: string;
  referenceId?: string;
  referenceType?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
}

export interface AssetTimelineEventFormData {
  assetId: string;
  eventType: string;
  title: string;
  description?: string;
  performedBy?: string;
  eventDate?: string;
  referenceId?: string;
  referenceType?: string;
  metadata?: Record<string, unknown>;
}

function rowToTimelineEvent(row: Record<string, unknown>): AssetTimelineEvent {
  return {
    id:            row.id as string,
    assetId:       row.asset_id as string,
    eventType:     row.event_type as string,
    title:         row.title as string,
    description:   row.description as string | undefined,
    performedBy:   row.performed_by as string | undefined,
    eventDate:     row.event_date as string,
    referenceId:   row.reference_id as string | undefined,
    referenceType: row.reference_type as string | undefined,
    metadata:      row.metadata as Record<string, unknown> | undefined,
    createdAt:     row.created_at as string,
    createdBy:     row.created_by as string,
  };
}

export const assetTimelineApi = {
  async list(assetId: string): Promise<AssetTimelineEvent[]> {
    const { data, error } = await pg('asset_timeline')
      .select('*').eq('asset_id', assetId).order('event_date', { ascending: false });
    if (error) throw new Error(error.message);
    return safeArray(data as Record<string, unknown>[]).map(rowToTimelineEvent);
  },

  async add(data: AssetTimelineEventFormData, createdBy: string): Promise<AssetTimelineEvent> {
    const now = new Date().toISOString();
    const row = {
      id:             'tl_' + crypto.randomUUID(),
      asset_id:       data.assetId,
      event_type:     data.eventType,
      title:          data.title,
      description:    data.description || null,
      performed_by:   data.performedBy || null,
      event_date:     data.eventDate ?? now,
      reference_id:   data.referenceId || null,
      reference_type: data.referenceType || null,
      metadata:       data.metadata ?? {},
      created_by:     createdBy,
      created_at:     now,
    };
    const { data: created, error } = await pg('asset_timeline').insert(row).select().maybeSingle();
    if (error) throw new Error(error.message);
    return rowToTimelineEvent(created as Record<string, unknown>);
  },

  async delete(id: string): Promise<void> {
    const { error } = await pg('asset_timeline').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

// =====================================================================
// SERVER-SIDE ASSET SEARCH
// =====================================================================

export interface AssetSearchParams {
  customerId?: string;
  query?: string;
  category?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface AssetSearchResult {
  assets: Asset[];
  totalCount: number;
}

export const assetSearchApi = {
  async search(params: AssetSearchParams): Promise<AssetSearchResult> {
    const { data, error } = await supabase.rpc('search_assets', {
      p_customer_id: params.customerId ?? null,
      p_query:       params.query ?? null,
      p_category:    params.category ?? null,
      p_status:      params.status ?? null,
      p_page:        params.page ?? 1,
      p_page_size:   params.pageSize ?? 25,
    });
    if (error) throw new Error(error.message);
    const rows = safeArray(data as Record<string, unknown>[]);
    const totalCount = rows.length > 0 ? Number((rows[0] as Record<string, unknown>).total_count ?? 0) : 0;
    return {
      assets: rows.map((row) => rowToAsset(row)),
      totalCount,
    };
  },
};
