/**
 * Supabase Client — Sectore 360
 * Single instance used across the entire application.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }, // we manage sessions ourselves via JWT tokens
  global: { headers: { 'x-app-id': 'sectore360' } },
});

/** Upload a file to a Supabase Storage bucket. Returns the public URL. */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob,
  contentType?: string,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: contentType ?? file.type, upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

/** Delete a file from storage by its public URL or path */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  await supabase.storage.from(bucket).remove([path]);
}
