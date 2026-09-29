/**
 * AMC Badges
 * Sectore 360 — Phase 1, Part 4
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AMCStatus, AMCContractType, AMCVisitFrequency, AMCVisitStatus } from '@/types/amc';
import { remainingDays } from '@/types/amc';

/* ── Status Badge ─────────────────────────────────────────────── */
const STATUS_STYLES: Record<AMCStatus, string> = {
  Active:    'bg-success/10 text-success border-success/20',
  Draft:     'bg-muted text-muted-foreground border-border',
  Expired:   'bg-destructive/10 text-destructive border-destructive/20',
  Cancelled: 'bg-muted text-muted-foreground border-border line-through',
  Renewed:   'bg-primary/10 text-primary border-primary/20',
};
export function AMCStatusBadge({ status }: { status: AMCStatus }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', STATUS_STYLES[status])}>
      {status}
    </Badge>
  );
}

/* ── Contract Type Badge ──────────────────────────────────────── */
const CONTRACT_STYLES: Record<AMCContractType, string> = {
  'Comprehensive':       'bg-primary/10 text-primary border-primary/20',
  'Non-Comprehensive':   'bg-warning/10 text-warning border-warning/20',
  'Preventive Maintenance': 'bg-success/10 text-success border-success/20',
  'Labour Only':         'bg-muted text-muted-foreground border-border',
  'Custom':              'bg-accent/10 text-accent-foreground border-accent/20',
};
export function AMCContractTypeBadge({ type }: { type: AMCContractType }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', CONTRACT_STYLES[type])}>
      {type}
    </Badge>
  );
}

/* ── Visit Frequency Badge ────────────────────────────────────── */
export function AMCFrequencyBadge({ frequency }: { frequency: AMCVisitFrequency }) {
  return (
    <Badge variant="outline" className="text-xs text-muted-foreground border-border">
      {frequency}
    </Badge>
  );
}

/* ── Visit Status Badge ───────────────────────────────────────── */
const VISIT_STATUS_STYLES: Record<AMCVisitStatus, string> = {
  Pending:     'bg-warning/10 text-warning border-warning/20',
  Completed:   'bg-success/10 text-success border-success/20',
  Missed:      'bg-destructive/10 text-destructive border-destructive/20',
  Rescheduled: 'bg-primary/10 text-primary border-primary/20',
};
export function AMCVisitStatusBadge({ status }: { status: AMCVisitStatus }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', VISIT_STATUS_STYLES[status])}>
      {status}
    </Badge>
  );
}

/* ── Remaining Days Badge ─────────────────────────────────────── */
export function RemainingDaysBadge({ endDate }: { endDate: string }) {
  const days = remainingDays(endDate);
  if (days < 0) {
    return <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">Expired {Math.abs(days)}d ago</Badge>;
  }
  if (days <= 30) {
    return <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">{days}d left</Badge>;
  }
  if (days <= 90) {
    return <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">{days}d left</Badge>;
  }
  return <Badge variant="outline" className="text-xs text-muted-foreground border-border">{days}d left</Badge>;
}
