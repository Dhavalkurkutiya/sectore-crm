/**
 * AMC Types
 * Sectore 360 — Phase 1, Part 4
 */

/* ── Enums ───────────────────────────────────────────────────── */
export type AMCStatus = 'Draft' | 'Active' | 'Expired' | 'Cancelled' | 'Renewed';
export type AMCContractType =
  | 'Comprehensive' | 'Non-Comprehensive' | 'Preventive Maintenance'
  | 'Labour Only' | 'Custom';
export type AMCVisitFrequency = 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly' | 'Custom';

export type AMCVisitStatus = 'Pending' | 'Completed' | 'Missed' | 'Rescheduled';

export type AMCDocumentType =
  | 'Signed Contract' | 'Quotation' | 'Renewal Documents' | 'Supporting Files';

export type AMCTimelineEventType =
  | 'amc_created' | 'amc_updated' | 'status_changed'
  | 'asset_added' | 'asset_removed'
  | 'document_uploaded' | 'document_deleted'
  | 'contract_renewed' | 'visit_completed' | 'visit_missed'
  | 'visit_generated' | 'engineer_assigned';

/* ── AMC Core ────────────────────────────────────────────────── */
export interface AMC {
  id: string;
  amcNumber: string;           // AMC-000001
  customerId: string;
  customerName: string;        // denormalised for performance
  contractType: AMCContractType;
  startDate: string;
  endDate: string;
  status: AMCStatus;

  // Visit config
  visitFrequency: AMCVisitFrequency;
  numberOfIncludedVisits: number;
  slaResponseTime: string;     // free text, e.g. "4 hours"
  slaResolutionTime: string;   // free text, e.g. "24 hours"
  workingHours?: string;
  holidayRules?: string;

  // Coverage flags
  labourIncluded: boolean;
  travelIncluded: boolean;
  emergencySupportIncluded: boolean;
  remoteSupportIncluded: boolean;

  // Coverage text
  includedServices?: string;
  excludedServices?: string;
  coveredParts?: string;
  excludedParts?: string;

  // Covered asset IDs
  coveredAssetIds: string[];

  remarks?: string;

  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type AMCFormData = Omit<AMC, 'id' | 'amcNumber' | 'customerName' | 'createdAt' | 'updatedAt'>;

/* ── Visit Schedule ──────────────────────────────────────────── */
export interface AMCVisitSchedule {
  id: string;
  amcId: string;
  visitNumber: number;
  scheduledDate: string;
  status: AMCVisitStatus;
  generatedTaskId?: string;
  generatedTaskNumber?: string;
  completedDate?: string;
  engineerId?: string;
  engineerName?: string;
}

/* ── Timeline ────────────────────────────────────────────────── */
export interface AMCTimelineEvent {
  id: string;
  amcId: string;
  eventType: AMCTimelineEventType;
  title: string;
  description?: string;
  oldValue?: string;
  newValue?: string;
  performedBy: string;
  createdAt: string;
}

/* ── Document ────────────────────────────────────────────────── */
export interface AMCDocument {
  id: string;
  amcId: string;
  fileName: string;
  documentType: AMCDocumentType;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

/* ── Renewal ─────────────────────────────────────────────────── */
export interface AMCRenewal {
  id: string;
  amcId: string;
  renewalDate: string;
  previousEndDate: string;
  newEndDate: string;
  renewedBy: string;
  renewalDocumentId?: string;
  createdAt: string;
}

/* ── Stats ───────────────────────────────────────────────────── */
export interface AMCStats {
  totalActive: number;
  expired: number;
  expiringIn30: number;
  expiringIn60: number;
  upcomingVisits: number;   // scheduled, next 7 days
  missedVisits: number;
  completedVisitsToday: number;
  draft: number;
}

/* ── Renewal reminder thresholds ────────────────────────────── */
export const RENEWAL_THRESHOLDS = [90, 60, 30, 15, 7, 1, 0];

export const CONTRACT_TYPE_OPTIONS: AMCContractType[] = [
  'Comprehensive', 'Non-Comprehensive', 'Preventive Maintenance', 'Labour Only', 'Custom',
];

export const VISIT_FREQUENCY_OPTIONS: AMCVisitFrequency[] = [
  'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'Custom',
];

export const AMC_STATUS_OPTIONS: AMCStatus[] = [
  'Draft', 'Active', 'Expired', 'Cancelled', 'Renewed',
];

/** Returns interval days for a given frequency */
export function frequencyToDays(freq: AMCVisitFrequency): number {
  switch (freq) {
    case 'Monthly':    return 30;
    case 'Quarterly':  return 90;
    case 'Half-Yearly':return 180;
    case 'Yearly':     return 365;
    default:           return 0;
  }
}

/** Calculates remaining days from today */
export function remainingDays(endDate: string): number {
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / 86400000);
}

/** Returns renewal urgency label */
export function renewalStatus(endDate: string): 'Not Due' | 'Due Soon' | 'Overdue' {
  const days = remainingDays(endDate);
  if (days < 0) return 'Overdue';
  if (days <= 90) return 'Due Soon';
  return 'Not Due';
}
