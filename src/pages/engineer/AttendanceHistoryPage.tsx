/**
 * Attendance History Page — Sectore 360
 *
 * ROLE-BASED VIEWS:
 *   - Admin/SuperAdmin: Full weekly matrix of REAL employees from DB (Sage UI style)
 *                       with real-time dynamic KPIs and full Sunday/weekend duty support.
 *   - Engineer:         Personal attendance calendar — only their OWN records,
 *                       with present/absent day counts, Sunday overtime support and monthly summary.
 */
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addWeeks, subWeeks, addMonths, subMonths, format, startOfMonth,
  endOfMonth, eachDayOfInterval, isWeekend as dateIsWeekend,
  isToday, isBefore
} from 'date-fns';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useEngineerContext } from '@/contexts/EngineerContext';
import { attendanceService } from '@/services/attendanceService';
import { usersApi } from '@/lib/api';
import { engineerService } from '@/services/engineerService';
import type { Attendance } from '@/types/engineer';
import { AttendanceKPIStats } from '@/components/attendance/AttendanceKPIStats';
import { AttendanceFilterBar } from '@/components/attendance/AttendanceFilterBar';
import { AttendanceMatrixTable } from '@/components/attendance/AttendanceMatrixTable';
import { AttendanceFeedView } from '@/components/attendance/AttendanceFeedView';
import {
  buildWeeklyMatrix,
  type EmployeeInput,
} from '@/components/attendance/mockAttendanceData';
import { exportAttendanceToExcel } from '@/components/attendance/exportAttendance';
import type { QuickFilterTag, AttendanceKPIStatsData } from '@/components/attendance/types';
import { AttendanceStatusBadge } from '@/components/engineer/EngineerBadges';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton, SkeletonKPIStatCard } from '@/components/shared/Skeleton';
import {
  ChevronLeft, ChevronRight, Clock, Calendar, MapPin, Loader2,
  CheckCircle2, XCircle, CalendarDays, TrendingUp, Download,
  Timer, Award, AlertTriangle, Users
} from 'lucide-react';

