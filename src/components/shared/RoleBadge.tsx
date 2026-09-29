/**
 * RoleBadge Component
 * Sectore 360 — visual role indicator badge
 */
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/types/auth';
import { Shield, Wrench, User, ShieldCheck, Briefcase, UserCog } from 'lucide-react';

const roleConfig: Record<UserRole, {
  label: string;
  icon: typeof Shield;
  className: string;
}> = {
  superadmin: {
    label: 'Super Admin',
    icon: ShieldCheck,
    className: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  manager: {
    label: 'Manager',
    icon: Briefcase,
    className: 'bg-info/10 text-info border-info/20',
  },
  backoffice: {
    label: 'Back Office',
    icon: UserCog,
    className: 'bg-secondary/10 text-secondary-foreground border-border',
  },
  engineer: {
    label: 'Engineer',
    icon: Wrench,
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  customer: {
    label: 'Customer',
    icon: User,
    className: 'bg-success/10 text-success border-success/20',
  },
};

interface RoleBadgeProps {
  role: UserRole;
  showIcon?: boolean;
  className?: string;
}

export function RoleBadge({ role, showIcon = true, className }: RoleBadgeProps) {
  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 text-xs font-medium px-2 py-0.5', config.className, className)}
    >
      {showIcon && <Icon size={11} />}
      {config.label}
    </Badge>
  );
}
