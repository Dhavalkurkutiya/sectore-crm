/**
 * Master Data Types
 * Sectore 360 — Enterprise Asset Master
 */

export type MasterType =
  | 'asset_category'
  | 'brand'
  | 'model'
  | 'manufacturer'
  | 'os_type'
  | 'processor_brand'
  | 'processor_model'
  | 'ram_type'
  | 'storage_type'
  | 'hdd_type'
  | 'ssd_type'
  | 'gpu_model'
  | 'camera_type'
  | 'switch_type'
  | 'firewall_type'
  | 'router_type'
  | 'printer_type'
  | 'ups_type'
  | 'server_type'
  | 'nas_type'
  | 'attendance_device_type'
  | 'intercom_type'
  | 'screen_size'
  | 'warranty_provider'
  | 'vendor'
  | 'department'
  | 'location'
  | 'building'
  | 'floor'
  | 'rack'
  | 'room'
  | 'asset_status'
  | 'ticket_priority'
  | 'ticket_category'
  | 'problem_type'
  | 'resolution_type'
  | 'engineer_skill'
  | 'license_type';

export interface MasterItem {
  id: string;
  masterType: MasterType | string;
  value: string;
  code?: string;
  parentId?: string;
  sortOrder: number;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface MasterItemFormData {
  masterType: string;
  value: string;
  code?: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AssetCustomField {
  id: string;
  category: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'date' | 'select' | 'boolean';
  fieldOptions?: string[];
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssetCustomFieldFormData {
  category: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'date' | 'select' | 'boolean';
  fieldOptions?: string[];
  isRequired?: boolean;
  sortOrder?: number;
}

export interface RecycleBinItem {
  id: string;
  entityType: 'asset' | 'customer' | 'task';
  entityId: string;
  entityCode?: string;
  entityName?: string;
  snapshot: Record<string, unknown>;
  deletedBy: string;
  deletedAt: string;
  deleteReason?: string;
  restoredAt?: string;
  restoredBy?: string;
}

/** Human-readable labels for all master types */
export const MASTER_TYPE_LABELS: Record<string, string> = {
  asset_category:         'Asset Categories',
  brand:                  'Brands',
  model:                  'Models',
  manufacturer:           'Manufacturers',
  os_type:                'Operating Systems',
  processor_brand:        'Processor Brands',
  processor_model:        'Processor Models',
  ram_type:               'RAM Types',
  storage_type:           'Storage Types',
  hdd_type:               'Hard Disk Types',
  ssd_type:               'SSD Types',
  gpu_model:              'GPU Models',
  camera_type:            'Camera Types',
  switch_type:            'Switch Types',
  firewall_type:          'Firewall Types',
  router_type:            'Router Types',
  printer_type:           'Printer Types',
  ups_type:               'UPS Types',
  server_type:            'Server Types',
  nas_type:               'NAS Types',
  attendance_device_type: 'Attendance Device Types',
  intercom_type:          'Intercom Types',
  screen_size:            'Screen Sizes',
  monitor_size:           'Monitor Sizes',
  warranty_provider:      'Warranty Providers',
  vendor:                 'Vendors',
  department:             'Departments',
  location:               'Locations',
  building:               'Buildings',
  floor:                  'Floors',
  rack:                   'Racks',
  room:                   'Rooms',
  asset_status:           'Asset Status',
  ticket_priority:        'Ticket Priorities',
  ticket_category:        'Ticket Categories',
  problem_type:           'Problem Types',
  resolution_type:        'Resolution Types',
  engineer_skill:         'Engineer Skills',
  license_type:           'License Types',
};

/** Grouped structure for sidebar navigation in Master Data page */
export const MASTER_TYPE_GROUPS: { group: string; types: string[] }[] = [
  {
    group: 'Asset Classification',
    types: ['asset_category', 'brand', 'model', 'manufacturer'],
  },
  {
    group: 'Hardware Specs',
    types: ['os_type', 'processor_brand', 'processor_model', 'ram_type', 'storage_type', 'hdd_type', 'ssd_type', 'gpu_model', 'screen_size', 'monitor_size'],
  },
  {
    group: 'Device Types',
    types: ['camera_type', 'switch_type', 'firewall_type', 'router_type', 'printer_type', 'ups_type', 'server_type', 'nas_type', 'attendance_device_type', 'intercom_type'],
  },
  {
    group: 'Organization',
    types: ['vendor', 'warranty_provider', 'department', 'location', 'building', 'floor', 'rack', 'room'],
  },
  {
    group: 'Tickets & Tasks',
    types: ['ticket_priority', 'ticket_category', 'problem_type', 'resolution_type'],
  },
  {
    group: 'System',
    types: ['asset_status', 'engineer_skill', 'license_type'],
  },
];

/** Category-specific dynamic fields (stored in specifications jsonb) */
export interface CategoryFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  masterType?: string;   // if set, load options from master_data
  options?: string[];    // static options fallback
  placeholder?: string;
  group?: string;
}

export const CATEGORY_FIELDS: Record<string, CategoryFieldConfig[]> = {
  Laptops: [
    { key: 'processor_brand', label: 'Processor Brand', type: 'select', masterType: 'processor_brand', group: 'Processor' },
    { key: 'processor_model', label: 'Processor Model', type: 'select', masterType: 'processor_model', group: 'Processor' },
    { key: 'generation',      label: 'Generation',      type: 'text',   placeholder: 'e.g. 13th Gen', group: 'Processor' },
    { key: 'processor_speed', label: 'Processor Speed', type: 'text',   placeholder: 'e.g. 2.4 GHz', group: 'Processor' },
    { key: 'ram',             label: 'RAM',              type: 'text',   placeholder: 'e.g. 16 GB', group: 'Memory & Storage' },
    { key: 'ram_type',        label: 'RAM Type',         type: 'select', masterType: 'ram_type', group: 'Memory & Storage' },
    { key: 'ram_slots',       label: 'RAM Slots',        type: 'number', placeholder: '2', group: 'Memory & Storage' },
    { key: 'ssd',             label: 'SSD',              type: 'text',   placeholder: 'e.g. 512 GB NVMe', group: 'Memory & Storage' },
    { key: 'hdd',             label: 'HDD',              type: 'text',   placeholder: 'e.g. 1 TB SATA', group: 'Memory & Storage' },
    { key: 'screen_size',     label: 'Screen Size',      type: 'select', masterType: 'screen_size', group: 'Display' },
    { key: 'battery',         label: 'Battery',          type: 'text',   placeholder: 'e.g. 45 Whr', group: 'Power' },
    { key: 'adapter',         label: 'Adapter',          type: 'text',   placeholder: 'e.g. 65W USB-C', group: 'Power' },
    { key: 'os',              label: 'Operating System', type: 'select', masterType: 'os_type', group: 'Software' },
    { key: 'office_version',  label: 'Office Version',   type: 'text',   placeholder: 'e.g. Office 2021', group: 'Software' },
    { key: 'antivirus',       label: 'Antivirus',        type: 'text',   placeholder: 'e.g. Kaspersky', group: 'Software' },
  ],
  Computers: [
    { key: 'processor_brand', label: 'Processor Brand', type: 'select', masterType: 'processor_brand', group: 'Processor' },
    { key: 'processor_model', label: 'Processor Model', type: 'select', masterType: 'processor_model', group: 'Processor' },
    { key: 'generation',      label: 'Generation',      type: 'text',   placeholder: 'e.g. 12th Gen', group: 'Processor' },
    { key: 'ram',             label: 'RAM',              type: 'text',   placeholder: 'e.g. 8 GB', group: 'Memory & Storage' },
    { key: 'ram_type',        label: 'RAM Type',         type: 'select', masterType: 'ram_type', group: 'Memory & Storage' },
    { key: 'ram_slots',       label: 'RAM Slots',        type: 'number', placeholder: '4', group: 'Memory & Storage' },
    { key: 'ssd',             label: 'SSD',              type: 'text',   placeholder: 'e.g. 256 GB', group: 'Memory & Storage' },
    { key: 'hdd',             label: 'HDD',              type: 'text',   placeholder: 'e.g. 1 TB', group: 'Memory & Storage' },
    { key: 'graphics',        label: 'Graphics Card',    type: 'select', masterType: 'gpu_model', group: 'Graphics' },
    { key: 'monitor',         label: 'Monitor',          type: 'text',   placeholder: 'Monitor model', group: 'Display' },
    { key: 'keyboard',        label: 'Keyboard',         type: 'text',   placeholder: 'e.g. Wired USB', group: 'Peripherals' },
    { key: 'mouse',           label: 'Mouse',            type: 'text',   placeholder: 'e.g. Wireless', group: 'Peripherals' },
    { key: 'os',              label: 'Operating System', type: 'select', masterType: 'os_type', group: 'Software' },
    { key: 'office_version',  label: 'Office Version',   type: 'text',   placeholder: 'e.g. Office 2021', group: 'Software' },
    { key: 'antivirus',       label: 'Antivirus',        type: 'text',   placeholder: 'e.g. Quick Heal', group: 'Software' },
  ],
  CCTV: [
    { key: 'camera_type',         label: 'Camera Type',         type: 'select', masterType: 'camera_type', group: 'Camera' },
    { key: 'ip_address',          label: 'IP Address',          type: 'text',   placeholder: '192.168.1.x', group: 'Network' },
    { key: 'camera_username',     label: 'Username',            type: 'text',   group: 'Network' },
    { key: 'camera_password',     label: 'Password',            type: 'text',   group: 'Network' },
    { key: 'install_location',    label: 'Installation Location',type: 'text',  placeholder: 'e.g. Main Gate', group: 'Camera' },
    { key: 'nvr_channel',         label: 'NVR Channel No.',     type: 'number', group: 'Camera' },
    { key: 'lens',                label: 'Lens',                 type: 'text',   placeholder: 'e.g. 2.8mm', group: 'Camera' },
    { key: 'recording_status',    label: 'Recording Status',    type: 'select', options: ['Recording', 'Not Recording', 'Offline', 'Faulty'], group: 'Camera' },
  ],
  'NVR/DVR': [
    { key: 'channels',    label: 'Channels',         type: 'number', placeholder: '16', group: 'Storage' },
    { key: 'hdd_storage', label: 'HDD',              type: 'text',   placeholder: 'e.g. 4 TB', group: 'Storage' },
    { key: 'total_storage', label: 'Total Storage',  type: 'text',   placeholder: 'e.g. 8 TB', group: 'Storage' },
    { key: 'ip_address',  label: 'IP Address',       type: 'text',   placeholder: '192.168.1.x', group: 'Network' },
    { key: 'username',    label: 'Username',         type: 'text',   group: 'Network' },
    { key: 'password',    label: 'Password',         type: 'text',   group: 'Network' },
    { key: 'firmware',    label: 'Firmware Version', type: 'text',   group: 'Network' },
  ],
  Servers: [
    { key: 'processor_model', label: 'Processor',      type: 'select', masterType: 'processor_model', group: 'Hardware' },
    { key: 'ram',             label: 'RAM',             type: 'text',   placeholder: 'e.g. 64 GB ECC', group: 'Hardware' },
    { key: 'storage',         label: 'Storage',         type: 'text',   placeholder: 'e.g. 4x 1.2TB SAS', group: 'Hardware' },
    { key: 'raid',            label: 'RAID Config',     type: 'text',   placeholder: 'e.g. RAID 10', group: 'Hardware' },
    { key: 'os',              label: 'OS',              type: 'select', masterType: 'os_type', group: 'Software' },
    { key: 'ip_address',      label: 'IP Address',      type: 'text',   placeholder: '192.168.1.x', group: 'Network' },
    { key: 'ilo_ip',          label: 'iLO / iDRAC IP',  type: 'text',   placeholder: 'Management IP', group: 'Network' },
    { key: 'rack_number',     label: 'Rack Number',     type: 'text',   group: 'Location' },
    { key: 'rack_unit',       label: 'Rack Unit (U)',   type: 'text',   placeholder: 'e.g. U12-U14', group: 'Location' },
  ],
  Firewall: [
    { key: 'wan_ip',          label: 'WAN IP',          type: 'text',   group: 'Network' },
    { key: 'lan_ip',          label: 'LAN IP',          type: 'text',   group: 'Network' },
    { key: 'firmware',        label: 'Firmware Version',type: 'text',   group: 'Config' },
    { key: 'license_expiry',  label: 'License Expiry',  type: 'date',   group: 'License' },
    { key: 'vpn_enabled',     label: 'VPN Enabled',     type: 'boolean',group: 'Config' },
    { key: 'backup_status',   label: 'Backup Status',   type: 'select', options: ['Configured', 'Not Configured', 'Failed'], group: 'Config' },
  ],
  Switch: [
    { key: 'ports',       label: 'Number of Ports', type: 'number', placeholder: '24', group: 'Hardware' },
    { key: 'managed',     label: 'Managed',         type: 'boolean', group: 'Hardware' },
    { key: 'ip_address',  label: 'IP Address',      type: 'text',   placeholder: '192.168.1.x', group: 'Network' },
    { key: 'firmware',    label: 'Firmware Version',type: 'text',   group: 'Network' },
    { key: 'rack_number', label: 'Rack Number',     type: 'text',   group: 'Location' },
    { key: 'poe',         label: 'PoE',             type: 'boolean', group: 'Hardware' },
  ],
  Printer: [
    { key: 'connection_usb',  label: 'USB',         type: 'boolean', group: 'Connectivity' },
    { key: 'connection_net',  label: 'Network',     type: 'boolean', group: 'Connectivity' },
    { key: 'ip_address',      label: 'IP Address',  type: 'text',    group: 'Connectivity' },
    { key: 'toner_model',     label: 'Toner Model', type: 'text',    placeholder: 'e.g. HP CF226A', group: 'Consumables' },
    { key: 'duplex',          label: 'Duplex',      type: 'boolean', group: 'Features' },
    { key: 'color',           label: 'Color',       type: 'boolean', group: 'Features' },
  ],
  UPS: [
    { key: 'capacity',            label: 'Capacity (VA)',       type: 'text',   placeholder: 'e.g. 2000VA', group: 'Specs' },
    { key: 'battery_count',       label: 'Battery Count',       type: 'number', group: 'Battery' },
    { key: 'runtime',             label: 'Runtime (min)',        type: 'number', group: 'Battery' },
    { key: 'battery_install_date',label: 'Battery Install Date', type: 'date',   group: 'Battery' },
    { key: 'battery_type',        label: 'Battery Type',         type: 'text',   placeholder: 'e.g. 12V 9Ah', group: 'Battery' },
  ],
};
