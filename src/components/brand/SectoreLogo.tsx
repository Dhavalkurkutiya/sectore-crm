/**
 * SectoreLogo Component
 * Official Sectore Tecknologies brand mark
 * Based on brand colors: Blue (#2563EB), Dark Blue (#1E3A8A), White, Black
 */
import { cn } from '@/lib/utils';

interface SectoreLogoProps {
  /** 'full' shows icon + wordmark, 'icon' shows icon only */
  variant?: 'full' | 'icon';
  /** Height in pixels */
  size?: number;
  className?: string;
}

export function SectoreLogo({ variant = 'full', size = 36, className }: SectoreLogoProps) {
  if (variant === 'icon') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('shrink-0', className)}
        aria-label="Sectore Tecknologies"
      >
        {/* Outer shield shape */}
        <path
          d="M20 2L4 9v10c0 9.4 6.8 18.2 16 20.4C29.2 37.2 36 28.4 36 19V9L20 2z"
          fill="url(#shield-grad)"
        />
        {/* Inner circuit node — "S" motif abstracted */}
        <circle cx="20" cy="20" r="7" fill="none" stroke="white" strokeWidth="2.5" />
        <circle cx="20" cy="20" r="2.5" fill="white" />
        {/* Circuit lines */}
        <line x1="20" y1="13" x2="20" y2="10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="27" y1="20" x2="30" y2="20" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="20" y1="27" x2="20" y2="30" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="13" y1="20" x2="10" y2="20" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <defs>
          <linearGradient id="shield-grad" x1="4" y1="2" x2="36" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2563EB" />
            <stop offset="1" stopColor="#1E3A8A" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  return (
    <div className={cn('flex items-center gap-2.5 shrink-0', className)}>
      {/* Icon mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M20 2L4 9v10c0 9.4 6.8 18.2 16 20.4C29.2 37.2 36 28.4 36 19V9L20 2z"
          fill="url(#shield-grad-full)"
        />
        <circle cx="20" cy="20" r="7" fill="none" stroke="white" strokeWidth="2.5" />
        <circle cx="20" cy="20" r="2.5" fill="white" />
        <line x1="20" y1="13" x2="20" y2="10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="27" y1="20" x2="30" y2="20" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="20" y1="27" x2="20" y2="30" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="13" y1="20" x2="10" y2="20" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <defs>
          <linearGradient id="shield-grad-full" x1="4" y1="2" x2="36" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2563EB" />
            <stop offset="1" stopColor="#1E3A8A" />
          </linearGradient>
        </defs>
      </svg>

      {/* Wordmark */}
      <div className="flex flex-col leading-none">
        <span
          className="font-bold tracking-tight text-foreground"
          style={{ fontSize: size * 0.45, letterSpacing: '-0.02em' }}
        >
          Sectore
          <span className="text-primary"> 360</span>
        </span>
        <span
          className="text-muted-foreground font-normal"
          style={{ fontSize: size * 0.26 }}
        >
          Powered by Sectore Tecknologies
        </span>
      </div>
    </div>
  );
}

/** Compact version for sidebar collapsed state */
export function SectoreLogoCompact({ size = 32, className }: Omit<SectoreLogoProps, 'variant'>) {
  return <SectoreLogo variant="icon" size={size} className={className} />;
}
