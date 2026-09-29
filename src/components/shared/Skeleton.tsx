/**
 * Skeleton Components
 * Sectore 360 — loading placeholders
 */
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

/** Base skeleton element */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
    />
  );
}

/** Skeleton for a stat/status card */
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('bg-card border border-border rounded-lg p-4 flex flex-col gap-3', className)}>
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/** Skeleton for a table row */
export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

/** Skeleton for a list item */
export function SkeletonListItem({ className }: SkeletonProps) {
  return (
    <div className={cn('flex items-center gap-3 p-3', className)}>
      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}
