import React from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

interface HorizontalWeekStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  attendanceDates?: Set<string>; // dates where user attended
}

export function HorizontalWeekStrip({
  selectedDate,
  onSelectDate,
  attendanceDates = new Set(),
}: HorizontalWeekStripProps) {
  // Generate 7 days of the week centered or starting Sunday/Monday
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="w-full flex items-center justify-between gap-1.5 overflow-x-auto py-1 px-0.5 no-scrollbar">
      {days.map((day) => {
        const isSelected = isSameDay(day, selectedDate);
        const dateStr = format(day, 'yyyy-MM-dd');
        const hasAttendance = attendanceDates.has(dateStr);
        const dayNum = format(day, 'dd');
        const dayName = format(day, 'EEE');

        return (
          <button
            key={dateStr}
            type="button"
            onClick={() => onSelectDate(day)}
            className={`flex-1 min-w-[46px] sm:min-w-[54px] py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
              isSelected
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.03]'
                : 'bg-card hover:bg-muted/60 text-muted-foreground border border-border/60 hover:text-foreground'
            }`}
          >
            <span
              className={`text-xs sm:text-sm font-extrabold font-mono tracking-tight ${
                isSelected ? 'text-white' : 'text-foreground'
              }`}
            >
              {dayNum}
            </span>
            <span
              className={`text-[10px] sm:text-[11px] font-semibold mt-0.5 ${
                isSelected ? 'text-blue-100' : 'text-muted-foreground'
              }`}
            >
              {dayName}
            </span>

            {/* Attendance Status Dot */}
            <div className="h-1.5 mt-1 flex items-center justify-center">
              {hasAttendance ? (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? 'bg-white' : 'bg-emerald-500'
                  }`}
                />
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
