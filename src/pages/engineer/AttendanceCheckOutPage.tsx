import { DashboardLayout } from '@/components/layouts/DashboardLayout';
/**
 * Attendance Check-Out Page — Part 5
 * Sectore 360 — Field Service Engineer Portal
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEngineerContext } from '@/contexts/EngineerContext';
import { attendanceService } from '@/services/attendanceService';
import type { GPSLocation } from '@/types/engineer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MapPin, LogOut, ChevronLeft, Clock } from 'lucide-react';

export default function AttendanceCheckOutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { engineerId } = useEngineerContext();
  const [gps, setGps] = useState<GPSLocation | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(new Date());
  const [checkInRecord, setCheckInRecord] = useState<import('@/types/engineer').Attendance | null>(null);

  useEffect(() => {
    if (!engineerId) return;
    attendanceService.getTodayRecord(engineerId).then((r) => {
      setCheckInRecord(r);
      if (!r || r.status !== 'checked_in') {
        toast.error('You must check in first');
        navigate('/engineer/dashboard');
        return;
      }
      // Enforce daily report before checkout
      import('@/services/dailyReportService').then(({ dailyReportService }) => {
        dailyReportService.getTodayReport(engineerId).then((report) => {
          if (!report || report.status === 'sent_back') {
            toast.error('Please submit your Daily Report before checking out');
            navigate('/engineer/daily-report');
          }
        }).catch(() => {
          toast.error('Please submit your Daily Report before checking out');
          navigate('/engineer/daily-report');
        });
      });
    }).catch(() => { navigate('/engineer/dashboard'); });
  }, [engineerId, navigate]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  function captureGPS() {
    setGpsLoading(true);
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('GPS not available');
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          latitude: parseFloat(pos.coords.latitude.toFixed(6)),
          longitude: parseFloat(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: new Date().toISOString(),
        });
        setGpsLoading(false);
      },
      () => { setGpsError('Could not get GPS. Check permissions.'); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function calcWorkingHours(): string {
    if (!checkInRecord?.checkInTime) return '—';
    const diff = (now.getTime() - new Date(checkInRecord.checkInTime).getTime()) / (1000 * 60 * 60);
    return diff.toFixed(1) + 'h';
  }

  async function handleCheckOut() {
    if (!engineerId) { toast.error('Engineer profile not resolved'); return; }
    setSaving(true);
    try {
      await attendanceService.checkOut(engineerId, gps ?? undefined);
      toast.success('Checked out successfully!');
      navigate('/engineer/dashboard');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Check-out failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
    <div className="flex flex-col gap-4 max-w-lg mx-auto pb-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => navigate(-1)}>
          <ChevronLeft size={18} />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Attendance Check-Out</h1>
      </div>

      {/* Time card */}
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="p-4 text-center">
          <p className="text-3xl font-bold text-warning tabular-nums">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Check-In Time</p>
            <p className="text-sm font-medium">
              {checkInRecord?.checkInTime
                ? new Date(checkInRecord.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '—'}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Current Time</p>
            <p className="text-sm font-medium tabular-nums">
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock size={15} className="text-primary" /> Working Hours
            </div>
            <p className="text-sm font-bold text-primary">{calcWorkingHours()}</p>
          </div>
        </CardContent>
      </Card>

      {/* GPS */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MapPin size={15} className="text-primary" /> GPS Location
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex flex-col gap-2">
          {gps ? (
            <div className="flex flex-col gap-1">
              <Badge variant="outline" className="w-fit text-xs bg-success/10 text-success border-success/20">Location Captured</Badge>
              <p className="text-xs text-muted-foreground">
                {gps.latitude}, {gps.longitude} · ±{gps.accuracy}m
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Location not captured</p>
          )}
          {gpsError && <p className="text-xs text-destructive">{gpsError}</p>}
          <Button type="button" variant="outline" size="sm" onClick={captureGPS} disabled={gpsLoading}>
            <MapPin size={14} className="mr-1" />
            {gpsLoading ? 'Getting location…' : gps ? 'Re-capture' : 'Capture GPS'}
          </Button>
        </CardContent>
      </Card>

      <Button size="lg" className="h-14 text-base w-full mt-2" onClick={handleCheckOut} disabled={saving}>
        <LogOut size={20} className="mr-2" />
        {saving ? 'Checking Out…' : 'Confirm Check-Out'}
      </Button>
    </div>
    </DashboardLayout>
  );
}
