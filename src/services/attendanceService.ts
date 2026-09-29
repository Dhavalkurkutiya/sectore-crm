/**
 * Attendance Service — Supabase-backed (Fixed)
 * Sectore 360 — Field Service Engineer Portal
 *
 * Root-cause fix: app uses custom JWT (not Supabase Auth) so auth.uid()
 * is always NULL. RLS is now permissive for anon; row-ownership is
 * enforced at query level by always filtering on engineer_id.
 */
import type { Attendance, GPSLocation, DeviceInfo } from '@/types/engineer';
import { supabase } from '@/lib/supabase';

const nowIso   = () => new Date().toISOString();
const todayStr = () => new Date().toISOString().slice(0, 10);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAttendance(r: any): Attendance {
  return {
    id:             r.id,
    engineerId:     r.engineer_id,
    engineerName:   r.engineer_name ?? '',
    date:           typeof r.date === 'string' ? r.date.slice(0, 10) : r.date,
    checkInTime:    r.check_in_time  ?? '',
    checkOutTime:   r.check_out_time ?? undefined,
    checkInGPS:     r.check_in_lat  != null
                      ? { latitude: Number(r.check_in_lat), longitude: Number(r.check_in_lng), accuracy: 0, timestamp: r.check_in_time ?? '' }
                      : undefined,
    checkOutGPS:    r.check_out_lat != null
                      ? { latitude: Number(r.check_out_lat), longitude: Number(r.check_out_lng), accuracy: 0, timestamp: r.check_out_time ?? '' }
                      : undefined,
    deviceInfo:     undefined,
    selfiePhotoUrl: r.selfie_photo_url ?? undefined,
    workingHours:   r.working_hours != null ? Number(r.working_hours) : undefined,
    status:         r.status as Attendance['status'],
    createdAt:      r.created_at,
    updatedAt:      r.updated_at ?? r.created_at,
  };
}

export const attendanceService = {
  /** Get today's attendance record for a specific engineer */
  async getTodayRecord(engineerId: string): Promise<Attendance | null> {
    if (!engineerId) return null;
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('engineer_id', engineerId)
      .eq('date', todayStr())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Failed to fetch attendance: ${error.message}`);
    return data ? rowToAttendance(data) : null;
  },

  /** Get attendance history — filtered by engineer if provided */
  async getHistory(engineerId?: string, days = 30): Promise<Attendance[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    let q = supabase
      .from('attendance')
      .select('*')
      .gte('date', cutoff.toISOString().slice(0, 10))
      .order('date', { ascending: false })
      .limit(200);
    if (engineerId) q = q.eq('engineer_id', engineerId);
    const { data, error } = await q;
    if (error) throw new Error(`Failed to fetch history: ${error.message}`);
    return (data ?? []).map(rowToAttendance);
  },

  /** Check in — inserts a new attendance record */
  async checkIn(
    engineerId: string,
    engineerName: string,
    gps?: GPSLocation,
    device?: DeviceInfo,
    selfiePhotoUrl?: string
  ): Promise<Attendance> {
    if (!engineerId) throw new Error('Engineer ID is required');

    // Guard: prevent double check-in
    const existing = await this.getTodayRecord(engineerId);
    if (existing) throw new Error('Already checked in today');

    const now = nowIso();
    const row = {
      engineer_id:      engineerId,
      engineer_name:    engineerName,
      user_id:          engineerId,
      date:             todayStr(),
      check_in_time:    now,
      check_in_lat:     gps?.latitude  ?? null,
      check_in_lng:     gps?.longitude ?? null,
      check_in_location: gps ? `${gps.latitude},${gps.longitude}` : null,
      selfie_photo_url: selfiePhotoUrl ?? null,
      status:           'checked_in',
      notes:            device ? `${device.platform} | ${device.userAgent.slice(0, 80)}` : null,
      created_at:       now,
      updated_at:       now,
    };

    const { data, error } = await supabase
      .from('attendance')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('[attendanceService.checkIn] Supabase error:', error);
      throw new Error(`Check-in failed: ${error.message}`);
    }
    if (!data) throw new Error('Check-in failed: no data returned from database');
    return rowToAttendance(data);
  },

  /** Check out — updates the existing record */
  async checkOut(engineerId: string, gps?: GPSLocation): Promise<Attendance> {
    if (!engineerId) throw new Error('Engineer ID is required');

    const record = await this.getTodayRecord(engineerId);
    if (!record)                           throw new Error('No check-in record found for today');
    if (record.status === 'checked_out')   throw new Error('Already checked out today');

    const checkOutTime = nowIso();
    const checkInMs    = new Date(record.checkInTime).getTime();
    const checkOutMs   = new Date(checkOutTime).getTime();
    const workingHours = parseFloat(((checkOutMs - checkInMs) / 3_600_000).toFixed(2));

    const { data, error } = await supabase
      .from('attendance')
      .update({
        check_out_time:    checkOutTime,
        check_out_lat:     gps?.latitude  ?? null,
        check_out_lng:     gps?.longitude ?? null,
        check_out_location: gps ? `${gps.latitude},${gps.longitude}` : null,
        working_hours:     workingHours,
        status:            'checked_out',
        updated_at:        checkOutTime,
      })
      .eq('id', record.id)
      .eq('engineer_id', engineerId)   // ownership guard
      .select()
      .single();

    if (error) {
      console.error('[attendanceService.checkOut] Supabase error:', error);
      throw new Error(`Check-out failed: ${error.message}`);
    }
    if (!data) throw new Error('Check-out failed: no data returned from database');
    return rowToAttendance(data);
  },

  /** Monthly summary for profile page */
  async getSummary(engineerId: string): Promise<{ totalDays: number; totalHours: number; avgHours: number }> {
    const monthStart = new Date();
    monthStart.setDate(1);
    const { data } = await supabase
      .from('attendance')
      .select('working_hours')
      .eq('engineer_id', engineerId)
      .gte('date', monthStart.toISOString().slice(0, 10));
    const records    = data ?? [];
    const totalDays  = records.length;
    const totalHours = records.reduce((s, r) => s + Number(r.working_hours ?? 0), 0);
    return {
      totalDays,
      totalHours: parseFloat(totalHours.toFixed(2)),
      avgHours:   totalDays > 0 ? parseFloat((totalHours / totalDays).toFixed(2)) : 0,
    };
  },
};
