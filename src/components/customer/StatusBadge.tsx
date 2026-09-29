/**
 * CustomerStatusBadge
 * Sectore 360 — Reusable status badge for customers & assets
 */
import { Badge } from '@/components/ui/badge';
import type { CustomerStatus, AssetStatus } from '@/types/customer';

interface Props {
  status: CustomerStatus | AssetStatus;
  className?: string;
}

const CONFIG: Record<string, { label: string; className: string }> = {
  Active:             { label: 'Active',           className: 'bg-success/10 text-success border-success/30' },
  Inactive:           { label: 'Inactive',         className: 'bg-muted text-muted-foreground border-border' },
  'Under Maintenance':{ label: 'Maintenance',      className: 'bg-warning/10 text-warning border-warning/30' },
  Retired:            { label: 'Retired',          className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export function StatusBadge({ status, className }: Props) {
  const cfg = CONFIG[status] ?? CONFIG['Inactive'];
  return (
    <Badge variant="outline" className={`text-xs font-medium ${cfg.className} ${className ?? ''}`}>
      {cfg.label}
    </Badge>
  );
}

const TYPE_CONFIG: Record<string, string> = {
  'AMC':              'bg-primary/10 text-primary border-primary/30',
  'AMC Customer':     'bg-primary/10 text-primary border-primary/30',
  'Call Based':       'bg-accent/10 text-foreground border-border',
  'Non-AMC Customer': 'bg-muted text-muted-foreground border-border',
  'Prospect':         'bg-blue-50 text-blue-700 border-blue-200',
  'One-Time Customer':'bg-orange-50 text-orange-700 border-orange-200',
  'Dealer / Partner': 'bg-purple-50 text-purple-700 border-purple-200',
  'Internal':         'bg-gray-100 text-gray-600 border-gray-300',
};

export function CustomerTypeBadge({ type, className }: { type: string; className?: string }) {
  const cls = TYPE_CONFIG[type] ?? 'bg-muted text-muted-foreground border-border';
  return (
    <Badge variant="outline" className={`text-xs font-medium ${cls} ${className ?? ''}`}>
      {type}
    </Badge>
  );
}
