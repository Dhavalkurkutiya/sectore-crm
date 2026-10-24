import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AttendanceCellDetailPopover } from './AttendanceCellDetailPopover';
import type { EmployeeAttendanceRow, AttendanceCellData } from './types';
import { formatDisplayName } from './types';
import { Clock, CheckCircle, CalendarOff, XCircle, Radio } from 'lucide-react';

interface AttendanceMatrixTableProps {
  rows: EmployeeAttendanceRow[];
}

export function AttendanceMatrixTable({ rows }: AttendanceMatrixTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
        <p className="text-sm font-medium text-muted-foreground">No employees found matching the filter criteria.</p>
      </div>
    );
  }

  // Use the days header from the first row
  const headerDays = rows[0]?.days || [];

  return (
    <div className="w-full rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          {/* Table Header */}
          <thead>
            <tr className="border-b border-border/80 bg-muted/20">
              {/* Employee Column Header */}
              <th className="sticky left-0 z-20 bg-card/95 backdrop-blur-xs py-3.5 px-3 sm:px-4 font-semibold text-xs text-foreground uppercase tracking-wider min-w-[180px] sm:min-w-[220px] border-r border-border/40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.04)]">
                Employee
              </th>

              {/* Day Headers (Sunday to Saturday) */}
              {headerDays.map((day) => (
                <th
                  key={day.date}
                  className={`py-3.5 px-2.5 sm:px-3 font-medium text-center min-w-[110px] sm:min-w-[125px] border-l border-border/40 ${
                    day.isWeekend ? 'bg-muted/20 text-foreground' : 'text-foreground'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span className="text-xs font-semibold text-foreground">{day.dayName}</span>
                    <span className={`text-[11px] font-mono font-bold ${day.isWeekend ? 'text-primary' : 'text-muted-foreground'}`}>
                      {day.dayNumber}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-border/60">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-muted/25 transition-colors group"
              >
                {/* Employee info (Sticky on horizontal scroll) */}
                <td className="sticky left-0 z-10 bg-card group-hover:bg-muted/30 transition-colors py-3 px-3 sm:px-4 border-r border-border/40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9 ring-1 ring-border/60 shrink-0">
                      <AvatarImage src={row.avatarUrl} alt={row.name} />
                      <AvatarFallback className="text-[11px] sm:text-xs font-bold bg-primary/10 text-primary">
                        {row.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-xs sm:text-sm text-foreground truncate" title={row.name}>
                        {formatDisplayName(row.name)}
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                        {row.role}
                      </span>
                    </div>
                  </div>
                </td>

                {/* 7 Days Attendance Cells */}
                {row.days.map((cell) => {
                  // Only apply diagonal hatch background if it's a weekend AND employee did not work
                  const isWeekendOff = cell.isWeekend && cell.status === 'weekend';

                  return (
                    <td
                      key={cell.date}
                      className={`p-2.5 text-center border-l border-border/40 align-middle ${
                        isWeekendOff
                          ? 'bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,rgba(150,150,150,0.06)_8px,rgba(150,150,150,0.06)_16px)]'
                          : ''
                      }`}
                    >
                      <AttendanceCellDetailPopover cell={cell} employeeName={row.name}>
                        <div className="flex justify-center">
                          <StatusPill cell={cell} />
                        </div>
                      </AttendanceCellDetailPopover>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Render individual status pill matching Sage UI design
 * Handles Sunday duty, weekend punches, active, present, leave, absent & upcoming
 */
function StatusPill({ cell }: { cell: AttendanceCellData }) {
  // 1. Weekend Off (Sunday/Saturday without punch)
  if (cell.status === 'weekend') {
    return <span className="text-xs font-mono text-muted-foreground/30">—</span>;
  }

  // 2. Upcoming Day (Future date in the week)
  if (cell.status === 'upcoming') {
    return <span className="text-xs font-mono text-muted-foreground/40">—</span>;
  }

  // 3. Leave
  if (cell.status === 'leave') {
    return (
      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-100/90 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/80 shadow-2xs hover:scale-105 transition-transform cursor-pointer">
        <CalendarOff size={12} className="shrink-0" />
        <span>Leave</span>
      </button>
    );
  }

  // 4. Absent
  if (cell.status === 'absent') {
    return (
      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-100/90 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80 shadow-2xs hover:scale-105 transition-transform cursor-pointer">
        <XCircle size={12} className="shrink-0" />
        <span>Absent</span>
      </button>
    );
  }

  // 5. Active (Currently punched in - works on any day including Sunday)
  if (cell.status === 'active') {
    return (
      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/80 shadow-2xs hover:scale-105 transition-transform cursor-pointer">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
        </span>
        <span>Active</span>
        {cell.isWeekend && (
          <span className="text-[9px] px-1 py-0.2 bg-teal-200/80 dark:bg-teal-900 rounded font-bold text-teal-900 dark:text-teal-200">
            {cell.dayName.slice(0, 3)}
          </span>
        )}
      </button>
    );
  }

  // 6. Short Hours (e.g. 4h 36m, 6h 24m) - Amber
  if (cell.status === 'short_hours') {
    return (
      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 shadow-2xs hover:scale-105 transition-transform cursor-pointer">
        <Clock size={12} className="shrink-0 text-amber-600 dark:text-amber-400" />
        <span>{cell.hoursFormatted || `${cell.hoursNumeric}h`}</span>
        {cell.isWeekend && (
          <span className="text-[9px] px-1 py-0.2 bg-amber-200/80 dark:bg-amber-900 rounded font-bold text-amber-900 dark:text-amber-200">
            {cell.dayName.slice(0, 3)}
          </span>
        )}
      </button>
    );
  }

  // 7. Present (Full workday e.g. 8 Hours - works on Sunday too!)
  return (
    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs hover:scale-105 transition-transform cursor-pointer">
      <CheckCircle size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span>{cell.hoursFormatted || '8 Hours'}</span>
      {cell.isWeekend && (
        <span className="text-[9px] px-1 py-0.2 bg-emerald-200/80 dark:bg-emerald-900 rounded font-bold text-emerald-900 dark:text-emerald-200">
          {cell.dayName.slice(0, 3)}
        </span>
      )}
    </button>
  );
}
