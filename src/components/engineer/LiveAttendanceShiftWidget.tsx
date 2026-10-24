import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LogIn,
  LogOut,
  Clock,
  Calendar,
  Coffee,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { SwipeActionButton } from './SwipeActionButton';
import { HorizontalWeekStrip } from './HorizontalWeekStrip';
import type { Attendance } from '@/types/engineer';

interface LiveAttendanceShiftWidgetProps {
  attendance: Attendance | null;
  onCheckInClick?: () => void;
  onCheckOutClick?: () => void;
  monthlyPresentDays?: number;
}

export function LiveAttendanceShiftWidget({
  attendance,
  onCheckInClick,
  onCheckOutClick,
  monthlyPresentDays = 24,
}: LiveAttendanceShiftWidgetProps) {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second for live shift elapsed time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const checkedIn = attendance?.status === 'checked_in';
  const checkedOut = attendance?.status === 'checked_out';

  // Live elapsed time calculation
  const elapsed = (() => {
    if (!checkedIn || !attendance?.checkInTime) {
      if (checkedOut && attendance?.workingHours) {
        const h = Math.floor(attendance.workingHours);
        const m = Math.round((attendance.workingHours - h) * 60);
        return `${h}h ${m}m`;
      }
      return '00:00 min';
    }
    const startMs = new Date(attendance.checkInTime).getTime();
    const nowMs = currentTime.getTime();
    const diffMs = Math.max(0, nowMs - startMs);

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  })();

  // Shift start threshold check (e.g. after 09:45 AM is considered Late)
  const isLate = (() => {
    if (attendance?.checkInTime) {
      const punchInDate = new Date(attendance.checkInTime);
      return punchInDate.getHours() > 9 || (punchInDate.getHours() === 9 && punchInDate.getMinutes() > 45);
    }
    return currentTime.getHours() > 9 || (currentTime.getHours() === 9 && currentTime.getMinutes() > 45);
  })();

  function fmtTime(iso?: string) {
    if (!iso) return '--:--';
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
    } catch {
      return iso;
    }
  }

  // Handle Swipe Actions
  const handleSwipeAction = () => {
    if (!checkedIn && !checkedOut) {
      if (onCheckInClick) {
        onCheckInClick();
      } else {
        navigate('/engineer/attendance/checkin');
      }
    } else if (checkedIn) {
      if (onCheckOutClick) {
        onCheckOutClick();
      } else {
        navigate('/engineer/daily-report');
      }
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* ── 1. Horizontal Date Strip ───────────────────────────── */}
      <div className="space-y-1.5">
        <HorizontalWeekStrip
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          attendanceDates={new Set([new Date().toISOString().slice(0, 10)])}
        />
      </div>

      {/* ── 2. Today Attendance Section ───────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
            Today Attendance
          </h2>
          {checkedIn && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Shift Active
            </span>
          )}
        </div>

        {/* 4 Clean Cards Grid (Matching Image 1 reference) */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {/* Card 1: Check In */}
          <Card className="rounded-2xl border border-border/70 bg-card hover:border-blue-400/50 transition-all shadow-xs overflow-hidden">
            <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <LogIn size={13} />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">Check In</span>
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold font-mono tracking-tight text-foreground">
                  {attendance?.checkInTime ? fmtTime(attendance.checkInTime) : '--:--'}
                </p>
                <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                  {attendance?.checkInTime
                    ? isLate
                      ? 'Late Entry'
                      : 'On Time'
                    : 'Not In Yet'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Check Out */}
          <Card className="rounded-2xl border border-border/70 bg-card hover:border-blue-400/50 transition-all shadow-xs overflow-hidden">
            <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-cyan-50 dark:bg-cyan-950/70 border border-cyan-200 dark:border-cyan-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                  <LogOut size={13} />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">Check Out</span>
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold font-mono tracking-tight text-foreground">
                  {attendance?.checkOutTime ? fmtTime(attendance.checkOutTime) : '--:--'}
                </p>
                <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                  {checkedOut ? 'Shift Ended' : checkedIn ? 'Working Now' : 'Pending'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Shift Duration / Live Elapsed Timer */}
          <Card className="rounded-2xl border border-border/70 bg-card hover:border-blue-400/50 transition-all shadow-xs overflow-hidden">
            <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Coffee size={13} />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">
                  {checkedIn ? 'Live Timer' : 'Shift Duration'}
                </span>
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold font-mono tracking-tight text-foreground">
                  {elapsed}
                </p>
                <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                  {checkedIn ? 'Shift Elapsed' : checkedOut ? 'Total Completed' : 'Target: 8h 00m'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Total Working Days (Personal) */}
          <Card className="rounded-2xl border border-border/70 bg-card hover:border-blue-400/50 transition-all shadow-xs overflow-hidden">
            <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-purple-50 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <Calendar size={13} />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">Total Days</span>
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold font-mono tracking-tight text-foreground">
                  {monthlyPresentDays}
                </p>
                <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                  Working Days (This Month)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── 3. Your Activity / Zomato-Swiggy Style Swipe Button ── */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Your Activity
          </span>
          <button
            type="button"
            onClick={() => navigate('/engineer/attendance/history')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            View History
          </button>
        </div>

        {checkedOut ? (
          /* Shift completed state banner */
          <div className="w-full py-3.5 px-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-foreground">Today's Shift Completed!</p>
                <p className="text-[11px] text-muted-foreground">
                  In: {fmtTime(attendance?.checkInTime)} · Out: {fmtTime(attendance?.checkOutTime)} ({attendance?.workingHours?.toFixed(1) || '8.0'}h)
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white border-0 text-[10px] shrink-0">Present ✓</Badge>
          </div>
        ) : checkedIn ? (
          /* Swipe to Check Out (Zomato/Swiggy Style) */
          <SwipeActionButton
            label="Swipe to Check Out"
            successLabel="Checking out..."
            variant="checkout"
            onAction={handleSwipeAction}
          />
        ) : (
          /* Swipe to Check In (Zomato/Swiggy Style) */
          <SwipeActionButton
            label="Swipe to Check In"
            successLabel="Checking in..."
            variant="checkin"
            onAction={handleSwipeAction}
          />
        )}
      </div>
    </div>
  );
}
