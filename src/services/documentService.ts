/**
 * Document Service — Supabase-backed
 * Sectore 360 — Phase 1, Part 2
 */
import type { UploadedDocument, DocumentCategory } from '@/types/customer';
import { supabase } from '@/lib/supabase';
import { timelineService } from './timelineService';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ALLOWED_EXT   = ['jpg', 'jpeg', 'png', 'pdf', 'docx'];
const MAX_SIZE      = 10 * 1024 * 1024; // 10 MB

export interface FileValidationError {
  file: string;
  error: string;
}

export function validateFile(file: File): string | null {
  if (file.size > MAX_SIZE) return `File exceeds 10 MB limit`;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXT.includes(ext) && !ALLOWED_TYPES.includes(file.type)) {
    return `File type not supported. Allowed: jpg, png, pdf, docx`;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToDoc(r: any): UploadedDocument {
  return {
    id:          r.id,
    entityId:    r.entity_id ?? r.customer_id,
    entityType:  (r.entity_type ?? 'customer') as 'customer' | 'asset',
    category:    (r.category ?? 'Other') as DocumentCategory,
    fileName:    r.file_name,
    fileType:    r.file_type,
    fileSize:    r.file_size,
    url:         r.url,
    version:     r.version ?? 1,
    uploadedAt:  r.uploaded_at,
    uploadedBy:  r.uploaded_by,
  };
}

export const documentService = {
  async getByEntity(entityId: string): Promise<UploadedDocument[]> {
    const { data } = await supabase
      .from('customer_documents')
      .select('*')
      .eq('entity_id', entityId)
      .order('uploaded_at', { ascending: false });
    return (data ?? []).map(rowToDoc);
  },

  async upload(
    entityId: string,
    entityType: 'customer' | 'asset',
    category: DocumentCategory,
    file: File,
    uploadedBy: string
  ): Promise<UploadedDocument | FileValidationError> {
    const err = validateFile(file);
    if (err) return { file: file.name, error: err };

    // Version tracking
    const { data: existing } = await supabase
      .from('customer_documents')
      .select('version')
      .eq('entity_id', entityId)
      .eq('file_name', file.name)
      .order('version', { ascending: false })
      .limit(1);
    const version = existing && existing.length > 0 ? (existing[0].version + 1) : 1;

    const now = new Date().toISOString();
    const url = URL.createObjectURL(file); // placeholder until storage upload is wired
    const row = {
      id:          `doc_${Date.now()}`,
      customer_id: entityType === 'customer' ? entityId : entityId,
      entity_id:   entityId,
      entity_type: entityType,
      category,
      file_name:   file.name,
      file_type:   file.name.split('.').pop()?.toLowerCase() ?? 'unknown',
      file_size:   file.size,
      url,
      version,
      uploaded_at: now,
      uploaded_by: uploadedBy,
    };
    const { data: inserted, error } = await supabase.from('customer_documents').insert(row).select().single();
    if (error) return { file: file.name, error: error.message };

    await timelineService.add({
      entityId, entityType,
      eventType: 'document_uploaded',
      title: 'Document Uploaded',
      description: `${file.name}${version > 1 ? ` (v${version})` : ''} uploaded.`,
      performedBy: uploadedBy,
    });
    return rowToDoc(inserted);
  },

  async delete(docId: string, deletedBy: string): Promise<void> {
    const { data: doc } = await supabase.from('customer_documents').select('*').eq('id', docId).maybeSingle();
    if (!doc) return;
    await supabase.from('customer_documents').delete().eq('id', docId);
    await timelineService.add({
      entityId:   doc.entity_id ?? doc.customer_id,
      entityType: (doc.entity_type ?? 'customer') as 'customer' | 'asset',
      eventType:  'document_deleted',
      title:      'Document Deleted',
      description: `${doc.file_name} removed.`,
      performedBy: deletedBy,
    });
  },
};
