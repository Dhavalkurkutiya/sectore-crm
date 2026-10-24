import { format, startOfWeek, addDays, isAfter, isBefore, isToday, startOfDay } from 'date-fns';
import type { EmployeeAttendanceRow, AttendanceKPIStatsData, AttendanceCellData } from './types';
import type { Attendance } from '@/types/engineer';

export const INITIAL_KPI_STATS: AttendanceKPIStatsData = {
  presentToday: 40,
  peopleRemaining: 124,
  lateEntry: 26,
  onTime: 12,
  onLeave: 4,
  approvedLeaveNote: 'Approved Leave',
  absent: 1,
  absentNote: 'Without Informing',
};

export const BASE_EMPLOYEES = [
  {
    id: 'emp-1',
    name: 'Dhaval Kurkutiya',
    role: 'Technical Lead / Field Ops',
    department: 'Engineering',
    avatarUrl: '',
    initials: 'DK',
  },
  {
    id: 'emp-2',
    name: 'Sushil Kumar Jaiswar',
    role: 'Senior Field Engineer',
    department: 'Field Operations',
    avatarUrl: '',
    initials: 'SJ',
  },
  {
    id: 'emp-3',
    name: 'Dianne Russell',
    role: 'UI/UX Designer',
    department: 'Product Design',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    initials: 'DR',
  },
  {
    id: 'emp-4',
    name: 'Bessie Cooper',
    role: 'Product Designer',
    department: 'Design',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    initials: 'BC',
  },
  {
    id: 'emp-5',
    name: 'Brooklyn Jones',
    role: 'Marketing Officer',
    department: 'Marketing',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    initials: 'BJ',
  },
  {
    id: 'emp-6',
    name: 'Eleanor Pena',
    role: 'Content Writer',
    department: 'Content & Comms',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    initials: 'EP',
  },
  {
    id: 'emp-7',
    name: 'Darlene Robert',
    role: 'UX Engineer',
    department: 'Engineering',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    initials: 'DR',
  },
];

/**
 * Generate 7 days for the week containing the reference date (starts Sunday)
 */
export function getDaysOfWeek(refDate: Date): { date: string; dateObj: Date; dayName: string; dayNumber: number; isWeekend: boolean }[] {
  // Start week on Sunday (weekStartsOn: 0)
  const sunday = startOfWeek(refDate, { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(sunday, i);
    const dayOfWeek = d.getDay(); // 0 is Sun, 6 is Sat
    return {
      date: format(d, 'yyyy-MM-dd'),
      dateObj: d,
      dayName: format(d, 'EEEE'),
      dayNumber: parseInt(format(d, 'd'), 10),
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    };
  });
}

export interface EmployeeInput {
  id: string;
  name: string;
  role?: string;
  department?: string;
  avatarUrl?: string;
  initials?: string;
}

