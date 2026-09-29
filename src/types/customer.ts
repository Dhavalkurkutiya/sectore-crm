/**
 * Customer & Asset Types
 * Sectore 360 — Phase 1, Part 2 (updated: leadSource, amcStatus)
 */

/* ── Customer ───────────────────────────────────────────────── */
export type CustomerType =
  | 'AMC'               // legacy
  | 'Call Based'        // legacy
  | 'AMC Customer'
  | 'Non-AMC Customer'
  | 'Prospect'
  | 'One-Time Customer'
  | 'Dealer / Partner'
  | 'Internal';

/** Ordered list used in dropdowns */
export const CUSTOMER_CATEGORIES: CustomerType[] = [
  'AMC Customer',
  'Non-AMC Customer',
  'Prospect',
  'One-Time Customer',
  'Dealer / Partner',
  'Internal',
];
export type CustomerStatus = 'Active' | 'Inactive';

export type LeadSource =
  | 'BNI' | 'Referral' | 'Progress Alliance' | 'Google' | 'Walk In'
  | 'Website' | 'Facebook' | 'Instagram' | 'LinkedIn' | 'IndiaMART'
  | 'JustDial' | 'Existing Customer' | 'Other';

export type AmcStatus = 'No AMC' | 'Active AMC' | 'Expired AMC' | 'Renewal Due';

export const LEAD_SOURCES: LeadSource[] = [
  'BNI', 'Referral', 'Progress Alliance', 'Google', 'Walk In',
  'Website', 'Facebook', 'Instagram', 'LinkedIn', 'IndiaMART',
  'JustDial', 'Existing Customer', 'Other',
];

export const AMC_STATUSES: AmcStatus[] = [
  'No AMC', 'Active AMC', 'Expired AMC', 'Renewal Due',
];

export interface Customer {
  id: string;
  code: string; // CUST-000001
  companyName: string;
  /** @deprecated use amcStatus instead; kept for backward compatibility */
  customerType: CustomerType;
  amcStatus?: AmcStatus;
  leadSource?: LeadSource;
  // contactPerson is required by the form but stored as '' when blank
  contactPerson: string;
  designation?: string;
  primaryMobile: string;
  secondaryMobile?: string;
  whatsappNumber?: string;
  // Optional — stored as '' in DB (NOT NULL with '' default)
  email: string;
  website?: string;
  gstNumber?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  googleMapLink?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  status: CustomerStatus;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type CustomerFormData = Omit<Customer, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'createdBy'> & {
  // These are optional in the form — blank string maps to '' in DB
  contactPerson?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
};

/* ── Asset ──────────────────────────────────────────────────── */
/**
 * AssetCategory is now a managed string (driven by catalogService).
 * The union alias is kept for backward-compatibility with existing code
 * that still references it as a type; the actual values come from
 * catalogService.getCategories() at runtime.
 */
export type AssetCategory = string;

export type AssetStatus = 'Active' | 'Inactive' | 'Under Maintenance' | 'Retired';

export interface Asset {
  id: string;
  code: string; // ASSET-000001
  assetNumber?: string; // e.g. DESK-001, LAP-024
  customerId: string;
  category: AssetCategory;
  deviceType: string;
  brand?: string;
  model?: string;
  serialNumber: string;
  serviceTag?: string;
  purchaseDate?: string;
  installationDate?: string;
  warrantyStart?: string;
  warrantyEnd?: string;
  vendor?: string;
  location?: string;
  floor?: string;
  department?: string;
  assignedUser?: string; // person using the asset
  ipAddress?: string;
  macAddress?: string;
  username?: string;
  password?: string; // stored masked
  configurationNotes?: string;
  remarks?: string;
  status: AssetStatus;
  qrCode?: string;
  barcode?: string;
  templateId?: string;
  parentId?: string; // parent asset id for child assets
  customFields?: Record<string, unknown>;
  specifications?: Record<string, unknown>;
  photoUrls?: string[];
  documentUrls?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type AssetFormData = Omit<Asset, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'createdBy'>;

/* ── Document ───────────────────────────────────────────────── */
export type DocumentCategory =
  | 'Company Logo' | 'Customer Photo' | 'Agreement'
  | 'Purchase Document' | 'Warranty Document' | 'Other'
  | 'Asset Photo' | 'Asset Document';

export interface UploadedDocument {
  id: string;
  entityId: string; // customer or asset id
  entityType: 'customer' | 'asset';
  category: DocumentCategory;
  fileName: string;
  fileType: string;
  fileSize: number; // bytes
  url: string;
  version: number;
  uploadedAt: string;
  uploadedBy: string;
}

/* ── Timeline ───────────────────────────────────────────────── */
export type TimelineEventType =
  | 'created' | 'updated' | 'deleted' | 'restored'
  | 'asset_added' | 'document_uploaded' | 'document_deleted'
  | 'amc_created' | 'service_visit' | 'engineer_assigned'
  | 'task_completed' | 'warranty_updated' | 'config_updated'
  | 'part_changed';

export interface TimelineEvent {
  id: string;
  entityId: string;
  entityType: 'customer' | 'asset';
  eventType: TimelineEventType;
  title: string;
  description?: string;
  performedBy: string;
  createdAt: string;
}

/* ── Device type map (legacy — kept for backward compat; use catalogService at runtime) ── */
export const DEVICE_TYPES_BY_CATEGORY: Record<string, string[]> = {
  Computers: ['Desktop', 'Laptop', 'Workstation', 'Mini PC'],
  Servers: ['Tower Server', 'Rack Server', 'Blade Server'],
  Networking: ['Router', 'Firewall', 'Managed Switch', 'Unmanaged Switch', 'Access Point', 'Patch Panel', 'Media Converter', 'Network Rack'],
  CCTV: ['NVR', 'DVR', 'IP Camera', 'Analog Camera', 'PTZ Camera', 'POE Switch', 'Hard Disk'],
  Storage: ['NAS', 'SAN', 'DAS'],
  Printer: ['Laser Printer', 'Inkjet Printer', 'Dot Matrix', 'Plotter'],
  UPS: ['Online UPS', 'Offline UPS', 'Line Interactive'],
  EPABX: ['EPABX System', 'IP PBX', 'VoIP Gateway'],
  'Attendance Machine': ['Fingerprint', 'Face Recognition', 'Card Based', 'Multi-Modal'],
  'Access Control': ['Proximity Card', 'Fingerprint Access', 'Face Access', 'Password Lock'],
  'Video Door Phone': ['Wired VDP', 'Wireless VDP', 'IP VDP'],
  Fiber: ['Fiber OFC', 'SFP Module', 'Fiber Splitter', 'Fiber Patch Panel'],
  Others: ['Other Device'],
};

export const ASSET_CATEGORIES: string[] = Object.keys(DEVICE_TYPES_BY_CATEGORY);
