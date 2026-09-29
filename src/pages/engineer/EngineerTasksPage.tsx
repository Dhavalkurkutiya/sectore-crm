import { DashboardLayout } from '@/components/layouts/DashboardLayout';
/**
 * Engineer Tasks List Page — Part 5
 * Sectore 360 — mobile-first assigned task list
 */
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEngineerContext } from '@/contexts/EngineerContext';
import { engineerService } from '@/services/engineerService';
import type { Task } from '@/types/task';
import { TaskStatusBadge, TaskPriorityBadge } from '@/components/task/TaskBadges';
import { TaskTypeFlagBadge } from '@/components/engineer/EngineerBadges';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, ChevronRight, Building2, Cpu, Calendar, SlidersHorizontal, X, ChevronLeft,
} from 'lucide-react';

type FilterStatus = 'all' | 'pending' | 'working' | 'completed' | 'overdue' | 'emergency';

function matchesFilter(task: Task, filter: FilterStatus): boolean {
  if (filter === 'all') return true;
  if (filter === 'pending') return task.status === 'Pending' || task.status === 'Assigned';
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
  const { engineerId } = useEngineerContext();
  const [params] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>((params.get('filter') as FilterStatus) ?? 'all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'amc' | 'chargeable'>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!engineerId) return;
    engineerService.getAssignedTasks(engineerId).then(setTasks).catch(() => setTasks([]));
  }, [engineerId]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
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
  }, [tasks, filter, typeFilter, search]);

  const counts: Record<FilterStatus, number> = useMemo(() => ({
    all: tasks.length,
    pending: tasks.filter((t) => matchesFilter(t, 'pending')).length,
    working: tasks.filter((t) => matchesFilter(t, 'working')).length,
    completed: tasks.filter((t) => matchesFilter(t, 'completed')).length,
    overdue: tasks.filter((t) => matchesFilter(t, 'overdue')).length,
    emergency: tasks.filter((t) => matchesFilter(t, 'emergency')).length,
  }), [tasks]);

  return (
    <DashboardLayout>
    <div className="flex flex-col gap-4 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => navigate('/engineer/dashboard')}>
          <ChevronLeft size={18} />
        </Button>
        <h1 className="text-lg font-bold text-foreground flex-1 min-w-0 truncate">My Tasks</h1>
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setShowFilters(!showFilters)}>
          <SlidersHorizontal size={18} />
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9 h-10"
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

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(Object.keys(FILTER_LABELS) as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/40'
            }`}
          >
            {FILTER_LABELS[f]}
            {counts[f] > 0 && (
              <span className={`rounded-full px-1.5 py-0 text-[10px] font-bold ${
                filter === f ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {counts[f]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Extra filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <p className="text-xs text-muted-foreground shrink-0">Type:</p>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="h-8 text-xs flex-1">
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

      {/* Count */}
      <p className="text-xs text-muted-foreground">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</p>

      {/* Task cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            No tasks match the selected filters
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((t) => (
            <Card
              key={t.id}
              className="cursor-pointer hover:border-primary/40 transition-colors active:bg-muted/50"
              onClick={() => navigate(`/engineer/tasks/${t.id}`)}
            >
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">{t.taskNumber}</span>
                      <TaskTypeFlagBadge isAMC={!!t.amcId} />
                    </div>
                    <p className="text-sm font-semibold text-foreground mt-0.5 line-clamp-2">{t.issueDescription}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-1" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <TaskStatusBadge status={t.status} />
                  <TaskPriorityBadge priority={t.priority} />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {t.expectedVisitDate && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} /> {t.expectedVisitDate}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
