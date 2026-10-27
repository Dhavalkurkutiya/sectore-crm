/**
 * Engineer Tasks List Page — Part 5
 * Sectore 360 — mobile-first assigned task list
 * Styled consistently with Attendance History page (Sage UI style)
 * With Interactive Monthly Calendar — clicking any date filters tasks below!
 */
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isWeekend as dateIsWeekend, isToday
} from 'date-fns';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useEngineerContext } from '@/contexts/EngineerContext';
import { engineerService } from '@/services/engineerService';
import type { Task } from '@/types/task';
import { TaskStatusBadge, TaskPriorityBadge } from '@/components/task/TaskBadges';
import { TaskTypeFlagBadge } from '@/components/engineer/EngineerBadges';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton, SkeletonKPIStatCard, SkeletonTaskCard } from '@/components/shared/Skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, ChevronRight, Calendar, SlidersHorizontal, X, ChevronLeft, Plus,
  ClipboardList, CheckCircle2, XCircle, Clock, CalendarDays, Award,
} from 'lucide-react';

type FilterStatus = 'all' | 'pending' | 'working' | 'completed' | 'overdue' | 'emergency';

function matchesFilter(task: Task, filter: FilterStatus): boolean {
  if (filter === 'all') return true;
  if (filter === 'pending') return task.status === 'Pending' || task.status === 'Assigned' || task.status === 'Waiting Parts' || task.status === 'Waiting Customer' || task.status === 'Waiting Vendor';
  if (filter === 'working') return ['Accepted', 'On The Way', 'Reached Site', 'Working', 'Waiting Customer', 'Waiting Parts', 'Waiting Vendor'].includes(task.status);
  if (filter === 'completed') return task.status === 'Completed' || task.status === 'Closed';
  if (filter === 'overdue') {
    const due = task.expectedVisitDate ?? task.createdAt;
    return !['Completed', 'Closed', 'Cancelled'].includes(task.status) && new Date(due) < new Date();
  }
  if (filter === 'emergency') return task.priority === 'Emergency';
  return true;
}

const FILTER_LABELS: Record<FilterStatus, string> = {
  all: 'All', pending: 'Pending', working: 'Working',
  completed: 'Completed', overdue: 'Overdue', emergency: 'Emergency',
};

