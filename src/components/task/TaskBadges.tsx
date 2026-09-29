/**
 * Task Status, Priority & Type Badges
 * Sectore 360 — Phase 1, Part 3
 */
import { Badge } from '@/components/ui/badge';
import type { TaskStatus, TaskPriority, TaskType } from '@/types/task';

/* ── Status ───────────────────────────────────────────────────── */
const STATUS_STYLES: Record<TaskStatus, string> = {
  'Pending':          'bg-muted text-muted-foreground border-border',
  'Assigned':         'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  'Accepted':         'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
  'On The Way':       'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800',
  'Reached Site':     'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800',
  'Working':          'bg-primary/10 text-primary border-primary/20',
  'Waiting Customer': 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800',
  'Waiting Parts':    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
  'Waiting Vendor':   'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  'Remote Support':   'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
  'Completed':        'bg-success/10 text-success border-success/20',
  'Closed':           'bg-muted text-muted-foreground border-border',
  'Cancelled':        'bg-destructive/10 text-destructive border-destructive/20',
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className={`text-xs font-medium whitespace-nowrap ${STATUS_STYLES[status] ?? ''}`}>
      {status}
    </Badge>
  );
}

/* ── Priority ─────────────────────────────────────────────────── */
const PRIORITY_STYLES: Record<TaskPriority, string> = {
  'Low':       'bg-muted text-muted-foreground border-border',
  'Medium':    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  'High':      'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
  'Critical':  'bg-destructive/10 text-destructive border-destructive/20',
  'Emergency': 'bg-destructive text-destructive-foreground border-destructive',
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge variant="outline" className={`text-xs font-medium whitespace-nowrap ${PRIORITY_STYLES[priority] ?? ''}`}>
      {priority}
    </Badge>
  );
}

/* ── Task Type ────────────────────────────────────────────────── */
export function TaskTypeBadge({ type }: { type: TaskType }) {
  return (
    <Badge variant="outline" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
      {type}
    </Badge>
  );
}
