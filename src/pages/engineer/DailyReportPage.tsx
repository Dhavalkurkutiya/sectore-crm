/**
 * Daily Report Page — Engineer
 * Must be submitted before Check Out.
 * Auto-fills read-only attendance/task data; engineer enters remarks.
 */
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEngineerContext } from '@/contexts/EngineerContext';
import { dailyReportService } from '@/services/dailyReportService';
import { attendanceService } from '@/services/attendanceService';
import { odometerService } from '@/services/odometerService';
import type { DailyReport, Attendance, OdometerPhoto } from '@/types/engineer';
import { tasksApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ChevronLeft, FileText, CheckCircle2, Clock, Camera,
  Upload, Paperclip, AlertCircle, User, ClipboardList,
} from 'lucide-react';

export default function DailyReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { engineerId } = useEngineerContext();

  const [existing,    setExisting]    = useState<DailyReport | null>(null);
  const [attendance,  setAttendance]  = useState<Attendance | null>(null);
  const [odoPhotos,   setOdoPhotos]   = useState<{ morning?: OdometerPhoto; evening?: OdometerPhoto }>({});
  const [taskStats,   setTaskStats]   = useState({ total: 0, completed: 0, pending: 0 });
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [profileError, setProfileError] = useState('');

  // Form fields
  const [partsRequired,    setPartsRequired]    = useState('');
  const [customerFollowup, setCustomerFollowup] = useState('');
  const [issuesFaced,      setIssuesFaced]      = useState('');
  const [tomorrowPriority, setTomorrowPriority] = useState('');
  const [remarks,          setRemarks]          = useState('');

  // File uploads
  const [sitePhotos,  setSitePhotos]  = useState<File[]>([]);
  const [bills,       setBills]       = useState<File[]>([]);
  const [documents,   setDocuments]   = useState<File[]>([]);
  const siteRef = useRef<HTMLInputElement>(null);
  const billRef = useRef<HTMLInputElement>(null);
  const docRef  = useRef<HTMLInputElement>(null);

  const todayLabel = new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!engineerId) return;
    setLoading(true);
    Promise.all([
      dailyReportService.getTodayReport(engineerId),
      attendanceService.getTodayRecord(engineerId),
      odometerService.getTodayPhotos(engineerId),
      tasksApi.list({ engineerId }).catch(() => [] as { status: string }[]),
    ]).then(([report, att, odo, tasks]) => {
      setExisting(report);
      setAttendance(att);
      setOdoPhotos(odo);
      const completed = (tasks ?? []).filter((t) => t.status === 'completed').length;
      setTaskStats({ total: (tasks ?? []).length, completed, pending: (tasks ?? []).length - completed });
      if (report) {
        setPartsRequired(report.partsRequired    ?? '');
        setCustomerFollowup(report.customerFollowup ?? '');
        setIssuesFaced(report.issuesFaced         ?? '');
        setTomorrowPriority(report.tomorrowPriority ?? '');
        setRemarks(report.remarks                  ?? '');
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [engineerId]);

  async function handleSubmit() {
    if (!engineerId) { toast.error('Engineer profile not linked'); return; }
    setSaving(true);
    try {
      const report = await dailyReportService.submit(
        engineerId,
        user?.name ?? 'Engineer',
        attendance?.id,
        { partsRequired, customerFollowup, issuesFaced, tomorrowPriority, remarks, sitePhotos, bills, documents },
      );
      setExisting(report);
      toast.success('Daily report submitted successfully!');
      navigate('/engineer/attendance/checkout');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSaving(false);
    }
  }

  function addFiles(setter: React.Dispatch<React.SetStateAction<File[]>>, files: FileList | null) {
    if (!files) return;
    setter((prev) => [...prev, ...Array.from(files)]);
  }

  const statusColor = (s?: string) =>
    s === 'approved' ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300' :
    s === 'sent_back' ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300' :
    'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300';

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (profileError) {
    return (
      <DashboardLayout>
        <div className="flex flex-col gap-4 max-w-lg mx-auto p-4">
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-4 flex flex-col gap-2">
              <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                <AlertCircle size={16} /> Engineer Profile Not Linked
              </p>
              <p className="text-sm text-muted-foreground">{profileError}</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const alreadySubmitted = !!existing && existing.status !== 'sent_back';

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
            <FileText size={18} className="text-primary" /> Daily Report
          </h1>
          <p className="text-xs text-muted-foreground">{todayLabel}</p>
        </div>
        {existing && (
          <Badge variant="outline" className={`text-xs capitalize ${statusColor(existing.status)}`}>
            {existing.status.replace('_', ' ')}
          </Badge>
        )}
      </div>

      {/* Admin notes if sent back */}
      {existing?.status === 'sent_back' && existing.adminNotes && (
        <Card className="border-red-400/40 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-3 flex gap-2">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-700 dark:text-red-300">Correction Required</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{existing.adminNotes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-filled section (read-only) */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <User size={14} className="text-primary" /> Auto-filled Summary
            <Badge variant="secondary" className="text-xs ml-1">Read Only</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex flex-col gap-2">
          {[
            { label: 'Attendance',       value: attendance?.status === 'checked_in' || attendance?.status === 'checked_out' ? 'Present' : 'Not recorded' },
            { label: 'Check In',         value: attendance?.checkInTime  ? new Date(attendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' },
            { label: 'Check Out',        value: attendance?.checkOutTime ? new Date(attendance.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not yet' },
            { label: 'Assigned Tasks',   value: String(taskStats.total) },
            { label: 'Completed Tasks',  value: String(taskStats.completed) },
            { label: 'Pending Tasks',    value: String(taskStats.pending) },
            { label: 'Morning Odometer', value: odoPhotos.morning ? 'Uploaded' : 'Not uploaded' },
            { label: 'Evening Odometer', value: odoPhotos.evening ? 'Uploaded' : 'Not uploaded' },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{row.label}</span>
              <span className={[
                'font-medium',
                row.value === 'Not recorded' || row.value === 'Not uploaded' ? 'text-amber-500' : 'text-foreground',
                row.value === 'Uploaded' ? 'text-green-600' : '',
              ].join(' ')}>{row.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Engineer-entered fields */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList size={14} className="text-primary" /> Your Report
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex flex-col gap-4">
          {[
            { label: 'Parts Required',        value: partsRequired,    setter: setPartsRequired,    placeholder: 'List any parts needed for follow-up…' },
            { label: 'Customer Follow-up',    value: customerFollowup, setter: setCustomerFollowup, placeholder: 'Any customer callbacks or follow-ups needed…' },
            { label: 'Issues Faced',          value: issuesFaced,      setter: setIssuesFaced,      placeholder: 'Describe any technical or operational issues…' },
            { label: "Tomorrow's Priority",   value: tomorrowPriority, setter: setTomorrowPriority, placeholder: 'Tasks or sites to prioritize tomorrow…' },
            { label: 'Remarks',               value: remarks,          setter: setRemarks,          placeholder: 'Any additional notes or observations…' },
          ].map((f) => (
            <div key={f.label} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">{f.label}</label>
              <Textarea
                rows={2}
                placeholder={f.placeholder}
                value={f.value}
                onChange={(e) => f.setter(e.target.value)}
                disabled={alreadySubmitted}
                className="text-sm resize-none"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Optional uploads */}
      {!alreadySubmitted && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Paperclip size={14} className="text-primary" /> Optional Uploads
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex flex-col gap-3">
            {[
              { label: 'Site Photos',   icon: Camera, files: sitePhotos, ref: siteRef, setter: setSitePhotos, accept: 'image/*', capture: 'environment' as const },
              { label: 'Bills',         icon: Paperclip, files: bills, ref: billRef, setter: setBills, accept: 'image/*,application/pdf', capture: undefined },
              { label: 'Documents',     icon: Upload, files: documents, ref: docRef, setter: setDocuments, accept: '*/*', capture: undefined },
            ].map((u) => (
              <div key={u.label} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <u.icon size={14} className="text-muted-foreground" />
                  {u.label}
                  {u.files.length > 0 && <Badge variant="secondary" className="text-xs">{u.files.length}</Badge>}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => u.ref.current?.click()}
                >
                  Add
                </Button>
                <input
                  ref={u.ref}
                  type="file"
                  accept={u.accept}
                  {...(u.capture ? { capture: u.capture } : {})}
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(u.setter, e.target.files)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Uploaded attachments (read-only view) */}
      {alreadySubmitted && existing && (existing.sitePhotoUrls.length > 0 || existing.billUrls.length > 0 || existing.documentUrls.length > 0) && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">Attachments</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex flex-col gap-2">
            {existing.sitePhotoUrls.map((u, i) => (
              <a key={u} href={u} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                <Camera size={11} /> Site Photo {i + 1}
              </a>
            ))}
            {existing.billUrls.map((u, i) => (
              <a key={u} href={u} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                <Paperclip size={11} /> Bill {i + 1}
              </a>
            ))}
            {existing.documentUrls.map((u, i) => (
              <a key={u} href={u} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                <Upload size={11} /> Document {i + 1}
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      {!alreadySubmitted ? (
        <Button
          onClick={handleSubmit}
          disabled={saving}
          size="lg"
          className="h-14 text-base w-full"
        >
          <FileText size={18} className="mr-2" />
          {saving ? 'Submitting…' : 'Submit Daily Report'}
        </Button>
      ) : (
        <Card className="border-green-400/30 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-300">Report Submitted</p>
              <p className="text-xs text-muted-foreground">
                {existing?.submittedAt ? new Date(existing.submittedAt).toLocaleString() : ''}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => navigate('/engineer/attendance/checkout')}
            >
              <Clock size={14} className="mr-1" /> Check Out
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
    </DashboardLayout>
  );
}
