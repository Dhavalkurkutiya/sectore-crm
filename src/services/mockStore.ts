/**
 * Mock Data Store — Production
 * Sectore 360
 * Clean production store — no demo/sample data.
 * All records are created through the Admin UI at runtime.
 */
import type {
  Customer, Asset, UploadedDocument, TimelineEvent,
} from '@/types/customer';
import type {
  Task, TaskTimelineEvent, TaskNote, TaskPhoto, TaskDocument, TaskActivity,
} from '@/types/task';
import type {
  AMC, AMCVisitSchedule, AMCTimelineEvent, AMCDocument, AMCRenewal,
} from '@/types/amc';
import type {
  Attendance, FuelLog, Bike, PartUsed,
  CustomerSignature, EngineerNote, WorkCompletion,
  EngineerTaskPhoto, OfflineQueueItem, NotificationTemplate,
  EngineerProfile,
} from '@/types/engineer';

/* ── Sequence counters (start at 0 — no pre-seeded data) ────── */
let customerSeq = 0;
let assetSeq = 0;
let docSeq = 0;
let timelineSeq = 0;
let taskSeq = 0;
let taskTimelineSeq = 0;
let taskNoteSeq = 0;
let taskPhotoSeq = 0;
let taskDocSeq = 0;
let taskActivitySeq = 0;
let amcSeq = 0;
let amcVisitSeq = 0;
let amcTimelineSeq = 0;
let amcDocSeq = 0;
let amcRenewalSeq = 0;
let attendanceSeq = 0;
let fuelLogSeq = 0;
let bikeSeq = 0;
let partUsedSeq = 0;
let signatureSeq = 0;
let engNoteSeq = 0;
let workCompletionSeq = 0;
let engPhotoSeq = 0;
let offlineQueueSeq = 0;
let notifTemplateSeq = 0;
let engineerProfileSeq = 0;

export function nextCustomerCode(): string {
  return `CUST-${String(++customerSeq).padStart(6, '0')}`;
}
export function nextAssetCode(): string {
  return `ASSET-${String(++assetSeq).padStart(6, '0')}`;
}
export function nextTaskNumber(): string {
  return `TASK-${String(++taskSeq).padStart(6, '0')}`;
}
export function nextAMCNumber(): string {
  return `AMC-${String(++amcSeq).padStart(6, '0')}`;
}
export function nextDocId(): string { return `doc_${++docSeq}`; }
export function nextTimelineId(): string { return `tl_${++timelineSeq}`; }
export function nextTaskTimelineId(): string { return `ttl_${++taskTimelineSeq}`; }
export function nextTaskNoteId(): string { return `tnote_${++taskNoteSeq}`; }
export function nextTaskPhotoId(): string { return `tphoto_${++taskPhotoSeq}`; }
export function nextTaskDocId(): string { return `tdoc_${++taskDocSeq}`; }
export function nextTaskActivityId(): string { return `tact_${++taskActivitySeq}`; }
export function nextAMCVisitId(): string { return `avisit_${++amcVisitSeq}`; }
export function nextAMCTimelineId(): string { return `atl_${++amcTimelineSeq}`; }
export function nextAMCDocId(): string { return `adoc_${++amcDocSeq}`; }
export function nextAMCRenewalId(): string { return `arenewal_${++amcRenewalSeq}`; }
// Part 5 generators
export function nextAttendanceId(): string { return `att_${++attendanceSeq}`; }
export function nextFuelLogId(): string { return `fuel_${++fuelLogSeq}`; }
export function nextBikeId(): string { return `bike_${++bikeSeq}`; }
export function nextPartUsedId(): string { return `part_${++partUsedSeq}`; }
export function nextSignatureId(): string { return `sig_${++signatureSeq}`; }
export function nextEngNoteId(): string { return `enote_${++engNoteSeq}`; }
export function nextWorkCompletionId(): string { return `wc_${++workCompletionSeq}`; }
export function nextEngPhotoId(): string { return `ephoto_${++engPhotoSeq}`; }
export function nextOfflineQueueId(): string { return `oq_${++offlineQueueSeq}`; }
export function nextNotifTemplateId(): string { return `ntpl_${++notifTemplateSeq}`; }
export function nextEngineerProfileId(): string { return `eprof_${++engineerProfileSeq}`; }

