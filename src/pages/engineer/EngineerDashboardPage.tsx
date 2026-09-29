/**
 * Engineer Dashboard Page — Phase 1 Part 6 (Production Stabilization)
 * Sectore 360 — Live Supabase data with Bike, Odometer, Daily Report status widgets
 */
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEngineerContext } from '@/contexts/EngineerContext';
import { engineerService } from '@/services/engineerService';
import { attendanceService } from '@/services/attendanceService';
import { bikeService } from '@/services/bikeService';
import { odometerService } from '@/services/odometerService';
import { dailyReportService } from '@/services/dailyReportService';
import { companyProfileService } from '@/services/companyProfileService';
import type { EngineerDashboardStats, Attendance, EngineerProfile, Bike, OdometerPhoto, DailyReport } from '@/types/engineer';
import type { AMCVisitSchedule } from '@/types/amc';
import { StatusCard } from '@/components/shared/StatusCard';
import { AttendanceStatusBadge } from '@/components/engineer/EngineerBadges';
import { OfflineBanner } from '@/components/engineer/OfflineBanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardList, CheckCircle2, AlertTriangle, Clock, Zap,
  CalendarDays, LogIn, LogOut, UserCircle, ChevronRight, Wrench,
  Phone, Mail, MessageCircle, Camera, FileText, Bike as BikeIcon, Gauge,
} from 'lucide-react';

