/**
 * StatusCard Component
 * Sectore 360 — metric display card with trend indicator
 */
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatusCardProps {
  title: string;
  value: string | number;
  /** Optional subtitle or description */
  subtitle?: string;
  icon?: LucideIcon;
  /** Positive = green trend, negative = red trend, 0 = neutral */
  trend?: number;
  trendLabel?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const variantStyles: Record<NonNullable<StatusCardProps['variant']>, string> = {
  default: 'border-border',
  primary: 'border-primary/30',
  success: 'border-success/30',
  warning: 'border-warning/30',
  danger: 'border-destructive/30',
};

const variantIconStyles: Record<NonNullable<StatusCardProps['variant']>, string> = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-destructive/10 text-destructive',
};

export function StatusCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  variant = 'default',
  className,
}: StatusCardProps) {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

  return (
    <div
      className={cn(
        'bg-card border rounded-lg p-4 flex flex-col gap-3',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground leading-tight">{title}</p>
        {Icon && (
          <div className={cn('p-2 rounded-md shrink-0', variantIconStyles[variant])}>
            <Icon size={16} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {trend !== undefined && (
        <div className="flex items-center gap-1">
          {isPositive && <TrendingUp size={13} className="text-success" />}
          {isNegative && <TrendingDown size={13} className="text-destructive" />}
          <span
            className={cn('text-xs font-medium', {
              'text-success': isPositive,
              'text-destructive': isNegative,
              'text-muted-foreground': !isPositive && !isNegative,
            })}
          >
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          {trendLabel && (
            <span className="text-xs text-muted-foreground">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
