/**
 * Daily Report Service — Supabase-backed
 * Engineer submits; Admin approves or sends back.
 */
import { supabase, uploadFile } from '@/lib/supabase';
import type { DailyReport } from '@/types/engineer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToReport(r: any): DailyReport {
  return {
    id:               r.id,
    engineerId:       r.engineer_id,
    engineerName:     r.engineer_name ?? '',
    attendanceId:     r.attendance_id   ?? undefined,
    date:             r.date,
    partsRequired:    r.parts_required   ?? undefined,
    customerFollowup: r.customer_followup ?? undefined,
    issuesFaced:      r.issues_faced      ?? undefined,
    tomorrowPriority: r.tomorrow_priority ?? undefined,
    remarks:          r.remarks           ?? undefined,
    sitePhotoUrls:    r.site_photo_urls   ?? [],
    billUrls:         r.bill_urls         ?? [],
    documentUrls:     r.document_urls     ?? [],
    status:           r.status            ?? 'submitted',
    adminNotes:       r.admin_notes       ?? undefined,
    reviewedBy:       r.reviewed_by       ?? undefined,
    reviewedAt:       r.reviewed_at       ?? undefined,
    submittedAt:      r.submitted_at      ?? r.created_at,
    createdAt:        r.created_at,
    updatedAt:        r.updated_at ?? r.created_at,
  };
}

export interface ReportSubmitData {
  partsRequired:    string;
  customerFollowup: string;
  issuesFaced:      string;
  tomorrowPriority: string;
  remarks:          string;
  sitePhotos:       File[];
  bills:            File[];
  documents:        File[];
}

async function uploadFiles(bucket: string, prefix: string, files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const safe = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const path = `${prefix}_${Date.now()}_${safe}`;
    const url = await uploadFile(bucket, path, file, file.type);
    urls.push(url);
  }
  return urls;
}

export const dailyReportService = {
  async getTodayReport(engineerId: string): Promise<DailyReport | null> {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('engineer_id', engineerId)
      .eq('date', today)
      .maybeSingle();
    if (error) { console.error('dailyReportService.getTodayReport:', error.message); return null; }
    return data ? rowToReport(data) : null;
  },

  async listByDate(date: string): Promise<DailyReport[]> {
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('date', date)
      .order('engineer_name');
    if (error) { console.error('dailyReportService.listByDate:', error.message); return []; }
    return (data ?? []).map(rowToReport);
  },

  async submit(
    engineerId: string,
    engineerName: string,
    attendanceId: string | undefined,
    formData: ReportSubmitData,
  ): Promise<DailyReport> {
    const today  = new Date().toISOString().slice(0, 10);
    const now    = new Date().toISOString();
    const prefix = `${engineerId}/${today}`;

    // Upload files in parallel
    const [sitePhotoUrls, billUrls, documentUrls] = await Promise.all([
      uploadFiles('daily-report-files', `${prefix}/site`, formData.sitePhotos),
      uploadFiles('daily-report-files', `${prefix}/bill`, formData.bills),
      uploadFiles('daily-report-files', `${prefix}/doc`,  formData.documents),
    ]);

    // Check if a "sent_back" report exists — update instead of insert
    const existing = await this.getTodayReport(engineerId);
    if (existing) {
      const { data, error } = await supabase
        .from('daily_reports')
        .update({
          parts_required:    formData.partsRequired    || null,
          customer_followup: formData.customerFollowup || null,
          issues_faced:      formData.issuesFaced      || null,
          tomorrow_priority: formData.tomorrowPriority || null,
          remarks:           formData.remarks           || null,
          site_photo_urls:   [...(existing.sitePhotoUrls ?? []), ...sitePhotoUrls],
          bill_urls:         [...(existing.billUrls        ?? []), ...billUrls],
          document_urls:     [...(existing.documentUrls    ?? []), ...documentUrls],
          status:            'submitted',
          admin_notes:       null,
          submitted_at:      now,
          updated_at:        now,
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return rowToReport(data);
    }

    const row = {
      engineer_id:       engineerId,
      engineer_name:     engineerName,
      attendance_id:     attendanceId ?? null,
      date:              today,
      parts_required:    formData.partsRequired    || null,
      customer_followup: formData.customerFollowup || null,
      issues_faced:      formData.issuesFaced      || null,
      tomorrow_priority: formData.tomorrowPriority || null,
      remarks:           formData.remarks           || null,
      site_photo_urls:   sitePhotoUrls,
      bill_urls:         billUrls,
      document_urls:     documentUrls,
      status:            'submitted',
      submitted_at:      now,
      created_at:        now,
      updated_at:        now,
    };
    const { data, error } = await supabase.from('daily_reports').insert(row).select().single();
    if (error) throw new Error(error.message);
    return rowToReport(data);
  },

  async approve(reportId: string, adminName: string): Promise<DailyReport> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('daily_reports')
      .update({ status: 'approved', reviewed_by: adminName, reviewed_at: now, updated_at: now })
      .eq('id', reportId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToReport(data);
  },

  async sendBack(reportId: string, adminName: string, notes: string): Promise<DailyReport> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('daily_reports')
      .update({ status: 'sent_back', admin_notes: notes, reviewed_by: adminName, reviewed_at: now, updated_at: now })
      .eq('id', reportId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToReport(data);
  },
};
