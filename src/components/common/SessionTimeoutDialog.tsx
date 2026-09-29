/**
 * SessionTimeoutDialog
 * Sectore 360 — Part 6
 * Warns 5 minutes before session expires. Auto-logs out at 0.
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

/** Timeout in ms before showing warning (default: 25 min of 30 min session) */
const IDLE_WARN_MS = 25 * 60 * 1000;
/** Countdown seconds from warning to auto-logout */
const COUNTDOWN_SEC = 5 * 60;

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

export function SessionTimeoutDialog() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SEC);

  const doLogout = useCallback(async () => {
    setOpen(false);
    await logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const extendSession = () => {
    setOpen(false);
    setCountdown(COUNTDOWN_SEC);
    resetTimer();
  };

  // Timer refs stored outside state to avoid re-render loops
  let warnTimer: ReturnType<typeof setTimeout>;
  let tickInterval: ReturnType<typeof setInterval>;

  const resetTimer = () => {
    clearTimeout(warnTimer);
    clearInterval(tickInterval);
    if (!isAuthenticated) return;

    warnTimer = setTimeout(() => {
      setOpen(true);
      setCountdown(COUNTDOWN_SEC);
      tickInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(tickInterval);
            doLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, IDLE_WARN_MS);
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    const handler = () => { if (!open) resetTimer(); };

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      clearTimeout(warnTimer);
      clearInterval(tickInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, open]);

  if (!isAuthenticated) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) extendSession(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock size={16} className="text-warning" />
            Session Expiring Soon
          </DialogTitle>
          <DialogDescription>
            Your session will expire due to inactivity.
          </DialogDescription>
        </DialogHeader>
        <div className="text-center py-4">
          <p className="text-5xl font-mono font-bold text-foreground">{fmt(countdown)}</p>
          <p className="text-sm text-muted-foreground mt-2">Time remaining</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={doLogout}>Logout Now</Button>
          <Button onClick={extendSession}>Stay Logged In</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
