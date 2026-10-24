import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  MapPin,
  Calendar,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import type { AttendanceCellData } from './types';
import { formatDisplayName } from './types';
import { format, parseISO } from 'date-fns';

interface AttendanceCellDetailPopoverProps {
  children: React.ReactNode;
  cell: AttendanceCellData;
  employeeName: string;
}

function formatCellDate(dateStr: string, fallbackDayName?: string, fallbackDayNumber?: number): string {
  try {
    const d = parseISO(dateStr);
    if (!isNaN(d.getTime())) {
      return format(d, 'EEEE, dd MMMM yyyy');
    }
  } catch {
    // fallback
  }
  if (fallbackDayName && fallbackDayNumber) {
    return `${fallbackDayName}, ${fallbackDayNumber}`;
  }
  return dateStr;
}

export function AttendanceCellDetailPopover({
  children,
  cell,
  employeeName,
}: AttendanceCellDetailPopoverProps) {
  // Only suppress popover if it's an off day or upcoming day with no punch
  if (cell.status === 'weekend' || cell.status === 'upcoming') {
    return <>{children}</>;
  }

  const mapUrl = cell.checkInGPS
    ? `https://www.google.com/maps?q=${cell.checkInGPS.latitude},${cell.checkInGPS.longitude}`
    : undefined;

  const formattedDate = formatCellDate(cell.date, cell.dayName, cell.dayNumber);

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={8}
        collisionPadding={16}
        avoidCollisions={true}
        className="w-[calc(100vw-32px)] sm:w-[350px] max-w-[360px] p-4 rounded-2xl shadow-2xl border border-border/80 bg-card text-card-foreground z-50 animate-in fade-in-0 zoom-in-95"
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="border-b border-border/60 pb-2.5 space-y-1.5">
            {/* Row 1: Name + Status Badge */}
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-foreground truncate" title={employeeName}>
                {formatDisplayName(employeeName)}
              </h4>
              <CellStatusBadge status={cell.status} hoursFormatted={cell.hoursFormatted} />
            </div>

            {/* Row 2: Date + Weekend Badge (if applicable) cleanly separated */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                <Calendar size={13} className="text-primary shrink-0" />
                <span className="font-medium text-foreground/85 truncate">{formattedDate}</span>
              </div>
              {cell.isWeekend && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 whitespace-nowrap shrink-0">
                  Weekend Duty
                </span>
              )}
            </div>
          </div>

          {/* Timing details */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-muted/40 border border-border/30">
              <span className="text-muted-foreground flex items-center gap-2 font-medium">
                <Clock size={13} className="text-emerald-500 shrink-0" /> Check In
              </span>
              <span className="font-semibold text-foreground font-mono">
                {cell.checkInTime || '—'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-muted/40 border border-border/30">
              <span className="text-muted-foreground flex items-center gap-2 font-medium">
                <Clock size={13} className="text-rose-500 shrink-0" /> Check Out
              </span>
              <span className="font-semibold text-foreground font-mono">
                {cell.checkOutTime || '—'}
              </span>
            </div>

            {cell.hoursNumeric || cell.hoursFormatted ? (
              <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
                <span className="text-blue-700 dark:text-blue-300 font-medium">Total Working</span>
                <span className="font-bold text-blue-700 dark:text-blue-300 font-mono">
                  {cell.hoursFormatted || `${cell.hoursNumeric}h`}
                </span>
              </div>
            ) : null}

            {cell.notes && (
              <div className="p-2.5 rounded-xl bg-muted/30 text-xs text-muted-foreground border border-border/40">
                <span className="font-semibold text-foreground">Note: </span>
                <span>{cell.notes}</span>
              </div>
            )}
          </div>

          {/* GPS Location & Verification */}
          {cell.checkInGPS && (
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin size={13} className="text-primary shrink-0" />
                <span className="font-mono text-[11px]">
                  {cell.checkInGPS.latitude.toFixed(4)}, {cell.checkInGPS.longitude.toFixed(4)}
                </span>
              </div>
              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline font-semibold text-xs"
                >
                  Map <ExternalLink size={11} />
                </a>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 justify-end font-medium">
            <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
            <span>Geo-verified punch</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CellStatusBadge({ status, hoursFormatted }: { status: string; hoursFormatted?: string }) {
  if (status === 'leave') {
    return (
      <Badge className="bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-0 text-xs font-semibold px-2.5 py-0.5 rounded-lg whitespace-nowrap shrink-0">
        Leave
      </Badge>
    );
  }
  if (status === 'absent') {
    return (
      <Badge className="bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-0 text-xs font-semibold px-2.5 py-0.5 rounded-lg whitespace-nowrap shrink-0">
        Absent
      </Badge>
    );
  }
  if (status === 'active') {
    return (
      <Badge className="bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border-0 text-xs font-semibold px-2.5 py-0.5 rounded-lg whitespace-nowrap shrink-0">
        Active
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-0 text-xs font-semibold px-2.5 py-0.5 rounded-lg whitespace-nowrap shrink-0">
      {hoursFormatted || 'Present'}
    </Badge>
  );
}
