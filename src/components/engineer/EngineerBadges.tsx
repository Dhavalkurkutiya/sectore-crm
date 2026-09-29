/**
 * Engineer Badges — Part 5
 * Sectore 360 — Field Service Engineer Portal
 */
import { Badge } from '@/components/ui/badge';
import type { AttendanceStatus } from '@/types/engineer';

/* ── Attendance Status ────────────────────────────────────────── */
const ATTENDANCE_STYLES: Record<AttendanceStatus, string> = {
  checked_in:  'bg-success/10 text-success border-success/20',
  checked_out: 'bg-muted text-muted-foreground border-border',
  absent:      'bg-destructive/10 text-destructive border-destructive/20',
};
const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  checked_in:  'Checked In',
  checked_out: 'Checked Out',
  absent:      'Absent',
};
export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  return (
    <Badge variant="outline" className={`text-xs font-medium whitespace-nowrap ${ATTENDANCE_STYLES[status]}`}>
      {ATTENDANCE_LABELS[status]}
    </Badge>
  );
}

/* ── Sync Status ──────────────────────────────────────────────── */
export function SyncStatusBadge({ synced }: { synced: boolean }) {
  return (
    <Badge
      variant="outline"
      className={synced
        ? 'text-xs bg-success/10 text-success border-success/20'
        : 'text-xs bg-warning/10 text-warning border-warning/20'}
    >
      {synced ? 'Synced' : 'Pending Sync'}
    </Badge>
  );
}

/* ── Online / Offline indicator ───────────────────────────────── */
export function OnlineStatusBadge({ online }: { online: boolean }) {
  return (
    <Badge
      variant="outline"
      className={online
        ? 'text-xs bg-success/10 text-success border-success/20'
        : 'text-xs bg-muted text-muted-foreground border-border'}
    >
      {online ? 'Online' : 'Offline'}
    </Badge>
  );
}

/* ── AMC vs Chargeable ────────────────────────────────────────── */
export function TaskTypeFlagBadge({ isAMC }: { isAMC: boolean }) {
  return (
    <Badge
      variant="outline"
      className={isAMC
        ? 'text-xs bg-primary/10 text-primary border-primary/20'
        : 'text-xs bg-muted text-muted-foreground border-border'}
    >
      {isAMC ? 'AMC' : 'Chargeable'}
    </Badge>
  );
}
