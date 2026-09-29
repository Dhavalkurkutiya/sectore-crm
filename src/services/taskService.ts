/**
 * Task Service — Supabase-backed
 * Sectore 360 — Production
 */
import type {
  Task, TaskFormData, TaskTimelineEvent, TaskNote, TaskPhoto,
  TaskDocument, TaskActivity, TaskStatus,
  NoteType, PhotoCategory,
} from '@/types/task';
import { tasksApi } from '@/lib/api';

export const taskService = {
  async list(opts?: {
    search?: string; status?: string[]; priority?: string[]; taskType?: string[];
    engineerId?: string; customerId?: string; assetId?: string;
    dateFrom?: string; dateTo?: string; includeCancelled?: boolean;
    limit?: number; offset?: number;
  }): Promise<Task[]> {
    return tasksApi.list(opts);
  },

  /** Kept for legacy sync callers — returns empty; use list() instead */
  getAllSync(): Task[] { return []; },

  async getAll(): Promise<Task[]> {
    return tasksApi.list({ includeCancelled: true, limit: 500 });
  },

  async getById(id: string): Promise<Task | null> {
    return tasksApi.getById(id);
  },

  async create(data: TaskFormData, createdByUser: string): Promise<Task> {
    return tasksApi.create(data, createdByUser);
  },

  async update(id: string, data: Partial<TaskFormData>, updatedByUser: string): Promise<Task> {
    return tasksApi.update(id, data);
  },

  async updateStatus(id: string, status: TaskStatus, updatedByUser: string): Promise<Task> {
    return tasksApi.update(id, { status });
  },

  /** Record service visit start time (Reached Site button) */
  async recordServiceStart(id: string): Promise<Task> {
    return tasksApi.update(id, { serviceStartTime: new Date().toISOString() });
  },

  /** Record service visit end time + calculate site minutes (Complete Task button) */
  async recordServiceEnd(id: string, serviceStartTime?: string): Promise<Task> {
    const endTime = new Date().toISOString();
    let siteTimeMinutes: number | undefined;
    if (serviceStartTime) {
      const diff = (new Date(endTime).getTime() - new Date(serviceStartTime).getTime()) / 60000;
      siteTimeMinutes = Math.round(diff);
    }
    return tasksApi.update(id, {
      serviceEndTime: endTime,
      ...(siteTimeMinutes !== undefined ? { siteTimeMinutes } : {}),
    });
  },

  /** Update customer-editable remarks only */
  async updateCustomerRemarks(id: string, customerRemarks: string, customerFeedback?: string): Promise<Task> {
    return tasksApi.update(id, { customerRemarks, ...(customerFeedback !== undefined ? { customerFeedback } : {}) });
  },

  async assignEngineer(id: string, engineerId: string, engineerName: string, updatedByUser: string): Promise<Task> {
    const oldTask = await tasksApi.getById(id);
    const newStatus = (!oldTask?.engineerId && !oldTask?.status?.includes('Assigned')) ? 'Assigned' as TaskStatus : undefined;
    return tasksApi.update(id, { engineerId, engineerName, ...(newStatus ? { status: newStatus } : {}) });
  },

  async softDelete(id: string, _by?: string): Promise<Task> {
    return tasksApi.update(id, { status: 'Cancelled' as TaskStatus });
  },

  async restore(id: string, _by?: string): Promise<Task> {
    return tasksApi.update(id, { status: 'Pending' as TaskStatus });
  },

  async getStats() {
    return tasksApi.getStats();
  },

  /** Engineer-scoped stats — only tasks assigned to this engineer */
  async getStatsByEngineer(engineerId: string) {
    return tasksApi.getStatsByEngineer(engineerId);
  },

  /** Customer-scoped stats — only tickets belonging to this customer */
  async getStatsByCustomer(customerId: string) {
    return tasksApi.getStatsByCustomer(customerId);
  },

  /** Admin global counters — live DB counts for dashboard cards */
  async getAdminCounts() {
    return tasksApi.getAdminCounts();
  },

  async getTimeline(taskId: string): Promise<TaskTimelineEvent[]> {
    return tasksApi.getTimeline(taskId);
  },

  async getNotes(taskId: string): Promise<TaskNote[]> {
    return tasksApi.getNotes(taskId);
  },

  async addNote(taskId: string, noteType: NoteType, content: string, addedBy: string, addedById: string): Promise<TaskNote> {
    return tasksApi.addNote(taskId, noteType, content, addedBy, addedById);
  },

  async deleteNote(noteId: string, _by?: string, _byId?: string): Promise<void> {
    return tasksApi.deleteNote(noteId);
  },

  async getPhotos(taskId: string): Promise<TaskPhoto[]> {
    return tasksApi.getPhotos(taskId);
  },

  async addPhoto(taskId: string, category: PhotoCategory, fileName: string, fileSize: number, url: string, uploadedBy: string, uploadedById: string): Promise<TaskPhoto> {
    return tasksApi.addPhoto(taskId, category, fileName, fileSize, url, uploadedBy, uploadedById);
  },

  async deletePhoto(photoId: string, _by?: string, _byId?: string): Promise<void> {
    return tasksApi.deletePhoto(photoId);
  },

  async getDocuments(taskId: string): Promise<TaskDocument[]> {
    return tasksApi.getDocuments(taskId);
  },

  async addDocument(taskId: string, fileName: string, fileType: string, fileSize: number, url: string, uploadedBy: string, uploadedById: string): Promise<TaskDocument> {
    return tasksApi.addDocument(taskId, fileName, fileType, fileSize, url, uploadedBy, uploadedById);
  },

  async deleteDocument(docId: string, _by?: string, _byId?: string): Promise<void> {
    return tasksApi.deleteDocument(docId);
  },

  async getActivity(taskId: string): Promise<TaskActivity[]> {
    return tasksApi.getActivity(taskId);
  },
};
