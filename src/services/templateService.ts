/**
 * Template Service
 * Sectore 360 — Intelligent Task Manager Enhancement
 *
 * In-memory store for TaskTemplates.
 * Built-in templates are seeded on import and cannot be deleted.
 * Admin-created templates can be fully managed.
 *
 * Future: swap out the store arrays for Supabase calls — zero API change needed.
 */

import type {
  TaskTemplate, TaskTemplateData, ChecklistItem, PlannedMaterial,
  DailyProgressEntry,
} from '@/types/template';

/* ── ID helpers ─────────────────────────────────────────────── */
function uid() { return `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function taskDataId() { return `ttd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

const NOW = new Date().toISOString();

/* ── Default config (sensible baseline) ─────────────────────── */
const BASE_CONFIG: TaskTemplate['config'] = {
  requireSerialNumber:       false,
  photosRequired:            false,
  photosOptional:            true,
  requireCustomerSignature:  false,
  requireEngineerSignature:  false,
  requireOldItemReturn:      false,
  materialsEnabled:          false,
  dailyProgressEnabled:      false,
  arrivalDepartureTracking:  true,
  gpsTracking:               false,
  isRemoteSession:           false,
  hideIssueDescription:      false,
  showDeliveredQty:          false,
  showSystemHealth:          false,
  defaultExpectedDays:       1,
  showWarrantyCapture:       false,
};

/* ── Checklist builder ───────────────────────────────────────── */
function cl(labels: string[], requiredAll = false): ChecklistItem[] {
  return labels.map((label, i) => ({
    id: `ci_${i + 1}`,
    label,
    required: requiredAll,
  }));
}

/* ── Built-in templates ─────────────────────────────────────── */
const BUILT_IN: TaskTemplate[] = [

  /* ── 1. Desktop Repair / Breakdown ────────────────────────── */
  {
    id: 'tmpl_desktop_repair',
    assetCategories: ['Computers'],
    name: 'Desktop Repair',
    description: 'Standard desktop / workstation hardware troubleshooting and repair.',
    serviceTypes: ['Breakdown Support', 'Warranty Service', 'Chargeable Service'],
    deviceCategory: 'Computers',
    checklist: cl([
      'Power check — PSU and cable verified',
      'Adapter / power supply check',
      'RAM seated / tested',
      'HDD / SSD health check',
      'Windows boot verified',
      'Data backup taken',
      'Delivery test completed',
      'Customer signed off',
    ]),
    defaultMaterials: [],
    config: { ...BASE_CONFIG, photosOptional: true, requireCustomerSignature: true },
    isActive: true, isBuiltIn: true, createdAt: NOW, updatedAt: NOW, createdBy: 'system',
  },

  /* ── 2. Laptop Repair / Breakdown ─────────────────────────── */
  {
    id: 'tmpl_laptop_repair',
    assetCategories: ['Computers'],
    name: 'Laptop Repair',
    description: 'Laptop hardware diagnosis, repair and component replacement.',
    serviceTypes: ['Breakdown Support', 'Warranty Service', 'Chargeable Service'],
    deviceCategory: 'Computers',
    checklist: cl([
      'Adapter / charger tested',
      'Battery health checked',
      'RAM tested / seated',
      'SSD / HDD checked',
      'Display / backlight verified',
      'Keyboard functional',
      'Data backup taken',
      'Thermal paste / cooling checked',
      'Final boot test',
    ]),
    defaultMaterials: [],
    config: { ...BASE_CONFIG, photosOptional: true, requireCustomerSignature: true },
    isActive: true, isBuiltIn: true, createdAt: NOW, updatedAt: NOW, createdBy: 'system',
  },

  /* ── 3. Desktop / Laptop Delivery ────────────────────────── */
  {
    id: 'tmpl_desktop_delivery',
    assetCategories: ['Computers'],
    name: 'Desktop / Laptop Delivery',
    description: 'New system delivery, unboxing and basic setup.',
    serviceTypes: ['Delivery'],
    checklist: cl([
      'System unboxed and verified',
      'Accessories / peripherals included',
      'Serial number recorded',
      'Power-on test',
      'OS boot verified',
      'Customer ID proof collected',
      'Customer signature obtained',
    ], true),
    defaultMaterials: [],
    config: {
      ...BASE_CONFIG,
      requireSerialNumber:       true,
      photosRequired:            true,
      requireCustomerSignature:  true,
      showDeliveredQty:          true,
      showWarrantyCapture:       true,
      hideIssueDescription:      true,
    },
    isActive: true, isBuiltIn: true, createdAt: NOW, updatedAt: NOW, createdBy: 'system',
  },

  /* ── 4. Printer Installation ──────────────────────────────── */
  {
    id: 'tmpl_printer_install',
    assetCategories: ['Printer'],
    name: 'Printer Installation',
    description: 'Printer setup, driver installation and network configuration.',
    serviceTypes: ['Installation'],
    deviceCategory: 'Printer',
    checklist: cl([
      'Printer physically installed',
      'Driver installed on all PCs',
      'Test print successful',
      'Network connected (if network printer)',
      'IP address assigned and documented',
      'Printer shared on network',
      'User training completed',
    ]),
    defaultMaterials: [
      { itemName: 'USB Cable', plannedQty: 1, unit: 'pcs' },
      { itemName: 'Network Cable (Cat6)', plannedQty: 2, unit: 'mtrs' },
    ],
    config: { ...BASE_CONFIG, materialsEnabled: true, photosOptional: true },
    isActive: true, isBuiltIn: true, createdAt: NOW, updatedAt: NOW, createdBy: 'system',
  },

  /* ── 5. Printer Breakdown ─────────────────────────────────── */
  {
    id: 'tmpl_printer_repair',
    assetCategories: ['Printer'],
    name: 'Printer Repair',
    description: 'Printer troubleshooting and repair.',
    serviceTypes: ['Breakdown Support', 'Warranty Service', 'Chargeable Service'],
    deviceCategory: 'Printer',
    checklist: cl([
      'Power and cable check',
      'Paper feed / jam cleared',
      'Print head / cartridge inspected',
      'Driver reinstalled if required',
      'Test print successful',
      'Customer sign-off obtained',
    ]),
    defaultMaterials: [],
    config: { ...BASE_CONFIG, photosOptional: true, requireCustomerSignature: true },
    isActive: true, isBuiltIn: true, createdAt: NOW, updatedAt: NOW, createdBy: 'system',
  },

  /* ── 6. Networking Installation (Router/Switch/WiFi) ─────── */
  {
    id: 'tmpl_router_install',
    assetCategories: ['Networking'],
    name: 'Router / Switch / WiFi Installation',
    description: 'LAN/WAN network device installation and configuration.',
    serviceTypes: ['Installation', 'Configuration'],
    deviceCategory: 'Networking',
    checklist: cl([
      'WAN configured and connected',
      'LAN ports tested',
      'WiFi SSID and password configured',
      'Admin password updated (default changed)',
      'Internet speed tested',
      'Backup configuration file saved',
      'Customer credentials handed over',
    ]),
    defaultMaterials: [
      { itemName: 'Cat6 Patch Cable', plannedQty: 5, unit: 'mtrs' },
      { itemName: 'RJ45 Connectors', plannedQty: 10, unit: 'pcs' },
    ],
    config: { ...BASE_CONFIG, materialsEnabled: true, photosOptional: true },
    isActive: true, isBuiltIn: true, createdAt: NOW, updatedAt: NOW, createdBy: 'system',
  },

  /* ── 7. Networking Breakdown (Router/Switch/WiFi) ────────── */
  {
    id: 'tmpl_networking_repair',
    assetCategories: ['Networking'],
    name: 'Network Device Troubleshooting',
    description: 'Troubleshoot router, switch, access point or network connectivity issues.',
    serviceTypes: ['Breakdown Support', 'Warranty Service', 'Chargeable Service'],
    deviceCategory: 'Networking',
    checklist: cl([
      'Physical layer checked — cables, ports, LEDs',
      'Power cycle performed',
      'IP configuration verified',
      'LAN connectivity tested port-by-port',
      'Internet / WAN status checked',
      'Firmware version noted',
      'Configuration backup taken',
      'Root cause documented',
      'Issue resolved / escalation noted',
      'Customer sign-off obtained',
    ]),
    defaultMaterials: [],
    config: { ...BASE_CONFIG, photosOptional: true, requireCustomerSignature: true },
    isActive: true, isBuiltIn: true, createdAt: NOW, updatedAt: NOW, createdBy: 'system',
  },

  /* ── 8. Firewall Installation ─────────────────────────────── */
  {
    id: 'tmpl_firewall_install',
    assetCategories: ['Networking'],
    name: 'Firewall Installation',
    description: 'Enterprise firewall / UTM installation, policy configuration and testing.',
    serviceTypes: ['Installation'],
    deviceCategory: 'Networking',
    checklist: cl([
      'WAN interface configured',
      'LAN interface configured',
      'VPN configured (if applicable)',
      'Firewall policies applied',
      'IPS / IDS enabled',
      'Backup / restore configuration verified',
      'Internet connectivity tested',
      'Management access secured',
    ]),
    defaultMaterials: [
      { itemName: 'SFP Module', plannedQty: 2, unit: 'pcs' },
      { itemName: 'Cat6 Cable', plannedQty: 10, unit: 'mtrs' },
    ],
    config: { ...BASE_CONFIG, materialsEnabled: true, photosRequired: true },
    isActive: true, isBuiltIn: true, createdAt: NOW, updatedAt: NOW, createdBy: 'system',
  },

  /* ── 9. RAM / Storage Upgrade ─────────────────────────────── */
  {
    id: 'tmpl_ram_upgrade',
    assetCategories: ['Computers'],
    name: 'RAM / SSD / HDD Upgrade',
    description: 'Memory or storage upgrade with optional data migration.',
    serviceTypes: ['Upgrade', 'Replacement'],
    checklist: cl([
      'Existing hardware photographed (before)',
      'Data backup taken',
      'New hardware installed',
      'System POST successful',
      'OS detects new hardware correctly',
      'Performance benchmark noted',
      'Old hardware packaged for return',
      'Customer informed of changes',
    ]),
    defaultMaterials: [],
    config: {
      ...BASE_CONFIG,
      requireOldItemReturn: true,
      photosRequired:       true,
      materialsEnabled:     true,
      requireSerialNumber:  true,
    },
    isActive: true, isBuiltIn: true, createdAt: NOW, updatedAt: NOW, createdBy: 'system',
  },

  /* ── 10. Windows / OS Installation ────────────────────────── */
  {
    id: 'tmpl_windows_install',
    assetCategories: ['Computers'],
    name: 'Windows / OS Installation',
    description: 'Fresh OS installation, driver setup and software configuration.',
    serviceTypes: ['Installation', 'Upgrade'],
    deviceCategory: 'Computers',
    checklist: cl([
      'Data backup taken (critical)',
      'License key documented',
      'OS installed successfully',
      'All drivers installed',
      'Windows updates completed',
      'Antivirus installed and updated',
      'Office / required software installed',
      'Customer login credentials set',
    ]),
    defaultMaterials: [],
    config: { ...BASE_CONFIG, photosOptional: true, requireCustomerSignature: true },
    isActive: true, isBuiltIn: true, createdAt: NOW, updatedAt: NOW, createdBy: 'system',
  },

  /* ── 11. CCTV / Camera Installation ──────────────────────── */
  {
    id: 'tmpl_cctv_install',
    assetCategories: ['CCTV'],
    name: 'CCTV / Camera Installation',
    description: 'IP / analog camera installation with NVR/DVR setup and cabling.',
    serviceTypes: ['Installation'],
    deviceCategory: 'CCTV',
    checklist: cl([
      'NVR/DVR installed and powered',
      'All cameras mounted',
      'Cabling completed and labelled',
      'All cameras added to NVR/DVR',
      'Recording configured (schedule/motion)',
      'Remote viewing set up',
      'HDD formatted and recording verified',
      'User training completed',
      'Customer credentials handed over',
    ]),
    defaultMaterials: [
      { itemName: 'CCTV Camera', plannedQty: 4, unit: 'pcs' },
      { itemName: 'Co-axial / CAT6 Cable', plannedQty: 50, unit: 'mtrs' },
      { itemName: 'BNC Connectors', plannedQty: 20, unit: 'pcs' },
      { itemName: 'Cable Tie', plannedQty: 1, unit: 'boxes' },
    ],
    config: {
      ...BASE_CONFIG,
      materialsEnabled:         true,
      photosRequired:           true,
      dailyProgressEnabled:     true,
      arrivalDepartureTracking: true,
      defaultExpectedDays:      2,
      requireCustomerSignature: true,
    },
    isActive: true, isBuiltIn: true, createdAt: NOW, updatedAt: NOW, createdBy: 'system',
  },

  /* ── 12. CCTV / Camera Breakdown ─────────────────────────── */
  {
    id: 'tmpl_cctv_repair',
    assetCategories: ['CCTV'],
    name: 'Camera / CCTV Troubleshooting',
    description: 'Diagnose and repair IP / analog cameras, NVR, DVR issues.',
    serviceTypes: ['Breakdown Support', 'Warranty Service', 'Chargeable Service'],
    deviceCategory: 'CCTV',
    checklist: cl([
      'Power supply to camera / NVR verified',
      'Cable and connector integrity checked',
      'Camera image / video feed tested',
      'NVR/DVR channel configuration verified',
      'HDD recording status checked',
      'Night vision / IR working',
      'Remote access / app connectivity tested',
      'Faulty component identified and noted',
      'Replacement / repair carried out',
      'All cameras recording confirmed',
      'Customer sign-off obtained',
    ]),
    defaultMaterials: [],
    config: { ...BASE_CONFIG, photosRequired: true, requireCustomerSignature: true },
    isActive: true, isBuiltIn: true, createdAt: NOW, updatedAt: NOW, createdBy: 'system',
  },

  /* ── 13. Server / NAS Installation ───────────────────────── */
  {
    id: 'tmpl_server_install',
    assetCategories: ['Servers'],
    name: 'Server / NAS Installation',
    description: 'Server or NAS rack installation, OS and service configuration.',
    serviceTypes: ['Installation'],
    deviceCategory: 'Servers',
    checklist: cl([
      'Rack space verified',
      'Server racked and cabled',
      'RAID configured',
      'OS installed',
      'Network configured (IP/VLAN)',
      'UPS / power redundancy verified',
      'Monitoring agent installed',
      'Backup policy configured',
      'Remote management enabled (IPMI/iDRAC)',
    ]),
    defaultMaterials: [
      { itemName: 'Cat6 Patch Cable (1m)', plannedQty: 4, unit: 'pcs' },
      { itemName: 'Cable Management Brackets', plannedQty: 2, unit: 'pcs' },
    ],
    config: {
      ...BASE_CONFIG,
      materialsEnabled:         true,
      photosRequired:           true,
      requireSerialNumber:      true,
      showWarrantyCapture:      true,
      requireCustomerSignature: true,
    },
    isActive: true, isBuiltIn: true, createdAt: NOW, updatedAt: NOW, createdBy: 'system',
  },

  /* ── 14. Server / NAS Breakdown ──────────────────────────── */
  {
    id: 'tmpl_server_repair',
    assetCategories: ['Servers'],
    name: 'Server / NAS Troubleshooting',
    description: 'Diagnose server hardware failures, OS issues, RAID and storage faults.',
    serviceTypes: ['Breakdown Support', 'Warranty Service', 'Chargeable Service'],
    deviceCategory: 'Servers',
    checklist: cl([
      'Server event log / IPMI alerts reviewed',
      'Hardware health — CPU, RAM, PSU checked',
      'RAID status and disk health verified',
      'OS boot and services checked',
      'Network connectivity tested',
      'Backup integrity verified',
      'Faulty component identified',
      'Replacement / repair carried out',
      'Post-repair health check passed',
      'Customer sign-off obtained',
    ]),
    defaultMaterials: [],
    config: { ...BASE_CONFIG, photosRequired: true, requireCustomerSignature: true },
    isActive: true, isBuiltIn: true, createdAt: NOW, updatedAt: NOW, createdBy: 'system',
  },

  /* ── 15. Fiber / Structured Cabling ──────────────────────── */
  {
    id: 'tmpl_fiber_work',
    assetCategories: ['Fiber'],
    name: 'Fiber / Structured Cabling',
    description: 'Fiber optic or structured cabling project.',
    serviceTypes: ['Installation'],
    deviceCategory: 'Fiber',
    checklist: cl([
      'Route survey completed',
      'Conduit / cable tray installed',
      'Cable pulled and labelled',
      'Splicing / termination completed',
      'OTDR test passed',
      'Patch panel terminated',
      'End-to-end connectivity tested',
      'As-built documentation prepared',
    ]),
    defaultMaterials: [
      { itemName: 'Fiber Cable (SM)', plannedQty: 100, unit: 'mtrs' },
      { itemName: 'SC-SC Patch Cord', plannedQty: 4, unit: 'pcs' },
      { itemName: 'Splice Protector', plannedQty: 12, unit: 'pcs' },
    ],
    config: {
      ...BASE_CONFIG,
      materialsEnabled:         true,
      photosRequired:           true,
      dailyProgressEnabled:     true,
      defaultExpectedDays:      3,
      requireCustomerSignature: true,
    },
    isActive: true, isBuiltIn: true, createdAt: NOW, updatedAt: NOW, createdBy: 'system',
  },

  /* ── 16. Attendance Machine / Access Control ─────────────── */
  {
    id: 'tmpl_attendance_install',
    assetCategories: [],
    name: 'Attendance Machine / Access Control',
    description: 'Biometric attendance or door access system installation.',
    serviceTypes: ['Installation'],
    checklist: cl([
      'Device mounted at correct height',
      'Power supply connected',
      'Network / PoE configured',
      'Admin enrolled',
      'Sample users enrolled and tested',
      'Software / app configured',
      'Data sync tested',
      'User manual handed over',
    ]),
    defaultMaterials: [
      { itemName: 'Cat6 Cable', plannedQty: 10, unit: 'mtrs' },
      { itemName: 'Wall Plug / Screw', plannedQty: 4, unit: 'pcs' },
    ],
    config: { ...BASE_CONFIG, materialsEnabled: true, photosRequired: true, requireCustomerSignature: true },
    isActive: true, isBuiltIn: true, createdAt: NOW, updatedAt: NOW, createdBy: 'system',
  },

  /* ── 17. Preventive Maintenance (AMC) ─────────────────────── */
  {
    id: 'tmpl_amc_pmc',
    assetCategories: [],
    name: 'Preventive Maintenance (AMC)',
    description: 'Scheduled AMC/PMC health check for all customer assets.',
    serviceTypes: ['Preventive Maintenance (AMC)', 'Inspection'],
    checklist: cl([
      'Visual inspection of all hardware',
      'Dust cleaning — fans / vents',
      'RAM / HDD health checked',
      'Antivirus updated and scanned',
      'Windows updates applied',
      'Data backup status verified',
      'Network connectivity stable',
      'UPS battery health checked',
      'Recommendations noted',
    ]),
    defaultMaterials: [],
    config: {
      ...BASE_CONFIG,
      showSystemHealth:         true,
      arrivalDepartureTracking: true,
      requireCustomerSignature: true,
    },
    isActive: true, isBuiltIn: true, createdAt: NOW, updatedAt: NOW, createdBy: 'system',
  },

  /* ── 18. Remote Support ───────────────────────────────────── */
  {
    id: 'tmpl_remote_support',
    assetCategories: [],
    name: 'Remote Support',
    description: 'Remote desktop / VPN session for troubleshooting and configuration.',
    serviceTypes: ['Remote Support'],
    checklist: cl([
      'Remote session established',
      'Issue diagnosed',
      'Fix applied',
      'User acceptance confirmed',
      'Session notes documented',
    ]),
    defaultMaterials: [],
    config: {
      ...BASE_CONFIG,
      isRemoteSession:          true,
      arrivalDepartureTracking: false,
      gpsTracking:              false,
      photosOptional:           false,
    },
    isActive: true, isBuiltIn: true, createdAt: NOW, updatedAt: NOW, createdBy: 'system',
  },
];

/* ── In-memory stores ────────────────────────────────────────── */
const templatesStore: TaskTemplate[] = [...BUILT_IN];
const taskDataStore: TaskTemplateData[] = [];

/* ═══════════════════════════════════════════════════════════════
   Template CRUD
═══════════════════════════════════════════════════════════════ */
export const templateService = {

  /** List all templates (optionally only active ones) */
  list(activeOnly = false): TaskTemplate[] {
    return activeOnly
      ? templatesStore.filter((t) => t.isActive)
      : [...templatesStore];
  },

  /** Get a single template by id */
  getById(id: string): TaskTemplate | null {
    return templatesStore.find((t) => t.id === id) ?? null;
  },

  /** @deprecated Use findByServiceTypeAndCategory instead */
  findByServiceType(serviceType: string): TaskTemplate | null {
    return this.findByServiceTypeAndCategory(serviceType, '');
  },

  /**
   * Find the best template using BOTH serviceType and assetCategory.
   * Priority:
   *  1. Active template matching serviceType AND assetCategory (non-empty assetCategories)
   *  2. Active template matching serviceType with no category restriction (assetCategories = [])
   *  3. null
   */
  findByServiceTypeAndCategory(serviceType: string, assetCategory: string): TaskTemplate | null {
    const cat = (assetCategory ?? '').trim();
    const active = templatesStore.filter((t) => t.isActive && t.serviceTypes.includes(serviceType));
    if (!active.length) return null;

    // 1. Specific match: template has categories defined AND assetCategory matches
    if (cat) {
      const specific = active.find(
        (t) => t.assetCategories.length > 0 &&
               t.assetCategories.some((c) => c.toLowerCase() === cat.toLowerCase()),
      );
      if (specific) return specific;
    }

    // 2. Generic fallback: template with no category restriction
    const generic = active.find((t) => t.assetCategories.length === 0);
    if (generic) return generic;

    // 3. Last resort: first active match regardless of category
    return active[0] ?? null;
  },

  /** Create a new admin-managed template */
  create(
    data: Omit<TaskTemplate, 'id' | 'isBuiltIn' | 'createdAt' | 'updatedAt'>,
    createdBy: string,
  ): TaskTemplate {
    const now = new Date().toISOString();
    const tmpl: TaskTemplate = {
      ...data,
      id:        uid(),
      isBuiltIn: false,
      createdAt: now,
      updatedAt: now,
      createdBy,
    };
    templatesStore.push(tmpl);
    return tmpl;
  },

  /** Update a template (built-in templates can only have isActive toggled) */
  update(id: string, patch: Partial<Omit<TaskTemplate, 'id' | 'isBuiltIn' | 'createdAt' | 'createdBy'>>): TaskTemplate {
    const idx = templatesStore.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Template not found');
    const existing = templatesStore[idx];
    // Built-in: only allow toggling isActive and editing non-structural fields
    const updated: TaskTemplate = {
      ...existing,
      ...(existing.isBuiltIn
        ? { isActive: patch.isActive ?? existing.isActive }
        : patch),
      updatedAt: new Date().toISOString(),
    };
    templatesStore[idx] = updated;
    return updated;
  },

  /** Duplicate a template (always creates a non-built-in copy) */
  duplicate(id: string, createdBy: string): TaskTemplate {
    const src = this.getById(id);
    if (!src) throw new Error('Template not found');
    const now = new Date().toISOString();
    const copy: TaskTemplate = {
      ...src,
      id:          uid(),
      name:        `${src.name} (Copy)`,
      isBuiltIn:   false,
      isActive:    false,
      createdAt:   now,
      updatedAt:   now,
      createdBy,
    };
    templatesStore.push(copy);
    return copy;
  },

  /** Delete a custom template (built-in templates cannot be deleted) */
  delete(id: string): void {
    const idx = templatesStore.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Template not found');
    if (templatesStore[idx].isBuiltIn) throw new Error('Built-in templates cannot be deleted. Disable instead.');
    templatesStore.splice(idx, 1);
  },

  /** Toggle active state */
  setActive(id: string, active: boolean): TaskTemplate {
    return this.update(id, { isActive: active });
  },
};

/* ═══════════════════════════════════════════════════════════════
   Task Template Data (per-task runtime state)
═══════════════════════════════════════════════════════════════ */
export const taskTemplateDataService = {

  /** Get or initialise runtime template data for a task */
  getOrInit(taskId: string, templateId: string): TaskTemplateData {
    const existing = taskDataStore.find((d) => d.taskId === taskId);
    if (existing) return existing;

    const template = templateService.getById(templateId);
    const data: TaskTemplateData = {
      taskId,
      templateId,
      checklist: template
        ? template.checklist.map((c) => ({ ...c, checked: false }))
        : [],
      materials: template
        ? template.defaultMaterials.map((m, i) => ({
            ...m,
            id:          `mat_${taskId}_${i}`,
            usedQty:     0,
            extraQty:    0,
            returnedQty: 0,
            history:     [],
          }))
        : [],
      dailyProgress:     [],
      expectedDays:      template?.config.defaultExpectedDays ?? 1,
      updatedAt:         new Date().toISOString(),
    };
    taskDataStore.push(data);
    return data;
  },

  /** Get existing data (null if not yet initialised) */
  get(taskId: string): TaskTemplateData | null {
    return taskDataStore.find((d) => d.taskId === taskId) ?? null;
  },

  /** Save full data object */
  save(data: TaskTemplateData): TaskTemplateData {
    const idx = taskDataStore.findIndex((d) => d.taskId === data.taskId);
    const updated = { ...data, updatedAt: new Date().toISOString() };
    if (idx === -1) { taskDataStore.push(updated); } else { taskDataStore[idx] = updated; }
    return updated;
  },

  /** Toggle a checklist item */
  toggleChecklist(taskId: string, itemId: string, checked: boolean): TaskTemplateData {
    const data = this.get(taskId);
    if (!data) throw new Error('Task template data not found');
    const updated: TaskTemplateData = {
      ...data,
      checklist: data.checklist.map((c) =>
        c.id === itemId ? { ...c, checked } : c
      ),
    };
    return this.save(updated);
  },

  /** Update material used quantity + append history */
  updateMaterial(
    taskId: string,
    materialId: string,
    patch: { usedQty?: number; extraQty?: number; extraReason?: string; returnedQty?: number },
    by: string,
  ): TaskTemplateData {
    const data = this.get(taskId);
    if (!data) throw new Error('Task template data not found');
    const updated: TaskTemplateData = {
      ...data,
      materials: data.materials.map((m) => {
        if (m.id !== materialId) return m;
        const entry = {
          id:     taskDataId(),
          action: 'used' as const,
          qty:    patch.usedQty ?? m.usedQty ?? 0,
          by,
          at:     new Date().toISOString(),
        };
        return {
          ...m,
          ...patch,
          history: [...(m.history ?? []), entry],
        };
      }),
    };
    return this.save(updated);
  },

  /** Add a planned material item */
  addMaterial(taskId: string, item: Omit<PlannedMaterial, 'id' | 'history'>, by: string): TaskTemplateData {
    const data = this.get(taskId);
    if (!data) throw new Error('Task template data not found');
    const newMat: PlannedMaterial = {
      ...item,
      id:      taskDataId(),
      history: [{
        id:     taskDataId(),
        action: 'planned',
        qty:    item.plannedQty,
        by,
        at:     new Date().toISOString(),
      }],
    };
    return this.save({ ...data, materials: [...data.materials, newMat] });
  },

  /** Add daily progress entry */
  addDailyProgress(taskId: string, entry: Omit<DailyProgressEntry, 'id' | 'submittedAt'>): TaskTemplateData {
    const data = this.get(taskId);
    if (!data) throw new Error('Task template data not found');
    const newEntry: DailyProgressEntry = {
      ...entry,
      id:          taskDataId(),
      submittedAt: new Date().toISOString(),
    };
    return this.save({ ...data, dailyProgress: [...data.dailyProgress, newEntry] });
  },
};

