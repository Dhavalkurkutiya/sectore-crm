/**
 * EmptyState Component
 * Sectore 360 — consistent empty/no-data placeholder
 */
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-16 px-8 text-center',
        className
      )}
    >
      {Icon && (
        <div className="p-4 rounded-full bg-muted">
          <Icon size={32} className="text-muted-foreground" />
        </div>
      )}
      <div className="flex flex-col gap-1.5 max-w-sm">
        <p className="text-base font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground text-pretty">{description}</p>
        )}
      </div>
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
