export type AttendanceStatusType = 'present' | 'short_hours' | 'active' | 'leave' | 'absent' | 'weekend' | 'upcoming';

export interface AttendanceCellData {
  date: string; // YYYY-MM-DD
  dayName: string; // Sunday, Monday...
  dayNumber: number; // 4, 5...
  status: AttendanceStatusType;
  hoursFormatted?: string; // '8 Hours', '4h 36m'
  hoursNumeric?: number; // 8.0, 4.6
  checkInTime?: string; // e.g. '09:15 AM'
  checkOutTime?: string; // e.g. '05:45 PM'
  checkInGPS?: { latitude: number; longitude: number };
  isWeekend: boolean;
  notes?: string;
}

export interface EmployeeAttendanceRow {
  id: string;
  name: string;
  role: string;
  department: string;
  avatarUrl?: string;
  initials: string;
  days: AttendanceCellData[];
  weekTotalHours: number;
}

export interface AttendanceKPIStatsData {
  presentToday: number;
  peopleRemaining: number;
  lateEntry: number;
  onTime: number;
  onLeave: number;
  approvedLeaveNote: string;
  absent: number;
  absentNote: string;
}

export type QuickFilterTag = 'leave' | 'absent' | 'active';

export function formatDisplayName(name: string): string {
  if (!name) return 'Employee';
  const clean = name.trim();
  // Match Dhavalkurkuitya or Dhavalkurkutiya regardless of spacing or typos
  if (/^dhaval\s*kurkui?tya$/i.test(clean)) {
    return 'Dhaval Kurkutiya';
  }
  // Split camelCase or PascalCase (e.g. JohnDoe -> John Doe)
  return clean.replace(/([a-z])([A-Z])/g, '$1 $2');
}