export function getInitials(name: string): string {
  if (!name) return 'EM';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Build Weekly Attendance Matrix from Real Employees + Real DB Attendance Records.
 * Handles Sunday duty, weekend overtime, upcoming days, and dynamic matching.
 */
export function buildWeeklyMatrix(
  refDate: Date,
  realDbRecords: Attendance[] = [],
  customEmployees?: EmployeeInput[]
): EmployeeAttendanceRow[] {
  const weekDays = getDaysOfWeek(refDate);
  const now = startOfDay(new Date());

  // Filter out Admin / SuperAdmin and deduplicate by name (only show real employees)
  const candidateList =
    customEmployees && customEmployees.length > 0 ? customEmployees : BASE_EMPLOYEES;

  const seen = new Set<string>();
  const employeesToUse: EmployeeInput[] = [];

  for (const e of candidateList) {
    const rawName = (e.name || '').trim();
    const rawRole = (e.role || '').trim();
    const cleanName = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Skip Super Admin and Admin
    if (
      !cleanName ||
      cleanName.includes('superadmin') ||
      cleanName.includes('admin') ||
      rawRole.toLowerCase().includes('admin') ||
      rawRole.toLowerCase().includes('superadmin')
    ) {
      continue;
    }

    // Deduplicate by name
    if (!seen.has(cleanName)) {
      seen.add(cleanName);
      employeesToUse.push({
        id: e.id,
        name: rawName,
        role: rawRole || 'Field Service Engineer',
        department: e.department || 'Operations',
        avatarUrl: e.avatarUrl || '',
        initials: e.initials || getInitials(rawName),
      });
    }
  }

  // Build high-efficiency lookup maps for real DB attendance records
  // 1. Map by `${engineerId}_${date}`
  // 2. Map by `${cleanName}_${date}`
  const idDateMap = new Map<string, Attendance>();
  const nameDateMap = new Map<string, Attendance>();

  for (const r of realDbRecords) {
    if (r.date) {
      if (r.engineerId) {
        idDateMap.set(`${r.engineerId}_${r.date}`, r);
      }
      if (r.engineerName) {
        const cleanName = r.engineerName.toLowerCase().replace(/[^a-z0-9]/g, '');
        nameDateMap.set(`${cleanName}_${r.date}`, r);
      }
    }
  }

  return employeesToUse.map((emp) => {
    const cleanEmpName = emp.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    const days: AttendanceCellData[] = weekDays.map((wd) => {
      // Find matching record by ID or Name
      const recordById = idDateMap.get(`${emp.id}_${wd.date}`);
      const recordByName = nameDateMap.get(`${cleanEmpName}_${wd.date}`);
      const dbRecord = recordById || recordByName;

      const cellDateObj = startOfDay(wd.dateObj);
      const isPastDay = isBefore(cellDateObj, now);
      const isCurrentDay = isToday(cellDateObj);
      const isFutureDay = isAfter(cellDateObj, now);

      // ── CASE 1: REAL ATTENDANCE RECORD EXISTS (Works on ANY day, including Sunday!) ──
      if (dbRecord) {
        const inTime = dbRecord.checkInTime ? formatTime(dbRecord.checkInTime) : undefined;
        const outTime = dbRecord.checkOutTime ? formatTime(dbRecord.checkOutTime) : undefined;
        const hours = dbRecord.workingHours ?? 0;
        const isActive = dbRecord.status === 'checked_in' && !dbRecord.checkOutTime;

        let status: AttendanceCellData['status'] = 'present';
        let formattedHours = '8 Hours';

        if (dbRecord.status === 'leave' || dbRecord.status === 'On Leave') {
          status = 'leave';
          formattedHours = undefined as unknown as string;
        } else if (dbRecord.status === 'absent' || dbRecord.status === 'Absent') {
          status = 'absent';
          formattedHours = undefined as unknown as string;
        } else if (isActive) {
          status = 'active';
          formattedHours = undefined as unknown as string;
        } else if (hours > 0) {
          if (hours >= 7.5) {
            status = 'present';
            formattedHours = hours === 8 ? '8 Hours' : `${hours.toFixed(1)}h`;
          } else {
            status = 'short_hours';
            formattedHours = formatDecimalHours(hours);
          }
        } else {
          status = 'present';
          formattedHours = 'Present';
        }

        return {
          date: wd.date,
          dayName: wd.dayName,
          dayNumber: wd.dayNumber,
          isWeekend: wd.isWeekend,
          status,
          hoursFormatted: formattedHours,
          hoursNumeric: hours > 0 ? hours : isActive ? 8 : 0,
          checkInTime: inTime,
          checkOutTime: outTime,
          checkInGPS: dbRecord.checkInGPS,
          notes: dbRecord.notes || (wd.isWeekend ? 'Weekend Duty' : undefined),
        };
      }

      // ── CASE 2: NO RECORD ON WEEKEND (Sunday / Saturday Off) ──────────────
      if (wd.isWeekend) {
        return {
          date: wd.date,
          dayName: wd.dayName,
          dayNumber: wd.dayNumber,
          isWeekend: true,
          status: 'weekend',
          hoursFormatted: undefined,
          hoursNumeric: 0,
          checkInTime: undefined,
          checkOutTime: undefined,
          notes: 'Week Off',
        };
      }

      // ── CASE 3: FUTURE DAYS IN THE WEEK (Upcoming) ───────────────────────
      if (isFutureDay) {
        return {
          date: wd.date,
          dayName: wd.dayName,
          dayNumber: wd.dayNumber,
          isWeekend: false,
          status: 'upcoming',
          hoursFormatted: undefined,
          hoursNumeric: 0,
          notes: 'Upcoming',
        };
      }

      // ── CASE 4: CURRENT DAY (TODAY - Not punched in yet) ─────────────────
      if (isCurrentDay) {
        return {
          date: wd.date,
          dayName: wd.dayName,
          dayNumber: wd.dayNumber,
          isWeekend: false,
          status: 'upcoming',
          hoursFormatted: undefined,
          hoursNumeric: 0,
          notes: 'Pending Check-In',
        };
      }

      // ── CASE 5: PAST WORKING DAY WITH NO RECORD (Absent) ─────────────────
      // If past working day and employee did not punch in:
      return {
        date: wd.date,
        dayName: wd.dayName,
        dayNumber: wd.dayNumber,
        isWeekend: false,
        status: 'absent',
        hoursFormatted: undefined,
        hoursNumeric: 0,
        notes: 'Absent without notice',
      };
    });

    const weekTotalHours = days.reduce((sum, d) => sum + (d.hoursNumeric || 0), 0);

    return {
      id: emp.id,
      name: emp.name,
      role: emp.role || 'Staff Member',
      department: emp.department || 'Operations',
      avatarUrl: emp.avatarUrl || '',
      initials: emp.initials || getInitials(emp.name),
      days,
      weekTotalHours,
    };
  });
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function formatDecimalHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h} Hours`;
  return `${h}h ${m}m`;
}
