/**
 * AMC Dashboard Page
 * Sectore 360 — Phase 1, Part 4
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusCard } from '@/components/shared/StatusCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AMCStatusBadge, AMCContractTypeBadge, AMCVisitStatusBadge, RemainingDaysBadge } from '@/components/amc/AMCBadges';
import { amcService } from '@/services/amcService';
import type { AMC, AMCStats, AMCVisitSchedule } from '@/types/amc';
import { remainingDays } from '@/types/amc';
import {
  FileText, Clock, AlertTriangle, CheckCircle2,
  RefreshCw, Plus, ArrowRight, CalendarDays, XCircle,
} from 'lucide-react';

export default function AMCDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AMCStats | null>(null);
  const [expiringAMCs, setExpiringAMCs] = useState<AMC[]>([]);
  const [upcomingVisits, setUpcomingVisits] = useState<(AMCVisitSchedule & { amcNumber: string; customerName: string })[]>([]);
  const [missedVisits, setMissedVisits] = useState<(AMCVisitSchedule & { amcNumber: string; customerName: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, allAMCs] = await Promise.all([amcService.getStats(), amcService.getAll()]);
    setStats(s);

    // Expiring in 60 days
    const today = new Date().toISOString().slice(0, 10);
    const exp = allAMCs
      .filter((a) => a.status === 'Active' && remainingDays(a.endDate) <= 60 && remainingDays(a.endDate) >= 0)
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .slice(0, 5);
    setExpiringAMCs(exp);

    // Build visit lists with context
    const visitRows: (AMCVisitSchedule & { amcNumber: string; customerName: string })[] = [];
    const missedRows: (AMCVisitSchedule & { amcNumber: string; customerName: string })[] = [];

    for (const amc of allAMCs.filter((a) => a.status === 'Active' || a.status === 'Renewed')) {
      const visits = await amcService.getVisitSchedule(amc.id);
      visits.forEach((v) => {
        const enriched = { ...v, amcNumber: amc.amcNumber, customerName: amc.customerName };
        if (v.status === 'Pending') {
          const diff = (new Date(v.scheduledDate).getTime() - new Date(today).getTime()) / 86400000;
          if (diff >= 0 && diff <= 30) visitRows.push(enriched);
        }
        if (v.status === 'Missed') missedRows.push(enriched);
      });
    }

    setUpcomingVisits(visitRows.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)).slice(0, 8));
    setMissedVisits(missedRows.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate)).slice(0, 8));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardLayout>
      <PageHeader
        title="AMC Dashboard"
        description="Overview of all Annual Maintenance Contracts, visits, and renewals."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'AMC Dashboard' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={load}>
              <RefreshCw size={13} /> Refresh
            </Button>
            <Button size="sm" className="gap-1.5 h-8" onClick={() => navigate('/amc/new')}>
              <Plus size={13} /> New AMC
            </Button>
          </div>
        }
      />

      {/* ── Stats Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="cursor-pointer" onClick={() => navigate('/amc?status=Active')}>
          <StatusCard title="Active Contracts" value={stats?.totalActive ?? '—'} icon={FileText} variant="success" />
        </div>
        <div className="cursor-pointer" onClick={() => navigate('/amc?expiring=30')}>
          <StatusCard title="Expiring ≤ 30d" value={stats?.expiringIn30 ?? '—'} icon={AlertTriangle} variant="danger" />
        </div>
        <div className="cursor-pointer" onClick={() => navigate('/amc?expiring=60')}>
          <StatusCard title="Expiring ≤ 60d" value={stats?.expiringIn60 ?? '—'} icon={Clock} variant="warning" />
        </div>
        <div className="cursor-pointer" onClick={() => navigate('/amc?status=Expired')}>
          <StatusCard title="Expired" value={stats?.expired ?? '—'} icon={XCircle} variant="danger" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatusCard title="Upcoming Visits" value={stats?.upcomingVisits ?? '—'} icon={CalendarDays} variant="primary"
          subtitle="Next 7 days" />
        <StatusCard title="Missed Visits" value={stats?.missedVisits ?? '—'} icon={AlertTriangle} variant="warning" />
        <StatusCard title="Completed Today" value={stats?.completedVisitsToday ?? '—'} icon={CheckCircle2} variant="success" />
        <div className="cursor-pointer" onClick={() => navigate('/amc?status=Draft')}>
          <StatusCard title="Draft Contracts" value={stats?.draft ?? '—'} icon={FileText} />
        </div>
      </div>

      {/* ── Two-column detail panels ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Expiring Contracts */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Expiring Within 60 Days</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate('/amc')}>
              View all <ArrowRight size={11} />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col gap-2 p-4">
                {[1,2,3].map((i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
              </div>
            ) : expiringAMCs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No contracts expiring soon.</p>
            ) : (
              <div className="divide-y divide-border">
                {expiringAMCs.map((amc) => (
                  <div key={amc.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => navigate(`/amc/${amc.id}`)}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium font-mono text-primary">{amc.amcNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">{amc.customerName}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <RemainingDaysBadge endDate={amc.endDate} />
                      <ArrowRight size={12} className="text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Visits */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Upcoming Visits (30 days)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col gap-2 p-4">
                {[1,2,3].map((i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
              </div>
            ) : upcomingVisits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No upcoming visits scheduled.</p>
            ) : (
              <div className="divide-y divide-border">
                {upcomingVisits.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                    <CalendarDays size={14} className="text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium font-mono text-primary">{v.amcNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">{v.customerName} · Visit #{v.visitNumber}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{v.scheduledDate}</span>
                      <AMCVisitStatusBadge status={v.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Missed Visits */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Missed Visits</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col gap-2 p-4">
                {[1,2].map((i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
              </div>
            ) : missedVisits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No missed visits.</p>
            ) : (
              <div className="divide-y divide-border">
                {missedVisits.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                    <AlertTriangle size={14} className="text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium font-mono text-primary">{v.amcNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">{v.customerName} · Visit #{v.visitNumber}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{v.scheduledDate}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Renewal Reminders */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Renewal Reminder Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              The following reminder templates are configured. Notification provider integration (Email/WhatsApp/SMS) will be enabled in a later phase.
            </p>
            <div className="flex flex-col gap-2">
              {[90,60,30,15,7,1,0].map((days) => (
                <div key={days} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-xs text-foreground">
                    {days === 0 ? 'On expiry date' : `${days} day${days !== 1 ? 's' : ''} before expiry`}
                  </span>
                  <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Template ready</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