/* ── Seed customers ──────────────────────────────────────────── */
/* ── Production stores — all empty on first launch ───────────── */
export const customersStore: Customer[]           = [];
export const assetsStore: Asset[]                 = [];
export const documentsStore: UploadedDocument[]   = [];
export const timelineStore: TimelineEvent[]       = [];

export const tasksStore: Task[]                   = [];
export const taskTimelineStore: TaskTimelineEvent[] = [];
export const taskNotesStore: TaskNote[]           = [];
export const taskPhotosStore: TaskPhoto[]         = [];
export const taskDocumentsStore: TaskDocument[]   = [];
export const taskActivityStore: TaskActivity[]    = [];

export const amcsStore: AMC[]                     = [];
export const amcVisitStore: AMCVisitSchedule[]    = [];
export const amcTimelineStore: AMCTimelineEvent[] = [];
export const amcDocumentsStore: AMCDocument[]     = [];
export const amcRenewalStore: AMCRenewal[]        = [];

export const engineerProfilesStore: EngineerProfile[] = [];
export const bikesStore: Bike[]                   = [];
export const attendanceStore: Attendance[]        = [];
export const fuelLogsStore: FuelLog[]             = [];
export const partsUsedStore: PartUsed[]           = [];
export const signaturesStore: CustomerSignature[] = [];
export const engineerNotesStore: EngineerNote[]   = [];
export const workCompletionsStore: WorkCompletion[] = [];
export const engineerPhotosStore: EngineerTaskPhoto[] = [];
export const offlineQueueStore: OfflineQueueItem[] = [];

/* ── Default notification templates (system-level, not user data) */
export const notificationTemplatesStore: NotificationTemplate[] = [
  { id: 'ntpl_001', type: 'task_assigned',       recipientRole: 'engineer', title: 'New Task Assigned',       messageBody: 'Task {{taskNumber}} has been assigned to you. Customer: {{customerName}}.', actionLink: '/engineer/tasks/{{taskId}}' },
  { id: 'ntpl_002', type: 'task_status_changed', recipientRole: 'admin',    title: 'Task Status Updated',     messageBody: 'Engineer {{engineerName}} updated Task {{taskNumber}} to {{status}}.', actionLink: '/tasks/{{taskId}}' },
  { id: 'ntpl_003', type: 'attendance_alert',    recipientRole: 'admin',    title: 'Engineer Not Checked In', messageBody: 'Engineer {{engineerName}} has not checked in by 10:00 AM.', actionLink: '/attendance' },
  { id: 'ntpl_004', type: 'task_overdue',        recipientRole: 'engineer', title: 'Task Overdue',            messageBody: 'Task {{taskNumber}} is overdue. Please update the status immediately.', actionLink: '/engineer/tasks/{{taskId}}' },
  { id: 'ntpl_005', type: 'help_request',        recipientRole: 'admin',    title: 'Engineer Needs Help',     messageBody: 'Engineer {{engineerName}} requested help on Task {{taskNumber}}.', actionLink: '/tasks/{{taskId}}' },
  { id: 'ntpl_006', type: 'escalation',          recipientRole: 'admin',    title: 'Task Escalated',          messageBody: 'Task {{taskNumber}} escalated by {{engineerName}}. Reason: {{reason}}.', actionLink: '/tasks/{{taskId}}' },
  { id: 'ntpl_007', type: 'amc_visit_reminder',  recipientRole: 'engineer', title: 'AMC Visit Reminder',      messageBody: 'Scheduled AMC visit at {{customerName}} is tomorrow ({{visitDate}}).', actionLink: '/engineer/tasks/{{taskId}}' },
];
