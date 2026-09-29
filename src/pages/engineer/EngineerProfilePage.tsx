import { DashboardLayout } from '@/components/layouts/DashboardLayout';
/**
 * Engineer Profile Page — Part 5
 * Sectore 360 — Personal info, attendance summary, task summary
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEngineerContext } from '@/contexts/EngineerContext';
import { engineerService } from '@/services/engineerService';
import { attendanceService } from '@/services/attendanceService';
import type { EngineerProfile, Bike } from '@/types/engineer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft, UserCircle, Phone, Mail, Calendar, Clock,
  Wrench, CheckCircle2, Bike as BikeIcon, Star,
} from 'lucide-react';

interface Row { label: string; value: string | number; icon?: React.ElementType }

function InfoRow({ label, value, icon: Icon }: Row) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon size={13} />}
        {label}
      </div>
      <p className="text-sm font-medium text-foreground text-right max-w-[55%] truncate">{value}</p>
    </div>
  );
}

export default function EngineerProfilePage() {
  const navigate = useNavigate();
  const { engineerId } = useEngineerContext();
  const [profile, setProfile]     = useState<EngineerProfile | null>(null);
  const [bike, setBike]           = useState<Bike | null>(null);
  const [attendance, setAttendance] = useState({ totalDays: 0, totalHours: 0, avgHours: 0 });
  const [taskSummary, setTaskSummary] = useState({ completedThisMonth: 0, pending: 0, total: 0 });

  useEffect(() => {
    if (!engineerId) return;
    Promise.all([
      engineerService.getProfile(engineerId),
      engineerService.getAssignedBike(engineerId),
      attendanceService.getSummary(engineerId),
      engineerService.getTaskSummary(engineerId),
    ]).then(([p, b, a, ts]) => {
      setProfile(p);
      setBike(b);
      setAttendance(a);
      setTaskSummary(ts);
    }).catch(() => {});
  }, [engineerId]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Loading profile…
      </div>
    );
  }

  return (
    <DashboardLayout>
    <div className="flex flex-col gap-4 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => navigate(-1)}>
          <ChevronLeft size={18} />
        </Button>
        <h1 className="text-lg font-bold text-foreground">My Profile</h1>
      </div>

      {/* Avatar + name */}
      <Card>
        <CardContent className="p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <UserCircle size={36} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-foreground">{profile.name}</p>
            <p className="text-sm text-muted-foreground">{profile.employeeId}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">Engineer</Badge>
              <Badge variant="outline" className="text-xs text-muted-foreground">{profile.specialization}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal details */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Personal Details</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <InfoRow label="Mobile"      value={profile.mobile}  icon={Phone} />
          <InfoRow label="Email"       value={profile.email}   icon={Mail} />
          <InfoRow label="Joined"      value={profile.joiningDate} icon={Calendar} />
          <InfoRow label="Experience"  value={`${profile.yearsOfExperience} years`} icon={Star} />
          <InfoRow label="Specialization" value={profile.specialization} icon={Wrench} />
        </CardContent>
      </Card>

      {/* Attendance summary */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock size={14} className="text-primary" /> Attendance (This Month)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-foreground">{attendance.totalDays}</p>
              <p className="text-xs text-muted-foreground">Days</p>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{attendance.totalHours.toFixed(0)}h</p>
              <p className="text-xs text-muted-foreground">Total Hours</p>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{attendance.avgHours.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">Avg/Day</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-3 text-xs h-8"
            onClick={() => navigate('/engineer/attendance/history')}>
            View Full History
          </Button>
        </CardContent>
      </Card>

      {/* Task summary */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 size={14} className="text-primary" /> Task Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-success">{taskSummary.completedThisMonth}</p>
              <p className="text-xs text-muted-foreground">Done (Month)</p>
            </div>
            <div>
              <p className="text-xl font-bold text-warning">{taskSummary.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{taskSummary.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-3 text-xs h-8"
            onClick={() => navigate('/engineer/tasks')}>
            View My Tasks
          </Button>
        </CardContent>
      </Card>

      {/* Bike */}
      {bike && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BikeIcon size={14} className="text-primary" /> Assigned Bike
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InfoRow label="Number" value={bike.bikeNumber} />
            <InfoRow label="Model"  value={bike.model} />
            <InfoRow label="Mileage" value={`${bike.averageMileage} KM/L`} />
            <Button variant="outline" size="sm" className="w-full mt-3 text-xs h-8"
              onClick={() => navigate('/engineer/bike')}>
              View Bike Details
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
    </DashboardLayout>
  );
}
