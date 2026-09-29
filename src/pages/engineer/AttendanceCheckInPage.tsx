import { DashboardLayout } from '@/components/layouts/DashboardLayout';
/**
 * Attendance Check-In Page — Part 5
 * Sectore 360 — Field Service Engineer Portal
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEngineerContext } from '@/contexts/EngineerContext';
import { attendanceService } from '@/services/attendanceService';
import type { GPSLocation, DeviceInfo } from '@/types/engineer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PhotoUpload } from '@/components/engineer/PhotoUpload';
import type { PhotoItem } from '@/components/engineer/PhotoUpload';
import { toast } from 'sonner';
import { MapPin, Monitor, Wifi, WifiOff, LogIn, ChevronLeft, Camera } from 'lucide-react';

export default function AttendanceCheckInPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { engineerId, engineerName: resolvedName } = useEngineerContext();
  const ENGINEER_NAME = resolvedName || user?.name || 'Engineer';
  const [gps, setGps] = useState<GPSLocation | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [online] = useState(navigator.onLine);
  const [selfiePhotos, setSelfiePhotos] = useState<PhotoItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(new Date());
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if already checked-in using context engineerId
  useEffect(() => {
    if (!engineerId) return;
    attendanceService.getTodayRecord(engineerId).then((existing) => {
      if (existing) {
        toast.info('Already checked in today');
        navigate('/engineer/dashboard');
      }
    }).catch(() => {});
  }, [engineerId, navigate]);

  function captureGPS() {
    setGpsLoading(true);
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('GPS not available on this device');
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
      () => {
        setGpsError('Could not get GPS location. Check browser permissions.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleCheckIn() {
    if (!engineerId) { toast.error('Engineer profile not linked. Contact your administrator.'); return; }
    setSaving(true);
    try {
      const device: DeviceInfo = {
        userAgent: navigator.userAgent.slice(0, 80),
        platform: navigator.platform,
        online,
      };
      const selfieUrl = selfiePhotos[0]?.dataUrl;
      await attendanceService.checkIn(engineerId, ENGINEER_NAME, gps ?? undefined, device, selfieUrl);
      toast.success('Checked in successfully!');
      navigate('/engineer/dashboard');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Check-in failed');
    } finally {
      setSaving(false);
    }
  }

  const device: DeviceInfo = {
    userAgent: navigator.userAgent.slice(0, 60) + '…',
    platform: navigator.platform,
    online,
  };

  return (
    <DashboardLayout>
    <div className="flex flex-col gap-4 max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => navigate(-1)}>
          <ChevronLeft size={18} />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Attendance Check-In</h1>
      </div>

      {/* Profile not linked error */}
      {profileError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-destructive">{profileError}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your user account is not linked to an engineer profile. Please ask your administrator to link your account.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Date / Time */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 text-center">
          <p className="text-3xl font-bold text-primary tabular-nums">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
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
                {gps.latitude}, {gps.longitude} · Accuracy: ±{gps.accuracy}m
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Location not yet captured</p>
          )}
          {gpsError && <p className="text-xs text-destructive">{gpsError}</p>}
          <Button type="button" variant="outline" size="sm" onClick={captureGPS} disabled={gpsLoading}>
            <MapPin size={14} className="mr-1" />
            {gpsLoading ? 'Getting location…' : gps ? 'Re-capture Location' : 'Capture GPS Location'}
          </Button>
        </CardContent>
      </Card>

      {/* Device Info */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Monitor size={15} className="text-primary" /> Device Info
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground break-words">{device.userAgent}</p>
          <p className="text-xs text-muted-foreground">Platform: {device.platform}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {online
              ? <><Wifi size={13} className="text-success" /><span className="text-xs text-success">Online</span></>
              : <><WifiOff size={13} className="text-warning" /><span className="text-xs text-warning">Offline</span></>
            }
          </div>
        </CardContent>
      </Card>

      {/* Selfie */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Camera size={15} className="text-primary" /> Selfie Photo
            <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <PhotoUpload
            category="selfie"
            label=""
            photos={selfiePhotos}
            onAdd={(p) => setSelfiePhotos([p])}
            onRemove={() => setSelfiePhotos([])}
            maxPhotos={1}
          />
        </CardContent>
      </Card>

      {/* Action */}
      <Button size="lg" className="h-14 text-base w-full mt-2" onClick={handleCheckIn} disabled={saving}>
        <LogIn size={20} className="mr-2" />
        {saving ? 'Checking In…' : 'Confirm Check-In'}
      </Button>
    </div>
    </DashboardLayout>
  );
}
