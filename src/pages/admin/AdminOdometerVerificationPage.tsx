/**
 * Admin Odometer Verification Page
 * Admin views morning/evening photos, enters readings, system calculates KM.
 */
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { odometerService } from '@/services/odometerService';
import { attendanceService } from '@/services/attendanceService';
import type { OdometerPhoto, OdometerVerification } from '@/types/engineer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Camera, CheckCircle2, Clock, MapPin, Gauge, AlertCircle } from 'lucide-react';

interface EngineerRow {
  engineerId:    string;
  engineerName:  string;
  morning?:      OdometerPhoto;
  evening?:      OdometerPhoto;
  verification?: OdometerVerification;
  bikeId?:       string;
}

export default function AdminOdometerVerificationPage() {
  const { user }         = useAuth();
  const [date, setDate]  = useState(new Date().toISOString().slice(0, 10));
  const [rows,  setRows] = useState<EngineerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [readings, setReadings] = useState<Record<string, { morning: string; evening: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      odometerService.listPendingVerifications(date),
      attendanceService.getHistory(undefined, 1),
    ]).then(async ([verifs]) => {
      // Fetch all odometer photos for the selected date
      const { supabase } = await import('@/lib/supabase');
      const { data: rawPhotos } = await supabase
        .from('odometer_photos')
        .select('*')
        .eq('date', date)
        .order('engineer_name');

      // Map raw DB rows to typed OdometerPhoto (snake_case → camelCase)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const photos: OdometerPhoto[] = (rawPhotos ?? []).map((r: any) => ({
        id:           r.id,
        engineerId:   r.engineer_id,
        engineerName: r.engineer_name ?? '',
        bikeId:       r.bike_id       ?? undefined,
        date:         typeof r.date === 'string' ? r.date.slice(0, 10) : r.date,
        photoType:    r.photo_type,
        photoUrl:     r.photo_url,
        gpsLat:       r.gps_lat  != null ? Number(r.gps_lat)  : undefined,
        gpsLng:       r.gps_lng  != null ? Number(r.gps_lng)  : undefined,
        capturedAt:   r.captured_at,
        createdAt:    r.created_at,
      }));

      // Group photos by engineer
      const map = new Map<string, EngineerRow>();
      photos.forEach((p) => {
        if (!map.has(p.engineerId)) {
          map.set(p.engineerId, { engineerId: p.engineerId, engineerName: p.engineerName, bikeId: p.bikeId });
        }
        const row = map.get(p.engineerId)!;
        if (p.photoType === 'morning') row.morning = p;
        if (p.photoType === 'evening') row.evening = p;
      });

      // Attach verifications
      verifs.forEach((v) => {
        if (map.has(v.engineerId)) {
          map.get(v.engineerId)!.verification = v;
        } else {
          map.set(v.engineerId, {
            engineerId:   v.engineerId,
            engineerName: v.engineerName,
            bikeId:       v.bikeId,
            verification: v,
          });
        }
      });

      const rowList = Array.from(map.values());
      setRows(rowList);

      // Initialize readings from existing verifications
      const init: Record<string, { morning: string; evening: string }> = {};
      rowList.forEach((r) => {
        init[r.engineerId] = {
          morning: r.verification?.morningReading?.toString() ?? '',
          evening: r.verification?.eveningReading?.toString() ?? '',
        };
      });
      setReadings(init);
    }).catch(console.error).finally(() => setLoading(false));
  }, [date]);

  function setReading(eid: string, type: 'morning' | 'evening', val: string) {
    setReadings((prev) => ({ ...prev, [eid]: { ...prev[eid], [type]: val } }));
  }

  async function saveVerification(row: EngineerRow) {
    const r = readings[row.engineerId];
    const morn = parseFloat(r?.morning ?? '');
    const eve  = parseFloat(r?.evening ?? '');
    if (isNaN(morn) || isNaN(eve)) { toast.error('Enter both readings'); return; }
    if (eve <= morn) { toast.error('Evening reading must be greater than morning'); return; }

    setSaving(row.engineerId);
    try {
      const saved = await odometerService.saveVerification({
        engineerId:     row.engineerId,
        engineerName:   row.engineerName,
        bikeId:         row.bikeId,
        date,
        morningPhotoId: row.morning?.id,
        eveningPhotoId: row.evening?.id,
        morningReading: morn,
        eveningReading: eve,
        verifiedBy:     user?.name ?? 'Admin',
      });
      setRows((prev) => prev.map((x) => x.engineerId === row.engineerId ? { ...x, verification: saved } : x));
      toast.success(`Verification saved for ${row.engineerName} — ${saved.kmTravelled} KM`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(null);
    }
  }

  return (
    <DashboardLayout>
    <div className="flex flex-col gap-4 max-w-3xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Gauge size={20} className="text-primary" /> Odometer Verification
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Enter readings from engineer photos</p>
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-40 h-9 text-sm"
        />
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Engineers',   value: rows.length },
          { label: 'Verified',    value: rows.filter((r) => r.verification?.status === 'verified').length },
          { label: 'Pending',     value: rows.filter((r) => r.verification?.status !== 'verified').length },
        ].map((s) => (
          <Card key={s.label} className="text-center">
            <CardContent className="p-3">
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Loading…</CardContent></Card>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">
          No odometer photos submitted for {date}
        </CardContent></Card>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((row) => {
            const verified = row.verification?.status === 'verified';
            const r = readings[row.engineerId] ?? { morning: '', evening: '' };
            const morn = parseFloat(r.morning);
            const eve  = parseFloat(r.evening);
            const km   = !isNaN(morn) && !isNaN(eve) && eve > morn ? eve - morn : row.verification?.kmTravelled;

            return (
              <Card key={row.engineerId} className={verified ? 'border-green-400/30' : ''}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm">{row.engineerName}</CardTitle>
                    <div className="flex items-center gap-2">
                      {km != null && (
                        <Badge variant="secondary" className="text-xs">
                          {km} KM
                        </Badge>
                      )}
                      {verified
                        ? <Badge variant="outline" className="text-xs text-green-600 border-green-400">Verified</Badge>
                        : <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">Pending</Badge>
                      }
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 flex flex-col gap-4">
                  {/* Photos */}
                  <div className="grid grid-cols-2 gap-3">
                    {(['morning', 'evening'] as const).map((t) => {
                      const photo = t === 'morning' ? row.morning : row.evening;
                      return (
                        <div key={t} className="flex flex-col gap-2">
                          <p className="text-xs font-semibold text-muted-foreground capitalize flex items-center gap-1">
                            {t === 'morning' ? <Clock size={11} /> : <Camera size={11} />} {t} Photo
                          </p>
                          {photo ? (
                            <a href={photo.photoUrl} target="_blank" rel="noreferrer">
                              <img
                                src={photo.photoUrl}
                                alt={`${t} odometer`}
                                className="w-full h-28 object-cover rounded-lg border border-border bg-muted hover:opacity-90 transition-opacity cursor-zoom-in"
                              />
                            </a>
                          ) : (
                            <div className="w-full h-28 rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center">
                              <div className="text-center">
                                <AlertCircle size={18} className="text-muted-foreground mx-auto mb-1" />
                                <p className="text-xs text-muted-foreground">Not uploaded</p>
                              </div>
                            </div>
                          )}
                          {photo?.gpsLat && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin size={10} /> {photo.gpsLat.toFixed(4)}, {photo.gpsLng?.toFixed(4)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Readings input */}
                  <div className="grid grid-cols-2 gap-3">
                    {(['morning', 'evening'] as const).map((t) => (
                      <div key={t} className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-foreground capitalize">{t} Reading (KM)</label>
                        <Input
                          type="number"
                          placeholder="Enter reading"
                          value={r[t]}
                          onChange={(e) => setReading(row.engineerId, t, e.target.value)}
                          disabled={verified}
                          className="h-10 text-sm"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Calculated KM */}
                  {km != null && km > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
                      <Gauge size={14} className="text-primary" />
                      <p className="text-sm font-semibold text-primary">KM Travelled Today: {km}</p>
                    </div>
                  )}

                  {/* Verification info or button */}
                  {verified ? (
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <CheckCircle2 size={14} />
                      Verified by {row.verification?.verifiedBy} · {row.verification?.verifiedAt ? new Date(row.verification.verifiedAt).toLocaleString() : ''}
                    </div>
                  ) : (
                    <Button
                      onClick={() => saveVerification(row)}
                      disabled={saving === row.engineerId || !row.morning || !row.evening}
                      size="sm"
                      className="w-full"
                    >
                      <CheckCircle2 size={14} className="mr-1" />
                      {saving === row.engineerId ? 'Saving…' : 'Verify & Save'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
