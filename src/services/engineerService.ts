/**
 * Engineer Service — Supabase-backed (tasks + profiles + bikes + parts) +
 *                    in-memory (signatures, work completions, offline queue)
 * Sectore 360 — Production
 */
import type {
  EngineerProfile, Bike, PartUsed, PartUsedFormData,
  CustomerSignature, EngineerNote, WorkCompletion, WorkCompletionFormData,
  EngineerTaskPhoto, TaskPhotoCategory, EngineerDashboardStats,
  OfflineQueueItem, OfflineDataType,
} from '@/types/engineer';
import {
  signaturesStore, engineerNotesStore, workCompletionsStore,
  engineerPhotosStore, offlineQueueStore,
  nextSignatureId, nextEngNoteId,
  nextWorkCompletionId, nextEngPhotoId, nextOfflineQueueId,
} from './mockStore';
import { attendanceService } from './attendanceService';
import { fuelService } from './fuelService';
import { tasksApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProfile(r: any): EngineerProfile {
  return {
    id:                  r.id,
    name:                r.name,
    email:               r.email,
    mobile:              r.mobile,
    employeeId:          r.employee_code ?? r.id,
    joiningDate:         r.created_at?.slice(0, 10) ?? '',
    yearsOfExperience:   0,
    specialization:      (r.skills ?? []).join(', ') || 'General',
    address:             r.address     ?? undefined,
    photoUrl:            r.profile_photo ?? undefined,
    designation:         r.status      ?? undefined,
    skills:              r.skills        ?? [],
    certifications:      r.certifications ?? [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToBike(r: any): Bike {
  return {
    id:                  r.id,
    bikeNumber:          r.registration_number,
    make:                r.make ?? '',
    model:               r.model ?? '',
    fuelType:            r.fuel_type ?? '',
    averageMileage:      r.average_mileage ?? 0,
    initialOdometer:     r.initial_odometer ?? 0,
    currentOdometer:     r.current_odometer ?? r.initial_odometer ?? 0,
    status:              r.status ?? 'Active',
    assignedEngineerId:  r.assigned_engineer_id ?? undefined,
    assignedEngineerName: r.assigned_engineer_name ?? undefined,
    serviceDueDate:      r.service_due_date       ?? undefined,
    insuranceExpiryDate: r.insurance_expiry_date  ?? undefined,
    pucExpiryDate:       r.puc_expiry_date         ?? undefined,
    notes:               r.notes                   ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPart(r: any): PartUsed {
  return {
    id:          r.id,
    taskId:      r.task_id,
    recordedBy:  r.recorded_by ?? 'System',
    recordedAt:  r.created_at,
    partName:    r.part_name,
    quantity:    r.quantity,
    serialNumber: r.part_number ?? undefined,
    remarks:     r.notes        ?? undefined,
  };
}

export const engineerService = {

  /* ── Profiles ──────────────────────────────────────────── */
  async getProfile(engineerId: string): Promise<EngineerProfile | null> {
    const { data } = await supabase
      .from('engineer_profiles')
      .select('*')
      .eq('id', engineerId)
      .maybeSingle();
    return data ? rowToProfile(data) : null;
  },

  async getAllProfiles(): Promise<EngineerProfile[]> {
    const { data } = await supabase.from('engineer_profiles').select('*').order('name');
    return (data ?? []).map(rowToProfile);
  },

  /* ── Bikes ─────────────────────────────────────────────── */
  async getAssignedBike(engineerId: string): Promise<Bike | null> {
    const { data } = await supabase
      .from('bikes')
      .select('*')
      .eq('assigned_engineer_id', engineerId)
      .maybeSingle();
    return data ? rowToBike(data) : null;
  },

  async getAllBikes(): Promise<Bike[]> {
    const { data } = await supabase.from('bikes').select('*').order('registration_number');
    return (data ?? []).map(rowToBike);
  },

  isBikeServiceDueSoon(bike: Bike): boolean {
    if (!bike.serviceDueDate) return false;
    const daysLeft = Math.ceil(
      (new Date(bike.serviceDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysLeft <= 7 && daysLeft >= 0;
  },

  isInsuranceExpiringSoon(bike: Bike): boolean {
    if (!bike.insuranceExpiryDate) return false;
    const daysLeft = Math.ceil(
      (new Date(bike.insuranceExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysLeft <= 30 && daysLeft >= 0;
  },

  /* ── Assigned Tasks (engineer scope) ───────────────────── */
  async getAssignedTasks(engineerId: string) {
    return tasksApi.list({ engineerId, includeCancelled: false });
  },

  async getTaskById(_engineerId: string, taskId: string) {
    return tasksApi.getById(taskId);
  },

  /* ── Parts Used ────────────────────────────────────────── */
  async getPartsUsed(taskId: string): Promise<PartUsed[]> {
    const { data } = await supabase
      .from('parts_used')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at');
    return (data ?? []).map(rowToPart);
  },

  async addPartUsed(taskId: string, recordedBy: string, data: PartUsedFormData): Promise<PartUsed> {
    const row = {
      id:          `part_${Date.now()}`,
      task_id:     taskId,
      engineer_id: recordedBy,
      recorded_by: recordedBy,
      part_name:   data.partName,
      part_number: data.serialNumber ?? null,
      quantity:    data.quantity,
      unit_price:  0,
      notes:       data.remarks ?? null,
    };
    const { data: inserted, error } = await supabase.from('parts_used').insert(row).select().single();
    if (error) throw new Error(error.message);
    return rowToPart(inserted);
  },

  async deletePartUsed(partId: string): Promise<void> {
    await supabase.from('parts_used').delete().eq('id', partId);
  },

  /* ── Signatures (in-memory — no DB table) ──────────────── */
  getSignature(taskId: string): CustomerSignature | null {
    return signaturesStore.find((s) => s.taskId === taskId) ?? null;
  },

  saveSignature(taskId: string, dataUrl: string, customerName?: string): CustomerSignature {
    const existing = signaturesStore.findIndex((s) => s.taskId === taskId);
    const sig: CustomerSignature = {
      id: nextSignatureId(),
      taskId,
      signatureDataUrl: dataUrl,
      signedAt: now(),
      customerName,
    };
    if (existing !== -1) signaturesStore[existing] = sig;
    else signaturesStore.push(sig);
    return sig;
  },

  /* ── Engineer Notes (in-memory) ────────────────────────── */
  getNotes(taskId: string): EngineerNote[] {
    return engineerNotesStore.filter((n) => n.taskId === taskId);
  },

  addNote(taskId: string, engineerId: string, noteType: EngineerNote['noteType'], content: string): EngineerNote {
    const note: EngineerNote = {
      id: nextEngNoteId(),
      taskId, engineerId, noteType, content,
      createdAt: now(),
    };
    engineerNotesStore.push(note);
    return note;
  },

  /* ── Work Completion (in-memory) ───────────────────────── */
  getWorkCompletion(taskId: string): WorkCompletion | null {
    return workCompletionsStore.find((w) => w.taskId === taskId) ?? null;
  },

  saveWorkCompletion(taskId: string, engineerId: string, data: WorkCompletionFormData): WorkCompletion {
    const existing = workCompletionsStore.findIndex((w) => w.taskId === taskId);
    const wc: WorkCompletion = { id: nextWorkCompletionId(), taskId, engineerId, completedAt: now(), ...data };
    if (existing !== -1) workCompletionsStore[existing] = wc;
    else workCompletionsStore.push(wc);
    return wc;
  },

  /* ── Photos (in-memory — photos stored as data URLs) ────── */
  getPhotos(taskId: string): EngineerTaskPhoto[] {
    return engineerPhotosStore.filter((p) => p.taskId === taskId);
  },

  addPhoto(taskId: string, engineerId: string, category: TaskPhotoCategory, dataUrl: string, fileName: string, fileSizeKB: number): EngineerTaskPhoto {
    const photo: EngineerTaskPhoto = {
      id: nextEngPhotoId(), taskId, engineerId, category,
      dataUrl, fileName, fileSizeKB,
      uploadedAt: now(), synced: true,
    };
    engineerPhotosStore.push(photo);
    return photo;
  },

  deletePhoto(photoId: string): void {
    const idx = engineerPhotosStore.findIndex((p) => p.id === photoId);
    if (idx !== -1) engineerPhotosStore.splice(idx, 1);
  },

  /* ── Offline Queue (in-memory) ──────────────────────────── */
  queueOfflineItem(dataType: OfflineDataType, payload: object): OfflineQueueItem {
    const item: OfflineQueueItem = {
      id: nextOfflineQueueId(), dataType,
      payload: JSON.stringify(payload),
      queuedAt: now(), syncStatus: 'pending', retryCount: 0,
    };
    offlineQueueStore.push(item);
    return item;
  },

  getPendingQueue(): OfflineQueueItem[] {
    return offlineQueueStore.filter((i) => i.syncStatus !== 'synced');
  },

  markSynced(itemId: string): void {
    const item = offlineQueueStore.find((i) => i.id === itemId);
    if (item) { item.syncStatus = 'synced'; item.syncedAt = now(); }
  },

  /* ── Dashboard Stats ────────────────────────────────────── */
  async getDashboardStats(engineerId: string): Promise<EngineerDashboardStats> {
    const tasks    = await tasksApi.list({ engineerId, includeCancelled: false });
    const todayStr = today();

    const todayPending   = tasks.filter((t) => t.status === 'Pending').length;
    const todayWorking   = tasks.filter((t) => ['Accepted', 'In Progress', 'In Transit'].includes(t.status)).length;
    const todayCompleted = tasks.filter((t) => t.status === 'Completed' && (t.completedAt ?? '').startsWith(todayStr)).length;
    const todayOverdue   = tasks.filter((t) => {
      const due = t.expectedVisitDate ?? t.createdAt;
      return !['Completed', 'Cancelled'].includes(t.status) && new Date(due) < new Date();
    }).length;
    const todayEmergency = tasks.filter((t) => t.priority === 'Emergency' && !['Completed', 'Cancelled'].includes(t.status)).length;

    const fuel = await fuelService.getTodayStats(engineerId);

    return {
      todayPending, todayWorking, todayCompleted,
      todayOverdue, todayEmergency,
      upcomingAMCVisits: 0,
      todayKM:         fuel.km,
      todayFuelCost:   fuel.fuelCost,
      todayFuelLiters: fuel.fuelLiters,
    };
  },

  /* ── Task summary for profile ───────────────────────────── */
  async getTaskSummary(engineerId: string) {
    const tasks      = await tasksApi.list({ engineerId, includeCancelled: true });
    const monthStart = new Date(); monthStart.setDate(1);
    const completedThisMonth = tasks.filter(
      (t) => t.status === 'Completed' && new Date(t.completedAt ?? '') >= monthStart
    ).length;
    const pending = tasks.filter((t) => !['Completed', 'Cancelled'].includes(t.status)).length;
    return { completedThisMonth, pending, total: tasks.length };
  },

  /* ── Upcoming AMC visits ────────────────────────────────── */
  getUpcomingAMCVisits(_days = 7) {
    return [] as { id: string; scheduledDate: string; status: string }[];
  },

  /* ── Attendance wrapper ─────────────────────────────────── */
  async getTodayAttendance(engineerId: string) {
    return attendanceService.getTodayRecord(engineerId);
  },
};

