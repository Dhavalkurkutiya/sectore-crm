/**
 * UserAvatar Component
 * Sectore 360 — user avatar with initials fallback
 */
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { UserRole } from '@/types/auth';

interface UserAvatarProps {
  name: string;
  src?: string;
  role?: UserRole;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  online?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

const textSizeMap = {
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
};

/** Generate a color from name for avatar fallback bg */
function nameToColor(name: string): string {
  const colors = [
    'bg-blue-600', 'bg-indigo-600', 'bg-violet-600',
    'bg-cyan-600', 'bg-teal-600', 'bg-emerald-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function UserAvatar({
  name,
  src,
  size = 'md',
  showStatus,
  online,
  className,
}: UserAvatarProps) {
  const initials = getInitials(name);
  const bgColor = nameToColor(name);

  return (
    <div className={cn('relative inline-block', className)}>
      <Avatar className={sizeMap[size]}>
        {src && <AvatarImage src={src} alt={name} />}
        <AvatarFallback className={cn('text-white font-semibold', bgColor, textSizeMap[size])}>
          {initials}
        </AvatarFallback>
      </Avatar>
      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-card',
            size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
            online ? 'bg-success' : 'bg-muted-foreground'
          )}
        />
      )}
    </div>
  );
}
