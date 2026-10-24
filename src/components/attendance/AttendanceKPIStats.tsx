import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Clock, CalendarDays, UserX } from 'lucide-react';
import type { AttendanceKPIStatsData } from './types';

interface AttendanceKPIStatsProps {
  stats: AttendanceKPIStatsData;
}

export function AttendanceKPIStats({ stats }: AttendanceKPIStatsProps) {
  const cards = [
    {
      title: 'Present Today',
      value: stats.presentToday < 10 ? `0${stats.presentToday}` : `${stats.presentToday}`,
      subtext: `${stats.peopleRemaining} People Remaining`,
      icon: CheckCircle2,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-100 dark:border-emerald-900',
    },
    {
      title: 'Late Entry',
      value: stats.lateEntry < 10 ? `0${stats.lateEntry}` : `${stats.lateEntry}`,
      subtext: `${stats.onTime} People are on Time`,
      icon: Clock,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-100 dark:border-amber-900',
    },
    {
      title: 'On Leave',
      value: stats.onLeave < 10 ? `0${stats.onLeave}` : `${stats.onLeave}`,
      subtext: stats.approvedLeaveNote,
      icon: CalendarDays,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-100 dark:border-purple-900',
    },
    {
      title: 'Absent',
      value: stats.absent < 10 ? `0${stats.absent}` : `${stats.absent}`,
      subtext: stats.absentNote,
      icon: UserX,
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-100 dark:border-rose-900',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card
            key={c.title}
            className="border border-border/80 shadow-xs bg-card hover:shadow-md transition-shadow duration-200 rounded-2xl overflow-hidden"
          >
            <CardContent className="p-3.5 sm:p-5 flex flex-col justify-between h-full gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className={`p-1.5 rounded-lg border ${c.iconBg} ${c.iconColor} shrink-0`}>
                  <Icon size={15} strokeWidth={2.2} />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-foreground tracking-tight truncate">
                  {c.title}
                </span>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight font-mono">
                  {c.value}
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
                  {c.subtext}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
