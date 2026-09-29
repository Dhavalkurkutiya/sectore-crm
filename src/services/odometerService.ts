/**
 * Odometer Service — Supabase-backed
 * Engineers: upload photos only (no manual values).
 * Admins: enter readings + verify.
 */
import type { OdometerPhoto, OdometerVerification, OdometerPhotoType } from '@/types/engineer';
import { supabase, uploadFile } from '@/lib/supabase';

const todayStr = () => new Date().toISOString().slice(0, 10);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPhoto(r: any): OdometerPhoto {
  return {
    id:           r.id,
    engineerId:   r.engineer_id,
    engineerName: r.engineer_name ?? '',
    bikeId:       r.bike_id       ?? undefined,
    date:         typeof r.date === 'string' ? r.date.slice(0, 10) : r.date,
    photoType:    r.photo_type as OdometerPhotoType,
    photoUrl:     r.photo_url,
    gpsLat:       r.gps_lat != null ? Number(r.gps_lat) : undefined,
    gpsLng:       r.gps_lng != null ? Number(r.gps_lng) : undefined,
    capturedAt:   r.captured_at,
    createdAt:    r.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToVerification(r: any): OdometerVerification {
  return {
    id:              r.id,
    engineerId:      r.engineer_id,
    engineerName:    r.engineer_name ?? '',
    bikeId:          r.bike_id       ?? undefined,
    date:            typeof r.date === 'string' ? r.date.slice(0, 10) : r.date,
    morningPhotoId:  r.morning_photo_id ?? undefined,
    eveningPhotoId:  r.evening_photo_id ?? undefined,
    morningReading:  r.morning_reading != null ? Number(r.morning_reading) : undefined,
    eveningReading:  r.evening_reading != null ? Number(r.evening_reading) : undefined,
    kmTravelled:     r.km_travelled    != null ? Number(r.km_travelled)    : undefined,
    verifiedBy:      r.verified_by  ?? undefined,
    verifiedAt:      r.verified_at  ?? undefined,
    status:          r.status as OdometerVerification['status'],
    createdAt:       r.created_at,
    updatedAt:       r.updated_at ?? r.created_at,
  };
}

export const odometerService = {
  /* ── Engineer: get today's photos ─────────────────────────── */
  async getTodayPhotos(engineerId: string): Promise<{ morning?: OdometerPhoto; evening?: OdometerPhoto }> {
    const { data, error } = await supabase
      .from('odometer_photos')
      .select('*')
      .eq('engineer_id', engineerId)
      .eq('date', todayStr());
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    return {
      morning: rows.find((r) => r.photo_type === 'morning') ? rowToPhoto(rows.find((r) => r.photo_type === 'morning')!) : undefined,
      evening: rows.find((r) => r.photo_type === 'evening') ? rowToPhoto(rows.find((r) => r.photo_type === 'evening')!) : undefined,
    };
  },

  /* ── Engineer: upload photo ────────────────────────────────── */
  async uploadPhoto(
    engineerId: string,
    engineerName: string,
    bikeId: string | undefined,
    photoType: OdometerPhotoType,
    file: File,
    gps?: { latitude: number; longitude: number },
    attendanceId?: string,
  ): Promise<OdometerPhoto> {
    if (photoType === 'evening') {
      const existing = await this.getTodayPhotos(engineerId);
      if (!existing.morning) throw new Error('Please upload morning odometer photo first');
    }

    // Upload to storage
    const ts       = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const path     = `${engineerId}/${todayStr()}/${photoType}_${ts}_${safeName}`;
    const photoUrl = await uploadFile('odometer-photos', path, file, file.type);

    const now = new Date().toISOString();
    const row: Record<string, unknown> = {
      engineer_id:   engineerId,
      engineer_name: engineerName,
      bike_id:       bikeId || null,
      date:          todayStr(),
      photo_type:    photoType,
      photo_url:     photoUrl,
      gps_lat:       gps?.latitude  ?? null,
      gps_lng:       gps?.longitude ?? null,
      captured_at:   now,
      created_at:    now,
      updated_at:    now,
    };
    if (attendanceId) row.attendance_id = attendanceId;

    const { data, error } = await supabase
      .from('odometer_photos')
      .upsert(row, { onConflict: 'engineer_id,date,photo_type' })
      .select()
      .single();
    if (error) {
      console.error('[odometerService.uploadPhoto] error:', error, { engineerId, photoType });
      throw new Error(`Photo upload failed: ${error.message}`);
    }
    return rowToPhoto(data);
  },

  /* ── Admin: list engineers needing verification ────────────── */
  async listPendingVerifications(date?: string): Promise<OdometerVerification[]> {
    const targetDate = date ?? todayStr();
    const { data, error } = await supabase
      .from('odometer_verifications')
      .select('*')
      .eq('date', targetDate)
      .order('engineer_name');
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToVerification);
  },

  async getVerificationByEngineer(engineerId: string, date?: string): Promise<OdometerVerification | null> {
    const { data, error } = await supabase
      .from('odometer_verifications')
      .select('*')
      .eq('engineer_id', engineerId)
      .eq('date', date ?? todayStr())
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToVerification(data) : null;
  },

  /* ── Admin: save readings ──────────────────────────────────── */
  async saveVerification(params: {
    engineerId: string;
    engineerName: string;
    bikeId?: string;
    date: string;
    morningPhotoId?: string;
    eveningPhotoId?: string;
    morningReading: number;
    eveningReading: number;
    verifiedBy: string;
  }): Promise<OdometerVerification> {
    if (params.eveningReading <= params.morningReading) {
      throw new Error('Evening reading must be greater than morning reading');
    }
    const now = new Date().toISOString();
    const row = {
      engineer_id:       params.engineerId,
      engineer_name:     params.engineerName,
      bike_id:           params.bikeId || null,
      date:              params.date,
      morning_photo_id:  params.morningPhotoId || null,
      evening_photo_id:  params.eveningPhotoId || null,
      morning_reading:   params.morningReading,
      evening_reading:   params.eveningReading,
      verified_by:       params.verifiedBy,
      verified_at:       now,
      status:            'verified',
      updated_at:        now,
    };
    const { data, error } = await supabase
      .from('odometer_verifications')
      .upsert(row, { onConflict: 'engineer_id,date' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToVerification(data);
  },

  /* ── Admin: get photos for an engineer on a date ─────────── */
  async getPhotosForDate(engineerId: string, date: string): Promise<{ morning?: OdometerPhoto; evening?: OdometerPhoto }> {
    const { data, error } = await supabase
      .from('odometer_photos')
      .select('*')
      .eq('engineer_id', engineerId)
      .eq('date', date);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    return {
      morning: rows.find((r) => r.photo_type === 'morning') ? rowToPhoto(rows.find((r) => r.photo_type === 'morning')!) : undefined,
      evening: rows.find((r) => r.photo_type === 'evening') ? rowToPhoto(rows.find((r) => r.photo_type === 'evening')!) : undefined,
    };
  },
};
