/**
 * Engineer Types — Part 5
 * Sectore 360 — Field Service Engineer Portal
 */

/* ── Attendance ─────────────────────────────────────────────── */
export type AttendanceStatus = 'checked_in' | 'checked_out' | 'absent';

export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  online: boolean;
}

export interface Attendance {
  id: string;
  engineerId: string;
  engineerName: string;
  date: string;                        // YYYY-MM-DD
  checkInTime: string;                 // ISO
  checkInGPS?: GPSLocation;
  deviceInfo?: DeviceInfo;
  selfiePhotoUrl?: string;
  checkOutTime?: string;               // ISO
  checkOutGPS?: GPSLocation;
  workingHours?: number;               // decimal hours
  status: AttendanceStatus;
  createdAt: string;
  updatedAt: string;
}

/* ── Fuel Log — KEPT for type compat (Admin-Only model) ───── */
export interface FuelLog {
  id: string;
  engineerId: string;
  engineerName: string;
  entryDate: string;                   // YYYY-MM-DD
  openingKM: number;
  closingKM: number;
  distanceTravelled: number;           // auto-calculated
  fuelFilled: number;                  // liters
  fuelCost: number;                    // currency
  fuelBillPhotoUrl?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Bike ───────────────────────────────────────────────────── */
export interface Bike {
  id: string;
  bikeNumber: string;           // registration_number
  make: string;
  model: string;
  fuelType: string;
  averageMileage: number;       // km per liter
  initialOdometer: number;
  currentOdometer: number;
  serviceDueDate?: string;
  pucExpiryDate?: string;
  insuranceExpiryDate?: string;
  assignedEngineerId?: string;
  assignedEngineerName?: string;
  status: string;               // Active | Inactive
  notes?: string;
}

/* ── Odometer Photo ──────────────────────────────────────────── */
export type OdometerPhotoType = 'morning' | 'evening';

export interface OdometerPhoto {
  id: string;
  engineerId: string;
  engineerName: string;
  bikeId?: string;
  date: string;                 // YYYY-MM-DD
  photoType: OdometerPhotoType;
  photoUrl: string;
  gpsLat?: number;
  gpsLng?: number;
  capturedAt: string;           // ISO
  createdAt: string;
}

/* ── Odometer Verification ───────────────────────────────────── */
export interface OdometerVerification {
  id: string;
  engineerId: string;
  engineerName: string;
  bikeId?: string;
  date: string;
  morningPhotoId?: string;
  eveningPhotoId?: string;
  morningReading?: number;
  eveningReading?: number;
  kmTravelled?: number;         // generated column: evening - morning
  verifiedBy?: string;
  verifiedAt?: string;
  status: 'pending' | 'verified';
  createdAt: string;
  updatedAt: string;
}

/* ── Daily Report ────────────────────────────────────────────── */
export type DailyReportStatus = 'submitted' | 'approved' | 'sent_back';

export interface DailyReport {
  id: string;
  engineerId: string;
  engineerName: string;
  attendanceId?: string;
  date: string;                 // YYYY-MM-DD
  partsRequired?: string;
  customerFollowup?: string;
  issuesFaced?: string;
  tomorrowPriority?: string;
  remarks?: string;
  sitePhotoUrls: string[];
  billUrls: string[];
  documentUrls: string[];
  status: DailyReportStatus;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Parts Used ─────────────────────────────────────────────── */
export interface PartUsed {
  id: string;
  taskId: string;
  partName: string;
  quantity: number;
  serialNumber?: string;
  remarks?: string;
  recordedAt: string;
  recordedBy: string;
}

/* ── Customer Signature ─────────────────────────────────────── */
export interface CustomerSignature {
  id: string;
  taskId: string;
  signatureDataUrl: string;            // base64 PNG
  signedAt: string;
  gps?: GPSLocation;
  customerName?: string;
  signatoryName?: string;              // printed name from signature pad
}

/* ── Task Photo ─────────────────────────────────────────────── */
export type TaskPhotoCategory = 'before' | 'work_in_progress' | 'after' | 'equipment' | 'serial_number' | 'fuel_bill' | 'selfie';

export interface EngineerTaskPhoto {
  id: string;
  taskId: string;
  engineerId: string;
  category: TaskPhotoCategory;
  dataUrl: string;                     // base64 compressed
  fileName: string;
  fileSizeKB: number;
  uploadedAt: string;
  synced: boolean;
}

/* ── Engineer Notes ─────────────────────────────────────────── */
export type NoteType = 'internal' | 'customer_remark' | 'escalation' | 'help_request';

export interface EngineerNote {
  id: string;
  taskId: string;
  engineerId: string;
  noteType: NoteType;
  content: string;
  createdAt: string;
}

/* ── Work Completion ────────────────────────────────────────── */
export interface WorkCompletion {
  id: string;
  taskId: string;
  engineerId: string;
  problemFound: string;
  rootCause: string;
  resolution: string;
  workPerformed: string;
  partsReplaced: string;
  recommendations?: string;
  customerRemarks?: string;
  internalNotes?: string;
  signatureId?: string;
  completedAt: string;
  completionGPS?: GPSLocation;
  resolutionStatus?: 'Resolved' | 'Temporary Fix' | 'Parts Required' | 'Follow-up Required';
  visitNumber?: number;
}

/* ── Offline Queue ──────────────────────────────────────────── */
export type OfflineDataType = 'attendance' | 'task_update' | 'photo' | 'signature' | 'parts' | 'work_completion' | 'fuel_log';
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface OfflineQueueItem {
  id: string;
  dataType: OfflineDataType;
  payload: string;                     // JSON
  queuedAt: string;
  syncStatus: SyncStatus;
  syncedAt?: string;
  retryCount: number;
}

/* ── Notification Template ──────────────────────────────────── */
export type NotificationType =
  | 'task_assigned'
  | 'task_status_changed'
  | 'attendance_alert'
  | 'task_overdue'
  | 'help_request'
  | 'escalation'
  | 'amc_visit_reminder';

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  recipientRole: string;
  title: string;
  messageBody: string;
  actionLink?: string;
}

/* ── Engineer Profile ───────────────────────────────────────── */
export interface EngineerProfile {
  id: string;                          // matches User.id
  name: string;
  employeeId: string;
  mobile: string;
  email: string;
  joiningDate: string;
  yearsOfExperience: number;
  specialization: string;
  assignedBikeId?: string;
  /* Phase 1 Final additions */
  designation?: string;
  photoUrl?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  address?: string;
  skills?: string[];
  certifications?: string[];
}

/* ── Stats ──────────────────────────────────────────────────── */
export interface EngineerDashboardStats {
  todayPending: number;
  todayWorking: number;
  todayCompleted: number;
  todayOverdue: number;
  todayEmergency: number;
  upcomingAMCVisits: number;
  todayKM: number;
  todayFuelCost: number;
  todayFuelLiters: number;
}

/* ── Form helpers ───────────────────────────────────────────── */
export type AttendanceFormData = Pick<Attendance,
  'checkInGPS' | 'deviceInfo' | 'selfiePhotoUrl'
>;

export type FuelLogFormData = Omit<FuelLog,
  'id' | 'engineerId' | 'engineerName' | 'distanceTravelled' | 'createdAt' | 'updatedAt'
>;

export type WorkCompletionFormData = Omit<WorkCompletion,
  'id' | 'taskId' | 'engineerId' | 'completedAt'
>;

export type PartUsedFormData = Omit<PartUsed,
  'id' | 'taskId' | 'recordedAt' | 'recordedBy'
>;
