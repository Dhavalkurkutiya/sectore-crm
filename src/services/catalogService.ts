/**
 * Catalog Service — Asset Categories & Device Types
 * Sectore 360 — Phase 1, Part 6 Enhancement
 *
 * In-memory store with full seed data.
 * Admin-manageable: no code changes needed to add new categories.
 */
import type { ManagedCategory, ManagedDeviceType, CategoryFormData, DeviceTypeFormData } from '@/types/catalog';

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

/* ── Sequence helpers ────────────────────────────────────────── */
let catSeq = 100;
let dtSeq  = 1000;
const nextCatId  = () => `cat_${++catSeq}`;
const nextDTId   = () => `dt_${++dtSeq}`;
const now        = () => new Date().toISOString();

/* ── Default seed data ───────────────────────────────────────── */
export const categoriesStore: ManagedCategory[] = [
  { id: 'cat_001', name: 'Computers',          description: 'Desktops, Laptops, Workstations',           sortOrder: 1,  active: true, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'cat_002', name: 'Servers',             description: 'Tower, Rack and Blade Servers',             sortOrder: 2,  active: true, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'cat_003', name: 'Networking',          description: 'Routers, Switches, Firewalls, APs',         sortOrder: 3,  active: true, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'cat_004', name: 'Storage',             description: 'NAS, SAN, DAS Storage Devices',             sortOrder: 4,  active: true, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'cat_005', name: 'CCTV',                description: 'Cameras, NVR, DVR, POE Switches',           sortOrder: 5,  active: true, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'cat_006', name: 'Printer',             description: 'Laser, Inkjet, Dot Matrix Printers',        sortOrder: 6,  active: true, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'cat_007', name: 'UPS',                 description: 'Online, Offline, Line Interactive UPS',     sortOrder: 7,  active: true, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'cat_008', name: 'EPABX',               description: 'EPABX and IP PBX Systems',                 sortOrder: 8,  active: true, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'cat_009', name: 'Attendance Machine',  description: 'Fingerprint, Face, Card Attendance',        sortOrder: 9,  active: true, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'cat_010', name: 'Access Control',      description: 'Door Access Control Systems',               sortOrder: 10, active: true, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'cat_011', name: 'Video Door Phone',    description: 'Wired and Wireless Video Door Phones',      sortOrder: 11, active: true, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'cat_012', name: 'Fiber',               description: 'Fiber OFC, SFP, Splitters',                sortOrder: 12, active: true, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'cat_013', name: 'Others',              description: 'Any other device category',                 sortOrder: 13, active: true, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
];

export const deviceTypesStore: ManagedDeviceType[] = [
  // Computers (cat_001)
  { id: 'dt_001', categoryId: 'cat_001', categoryName: 'Computers', name: 'Desktop',       active: true, sortOrder: 1, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_002', categoryId: 'cat_001', categoryName: 'Computers', name: 'Laptop',        active: true, sortOrder: 2, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_003', categoryId: 'cat_001', categoryName: 'Computers', name: 'Mini PC',       active: true, sortOrder: 3, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_004', categoryId: 'cat_001', categoryName: 'Computers', name: 'Workstation',   active: true, sortOrder: 4, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },

  // Servers (cat_002)
  { id: 'dt_010', categoryId: 'cat_002', categoryName: 'Servers', name: 'Tower Server',    active: true, sortOrder: 1, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_011', categoryId: 'cat_002', categoryName: 'Servers', name: 'Rack Server',     active: true, sortOrder: 2, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_012', categoryId: 'cat_002', categoryName: 'Servers', name: 'Blade Server',    active: true, sortOrder: 3, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },

  // Networking (cat_003)
  { id: 'dt_020', categoryId: 'cat_003', categoryName: 'Networking', name: 'Router',             active: true, sortOrder: 1,  createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_021', categoryId: 'cat_003', categoryName: 'Networking', name: 'Firewall',           active: true, sortOrder: 2,  createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_022', categoryId: 'cat_003', categoryName: 'Networking', name: 'Managed Switch',     active: true, sortOrder: 3,  createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_023', categoryId: 'cat_003', categoryName: 'Networking', name: 'Unmanaged Switch',   active: true, sortOrder: 4,  createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_024', categoryId: 'cat_003', categoryName: 'Networking', name: 'Access Point',       active: true, sortOrder: 5,  createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_025', categoryId: 'cat_003', categoryName: 'Networking', name: 'Patch Panel',        active: true, sortOrder: 6,  createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_026', categoryId: 'cat_003', categoryName: 'Networking', name: 'Media Converter',    active: true, sortOrder: 7,  createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_027', categoryId: 'cat_003', categoryName: 'Networking', name: 'Network Rack',       active: true, sortOrder: 8,  createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },

  // Storage (cat_004)
  { id: 'dt_030', categoryId: 'cat_004', categoryName: 'Storage', name: 'NAS',   active: true, sortOrder: 1, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_031', categoryId: 'cat_004', categoryName: 'Storage', name: 'SAN',   active: true, sortOrder: 2, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_032', categoryId: 'cat_004', categoryName: 'Storage', name: 'DAS',   active: true, sortOrder: 3, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },

  // CCTV (cat_005)
  { id: 'dt_040', categoryId: 'cat_005', categoryName: 'CCTV', name: 'NVR',            active: true, sortOrder: 1, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_041', categoryId: 'cat_005', categoryName: 'CCTV', name: 'DVR',            active: true, sortOrder: 2, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_042', categoryId: 'cat_005', categoryName: 'CCTV', name: 'IP Camera',      active: true, sortOrder: 3, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_043', categoryId: 'cat_005', categoryName: 'CCTV', name: 'Analog Camera',  active: true, sortOrder: 4, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_044', categoryId: 'cat_005', categoryName: 'CCTV', name: 'PTZ Camera',     active: true, sortOrder: 5, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_045', categoryId: 'cat_005', categoryName: 'CCTV', name: 'POE Switch',     active: true, sortOrder: 6, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_046', categoryId: 'cat_005', categoryName: 'CCTV', name: 'Hard Disk',      active: true, sortOrder: 7, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },

  // Printer (cat_006)
  { id: 'dt_050', categoryId: 'cat_006', categoryName: 'Printer', name: 'Laser Printer',   active: true, sortOrder: 1, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_051', categoryId: 'cat_006', categoryName: 'Printer', name: 'Inkjet Printer',  active: true, sortOrder: 2, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_052', categoryId: 'cat_006', categoryName: 'Printer', name: 'Dot Matrix',      active: true, sortOrder: 3, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_053', categoryId: 'cat_006', categoryName: 'Printer', name: 'Plotter',         active: true, sortOrder: 4, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },

  // UPS (cat_007)
  { id: 'dt_060', categoryId: 'cat_007', categoryName: 'UPS', name: 'Online UPS',       active: true, sortOrder: 1, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_061', categoryId: 'cat_007', categoryName: 'UPS', name: 'Offline UPS',      active: true, sortOrder: 2, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_062', categoryId: 'cat_007', categoryName: 'UPS', name: 'Line Interactive', active: true, sortOrder: 3, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },

  // EPABX (cat_008)
  { id: 'dt_070', categoryId: 'cat_008', categoryName: 'EPABX', name: 'EPABX System',  active: true, sortOrder: 1, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_071', categoryId: 'cat_008', categoryName: 'EPABX', name: 'IP PBX',        active: true, sortOrder: 2, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_072', categoryId: 'cat_008', categoryName: 'EPABX', name: 'VoIP Gateway',  active: true, sortOrder: 3, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },

  // Attendance Machine (cat_009)
  { id: 'dt_080', categoryId: 'cat_009', categoryName: 'Attendance Machine', name: 'Fingerprint',       active: true, sortOrder: 1, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_081', categoryId: 'cat_009', categoryName: 'Attendance Machine', name: 'Face Recognition',  active: true, sortOrder: 2, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_082', categoryId: 'cat_009', categoryName: 'Attendance Machine', name: 'Card Based',        active: true, sortOrder: 3, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_083', categoryId: 'cat_009', categoryName: 'Attendance Machine', name: 'Multi-Modal',       active: true, sortOrder: 4, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },

  // Access Control (cat_010)
  { id: 'dt_090', categoryId: 'cat_010', categoryName: 'Access Control', name: 'Proximity Card',    active: true, sortOrder: 1, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_091', categoryId: 'cat_010', categoryName: 'Access Control', name: 'Fingerprint Access',active: true, sortOrder: 2, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_092', categoryId: 'cat_010', categoryName: 'Access Control', name: 'Face Access',       active: true, sortOrder: 3, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_093', categoryId: 'cat_010', categoryName: 'Access Control', name: 'Password Lock',     active: true, sortOrder: 4, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },

  // Video Door Phone (cat_011)
  { id: 'dt_100', categoryId: 'cat_011', categoryName: 'Video Door Phone', name: 'Wired VDP',    active: true, sortOrder: 1, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_101', categoryId: 'cat_011', categoryName: 'Video Door Phone', name: 'Wireless VDP', active: true, sortOrder: 2, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_102', categoryId: 'cat_011', categoryName: 'Video Door Phone', name: 'IP VDP',       active: true, sortOrder: 3, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },

  // Fiber (cat_012)
  { id: 'dt_110', categoryId: 'cat_012', categoryName: 'Fiber', name: 'Fiber OFC',          active: true, sortOrder: 1, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_111', categoryId: 'cat_012', categoryName: 'Fiber', name: 'SFP Module',         active: true, sortOrder: 2, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_112', categoryId: 'cat_012', categoryName: 'Fiber', name: 'Fiber Splitter',     active: true, sortOrder: 3, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'dt_113', categoryId: 'cat_012', categoryName: 'Fiber', name: 'Fiber Patch Panel',  active: true, sortOrder: 4, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },

  // Others (cat_013)
  { id: 'dt_120', categoryId: 'cat_013', categoryName: 'Others', name: 'Other Device', active: true, sortOrder: 1, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
];

/* ── Service ─────────────────────────────────────────────────── */
export const catalogService = {
  /* ── Categories ──────────────────────────────────────────── */
  async getCategories(activeOnly = true): Promise<ManagedCategory[]> {
    await delay();
    return activeOnly
      ? categoriesStore.filter((c) => c.active).sort((a, b) => a.sortOrder - b.sortOrder)
      : [...categoriesStore].sort((a, b) => a.sortOrder - b.sortOrder);
  },

  getCategoriesSync(activeOnly = true): ManagedCategory[] {
    return activeOnly
      ? categoriesStore.filter((c) => c.active).sort((a, b) => a.sortOrder - b.sortOrder)
      : [...categoriesStore].sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getCategoryById(id: string): Promise<ManagedCategory | null> {
    await delay(50);
    return categoriesStore.find((c) => c.id === id) ?? null;
  },

  async createCategory(data: CategoryFormData): Promise<ManagedCategory> {
    await delay(250);
    const ts = now();
    const cat: ManagedCategory = { ...data, id: nextCatId(), createdAt: ts, updatedAt: ts };
    categoriesStore.push(cat);
    return cat;
  },

  async updateCategory(id: string, data: Partial<CategoryFormData>): Promise<ManagedCategory> {
    await delay(250);
    const idx = categoriesStore.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Category not found');
    categoriesStore[idx] = { ...categoriesStore[idx], ...data, updatedAt: now() };
    return categoriesStore[idx];
  },

  async deleteCategory(id: string): Promise<void> {
    await delay(200);
    const idx = categoriesStore.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Category not found');
    categoriesStore[idx].active = false;
    categoriesStore[idx].updatedAt = now();
  },

  /* ── Device Types ────────────────────────────────────────── */
  async getDeviceTypes(categoryId?: string, activeOnly = true): Promise<ManagedDeviceType[]> {
    await delay();
    let list = activeOnly ? deviceTypesStore.filter((d) => d.active) : [...deviceTypesStore];
    if (categoryId) list = list.filter((d) => d.categoryId === categoryId);
    return list.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  getDeviceTypesSync(categoryId?: string, activeOnly = true): ManagedDeviceType[] {
    let list = activeOnly ? deviceTypesStore.filter((d) => d.active) : [...deviceTypesStore];
    if (categoryId) list = list.filter((d) => d.categoryId === categoryId);
    return list.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async createDeviceType(data: DeviceTypeFormData): Promise<ManagedDeviceType> {
    await delay(250);
    const ts = now();
    const dt: ManagedDeviceType = { ...data, id: nextDTId(), createdAt: ts, updatedAt: ts };
    deviceTypesStore.push(dt);
    return dt;
  },

  async updateDeviceType(id: string, data: Partial<DeviceTypeFormData>): Promise<ManagedDeviceType> {
    await delay(250);
    const idx = deviceTypesStore.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error('Device type not found');
    deviceTypesStore[idx] = { ...deviceTypesStore[idx], ...data, updatedAt: now() };
    return deviceTypesStore[idx];
  },

  async toggleDeviceType(id: string): Promise<ManagedDeviceType> {
    await delay(150);
    const idx = deviceTypesStore.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error('Device type not found');
    deviceTypesStore[idx].active = !deviceTypesStore[idx].active;
    deviceTypesStore[idx].updatedAt = now();
    return deviceTypesStore[idx];
  },
};
