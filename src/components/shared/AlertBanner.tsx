/**
 * AlertBanner Component
 * Sectore 360 — inline status alerts (success / warning / error / info)
 */
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useState } from 'react';

type AlertVariant = 'success' | 'warning' | 'error' | 'info';

interface AlertBannerProps {
  variant: AlertVariant;
  title?: string;
  message: string;
  dismissible?: boolean;
  className?: string;
}

const variantConfig: Record<AlertVariant, {
  icon: typeof CheckCircle2;
  containerClass: string;
  iconClass: string;
}> = {
  success: {
    icon: CheckCircle2,
    containerClass: 'bg-success/10 border-success/30 text-success',
    iconClass: 'text-success',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'bg-warning/10 border-warning/30 text-warning',
    iconClass: 'text-warning',
  },
  error: {
    icon: XCircle,
    containerClass: 'bg-destructive/10 border-destructive/30 text-destructive',
    iconClass: 'text-destructive',
  },
  info: {
    icon: Info,
    containerClass: 'bg-info/10 border-info/30 text-info',
    iconClass: 'text-info',
  },
};

export function AlertBanner({
  variant,
  title,
  message,
  dismissible = false,
  className,
}: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const { icon: Icon, containerClass, iconClass } = variantConfig[variant];

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3',
        containerClass,
        className
      )}
    >
      <Icon size={16} className={cn('shrink-0 mt-0.5', iconClass)} />
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold mb-0.5">{title}</p>}
        <p className="text-sm opacity-90">{message}</p>
      </div>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
