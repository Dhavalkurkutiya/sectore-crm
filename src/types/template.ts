/**
 * Task Template Types
 * Sectore 360 — Intelligent Task Manager Enhancement
 *
 * A TaskTemplate defines the behaviour of a task when a specific
 * Service Type (or explicit template) is selected.  Every rule is
 * data-driven so no code changes are needed to add new templates.
 */

/* ── Checklist ───────────────────────────────────────────────── */
export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;         // must be checked before task can complete
  checked?: boolean;         // runtime state (stored per-task)
  notes?: string;            // per-item notes
}

/* ── Material ────────────────────────────────────────────────── */
export type MaterialUnit = 'pcs' | 'mtrs' | 'rolls' | 'sets' | 'boxes' | 'ltrs' | 'kg' | 'units';

export interface PlannedMaterial {
  id: string;
  itemName: string;
  plannedQty: number;
  unit: MaterialUnit;
  remarks?: string;
  // Runtime fields (filled by engineer)
  usedQty?: number;
  extraQty?: number;
  extraReason?: string;
  returnedQty?: number;
  history?: MaterialHistoryEntry[];
}

export interface MaterialHistoryEntry {
  id: string;
  action: 'planned' | 'used' | 'extra' | 'returned' | 'edited';
  qty: number;
  by: string;
  at: string;
  note?: string;
}

/* ── Daily Progress ──────────────────────────────────────────── */
export interface DailyProgressEntry {
  id: string;
  date: string;             // YYYY-MM-DD
  workDone: string;
  materialsUsed?: string;
  photosUrls?: string[];
  customerSignature?: string;  // base64 or URL
  engineerNotes?: string;
  submittedBy: string;
  submittedAt: string;
}

/* ── Template Config ─────────────────────────────────────────── */
export interface TaskTemplateConfig {
  /** Require serial number entry */
  requireSerialNumber: boolean;
  /** Show / enforce photo upload */
  photosRequired: boolean;
  photosOptional: boolean;          // shows the upload UI but doesn't block
  /** Require customer signature at completion */
  requireCustomerSignature: boolean;
  /** Require engineer signature at completion */
  requireEngineerSignature: boolean;
  /** Show the "Old item returned" field */
  requireOldItemReturn: boolean;
  /** Show the Materials section */
  materialsEnabled: boolean;
  /** Enable multi-day daily-progress section (also triggered when expectedDays > 1) */
  dailyProgressEnabled: boolean;
  /** Enable arrival / departure time tracking */
  arrivalDepartureTracking: boolean;
  /** Show GPS location capture */
  gpsTracking: boolean;
  /** Show Remote Session Notes instead of onsite fields */
  isRemoteSession: boolean;
  /** Hide issue description (e.g. Delivery — no issue to describe) */
  hideIssueDescription: boolean;
  /** Show "Delivered Quantity" field */
  showDeliveredQty: boolean;
  /** Show system health section (AMC/PMC) */
  showSystemHealth: boolean;
  /** Default expected duration in days */
  defaultExpectedDays: number;
  /** Show warranty capture field */
  showWarrantyCapture: boolean;
}

/* ── Full Template ───────────────────────────────────────────── */
export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  /** Maps to one or more ServiceType values in TASK_TYPES */
  serviceTypes: string[];
  /** The device category this template targets (optional, for filtering) */
  deviceCategory?: string;
  /** One or more asset categories (from ASSET_CATEGORIES) this template applies to.
   *  Empty array = applies to any category (e.g. Remote Support, generic templates). */
  assetCategories: string[];
  checklist: ChecklistItem[];
  defaultMaterials: Omit<PlannedMaterial, 'id' | 'usedQty' | 'extraQty' | 'extraReason' | 'returnedQty' | 'history'>[];
  config: TaskTemplateConfig;
  /** Admin-managed: can be disabled without deleting */
  isActive: boolean;
  isBuiltIn: boolean;        // built-in templates cannot be deleted, only disabled/duplicated
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/* ── Per-Task Template Data ──────────────────────────────────── */
/** Stored alongside a Task — the live runtime state of the template */
export interface TaskTemplateData {
  taskId: string;
  templateId: string;
  checklist: ChecklistItem[];          // copy of template checklist (with live checked state)
  materials: PlannedMaterial[];        // copy of template materials (with live used qty)
  dailyProgress: DailyProgressEntry[];
  expectedDays: number;
  customerSignature?: string;
  engineerSignature?: string;
  deliveredQty?: number;
  serialNumberCaptured?: string;
  systemHealth?: string;              // free text for AMC health summary
  remoteSessionNotes?: string;
  oldItemReturned?: boolean;
  oldItemDescription?: string;
  workDoneSummary?: string;
  recommendations?: string;
  updatedAt: string;
}
