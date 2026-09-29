import { DashboardLayout } from '@/components/layouts/DashboardLayout';
/**
 * Attendance History Page — Part 5
 * Sectore 360 — Engineer + Admin view
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEngineerContext } from '@/contexts/EngineerContext';
import { attendanceService } from '@/services/attendanceService';
import type { Attendance } from '@/types/engineer';
import { AttendanceStatusBadge } from '@/components/engineer/EngineerBadges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, Clock, Calendar, MapPin } from 'lucide-react';

type Range = '7' | '30' | '90';

export default function AttendanceHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { engineerId } = useEngineerContext();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const [range, setRange] = useState<Range>('30');
  const [records, setRecords] = useState<Attendance[]>([]);

  useEffect(() => {
    if (isAdmin) {
      attendanceService.getHistory(undefined, parseInt(range))
        .then(setRecords).catch(() => setRecords([]));
    } else {
      if (!engineerId) return;
      attendanceService.getHistory(engineerId, parseInt(range))
        .then(setRecords).catch(() => setRecords([]));
    }
  }, [range, isAdmin, engineerId]);

  function fmtTime(iso?: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  }

  const totalDays   = records.length;
  const totalHours  = records.reduce((s, r) => s + (r.workingHours ?? 0), 0);
  const avgHours    = totalDays > 0 ? totalHours / totalDays : 0;

  return (
    <DashboardLayout>
    <div className="flex flex-col gap-4 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => navigate(-1)}>
          <ChevronLeft size={18} />
        </Button>
        <h1 className="text-lg font-bold text-foreground flex-1 min-w-0 truncate">Attendance History</h1>
        <Select value={range} onValueChange={(v) => setRange(v as Range)}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <CardContent className="p-3 flex flex-col gap-0.5">
            <p className="text-xl font-bold text-foreground">{totalDays}</p>
            <p className="text-xs text-muted-foreground">Days</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3 flex flex-col gap-0.5">
            <p className="text-xl font-bold text-foreground">{totalHours.toFixed(0)}h</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3 flex flex-col gap-0.5">
            <p className="text-xl font-bold text-foreground">{avgHours.toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground">Avg/Day</p>
          </CardContent>
        </Card>
      </div>

      {/* Records list */}
      {records.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            No attendance records found
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {records.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-primary shrink-0" />
                    <p className="text-sm font-semibold text-foreground">{fmtDate(r.date)}</p>
                    {isAdmin && (
                      <Badge variant="outline" className="text-xs">{r.engineerName}</Badge>
                    )}
                  </div>
                  <AttendanceStatusBadge status={r.status} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock size={11} />
                    <span>In: {fmtTime(r.checkInTime)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={11} />
                    <span>Out: {fmtTime(r.checkOutTime)}</span>
                  </div>
                  <div className="flex items-center gap-1 font-medium text-foreground">
                    <Clock size={11} />
                    <span>{r.workingHours != null ? `${r.workingHours.toFixed(1)}h` : '—'}</span>
                  </div>
                </div>
                {(r.checkInGPS || r.checkOutGPS) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin size={11} />
                    {r.checkInGPS && <span>In: {r.checkInGPS.latitude.toFixed(4)},{r.checkInGPS.longitude.toFixed(4)}</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
