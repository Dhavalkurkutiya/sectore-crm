/**
 * ProgressBar Component
 * Sectore 360 — linear progress indicator
 */
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  /** 0–100 */
  value: number;
  label?: string;
  showPercent?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantColor: Record<NonNullable<ProgressBarProps['variant']>, string> = {
  default: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
};

const sizeHeight: Record<NonNullable<ProgressBarProps['size']>, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export function ProgressBar({
  value,
  label,
  showPercent = false,
  variant = 'default',
  size = 'md',
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
          {showPercent && <span className="text-xs font-medium text-foreground">{clamped}%</span>}
        </div>
      )}
      <div className={cn('w-full rounded-full bg-muted overflow-hidden', sizeHeight[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-300 ease-out', variantColor[variant])}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