export default function EngineerDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { engineerId } = useEngineerContext();

  const [stats,         setStats]         = useState<EngineerDashboardStats | null>(null);
  const [attendance,    setAttendance]    = useState<Attendance | null>(null);
  const [profile,       setProfile]       = useState<EngineerProfile | null>(null);
  const [bike,          setBike]          = useState<Bike | null>(null);
  const [odomPhotos,    setOdomPhotos]    = useState<{ morning?: OdometerPhoto; evening?: OdometerPhoto }>({});
  const [dailyReport,   setDailyReport]   = useState<DailyReport | null>(null);
  const [upcomingVisits, setUpcomingVisits] = useState<AMCVisitSchedule[]>([]);
  const company = companyProfileService.get();

  useEffect(() => {
    if (!engineerId) return;
    attendanceService.getTodayRecord(engineerId).then(setAttendance).catch(() => {});
    bikeService.getAssignedBike(engineerId).then(setBike).catch(() => {});
    odometerService.getTodayPhotos(engineerId).then(setOdomPhotos).catch(() => {});
    dailyReportService.getTodayReport(engineerId).then(setDailyReport).catch(() => {});
    engineerService.getDashboardStats(engineerId).then(setStats).catch(() => {});
    engineerService.getProfile(engineerId).then(setProfile).catch(() => {});
    setUpcomingVisits(engineerService.getUpcomingAMCVisits(7).slice(0, 5) as unknown as AMCVisitSchedule[]);
  }, [engineerId]);

  const checkedIn  = attendance?.status === 'checked_in';
  const checkedOut = attendance?.status === 'checked_out';
  const canCheckOut = checkedIn && !!dailyReport && dailyReport.status !== 'sent_back';

  function fmtTime(iso?: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const reportStatusColor = (s?: string) =>
    !s                   ? 'text-muted-foreground' :
    s === 'approved'     ? 'text-green-600'         :
    s === 'sent_back'    ? 'text-red-500'            :
    /* submitted */        'text-blue-600';

  return (
    <DashboardLayout>
    <div className="flex flex-col gap-4 max-w-2xl mx-auto pb-8">

      {/* ── Profile Header ───────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/engineer/profile')}
          className="shrink-0 w-12 h-12 rounded-full border-2 border-primary/30 overflow-hidden bg-muted flex items-center justify-center hover:border-primary transition-colors"
        >
          {profile?.photoUrl
            ? <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
            : <UserCircle size={28} className="text-muted-foreground" />
          }
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground">
            {greeting}, {profile?.name?.split(' ')[0] ?? user?.name?.split(' ')[0] ?? 'Engineer'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {profile?.designation && <span className="font-medium">{profile.designation} · </span>}
            {new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      <OfflineBanner />

      {/* ── Attendance Card ──────────────────────────────── */}
      <Card className={
        checkedIn  ? 'border-green-500/40 bg-green-500/5' :
        checkedOut ? 'border-border'                       :
        'border-amber-400/40 bg-amber-400/5'
      }>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">Attendance</span>
                {attendance
                  ? <AttendanceStatusBadge status={attendance.status} />
                  : <Badge variant="outline" className="text-xs bg-amber-400/10 text-amber-600 border-amber-400/20">Not Checked In</Badge>
                }
              </div>
              {attendance && (
                <p className="text-xs text-muted-foreground">
                  In: {fmtTime(attendance.checkInTime)}
                  {attendance.checkOutTime && ` · Out: ${fmtTime(attendance.checkOutTime)}`}
                  {attendance.workingHours != null && ` · ${attendance.workingHours.toFixed(1)}h`}
                </p>
              )}
            </div>
            {!checkedIn && !checkedOut && (
              <Button size="sm" className="shrink-0 min-h-[40px] px-4" onClick={() => navigate('/engineer/attendance/checkin')}>
                <LogIn size={15} className="mr-1" /> Check In
              </Button>
            )}
            {checkedIn && (
              <Button
                size="sm" variant="outline"
                className="shrink-0 min-h-[40px] px-4"
                onClick={() => navigate('/engineer/daily-report')}
              >
                <LogOut size={15} className="mr-1" /> Check Out
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Status Widgets Row ───────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Assigned Bike */}
        <button
          type="button"
          onClick={() => navigate('/engineer/bike')}
          className="text-left"
        >
          <Card className="h-full hover:border-primary/40 transition-colors">
            <CardContent className="p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <BikeIcon size={11} /> Assigned Bike
                </p>
                <ChevronRight size={12} className="text-muted-foreground" />
              </div>
              {bike ? (
                <>
                  <p className="text-sm font-bold text-foreground">{bike.bikeNumber}</p>
                  <p className="text-xs text-muted-foreground">{bike.make} {bike.model}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Not assigned</p>
              )}
            </CardContent>
          </Card>
        </button>

        {/* Odometer Status */}
        <button
          type="button"
          onClick={() => navigate('/engineer/odometer')}
          className="text-left"
        >
          <Card className="h-full hover:border-primary/40 transition-colors">
            <CardContent className="p-3 flex flex-col gap-1">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Gauge size={11} /> Odometer Photos
              </p>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1 text-xs">
                  {odomPhotos.morning
                    ? <CheckCircle2 size={11} className="text-green-500" />
                    : <Clock size={11} className="text-muted-foreground" />
                  }
                  <span className={odomPhotos.morning ? 'text-green-600' : 'text-muted-foreground'}>
                    Morning
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {odomPhotos.evening
                    ? <CheckCircle2 size={11} className="text-green-500" />
                    : <Clock size={11} className="text-muted-foreground" />
                  }
                  <span className={odomPhotos.evening ? 'text-green-600' : 'text-muted-foreground'}>
                    Evening
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* ── Daily Report Status ──────────────────────────── */}
      <button
        type="button"
        onClick={() => navigate('/engineer/daily-report')}
        className="text-left w-full"
      >
        <Card className={`hover:border-primary/40 transition-colors ${!dailyReport && checkedIn ? 'border-amber-400/40 bg-amber-400/5' : ''}`}>
          <CardContent className="p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText size={16} className={`shrink-0 ${dailyReport ? reportStatusColor(dailyReport.status) : 'text-muted-foreground'}`} />
              <div>
                <p className="text-sm font-semibold text-foreground">Daily Report</p>
                <p className={`text-xs ${reportStatusColor(dailyReport?.status)}`}>
                  {!dailyReport
                    ? checkedIn ? 'Required before check out' : 'Not submitted'
                    : dailyReport.status === 'approved'  ? 'Approved by admin'
                    : dailyReport.status === 'sent_back' ? 'Sent back — needs correction'
                    : 'Submitted — awaiting review'
                  }
                </p>
              </div>
            </div>
            <ChevronRight size={14} className="text-muted-foreground shrink-0" />
          </CardContent>
        </Card>
      </button>

      {/* ── Task Stats ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="cursor-pointer" onClick={() => navigate('/engineer/tasks?filter=pending')}>
          <StatusCard title="Pending" value={stats?.todayPending ?? '—'} icon={ClipboardList} variant="warning" />
        </div>
        <div className="cursor-pointer" onClick={() => navigate('/engineer/tasks?filter=working')}>
          <StatusCard title="Working" value={stats?.todayWorking ?? '—'} icon={Wrench} variant="primary" />
        </div>
        <div className="cursor-pointer" onClick={() => navigate('/engineer/tasks?filter=completed')}>
          <StatusCard title="Completed" value={stats?.todayCompleted ?? '—'} icon={CheckCircle2} variant="success" />
        </div>
        <div className="cursor-pointer" onClick={() => navigate('/engineer/tasks?filter=overdue')}>
          <StatusCard title="Overdue" value={stats?.todayOverdue ?? '—'} icon={AlertTriangle} variant="danger" />
        </div>
      </div>

      {stats?.todayEmergency ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-3 flex items-center gap-3">
            <Zap size={18} className="text-destructive shrink-0" />
            <p className="text-sm font-semibold text-destructive flex-1">
              {stats.todayEmergency} Emergency Task{stats.todayEmergency > 1 ? 's' : ''}
            </p>
            <Button size="sm" variant="ghost" className="text-destructive shrink-0 h-8 px-2"
              onClick={() => navigate('/engineer/tasks?filter=emergency')}>
              View <ChevronRight size={14} />
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Quick Actions ────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Quick Actions</p>
        <div className="grid grid-cols-3 gap-2">
          {/* Check In */}
          {!checkedIn && !checkedOut && (
            <Button size="lg" className="h-14 flex-col gap-1 text-xs" onClick={() => navigate('/engineer/attendance/checkin')}>
              <LogIn size={18} />Check In
            </Button>
          )}
          {/* My Tasks */}
          <Button size="lg" variant="outline" className="h-14 flex-col gap-1 text-xs" onClick={() => navigate('/engineer/tasks')}>
            <ClipboardList size={18} />My Tasks
          </Button>
          {/* Morning Odometer */}
          <Button
            size="lg"
            variant={odomPhotos.morning ? 'outline' : 'default'}
            className="h-14 flex-col gap-1 text-xs"
            onClick={() => navigate('/engineer/odometer?type=morning')}
          >
            <Camera size={18} />
            {odomPhotos.morning ? 'Morning ✓' : 'Morning Odo'}
          </Button>
          {/* Evening Odometer */}
          <Button
            size="lg"
            variant={odomPhotos.evening ? 'outline' : 'default'}
            className="h-14 flex-col gap-1 text-xs"
            onClick={() => navigate('/engineer/odometer?type=evening')}
          >
            <Camera size={18} />
            {odomPhotos.evening ? 'Evening ✓' : 'Evening Odo'}
          </Button>
          {/* Daily Report */}
          <Button
            size="lg"
            variant={dailyReport ? 'outline' : checkedIn ? 'default' : 'outline'}
            className="h-14 flex-col gap-1 text-xs"
            onClick={() => navigate('/engineer/daily-report')}
          >
            <FileText size={18} />
            {dailyReport ? 'Report ✓' : 'Daily Report'}
          </Button>
          {/* Check Out */}
          {checkedIn && (
            <Button
              size="lg"
              variant={canCheckOut ? 'default' : 'outline'}
              className="h-14 flex-col gap-1 text-xs"
              onClick={() => navigate('/engineer/daily-report')}
            >
              <LogOut size={18} />Check Out
            </Button>
          )}
        </div>
      </div>

      {/* ── Emergency Support ────────────────────────────── */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Phone size={13} className="text-primary" />Emergency Support
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">{company.name} — {company.tagline}</p>
          <div className="grid grid-cols-3 gap-2">
            <a href={`tel:+91${company.emergencyPhone}`}>
              <Button variant="outline" className="w-full gap-1.5 h-10 text-xs" type="button">
                <Phone size={13} className="text-primary" />Call
              </Button>
            </a>
            <a href={`mailto:${company.supportEmail}`}>
              <Button variant="outline" className="w-full gap-1.5 h-10 text-xs" type="button">
                <Mail size={13} className="text-primary" />Email
              </Button>
            </a>
            <a href={`https://wa.me/91${company.emergencyPhone}`} target="_blank" rel="noreferrer">
              <Button variant="outline" className="w-full gap-1.5 h-10 text-xs" type="button">
                <MessageCircle size={13} className="text-green-600" />WhatsApp
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* ── Upcoming AMC Visits ──────────────────────────── */}
      {upcomingVisits.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarDays size={15} className="text-primary" />Upcoming AMC Visits
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => navigate('/amc')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex flex-col gap-2">
            {upcomingVisits.map((v) => (
              <div key={v.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarDays size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Visit #{v.visitNumber}</p>
                  <p className="text-xs text-muted-foreground">{v.scheduledDate}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">Pending</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
    </DashboardLayout>
  );
}
