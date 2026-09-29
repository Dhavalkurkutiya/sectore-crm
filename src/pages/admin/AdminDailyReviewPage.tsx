/**
 * Admin Daily Review Dashboard
 * Per-engineer daily view: Attendance, Odometer, Daily Report, Tasks, KM, Fuel.
 * Admin can Approve or Send Back for Correction.
 */
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { dailyReportService } from '@/services/dailyReportService';
import { attendanceService } from '@/services/attendanceService';
import { odometerService } from '@/services/odometerService';
import { fuelService, type FuelLogEntry } from '@/services/fuelService';
import type { DailyReport, Attendance, OdometerVerification } from '@/types/engineer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  CheckCircle2, Clock, Camera, Fuel, FileText,
  AlertCircle, ChevronDown, ChevronUp, Gauge,
} from 'lucide-react';

interface EngineerDayRow {
  engineerId:    string;
  engineerName:  string;
  attendance?:   Attendance;
  verification?: OdometerVerification;
  report?:       DailyReport;
  fuelLogs:      FuelLogEntry[];
  expanded:      boolean;
}

export default function AdminDailyReviewPage() {
  const { user }        = useAuth();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows,  setRows]   = useState<EngineerDayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendBackOpen, setSendBackOpen] = useState(false);
  const [sendBackId,   setSendBackId]   = useState('');
  const [adminNotes,   setAdminNotes]   = useState('');
  const [actioning,    setActioning]    = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dailyReportService.listByDate(date),
      attendanceService.getHistory(undefined, 1),
      odometerService.listPendingVerifications(date),
      fuelService.getByDateRange(date, date),
    ]).then(([reports, allAtt, verifs, fuels]) => {
      // Map by engineer
      const map = new Map<string, EngineerDayRow>();

      // Seed from attendance
      allAtt
        .filter((a) => a.date === date)
        .forEach((a) => {
          map.set(a.engineerId, {
            engineerId:  a.engineerId,
            engineerName: a.engineerName,
            attendance:  a,
            fuelLogs:    [],
            expanded:    false,
          });
        });

      // Add verifications
      verifs.forEach((v) => {
        if (!map.has(v.engineerId)) {
          map.set(v.engineerId, { engineerId: v.engineerId, engineerName: v.engineerName, fuelLogs: [], expanded: false });
        }
        map.get(v.engineerId)!.verification = v;
      });

      // Add reports
      reports.forEach((r) => {
        if (!map.has(r.engineerId)) {
          map.set(r.engineerId, { engineerId: r.engineerId, engineerName: r.engineerName, fuelLogs: [], expanded: false });
        }
        map.get(r.engineerId)!.report = r;
      });

      // Add fuel logs
      fuels.forEach((f) => {
        if (!map.has(f.engineerId)) {
          map.set(f.engineerId, { engineerId: f.engineerId, engineerName: f.engineerName, fuelLogs: [], expanded: false });
        }
        map.get(f.engineerId)!.fuelLogs.push(f);
      });

      setRows(Array.from(map.values()).sort((a, b) => a.engineerName.localeCompare(b.engineerName)));
    }).catch(console.error).finally(() => setLoading(false));
  }, [date]);

  function toggleExpand(eid: string) {
    setRows((p) => p.map((r) => r.engineerId === eid ? { ...r, expanded: !r.expanded } : r));
  }

  async function handleApprove(reportId: string) {
    setActioning(true);
    try {
      const updated = await dailyReportService.approve(reportId, user?.name ?? 'Admin');
      setRows((p) => p.map((r) => r.report?.id === reportId ? { ...r, report: updated } : r));
      toast.success('Daily report approved!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActioning(false);
    }
  }

  async function handleSendBack() {
    if (!adminNotes.trim()) { toast.error('Enter correction notes'); return; }
    setActioning(true);
    try {
      const updated = await dailyReportService.sendBack(sendBackId, user?.name ?? 'Admin', adminNotes);
      setRows((p) => p.map((r) => r.report?.id === sendBackId ? { ...r, report: updated } : r));
      toast.success('Sent back for correction');
      setSendBackOpen(false);
      setAdminNotes('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActioning(false);
    }
  }

  const statusBadge = (status?: string) => {
    if (!status) return null;
    const cfg: Record<string, string> = {
      approved:  'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300',
      submitted: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300',
      sent_back: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300',
    };
    return (
      <Badge variant="outline" className={`text-xs capitalize ${cfg[status] ?? ''}`}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
    <div className="flex flex-col gap-4 max-w-3xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText size={20} className="text-primary" /> Daily Operations Review
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Per-engineer daily summary</p>
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-40 h-9 text-sm"
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Engineers',  value: rows.length },
          { label: 'Present',    value: rows.filter((r) => r.attendance).length },
          { label: 'Reported',   value: rows.filter((r) => r.report).length },
          { label: 'Approved',   value: rows.filter((r) => r.report?.status === 'approved').length },
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
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No activity data for {date}</CardContent></Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <Card key={row.engineerId}>
              {/* Summary row — always visible */}
              <CardHeader className="pb-0 pt-4 px-4">
                <button
                  className="flex items-center justify-between w-full text-left"
                  onClick={() => toggleExpand(row.engineerId)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{row.engineerName.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{row.engineerName}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {/* Attendance */}
                        <span className={`flex items-center gap-0.5 text-xs ${row.attendance ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {row.attendance ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          {row.attendance ? 'Present' : 'Absent'}
                        </span>
                        {/* Odometer */}
                        <span className={`flex items-center gap-0.5 text-xs ${row.verification?.status === 'verified' ? 'text-green-600' : 'text-muted-foreground'}`}>
                          <Gauge size={10} />
                          {row.verification?.kmTravelled != null ? `${row.verification.kmTravelled}KM` : 'Odo—'}
                        </span>
                        {/* Report */}
                        {row.report && statusBadge(row.report.status)}
                        {!row.report && <Badge variant="outline" className="text-xs text-muted-foreground">No Report</Badge>}
                        {/* Fuel */}
                        {row.fuelLogs.length > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Fuel size={10} /> ₹{row.fuelLogs.reduce((s, f) => s + f.amount, 0).toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {row.expanded ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
                </button>
              </CardHeader>

              {/* Expanded detail */}
              {row.expanded && (
                <CardContent className="px-4 pb-4 pt-3 flex flex-col gap-4 border-t border-border mt-3">
                  {/* Attendance detail */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">ATTENDANCE</p>
                    {row.attendance ? (
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Check In</p>
                          <p className="font-medium">{row.attendance.checkInTime ? new Date(row.attendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Check Out</p>
                          <p className="font-medium">{row.attendance.checkOutTime ? new Date(row.attendance.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not yet'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Hours</p>
                          <p className="font-medium">{row.attendance.workingHours ?? '—'}h</p>
                        </div>
                      </div>
                    ) : <p className="text-xs text-muted-foreground">No attendance record</p>}
                  </div>

                  {/* Odometer */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">ODOMETER</p>
                    {row.verification ? (
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><p className="text-muted-foreground">Morning</p><p className="font-medium">{row.verification.morningReading ?? '—'} KM</p></div>
                        <div><p className="text-muted-foreground">Evening</p><p className="font-medium">{row.verification.eveningReading ?? '—'} KM</p></div>
                        <div><p className="text-muted-foreground">Travelled</p><p className="font-medium text-primary">{row.verification.kmTravelled ?? '—'} KM</p></div>
                      </div>
                    ) : <p className="text-xs text-muted-foreground">No verification data</p>}
                  </div>

                  {/* Fuel */}
                  {row.fuelLogs.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">FUEL</p>
                      <div className="flex flex-wrap gap-3 text-xs">
                        <span><span className="text-muted-foreground">Litres: </span>{row.fuelLogs.reduce((s, f) => s + f.liters, 0).toFixed(1)}L</span>
                        <span><span className="text-muted-foreground">Cost: </span>₹{row.fuelLogs.reduce((s, f) => s + f.amount, 0).toFixed(0)}</span>
                        {row.fuelLogs[0]?.mileage && <span><span className="text-muted-foreground">Mileage: </span>{row.fuelLogs[0].mileage.toFixed(1)} KM/L</span>}
                      </div>
                    </div>
                  )}

                  {/* Daily Report */}
                  {row.report && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">DAILY REPORT</p>
                      <div className="flex flex-col gap-2">
                        {[
                          { label: 'Parts Required',     value: row.report.partsRequired },
                          { label: 'Customer Follow-up', value: row.report.customerFollowup },
                          { label: 'Issues Faced',       value: row.report.issuesFaced },
                          { label: "Tomorrow's Priority",value: row.report.tomorrowPriority },
                          { label: 'Remarks',            value: row.report.remarks },
                        ].filter((f) => f.value).map((f) => (
                          <div key={f.label}>
                            <p className="text-xs text-muted-foreground">{f.label}</p>
                            <p className="text-xs text-foreground">{f.value}</p>
                          </div>
                        ))}
                        {/* Photos */}
                        {row.report.sitePhotoUrls.length > 0 && (
                          <div className="flex gap-2 flex-wrap mt-1">
                            {row.report.sitePhotoUrls.map((url, i) => (
                              <a key={url} href={url} target="_blank" rel="noreferrer">
                                <img src={url} alt={`site ${i + 1}`} className="h-14 w-14 object-cover rounded border border-border cursor-zoom-in hover:opacity-80" />
                              </a>
                            ))}
                          </div>
                        )}
                        {/* Admin notes if sent back */}
                        {row.report.adminNotes && (
                          <div className="flex gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
                            <AlertCircle size={12} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-600 dark:text-red-400">{row.report.adminNotes}</p>
                          </div>
                        )}
                        {/* Actions */}
                        {row.report.status === 'submitted' && (
                          <div className="flex gap-2 mt-1">
                            <Button
                              size="sm"
                              className="flex-1 h-9 text-xs"
                              onClick={() => handleApprove(row.report!.id)}
                              disabled={actioning}
                            >
                              <CheckCircle2 size={13} className="mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-9 text-xs"
                              onClick={() => { setSendBackId(row.report!.id); setSendBackOpen(true); }}
                            >
                              <Camera size={13} className="mr-1" /> Send Back
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {!row.report && (
                    <div className="flex items-center gap-2 text-xs text-amber-600">
                      <AlertCircle size={12} /> Daily report not submitted yet
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Send Back dialog */}
      <Dialog open={sendBackOpen} onOpenChange={setSendBackOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Back for Correction</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-foreground">Correction Notes *</label>
            <Textarea
              rows={4}
              className="mt-2"
              placeholder="Explain what needs to be corrected…"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendBackOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleSendBack} disabled={actioning || !adminNotes.trim()}>
              {actioning ? 'Sending…' : 'Send Back'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
}
