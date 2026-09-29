/**
 * AMC Service — Supabase-backed
 * Sectore 360 — Production
 */
import type {
  AMC, AMCFormData, AMCVisitSchedule, AMCTimelineEvent,
  AMCDocument, AMCRenewal, AMCStats,
} from '@/types/amc';
import { amcApi } from '@/lib/api';

export const amcService = {
  async list(opts?: {
    search?: string; status?: string[]; contractType?: string[];
    visitFrequency?: string[]; customerId?: string;
    expiringDays?: number; dateFrom?: string; dateTo?: string;
    includeCancelled?: boolean;
  }): Promise<AMC[]> {
    let amcs = await amcApi.list({
      customerId: opts?.customerId,
      status: opts?.status,
    });
    if (!opts?.includeCancelled) {
      amcs = amcs.filter((a) => a.status !== 'Cancelled');
    }
    if (opts?.contractType?.length) amcs = amcs.filter((a) => opts.contractType!.includes(a.contractType));
    if (opts?.visitFrequency?.length) amcs = amcs.filter((a) => opts.visitFrequency!.includes(a.visitFrequency));
    if (opts?.dateFrom) amcs = amcs.filter((a) => a.startDate >= opts.dateFrom!);
    if (opts?.dateTo)   amcs = amcs.filter((a) => a.endDate   <= opts.dateTo!);
    if (typeof opts?.expiringDays === 'number') {
      const today = new Date();
      amcs = amcs.filter((a) => {
        const diff = Math.ceil((new Date(a.endDate).getTime() - today.getTime()) / 86400000);
        return diff >= 0 && diff <= opts.expiringDays!;
      });
    }
    if (opts?.search) {
      const q = opts.search.toLowerCase();
      amcs = amcs.filter((a) =>
        a.amcNumber.toLowerCase().includes(q) ||
        a.customerName.toLowerCase().includes(q) ||
        a.contractType.toLowerCase().includes(q) ||
        a.status.toLowerCase().includes(q)
      );
    }
    return amcs;
  },

  async getById(id: string): Promise<AMC | null> {
    return amcApi.getById(id);
  },

  async create(data: AMCFormData, createdBy: string): Promise<AMC> {
    return amcApi.create(data, createdBy);
  },

  async update(id: string, data: Partial<AMCFormData>, _updatedBy?: string): Promise<AMC> {
    return amcApi.update(id, data);
  },

  async getStats(): Promise<AMCStats> {
    const all = await amcApi.list();
    const today = new Date().toISOString().slice(0, 10);
    const active   = all.filter((a) => a.status === 'Active');
    const expiring30 = all.filter((a) => {
      const diff = Math.ceil((new Date(a.endDate).getTime() - new Date().getTime()) / 86400000);
      return a.status === 'Active' && diff >= 0 && diff <= 30;
    });
    const expiring60 = all.filter((a) => {
      const diff = Math.ceil((new Date(a.endDate).getTime() - new Date().getTime()) / 86400000);
      return a.status === 'Active' && diff >= 0 && diff <= 60;
    });
    const expired = all.filter((a) => a.endDate < today && a.status !== 'Cancelled');
    return {
      totalActive:           active.length,
      expired:               expired.length,
      expiringIn30:          expiring30.length,
      expiringIn60:          expiring60.length,
      upcomingVisits:        0,
      missedVisits:          0,
      completedVisitsToday:  0,
      draft:                 all.filter((a) => a.status === 'Draft').length,
    };
  },

  async getTimeline(amcId: string): Promise<AMCTimelineEvent[]> {
    return amcApi.getTimeline(amcId);
  },

  async getVisits(amcId: string): Promise<AMCVisitSchedule[]> {
    return amcApi.getVisits(amcId);
  },

  async completeVisit(amcId: string, visitId: string, completedAt: string): Promise<AMCVisitSchedule> {
    const visits = await amcApi.getVisits(amcId);
    return visits.find((v) => v.id === visitId) ?? (() => { throw new Error('Visit not found'); })();
  },

  async getDocuments(amcId: string): Promise<AMCDocument[]> {
    return amcApi.getDocuments(amcId);
  },

  async addDocument(
    amcId: string,
    doc: { documentType: AMCDocument['documentType']; fileName: string; fileType?: string; fileSize?: number; url?: string },
    uploadedBy: string,
  ): Promise<AMCDocument> {
    const { supabase } = await import('@/lib/supabase');
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('amc_documents')
      .insert({
        id: crypto.randomUUID(), amc_id: amcId,
        document_type: doc.documentType, file_name: doc.fileName,
        file_type: doc.fileType ?? 'application/octet-stream',
        file_size: doc.fileSize ?? 0, url: doc.url ?? '', uploaded_by: uploadedBy, created_at: now,
      })
      .select().maybeSingle();
    if (error) throw new Error(error.message);
    const r = data as Record<string, unknown>;
    return { id: r.id as string, amcId: r.amc_id as string, documentType: r.document_type as AMCDocument['documentType'], fileName: r.file_name as string, fileType: r.file_type as string, fileSize: r.file_size as number, url: r.url as string, uploadedBy: r.uploaded_by as string, uploadedAt: (r.created_at ?? r.uploaded_at ?? new Date().toISOString()) as string };
  },

  /** Alias for list() with no filters — used by legacy callers */
  async getAll(): Promise<AMC[]> {
    return this.list({ includeCancelled: true });
  },

  async softDelete(id: string, _deletedBy?: string): Promise<void> {
    await amcApi.update(id, { status: 'Cancelled' } as Partial<AMCFormData>);
  },

  async renew(id: string, newEndDate: string, _renewedBy?: string): Promise<AMC> {
    return amcApi.update(id, { endDate: newEndDate, status: 'Renewed' } as Partial<AMCFormData>);
  },

  async getVisitSchedule(amcId: string): Promise<AMCVisitSchedule[]> {
    return this.getVisits(amcId);
  },

  async getGeneratedTasks(amcId: string): Promise<unknown[]> {
    try {
      const { tasksApi } = await import('@/lib/api');
      return tasksApi.list({ search: amcId });
    } catch { return []; }
  },

  async deleteDocument(amcId: string, docId: string, _deletedBy?: string): Promise<void> {
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('amc_documents').delete().eq('id', docId).eq('amc_id', amcId);
  },

  async getAMCsForCustomer(customerId: string): Promise<AMC[]> {
    return this.list({ customerId, includeCancelled: true });
  },

  async getAMCForAsset(assetId: string): Promise<AMC | null> {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase
      .from('amcs')
      .select('*')
      .eq('asset_id', assetId)
      .eq('status', 'Active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const r = data as Record<string, unknown>;
    return {
      id: r.id as string,
      amcNumber: r.amc_number as string,
      customerId: r.customer_id as string,
      customerName: (r.customer_name ?? '') as string,
      coveredAssetIds: [assetId],
      contractType: r.contract_type as AMC['contractType'],
      startDate: r.start_date as string,
      endDate: r.end_date as string,
      visitFrequency: r.visit_frequency as AMC['visitFrequency'],
      numberOfIncludedVisits: (r.number_of_included_visits as number) ?? 0,
      slaResponseTime: (r.sla_response_time as string) ?? '',
      slaResolutionTime: (r.sla_resolution_time as string) ?? '',
      labourIncluded: (r.labour_included as boolean) ?? false,
      travelIncluded: (r.travel_included as boolean) ?? false,
      emergencySupportIncluded: (r.emergency_support_included as boolean) ?? false,
      remoteSupportIncluded: (r.remote_support_included as boolean) ?? false,
      status: r.status as AMC['status'],
      remarks: r.notes as string | undefined,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
      createdBy: r.created_by as string,
    };
  },


  async getRenewals(amcId: string): Promise<AMCRenewal[]> {
    return amcApi.getRenewals(amcId);
  },
};
