import React from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AttendanceCellDetailPopover } from './AttendanceCellDetailPopover';
import type { EmployeeAttendanceRow, AttendanceCellData } from './types';
import { formatDisplayName } from './types';
import {
  Clock,
  CheckCircle2,
  CalendarOff,
  XCircle,
  Radio,
  MapPin,
  CalendarDays,
  UserCheck,
} from 'lucide-react';

interface AttendanceFeedViewProps {
  rows: EmployeeAttendanceRow[];
  selectedDate: Date;
}

export function AttendanceFeedView({ rows, selectedDate }: AttendanceFeedViewProps) {
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
        <UserCheck className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-semibold text-foreground">No attendance records found</p>
        <p className="text-xs text-muted-foreground mt-1">
          Try clearing your search query or adjusting your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {rows.map((row) => {
        // Find cell matching selected date or fallback to first available
        const currentDayCell =
          row.days.find((d) => d.date === selectedDateStr) || row.days[0];

        return (
          <Card
            key={row.id}
            className="rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
          >
            <CardContent className="p-4 space-y-4">
              {/* Header: Avatar, Name, Department & Weekly Total */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10 ring-2 ring-border/50 shrink-0">
                    <AvatarImage src={row.avatarUrl} alt={row.name} />
                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                      {row.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{formatDisplayName(row.name)}</h3>
                    <p className="text-xs text-muted-foreground truncate">{row.role}</p>
                    <span className="inline-block mt-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
                      {row.department}
                    </span>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className="shrink-0 text-xs font-semibold bg-primary/5 text-primary border-primary/20"
                >
                  {row.weekTotalHours.toFixed(1)} hrs/wk
                </Badge>
              </div>

              {/* Today / Selected Day Focus Card */}
              {currentDayCell && (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                      <CalendarDays size={13} className="text-primary" />
                      <span>{currentDayCell.dayName}, {format(new Date(currentDayCell.date), 'dd MMM')}</span>
                    </div>
                    <AttendanceCellDetailPopover cell={currentDayCell} employeeName={row.name}>
                      <button className="cursor-pointer">
                        <FeedStatusPill cell={currentDayCell} />
                      </button>
                    </AttendanceCellDetailPopover>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5 bg-card/80 p-1.5 rounded-lg border border-border/40">
                      <Clock size={12} className="text-emerald-500" />
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-muted-foreground/80 font-bold">In</span>
                        <span className="font-semibold text-foreground">
                          {currentDayCell.checkInTime || '—'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-card/80 p-1.5 rounded-lg border border-border/40">
                      <Clock size={12} className="text-rose-500" />
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-muted-foreground/80 font-bold">Out</span>
                        <span className="font-semibold text-foreground">
                          {currentDayCell.checkOutTime || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {currentDayCell.checkInGPS && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 pt-0.5">
                      <MapPin size={11} className="text-primary" />
                      <span>GPS Verified Check-in</span>
                    </div>
                  )}
                </div>
              )}

              {/* 7-Day Mini Timeline Bar */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Week At A Glance
                </p>
                <div className="grid grid-cols-7 gap-1">
                  {row.days.map((day) => {
                    const isSelected = day.date === selectedDateStr;
                    return (
                      <AttendanceCellDetailPopover
                        key={day.date}
                        cell={day}
                        employeeName={row.name}
                      >
                        <button
                          type="button"
                          className={`flex flex-col items-center justify-center p-1 rounded-lg border text-[10px] transition-all cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-primary ring-offset-1 border-primary bg-primary/10 font-bold'
                              : 'border-border/40 hover:bg-muted/60'
                          }`}
                          title={`${day.dayName}: ${day.status}`}
                        >
                          <span className="text-[9px] text-muted-foreground">
                            {day.dayName.slice(0, 2)}
                          </span>
                          <span className="font-mono text-[10px]">{day.dayNumber}</span>
                          <MiniStatusDot status={day.status} />
                        </button>
                      </AttendanceCellDetailPopover>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function MiniStatusDot({ status }: { status: AttendanceCellData['status'] }) {
  switch (status) {
    case 'present':
    case 'active':
      return <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-0.5" />;
    case 'short_hours':
      return <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-0.5" />;
    case 'leave':
      return <span className="h-1.5 w-1.5 rounded-full bg-purple-500 mt-0.5" />;
    case 'absent':
      return <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-0.5" />;
    default:
      return <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 mt-0.5" />;
  }
}

function FeedStatusPill({ cell }: { cell: AttendanceCellData }) {
  switch (cell.status) {
    case 'present':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
          <CheckCircle2 size={12} />
          {cell.hoursFormatted || 'Present'}
        </span>
      );
    case 'active':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300">
          <Radio size={11} className="animate-pulse" />
          Active Now
        </span>
      );
    case 'short_hours':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
          <Clock size={12} />
          {cell.hoursFormatted || 'Short Hours'}
        </span>
      );
    case 'leave':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300">
          <CalendarOff size={12} />
          On Leave
        </span>
      );
    case 'absent':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
          <XCircle size={12} />
          Absent
        </span>
      );
    case 'weekend':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground">
          Weekend Off
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/60 text-muted-foreground/60">
          Upcoming
        </span>
      );
  }
}