export default function EngineerTasksPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { engineerId, userId, engineerName } = useEngineerContext();
  const displayName = engineerName || user?.name || 'Engineer';

  const [params] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>((params.get('filter') as FilterStatus) ?? 'all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'amc' | 'chargeable'>('all');
  const [showFilters, setShowFilters] = useState(false);

  /* Calendar state */
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const eid = engineerId || user?.id;
    if (!eid) return;
    const uid = userId || user?.id;
    const uname = engineerName || user?.name;
    setLoading(true);
    engineerService.getAssignedTasks(eid, { userId: uid, userName: uname })
      .then(setTasks)
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [engineerId, userId, engineerName, user?.id, user?.name]);

  /* Calendar days for current month */
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  /* Fast lookup map: date string ('YYYY-MM-DD') -> Tasks on that day */
  const taskDateMap = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const visitDate = (t.expectedVisitDate || t.createdAt || '').slice(0, 10);
      if (visitDate) {
        const list = map.get(visitDate) ?? [];
        list.push(t);
        map.set(visitDate, list);
      }
      if (t.completedAt) {
        const compDate = t.completedAt.slice(0, 10);
        if (compDate && compDate !== visitDate) {
          const list = map.get(compDate) ?? [];
          list.push(t);
          map.set(compDate, list);
        }
      }
    }
    return map;
  }, [tasks]);

  /* Tasks filtered by month and optional selected date */
  const periodTasks = useMemo(() => {
    const monthStr = format(currentMonth, 'yyyy-MM');
    return tasks.filter((t) => {
      const dateKey = (t.expectedVisitDate || t.createdAt || '').slice(0, 10);
      const completedKey = (t.completedAt || '').slice(0, 10);

      if (selectedDate) {
        return dateKey === selectedDate || completedKey === selectedDate;
      }

      // Default: match entire current month
      return dateKey.slice(0, 7) === monthStr || completedKey.slice(0, 7) === monthStr;
    });
  }, [tasks, currentMonth, selectedDate]);

  /* Monthly total tasks (unaffected by single date selection, for monthly stats) */
  const monthlyTasks = useMemo(() => {
    const monthStr = format(currentMonth, 'yyyy-MM');
    return tasks.filter((t) => {
      const dateKey = (t.expectedVisitDate || t.createdAt || '').slice(0, 10);
      const completedKey = (t.completedAt || '').slice(0, 10);
      return dateKey.slice(0, 7) === monthStr || completedKey.slice(0, 7) === monthStr;
    });
  }, [tasks, currentMonth]);

  /* Top overview counts for the month */
  const overviewStats = useMemo(() => {
    const total = monthlyTasks.length;
    const completed = monthlyTasks.filter((t) => matchesFilter(t, 'completed')).length;
    const working = monthlyTasks.filter((t) => matchesFilter(t, 'working')).length;
    const pending = monthlyTasks.filter((t) => matchesFilter(t, 'pending')).length;
    const waitingParts = monthlyTasks.filter((t) => t.status === 'Waiting Parts').length;
    return { total, completed, working, pending, waitingParts };
  }, [monthlyTasks]);

  /* Task completion percentage */
  const completionRate = useMemo(() => {
    if (overviewStats.total === 0) return 0;
    return Math.min(100, Math.round((overviewStats.completed / overviewStats.total) * 100));
  }, [overviewStats.total, overviewStats.completed]);

  /* Final filtered tasks for the list below */
  const filtered = useMemo(() => {
    return periodTasks.filter((t) => {
      if (!matchesFilter(t, filter)) return false;
      if (typeFilter === 'amc' && !t.amcId) return false;
      if (typeFilter === 'chargeable' && t.amcId) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.taskNumber.toLowerCase().includes(q) ||
          t.issueDescription.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [periodTasks, filter, typeFilter, search]);

  const counts: Record<FilterStatus, number> = useMemo(() => ({
    all: periodTasks.length,
    pending: periodTasks.filter((t) => matchesFilter(t, 'pending')).length,
    working: periodTasks.filter((t) => matchesFilter(t, 'working')).length,
    completed: periodTasks.filter((t) => matchesFilter(t, 'completed')).length,
    overdue: periodTasks.filter((t) => matchesFilter(t, 'overdue')).length,
    emergency: periodTasks.filter((t) => matchesFilter(t, 'emergency')).length,
  }), [periodTasks]);

  return (
    <DashboardLayout>
      <div className="w-full max-w-3xl mx-auto space-y-6 pb-12">
        {/* ── Header ──────────────────────────── */}
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl border-border/80 shrink-0"
            onClick={() => navigate('/engineer/dashboard')}
          >
            <ChevronLeft size={18} />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">My Tasks</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
              {displayName} — Personal assigned tasks & work orders
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl border-border/80"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal size={16} />
            </Button>
            <Button size="sm" className="gap-1.5 h-9 rounded-xl shadow-xs" onClick={() => navigate('/tasks/new')}>
              <Plus size={16} /> New Task
            </Button>
          </div>
        </div>

        {/* ── 4 Personal Stat Cards (Clean Attendance Style) ─────── */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SkeletonKPIStatCard />
            <SkeletonKPIStatCard />
            <SkeletonKPIStatCard />
            <SkeletonKPIStatCard />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Completed */}
            <Card
              className="rounded-2xl border border-border/80 shadow-sm hover:shadow-md transition-all cursor-pointer bg-card"
              onClick={() => setFilter(filter === 'completed' ? 'all' : 'completed')}
            >
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={15} strokeWidth={2.2} />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Completed</span>
                </div>
                <div className="text-3xl font-extrabold text-foreground font-mono">{overviewStats.completed}</div>
                <p className="text-[11px] text-muted-foreground">Resolved & closed</p>
              </CardContent>
            </Card>

            {/* Card 2: Pending / Issues */}
            <Card
              className="rounded-2xl border border-border/80 shadow-sm hover:shadow-md transition-all cursor-pointer bg-card"
              onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')}
            >
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900 text-rose-600 dark:text-rose-400">
                    <XCircle size={15} strokeWidth={2.2} />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Pending</span>
                </div>
                <div className="text-3xl font-extrabold text-foreground font-mono">{overviewStats.pending}</div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {overviewStats.waitingParts > 0 ? `${overviewStats.waitingParts} waiting parts` : 'Awaiting action'}
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Working */}
            <Card
              className="rounded-2xl border border-border/80 shadow-sm hover:shadow-md transition-all cursor-pointer bg-card"
              onClick={() => setFilter(filter === 'working' ? 'all' : 'working')}
            >
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900 text-amber-600 dark:text-amber-400">
                    <Clock size={15} strokeWidth={2.2} />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Working</span>
                </div>
                <div className="text-3xl font-extrabold text-foreground font-mono">{overviewStats.working}</div>
                <p className="text-[11px] text-muted-foreground">In progress & on site</p>
              </CardContent>
            </Card>

            {/* Card 4: Total Tasks */}
            <Card
              className="rounded-2xl border border-border/80 shadow-sm hover:shadow-md transition-all cursor-pointer bg-card"
              onClick={() => setFilter('all')}
            >
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400">
                    <ClipboardList size={15} strokeWidth={2.2} />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Total Tasks</span>
                </div>
                <div className="text-3xl font-extrabold text-foreground font-mono">{overviewStats.total}</div>
                <p className="text-[11px] text-muted-foreground">Total this month</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Monthly Completion Rate (Attendance Rate Style) ─────────────── */}
        <Card className="rounded-2xl border border-border/80 shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-primary" />
                <span className="text-sm font-bold text-foreground">Task Completion Rate</span>
              </div>
              {loading ? (
                <Skeleton className="h-6 w-12 rounded-md" />
              ) : (
                <span className="text-lg font-extrabold text-primary font-mono">{completionRate}%</span>
              )}
            </div>
            {loading ? (
              <Skeleton className="h-3 w-full rounded-full" />
            ) : (
              <Progress value={completionRate} className="h-3 bg-muted/60" />
            )}
            {loading ? (
              <Skeleton className="h-3 w-48 rounded-md" />
            ) : (
              <p className="text-xs text-muted-foreground">
                {overviewStats.completed} tasks resolved out of {overviewStats.total} total in {format(currentMonth, 'MMMM yyyy')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Month Calendar View (Attendance Calendar Style with Interactive Date Filtering) ─────────────── */}
        <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
          <CardContent className="p-5 space-y-4">
            {/* Month Navigator Header */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => {
                  setCurrentMonth((m) => subMonths(m, 1));
                  setSelectedDate(null);
                }}
              >
                <ChevronLeft size={16} />
              </Button>
              <button
                type="button"
                onClick={() => {
                  setCurrentMonth(new Date());
                  setSelectedDate(null);
                }}
                className="text-sm font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
              >
                {format(currentMonth, 'MMMM yyyy')}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => {
                  setCurrentMonth((m) => addMonths(m, 1));
                  setSelectedDate(null);
                }}
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
            {loading ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 14 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {/* Empty padding cells for first week */}
                {Array.from({ length: calendarDays[0]?.getDay() ?? 0 }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {calendarDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayTasks = taskDateMap.get(dateStr) || [];
                  const isSelected = selectedDate === dateStr;
                  const isTdy = isToday(day);
                  const isWknd = dateIsWeekend(day);
                  const hasCompleted = dayTasks.some((t) => t.status === 'Completed' || t.status === 'Closed');
                  const hasWorking = dayTasks.some((t) => ['Working', 'On The Way', 'Reached Site', 'Accepted'].includes(t.status));
                  const hasPending = dayTasks.some((t) => t.status === 'Pending' || t.status === 'Assigned' || t.status === 'Waiting Parts');

                  let bgClass = 'bg-card text-muted-foreground';
                  if (isSelected) {
                    bgClass = 'bg-primary/10 border-primary ring-2 ring-primary text-primary font-bold';
                  } else if (isTdy) {
                    bgClass = 'ring-2 ring-primary ring-offset-1 text-primary font-bold bg-card';
                  } else if (dayTasks.length > 0) {
                    bgClass = 'bg-muted/40 hover:bg-muted/70 text-foreground font-semibold border-border/60';
                  } else if (isWknd) {
                    bgClass = 'bg-muted/15 text-muted-foreground/50';
                  }

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      className={`relative flex flex-col items-center justify-center rounded-xl p-1 min-h-[52px] border border-transparent text-center transition-all cursor-pointer ${bgClass}`}
                    >
                      <span className="text-xs">{day.getDate()}</span>

                      {/* Status indicator dots */}
                      {dayTasks.length > 0 && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {hasCompleted && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                          {hasWorking && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                          {hasPending && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                        </div>
                      )}

                      {/* Task Count badge */}
                      {dayTasks.length > 0 && (
                        <span className="text-[9px] font-mono text-muted-foreground font-medium mt-0.5">
                          {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Calendar Legend & Selection Filter Notice */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex-wrap">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Working
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Pending
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full ring-2 ring-primary" /> Today
                </span>
              </div>

              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="text-primary hover:underline font-semibold text-xs ml-auto"
                >
                  Show All {format(currentMonth, 'MMMM')} Tasks
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Tasks Section Header (Punch Records Style) ─────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-foreground">
              {selectedDate
                ? `Tasks for ${format(new Date(selectedDate + 'T00:00:00'), 'EEE, d MMM yyyy')}`
                : `Tasks for ${format(currentMonth, 'MMMM yyyy')}`}
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              {filtered.length} task{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 h-10 rounded-xl"
              placeholder="Search tasks, descriptions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
                <X size={14} className="text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {(Object.keys(FILTER_LABELS) as FilterStatus[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  filter === f
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card text-muted-foreground border-border/80 hover:border-primary/40'
                }`}
              >
                {FILTER_LABELS[f]}
                {loading ? (
                  <Skeleton className="h-3.5 w-4 rounded-full" />
                ) : counts[f] > 0 ? (
                  <span
                    className={`rounded-full px-1.5 py-0 text-[10px] font-bold ${
                      filter === f ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {counts[f]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {/* Extra Filters (AMC / Chargeable) */}
          {showFilters && (
            <Card className="rounded-2xl border border-border/80 shadow-xs">
              <CardContent className="p-3 flex items-center gap-3">
                <p className="text-xs text-muted-foreground shrink-0 font-medium">Task Type:</p>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                  <SelectTrigger className="h-8 text-xs flex-1 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="amc">AMC Only</SelectItem>
                    <SelectItem value="chargeable">Chargeable Only</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Task List */}
          {loading ? (
            <div className="flex flex-col gap-2.5">
              <SkeletonTaskCard />
              <SkeletonTaskCard />
              <SkeletonTaskCard />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="rounded-2xl border border-border/80 shadow-sm">
              <CardContent className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
                <CalendarDays className="mx-auto text-muted-foreground/40" size={36} />
                <p>
                  {selectedDate
                    ? `No tasks scheduled on ${format(new Date(selectedDate + 'T00:00:00'), 'd MMM yyyy')}`
                    : 'No tasks found for this period'}
                </p>
                {selectedDate ? (
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setSelectedDate(null)}>
                    Show All Month Tasks
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-xl" onClick={() => navigate('/tasks/new')}>
                    <Plus size={14} /> Create a Task
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filtered.map((t) => (
                <Card
                  key={t.id}
                  className="rounded-2xl border border-border/80 shadow-xs cursor-pointer hover:border-primary/50 transition-all active:bg-muted/50"
                  onClick={() => navigate(`/engineer/tasks/${t.id}`)}
                >
                  <CardContent className="p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-medium text-muted-foreground">{t.taskNumber}</span>
                          <TaskTypeFlagBadge isAMC={!!t.amcId} />
                        </div>
                        <p className="text-sm font-semibold text-foreground mt-1 line-clamp-2">{t.issueDescription}</p>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-1" />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      <TaskStatusBadge status={t.status} />
                      <TaskPriorityBadge priority={t.priority} />
                      {t.resolutionStatus && t.status !== 'Completed' && t.status !== 'Closed' && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                            t.resolutionStatus === 'Parts Required'
                              ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                            : t.resolutionStatus === 'Temporary Fix'
                              ? 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800'
                            : 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                          }`}
                        >
                          {t.resolutionStatus}
                        </Badge>
                      )}
                    </div>

                    {t.expectedVisitDate && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {t.expectedVisitDate}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
