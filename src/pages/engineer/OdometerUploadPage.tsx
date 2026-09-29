/**
 * Odometer Upload Page — Engineer
 * Upload morning/evening odometer photo. No manual value entry.
 */
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEngineerContext } from '@/contexts/EngineerContext';
import { odometerService } from '@/services/odometerService';
import { bikeService } from '@/services/bikeService';
import { attendanceService } from '@/services/attendanceService';
import type { OdometerPhoto, OdometerPhotoType, Bike } from '@/types/engineer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ChevronLeft, Camera, CheckCircle2, Clock, MapPin, Bike as BikeIcon, Upload, AlertCircle } from 'lucide-react';

export default function OdometerUploadPage() {
  const navigate      = useNavigate();
  const { user }      = useAuth();
  const { engineerId } = useEngineerContext();
  const [params]      = useSearchParams();
  const defaultType   = (params.get('type') ?? 'morning') as OdometerPhotoType;

  const [activeType,  setActiveType]  = useState<OdometerPhotoType>(defaultType);
  const [morning,     setMorning]     = useState<OdometerPhoto | undefined>();
  const [evening,     setEvening]     = useState<OdometerPhoto | undefined>();
  const [bike,        setBike]        = useState<Bike | null>(null);
  const [gps,         setGps]         = useState<{ latitude: number; longitude: number } | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [preview,     setPreview]     = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attendanceId, setAttendanceId] = useState<string | undefined>();
  const [profileError, setProfileError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const todayLabel = new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!engineerId) return;
    odometerService.getTodayPhotos(engineerId).then((p) => {
      setMorning(p.morning);
      setEvening(p.evening);
    }).catch(console.error);
    bikeService.getAssignedBike(engineerId).then(setBike).catch(console.error);
    attendanceService.getTodayRecord(engineerId).then((att) => {
      if (att?.id) setAttendanceId(att.id);
    }).catch(() => {});
    navigator.geolocation?.getCurrentPosition(
      (pos) => setGps({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [engineerId]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function clearSelection() {
    setSelectedFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleUpload() {
    if (!selectedFile) { toast.error('Please select a photo first'); return; }
    if (!engineerId) { toast.error('Engineer profile not linked'); return; }

    if (activeType === 'evening' && !morning) {
      toast.error('Please upload morning odometer photo first');
      return;
    }

    setUploading(true);
    try {
      const photo = await odometerService.uploadPhoto(
        engineerId,
        user?.name ?? 'Engineer',
        bike?.id,
        activeType,
        selectedFile,
        gps ?? undefined,
        attendanceId,
      );
      if (activeType === 'morning') setMorning(photo);
      else                          setEvening(photo);
      toast.success(`${activeType === 'morning' ? 'Morning' : 'Evening'} odometer photo uploaded!`);
      clearSelection();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const alreadyUploaded = activeType === 'morning' ? !!morning : !!evening;

  return (
    <DashboardLayout>
    <div className="flex flex-col gap-4 max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => navigate(-1)}>
          <ChevronLeft size={18} />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Camera size={18} className="text-primary" /> Odometer Photo
          </h1>
          <p className="text-xs text-muted-foreground">{todayLabel}</p>
        </div>
      </div>

      {/* Profile not linked error */}
      {profileError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-destructive">{profileError}</p>
          </CardContent>
        </Card>
      )}

      {/* Assigned Bike */}
      {bike && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 flex items-center gap-3">
            <BikeIcon size={16} className="text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{bike.bikeNumber}</p>
              <p className="text-xs text-muted-foreground">{bike.make} {bike.model}</p>
            </div>
            <Badge variant="secondary" className="text-xs">{bike.fuelType}</Badge>
          </CardContent>
        </Card>
      )}

      {/* Photo type selector */}
      <div className="grid grid-cols-2 gap-3">
        {(['morning', 'evening'] as OdometerPhotoType[]).map((t) => {
          const done = t === 'morning' ? !!morning : !!evening;
          const active = activeType === t;
          return (
            <button
              key={t}
              onClick={() => { setActiveType(t); clearSelection(); }}
              className={[
                'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40',
              ].join(' ')}
            >
              {done
                ? <CheckCircle2 size={24} className="text-green-500" />
                : <Clock size={24} className="opacity-60" />
              }
              <span className="capitalize">{t}</span>
              {done && <span className="text-xs text-green-600">Uploaded</span>}
            </button>
          );
        })}
      </div>

      {/* Evening warning */}
      {activeType === 'evening' && !morning && (
        <Card className="border-amber-400/40 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              You must upload morning odometer photo first
            </p>
          </CardContent>
        </Card>
      )}

      {/* Already uploaded */}
      {alreadyUploaded ? (
        <Card className="border-green-400/30">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2 text-green-600">
              <CheckCircle2 size={16} /> {activeType === 'morning' ? 'Morning' : 'Evening'} Photo Uploaded
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex flex-col gap-3">
            <img
              src={activeType === 'morning' ? morning?.photoUrl : evening?.photoUrl}
              alt="Odometer"
              className="w-full max-h-64 object-contain rounded-lg border border-border bg-muted"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock size={12} />
              {new Date(activeType === 'morning' ? (morning?.capturedAt ?? '') : (evening?.capturedAt ?? '')).toLocaleTimeString()}
              {gps && <><MapPin size={12} className="ml-2" /> GPS captured</>}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Photo recorded. Admin will verify the reading.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Upload card */
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold capitalize">
              {activeType} Odometer Photo
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex flex-col gap-4">
            {/* Preview */}
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="w-full max-h-64 object-contain rounded-lg border border-border bg-muted" />
                <button
                  onClick={clearSelection}
                  className="absolute top-2 right-2 bg-background/80 rounded-full p-1 text-xs text-foreground border border-border"
                >✕</button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center gap-3 w-full rounded-xl border-2 border-dashed border-border bg-muted/30 py-10 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Camera size={36} className="opacity-50" />
                <span className="text-sm font-medium">Tap to take / choose photo</span>
                <span className="text-xs opacity-60">JPG, PNG, HEIC — max 20MB</span>
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onFileChange}
            />

            {gps && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin size={12} className="text-green-500" />
                GPS: {gps.latitude.toFixed(4)}, {gps.longitude.toFixed(4)}
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading || (activeType === 'evening' && !morning)}
              size="lg"
              className="h-14 text-base w-full"
            >
              <Upload size={18} className="mr-2" />
              {uploading ? 'Uploading…' : `Upload ${activeType === 'morning' ? 'Morning' : 'Evening'} Photo`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Status summary */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Today's Status</p>
          <div className="flex flex-col gap-1.5">
            {[
              { label: 'Morning Photo', done: !!morning, time: morning?.capturedAt },
              { label: 'Evening Photo', done: !!evening, time: evening?.capturedAt },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-xs">
                <span className="text-foreground">{row.label}</span>
                {row.done
                  ? <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={11} /> {new Date(row.time!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  : <span className="text-muted-foreground">Pending</span>
                }
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
}
