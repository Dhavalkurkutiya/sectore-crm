/**
 * OfflineBanner — shows offline mode status + sync queue count
 * Part 5 — Sectore 360
 */
import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CloudOff } from 'lucide-react';

interface OfflineBannerProps {
  queueCount?: number;
}

export function OfflineBanner({ queueCount = 0 }: OfflineBannerProps) {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (online && queueCount === 0) return null;

  if (!online) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/30 rounded-lg text-warning text-sm">
        <WifiOff size={15} className="shrink-0" />
        <span className="font-medium">You're offline.</span>
        <span className="text-xs text-muted-foreground">Changes will sync when internet returns.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg text-primary text-sm">
      <RefreshCw size={15} className="shrink-0 animate-spin" />
      <span className="font-medium">Syncing…</span>
      <span className="text-xs text-muted-foreground">{queueCount} item{queueCount !== 1 ? 's' : ''} pending upload.</span>
    </div>
  );
}

/** Small offline indicator dot for the header */
export function OfflineDot() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (online) return null;
  return (
    <div className="flex items-center gap-1 text-warning text-xs font-medium">
      <CloudOff size={13} />
      <span className="hidden md:inline">Offline</span>
    </div>
  );
}
