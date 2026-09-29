/**
 * Spinner Component
 * Sectore 360 — loading indicator
 */
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
};

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <div role="status" className={cn('flex flex-col items-center gap-2', className)}>
      <div
        className={cn(
          'rounded-full border-border border-t-primary animate-spin',
          sizeMap[size]
        )}
      />
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Full-page loading overlay */
export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Spinner size="lg" label={label} />
    </div>
  );
}