// ─── Admin Matrix View (Sage-style multi-employee weekly grid) ─────────
function AdminAttendanceView() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTags, setActiveTags] = useState<QuickFilterTag[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');
  const [records, setRecords] = useState<Attendance[]>([]);
  const [staffList, setStaffList] = useState<EmployeeInput[]>([]);
  const [loading, setLoading] = useState(false);

  // Load Real Employees + Attendance Records from Supabase
  useEffect(() => {
    setLoading(true);
    Promise.all([
      attendanceService.getHistory(undefined, 90),
      usersApi.getAll({ status: 'Active' }).catch(() => []),
      engineerService.getAllProfiles().catch(() => []),
    ])
      .then(([attRecords, appUsers, engProfiles]) => {
        setRecords(attRecords);

        // Build consolidated real staff list
        const staffMap = new Map<string, EmployeeInput>();

        // 1. App Users (Active staff members)
        for (const u of appUsers) {
          if (u.role !== 'customer') {
            staffMap.set(u.id, {
              id: u.id,
              name: u.name,
              role: u.designation || (u.role === 'engineer' ? 'Field Service Engineer' : u.role.toUpperCase()),
              department: u.department || 'Operations',
              avatarUrl: u.profile_photo || u.avatar_url || '',
            });
          }
        }

        // 2. Engineer profiles (ensure all registered engineers are included)
        for (const ep of engProfiles) {
          if (!staffMap.has(ep.id)) {
            staffMap.set(ep.id, {
              id: ep.id,
              name: ep.name,
              role: ep.designation || 'Field Service Engineer',
              department: 'Field Operations',
              avatarUrl: ep.photoUrl || '',
            });
          }
        }

        const realStaff = Array.from(staffMap.values());
        setStaffList(realStaff);
      })
      .catch(() => {
        setRecords([]);
        setStaffList([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Build weekly matrix using Real Employees & Real Attendance Records
  const allMatrixRows = useMemo(
    () => buildWeeklyMatrix(currentDate, records, staffList),
    [currentDate, records, staffList]
  );

  // Calculate Real Dynamic KPI Stats for Today
  const dynamicKPIStats = useMemo<AttendanceKPIStatsData>(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayRecords = records.filter((r) => r.date === todayStr);

    const presentSet = new Set<string>();
    let lateCount = 0;
    let leaveCount = 0;

    for (const r of todayRecords) {
      if (r.status === 'leave' || r.status === 'On Leave') {
        leaveCount++;
      } else if (
        r.status === 'checked_in' ||
        r.status === 'checked_out' ||
        (r.workingHours != null && r.workingHours > 0)
      ) {
        presentSet.add(r.engineerId || r.engineerName);
        if (r.checkInTime) {
          const inDate = new Date(r.checkInTime);
          if (inDate.getHours() > 9 || (inDate.getHours() === 9 && inDate.getMinutes() > 45)) {
            lateCount++;
          }
        }
      }
    }

    const presentToday = presentSet.size;
    const totalStaffCount = staffList.length > 0 ? staffList.length : (allMatrixRows.length || 7);
    const peopleRemaining = Math.max(0, totalStaffCount - presentToday);
    const onTime = Math.max(0, presentToday - lateCount);
    const isTodaySunday = new Date().getDay() === 0;
    const absent = isTodaySunday ? 0 : Math.max(0, totalStaffCount - presentToday - leaveCount);

    return {
      presentToday,
      peopleRemaining,
      lateEntry: lateCount,
      onTime,
      onLeave: leaveCount,
      approvedLeaveNote: leaveCount > 0 ? `${leaveCount} on Approved Leave` : 'Approved Leave',
      absent,
      absentNote: absent > 0 ? `${absent} Without Informing` : 'All Staff On Duty',
    };
  }, [records, staffList, allMatrixRows]);

  // Extract unique departments for filtering
  const availableDepartments = useMemo(() => {
    const depts = new Set<string>();
    for (const r of allMatrixRows) {
      if (r.department) depts.add(r.department);
    }
    return Array.from(depts);
  }, [allMatrixRows]);

  // Filter matrix rows based on Search, Quick Tags, and Department
  const filteredMatrixRows = useMemo(() => {
    return allMatrixRows.filter((row) => {
      if (selectedDepartment !== 'all' && row.department !== selectedDepartment) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !row.name.toLowerCase().includes(q) &&
          !row.role.toLowerCase().includes(q) &&
          !row.department?.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (activeTags.length > 0) {
        const hasMatch = row.days.some((d) => activeTags.some((t) => d.status === t));
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [allMatrixRows, searchQuery, activeTags, selectedDepartment]);

  const handleToggleTag = (tag: QuickFilterTag) => {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-4 lg:px-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl border-border/80 shrink-0"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft size={18} />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Employee Attendance</h1>
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                Live DB
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Analyse attendance records of all connected employees & field engineers
            </p>
          </div>
        </div>
      </div>

      {/* Real Dynamic KPI Stats */}
      <AttendanceKPIStats stats={dynamicKPIStats} loading={loading} />

      {/* Filter bar with week navigator & Excel export */}
      <AttendanceFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTags={activeTags}
        onToggleTag={handleToggleTag}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onPrevWeek={() => setCurrentDate((d) => subWeeks(d, 1))}
        onNextWeek={() => setCurrentDate((d) => addWeeks(d, 1))}
        onToday={() => setCurrentDate(new Date())}
        onExport={() => exportAttendanceToExcel(filteredMatrixRows, currentDate)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalFiltered={filteredMatrixRows.length}
        availableDepartments={availableDepartments}
        selectedDepartment={selectedDepartment}
        onDepartmentChange={setSelectedDepartment}
      />

      {loading ? (
        <div className="h-64 flex items-center justify-center rounded-2xl border border-border bg-card">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      ) : viewMode === 'matrix' ? (
        <AttendanceMatrixTable rows={filteredMatrixRows} />
      ) : (
        <AttendanceFeedView rows={filteredMatrixRows} selectedDate={currentDate} />
      )}
    </div>
  );
}

// ─── Engineer Personal Attendance View (Only MY records) ─────────────
function EngineerAttendanceView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { engineerId, engineerName } = useEngineerContext();
  const displayName = engineerName || user?.name || 'Engineer';

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch ONLY this engineer's records from DB
  useEffect(() => {
    if (!engineerId && !user?.id) {
      setLoading(false);
      return;
    }
    const targetId = engineerId || user?.id;
    setLoading(true);
    attendanceService
      .getHistory(targetId, 90)
      .then(setRecords)
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [engineerId, user?.id]);

  // Lookup map: date string -> Attendance record
  const recordMap = useMemo(() => {
    const map = new Map<string, Attendance>();
    for (const r of records) {
      if (r.date) map.set(r.date, r);
    }
    return map;
  }, [records]);

  // Calendar days for the current month
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Compute personal stats for this month (including Sunday/Weekend overtime!)
  const myStats = useMemo(() => {
    let workingDaysCount = 0;
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let totalHours = 0;

    for (const day of calendarDays) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const rec = recordMap.get(dateStr);
      const isWknd = dateIsWeekend(day);
      const isPastDay = isBefore(day, new Date()) && !isToday(day);

      if (!isWknd && !isBefore(new Date(), day)) {
        workingDaysCount++;
      }

      // If employee worked (EVEN ON SUNDAY OR SATURDAY!):
      if (rec) {
        presentDays++;
        totalHours += rec.workingHours ?? 0;
        if (rec.checkInTime) {
          const punchIn = new Date(rec.checkInTime);
          if (punchIn.getHours() > 9 || (punchIn.getHours() === 9 && punchIn.getMinutes() > 45)) {
            lateDays++;
          }
        }
      } else if (isPastDay && !isWknd) {
        // Missed a standard working day
        absentDays++;
      }
    }

    const avgHours = presentDays > 0 ? totalHours / presentDays : 0;
    const attendancePercent =
      workingDaysCount > 0 ? Math.min(100, Math.round((presentDays / workingDaysCount) * 100)) : 0;

    return {
      totalWorkingDays: workingDaysCount,
      presentDays,
      absentDays,
      lateDays,
      totalHours,
      avgHours,
      attendancePercent,
    };
  }, [calendarDays, recordMap]);

  function fmtTime(iso?: string) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 pb-12">
      {/* ── Header ──────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-xl border-border/80 shrink-0"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={18} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My Attendance</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {displayName} — Personal attendance & shift history
          </p>
        </div>
      </div>

      {loading ? (
        <>
          {/* ── Skeleton 4 Stat Cards ─────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SkeletonKPIStatCard />
            <SkeletonKPIStatCard />
            <SkeletonKPIStatCard />
            <SkeletonKPIStatCard />
          </div>

          {/* ── Skeleton Attendance % Progress ────── */}
          <Card className="rounded-2xl border border-border/80 shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-40 rounded-md" />
                </div>
                <Skeleton className="h-5 w-12 rounded-md" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-3 w-48 rounded-md" />
            </CardContent>
          </Card>

          {/* ── Skeleton Calendar Card ────────────── */}
          <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <div className="grid grid-cols-7 gap-1.5 pt-2">
                {Array.from({ length: 14 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* ── My 4 Personal Stat Cards ─────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="rounded-2xl border border-border/80 shadow-sm">
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={15} strokeWidth={2.2} />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Present</span>
                </div>
                <div className="text-3xl font-extrabold text-foreground font-mono">{myStats.presentDays}</div>
                <p className="text-[11px] text-muted-foreground">Days attended this month</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/80 shadow-sm">
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900 text-rose-600 dark:text-rose-400">
                    <XCircle size={15} strokeWidth={2.2} />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Absent</span>
                </div>
                <div className="text-3xl font-extrabold text-foreground font-mono">{myStats.absentDays}</div>
                <p className="text-[11px] text-muted-foreground">Days missed this month</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/80 shadow-sm">
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900 text-amber-600 dark:text-amber-400">
                    <AlertTriangle size={15} strokeWidth={2.2} />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Late</span>
                </div>
                <div className="text-3xl font-extrabold text-foreground font-mono">{myStats.lateDays}</div>
                <p className="text-[11px] text-muted-foreground">Late punches (&gt;09:45 AM)</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/80 shadow-sm">
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400">
                    <Timer size={15} strokeWidth={2.2} />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Avg Hours</span>
                </div>
                <div className="text-3xl font-extrabold text-foreground font-mono">{myStats.avgHours.toFixed(1)}h</div>
                <p className="text-[11px] text-muted-foreground">Total: {myStats.totalHours.toFixed(1)}h</p>
              </CardContent>
            </Card>
          </div>

          {/* ── Attendance % Progress ─────────────── */}
          <Card className="rounded-2xl border border-border/80 shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-primary" />
                  <span className="text-sm font-bold text-foreground">Monthly Attendance Rate</span>
                </div>
                <span className="text-lg font-extrabold text-primary font-mono">{myStats.attendancePercent}%</span>
              </div>
              <Progress value={myStats.attendancePercent} className="h-3 bg-muted/60" />
              <p className="text-xs text-muted-foreground">
                {myStats.presentDays} days present in {format(currentMonth, 'MMMM yyyy')}
              </p>
            </CardContent>
          </Card>

          {/* ── Month Calendar View (With Sunday Duty Support!) ─────────────── */}
          <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
            <CardContent className="p-5 space-y-4">
              {/* Month Navigator */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setCurrentMonth((d) => subMonths(d, 1))}
                >
                  <ChevronLeft size={16} />
                </Button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="text-sm font-bold text-foreground hover:text-primary transition-colors"
                >
                  {format(currentMonth, 'MMMM yyyy')}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setCurrentMonth((d) => addMonths(d, 1))}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="text-[11px] font-semibold text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: calendarDays[0]?.getDay() ?? 0 }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {calendarDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const rec = recordMap.get(dateStr);
                  const isWknd = dateIsWeekend(day);
                  const isTdy = isToday(day);
                  const isPast = isBefore(day, new Date()) && !isTdy;

                  let bgClass = 'bg-card';
                  let textClass = 'text-muted-foreground';
                  let dotClass = '';

                  // Check if record exists FIRST (even on Sunday!)
                  if (rec) {
                    bgClass =
                      'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
                    textClass = 'text-emerald-800 dark:text-emerald-200';
                    dotClass = 'bg-emerald-500';
                  } else if (isWknd) {
                    bgClass = 'bg-muted/30';
                    textClass = 'text-muted-foreground/50';
                  } else if (isPast) {
                    bgClass = 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800';
                    textClass = 'text-rose-800 dark:text-rose-200';
                    dotClass = 'bg-rose-500';
                  }

                  return (
                    <div
                      key={dateStr}
                      className={`relative flex flex-col items-center justify-center rounded-xl p-1.5 min-h-[52px] border border-transparent text-center transition-all ${bgClass} ${
                        isTdy ? 'ring-2 ring-primary ring-offset-1' : ''
                      }`}
                    >
                      <span className={`text-xs font-semibold ${textClass}`}>{day.getDate()}</span>
                      {dotClass && <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${dotClass}`} />}
                      {rec && rec.workingHours != null && (
                        <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {rec.workingHours.toFixed(1)}h
                        </span>
                      )}
                      {rec && rec.status === 'checked_in' && !rec.checkOutTime && (
                        <span className="text-[9px] font-bold text-teal-600">Active</span>
                      )}
                      {rec && isWknd && (
                        <span className="text-[8px] font-bold text-amber-600 dark:text-amber-400">Sun</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 justify-center pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present / Duty
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Absent
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-muted" /> Week Off
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full ring-2 ring-primary" /> Today
                </span>
              </div>
            </CardContent>
          </Card>

          {/* ── Detailed Punch Records Feed ─────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-foreground">Recent Punch Records</h2>
              <span className="text-xs text-muted-foreground">{records.length} records</span>
            </div>

            {records.length === 0 ? (
              <Card className="rounded-2xl border border-border">
                <CardContent className="p-10 text-center text-muted-foreground text-sm">
                  <CalendarDays className="mx-auto mb-3 text-muted-foreground/40" size={36} />
                  No attendance records found yet.
                </CardContent>
              </Card>
            ) : (
              records.slice(0, 30).map((r) => (
                <Card
                  key={r.id}
                  className="rounded-2xl border border-border shadow-xs hover:shadow-sm transition-shadow"
                >
                  <CardContent className="p-4 flex flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar size={15} className="text-primary shrink-0" />
                        <p className="text-sm font-semibold text-foreground">
                          {format(new Date(r.date + 'T00:00:00'), 'EEE, d MMM yyyy')}
                        </p>
                      </div>
                      <AttendanceStatusBadge status={r.status} />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-emerald-500" />
                        <span>In: {fmtTime(r.checkInTime)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-rose-500" />
                        <span>Out: {fmtTime(r.checkOutTime)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Clock size={12} className="text-primary" />
                        <span>{r.workingHours != null ? `${r.workingHours.toFixed(1)}h` : '—'}</span>
                      </div>
                    </div>

                    {(r.checkInGPS || r.checkOutGPS) && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border/40">
                        <MapPin size={12} className="text-primary" />
                        {r.checkInGPS && (
                          <span>
                            Location: {r.checkInGPS.latitude.toFixed(4)}, {r.checkInGPS.longitude.toFixed(4)}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page: Routes to correct view based on role ─────────────────
export default function AttendanceHistoryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <DashboardLayout>
      {isAdmin ? <AdminAttendanceView /> : <EngineerAttendanceView />}
    </DashboardLayout>
  );
}
