/**
 * Task Types
 * Sectore 360 — Phase 1, Part 3
 */

/* ── Enums ───────────────────────────────────────────────────── */
export type TaskType =
  | 'Breakdown Support'
  | 'Preventive Maintenance (AMC)'
  | 'Installation'
  | 'Delivery'
  | 'Upgrade'
  | 'Replacement'
  | 'Configuration'
  | 'Inspection'
  | 'Remote Support'
  | 'Warranty Service'
  | 'Chargeable Service'
  | 'Demo / POC'
  | 'Other';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical' | 'Emergency';

export type TaskStatus =
  | 'Pending' | 'Assigned' | 'Accepted' | 'On The Way' | 'Reached Site'
  | 'Working' | 'Waiting Customer' | 'Waiting Parts' | 'Waiting Vendor'
  | 'Remote Support' | 'Completed' | 'Closed' | 'Cancelled';

export type PhotoCategory = 'Before' | 'During' | 'After';

export type NoteType = 'Internal' | 'Customer' | 'Engineer';

export type TaskTimelineEventType =
  | 'task_created' | 'engineer_assigned' | 'engineer_reassigned'
  | 'status_changed' | 'priority_changed' | 'engineer_accepted'
  | 'engineer_started' | 'engineer_completed' | 'task_closed'
  | 'task_cancelled' | 'task_restored'
  | 'photo_uploaded' | 'photo_deleted'
  | 'document_uploaded' | 'document_deleted'
  | 'note_added' | 'note_edited' | 'note_deleted'
  | 'task_updated';

/* ── Task ────────────────────────────────────────────────────── */
export interface Task {
  id: string;
  taskNumber: string;     // TASK-000001
  customerId: string;
  assetId: string;
  taskType: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  issueDescription: string;
  engineerId?: string;
  engineerName?: string;
  expectedVisitDate?: string;
  expectedVisitTime?: string;
  remarks?: string;
  internalNotes?: string;
  customerNotes?: string;
  // AMC linkage (Part 4)
  amcId?: string;
  amcNumber?: string;
  // Part 5 engineer fields
  completedAt?: string;
  rejectionReason?: string;
  escalationReason?: string;
  deletedAt?: string;
  // Service visit timings (Reached Site → Complete Task)
  serviceStartTime?: string;   // ISO — captured when engineer clicks "Reached Site"
  serviceEndTime?: string;     // ISO — captured when engineer clicks "Complete Task"
  siteTimeMinutes?: number;    // calculated: (serviceEndTime - serviceStartTime) in minutes
  // Customer-editable fields
  customerRemarks?: string;
  customerFeedback?: string;
  // Contact info captured at ticket creation
  contactPerson?: string;
  contactMobile?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskFormData = Omit<Task, 'id' | 'taskNumber' | 'createdAt' | 'updatedAt'>;

/* ── Task Timeline ───────────────────────────────────────────── */
export interface TaskTimelineEvent {
  id: string;
  taskId: string;
  eventType: TaskTimelineEventType;
  title: string;
  description?: string;
  oldValue?: string;
  newValue?: string;
  performedBy: string;
  performedById?: string;
  createdAt: string;
}

/* ── Task Note ───────────────────────────────────────────────── */
export interface TaskNote {
  id: string;
  taskId: string;
  noteType: NoteType;
  content: string;
  addedBy: string;
  addedById: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Task Photo ──────────────────────────────────────────────── */
export interface TaskPhoto {
  id: string;
  taskId: string;
  category: PhotoCategory;
  fileName: string;
  fileSize: number;
  url: string;
  uploadedBy: string;
  uploadedById: string;
  uploadedAt: string;
}

/* ── Task Document ───────────────────────────────────────────── */
export interface TaskDocument {
  id: string;
  taskId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedBy: string;
  uploadedById: string;
  uploadedAt: string;
}

/* ── Task Activity Log ───────────────────────────────────────── */
export interface TaskActivity {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
  ipAddress: string;
  createdAt: string;
}

/* ── Constants ───────────────────────────────────────────────── */
export const TASK_TYPES: TaskType[] = [
  'Breakdown Support',
  'Preventive Maintenance (AMC)',
  'Installation',
  'Delivery',
  'Upgrade',
  'Replacement',
  'Configuration',
  'Inspection',
  'Remote Support',
  'Warranty Service',
  'Chargeable Service',
  'Demo / POC',
  'Other',
];

export const TASK_PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical', 'Emergency'];

export const TASK_STATUSES: TaskStatus[] = [
  'Pending', 'Assigned', 'Accepted', 'On The Way', 'Reached Site',
  'Working', 'Waiting Customer', 'Waiting Parts', 'Waiting Vendor',
  'Remote Support', 'Completed', 'Closed', 'Cancelled',
];

/** Statuses an engineer is allowed to set on their assigned task */
export const ENGINEER_ALLOWED_STATUSES: TaskStatus[] = [
  'Accepted', 'On The Way', 'Reached Site', 'Working',
  'Waiting Customer', 'Waiting Parts', 'Waiting Vendor',
  'Remote Support', 'Completed',
];

/* ── Notification interface (future providers) ───────────────── */
export interface NotificationPayload {
  recipient: string;
  subject: string;
  message: string;
  template?: string;
  data?: Record<string, unknown>;
}

export interface NotificationService {
  sendEmail(payload: NotificationPayload): Promise<boolean>;
  sendWhatsApp(payload: NotificationPayload): Promise<boolean>;
  sendPush(payload: NotificationPayload): Promise<boolean>;
  sendSMS(payload: NotificationPayload): Promise<boolean>;
}
