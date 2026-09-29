/**
 * Dashboard Page
 * Sectore 360 — Main overview for all roles
 * Role-aware: Admin sees global live stats, Engineer sees own data, Customer sees own data
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusCard } from '@/components/shared/StatusCard';
import { AlertBanner } from '@/components/shared/AlertBanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { taskService } from '@/services/taskService';
import { amcService } from '@/services/amcService';
import { companyProfileService } from '@/services/companyProfileService';
import type { AMCStats } from '@/types/amc';
import {
  Users, Server, ClipboardList, CheckCircle2, Clock, AlertTriangle,
  Activity, Wrench, Building2, Package, UserX, Plus, FileText,
} from 'lucide-react';
import { SkeletonCard } from '@/components/shared/Skeleton';

/* ── Admin counter shape ───────────────────────────────────── */
interface AdminCounts {
  totalCustomers: number; totalEngineers: number; totalAssets: number;
  openTickets: number; inProgressTickets: number; completedTickets: number; activeAMC: number;
}

/* ── Task Stats Widget (Admin) ─────────────────────────────── */
interface TaskStats {
  todayTotal: number; pending: number; completedToday: number;
  overdue: number; emergency: number; waitingParts: number; waitingCustomer: number;
}

function TaskStatsRow({ stats, navigate }: { stats: TaskStats; navigate: (path: string) => void }) {
  const items = [
    { label: "Today's Tasks",    value: stats.todayTotal,      icon: ClipboardList, color: 'text-primary',     filter: '/tasks' },
    { label: 'Pending',          value: stats.pending,         icon: Clock,         color: 'text-warning',     filter: '/tasks?status=Pending' },
    { label: 'Completed Today',  value: stats.completedToday,  icon: CheckCircle2,  color: 'text-success',     filter: '/tasks?status=Completed' },
    { label: 'Overdue',          value: stats.overdue,         icon: AlertTriangle, color: 'text-destructive', filter: '/tasks?overdue=true' },
    { label: 'Emergency',        value: stats.emergency,       icon: AlertTriangle, color: 'text-destructive', filter: '/tasks?priority=Emergency' },
    { label: 'Waiting Parts',    value: stats.waitingParts,    icon: Package,       color: 'text-orange-500',  filter: '/tasks?status=Waiting+Parts' },
    { label: 'Waiting Customer', value: stats.waitingCustomer, icon: UserX,         color: 'text-yellow-500',  filter: '/tasks?status=Waiting+Customer' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.label} onClick={() => navigate(item.filter)}
            className="flex flex-col gap-2 p-4 rounded-lg border border-border bg-card hover:bg-muted/60 hover:border-primary/30 transition-colors text-left cursor-pointer">
            <div className="flex items-center justify-between">
              <Icon size={16} className={item.color} />
              <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium leading-tight">{item.label}</p>
          </button>
        );
      })}
      <button onClick={() => navigate('/tasks/new')}
        className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-primary cursor-pointer">
        <Plus size={20} />
        <span className="text-xs font-medium">New Task</span>
      </button>
    </div>
  );
}

/* ── Admin Dashboard — global company-wide data only ───────── */
function AdminDashboard({
  counts, taskStats, amcStats,
}: {
  counts: AdminCounts | null;
  taskStats: TaskStats | null;
  amcStats: AMCStats | null;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-6">
      {/* Live global counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatusCard
          title="Total Customers"
          value={counts ? String(counts.totalCustomers) : '—'}
          icon={Building2} variant="primary"
        />
        <StatusCard
          title="Active Engineers"
          value={counts ? String(counts.totalEngineers) : '—'}
          icon={Wrench} variant="default"
        />
        <StatusCard
          title="Assets Managed"
          value={counts ? String(counts.totalAssets) : '—'}
          icon={Server} variant="default"
        />
        <StatusCard
          title="Open Tickets"
          value={counts ? String(counts.openTickets + counts.inProgressTickets) : '—'}
          icon={ClipboardList} variant="warning"
        />
      </div>

      {/* Secondary counters row */}
      <div className="grid grid-cols-3 gap-4">
        <StatusCard title="In Progress" value={counts ? String(counts.inProgressTickets) : '—'} icon={Activity} variant="default" />
        <StatusCard title="Completed Tickets" value={counts ? String(counts.completedTickets) : '—'} icon={CheckCircle2} variant="success" />
        <StatusCard title="Active AMC" value={counts ? String(counts.activeAMC) : '—'} icon={FileText} variant="default" />
      </div>

      {/* AMC Summary strip */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><FileText size={15} className="text-primary" />AMC Overview</span>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => navigate('/amc/dashboard')}>
              AMC Dashboard
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Active Contracts', value: amcStats?.totalActive   ?? '—', color: 'text-success',     path: '/amc?status=Active' },
              { label: 'Expiring ≤ 30d',   value: amcStats?.expiringIn30  ?? '—', color: 'text-destructive', path: '/amc?expiring=30'   },
              { label: 'Upcoming Visits',  value: amcStats?.upcomingVisits ?? '—', color: 'text-primary',    path: '/amc/dashboard'     },
              { label: 'Missed Visits',    value: amcStats?.missedVisits  ?? '—', color: 'text-warning',     path: '/amc/dashboard'     },
            ].map((item) => (
              <button key={item.label} onClick={() => navigate(item.path)}
                className="flex flex-col gap-2 p-4 rounded-lg border border-border bg-card hover:bg-muted/60 hover:border-primary/30 transition-colors text-left cursor-pointer">
                <div className="flex items-center justify-between">
                  <FileText size={14} className={item.color} />
                  <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium leading-tight">{item.label}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Task stats section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><ClipboardList size={15} className="text-primary" />Service Tasks</span>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => navigate('/tasks')}>
              View All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {taskStats ? (
            <TaskStatsRow stats={taskStats} navigate={navigate} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users size={15} className="text-primary" />Quick Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Customers',   path: '/customers',  icon: Building2      },
                { label: 'Tasks',       path: '/tasks',      icon: ClipboardList  },
                { label: 'Assets',      path: '/assets',     icon: Server         },
                { label: 'AMC',         path: '/amc',        icon: FileText       },
                { label: 'Users',       path: '/users',      icon: Users          },
                { label: 'Reports',     path: '/reports',    icon: Activity       },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.label} onClick={() => navigate(item.path)}
                    className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card hover:bg-muted/60 hover:border-primary/30 transition-colors text-left">
                    <Icon size={14} className="text-primary shrink-0" />
                    <span className="text-xs font-medium text-foreground">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity size={15} className="text-primary" />Ticket Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Open',        value: counts?.openTickets ?? 0,        color: 'bg-warning'     },
                { label: 'In Progress', value: counts?.inProgressTickets ?? 0,  color: 'bg-primary'     },
                { label: 'Completed',   value: counts?.completedTickets ?? 0,   color: 'bg-success'     },
              ].map((item) => {
                const total = (counts?.openTickets ?? 0) + (counts?.inProgressTickets ?? 0) + (counts?.completedTickets ?? 0);
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div key={item.label} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-semibold">{item.value} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── Engineer Dashboard — own data only (rendered in EngineerDashboardPage) */
function EngineerDashboard({ taskStats }: { taskStats: TaskStats | null }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <StatusCard title="My Open Tasks"    value={String(taskStats ? taskStats.todayTotal     : '—')} icon={ClipboardList} variant="primary"  subtitle="Assigned to me" />
        <StatusCard title="Completed Today"  value={String(taskStats ? taskStats.completedToday : '—')} icon={CheckCircle2}  variant="success" />
        <StatusCard title="Waiting Parts"    value={String(taskStats ? taskStats.waitingParts   : '—')} icon={Package}       variant="warning" />
        <StatusCard title="Emergency"        value={String(taskStats ? taskStats.emergency      : '—')} icon={AlertTriangle} variant="danger"  />
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'My Tasks',      icon: ClipboardList, path: '/engineer/tasks'  },
              { label: 'Check In',      icon: Plus,          path: '/engineer/attendance/checkin' },
              { label: 'Daily Report',  icon: FileText,      path: '/engineer/daily-report' },
              { label: 'Fuel Entry',    icon: Package,       path: '/engineer/fuel'   },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button key={action.label} onClick={() => navigate(action.path)}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-card hover:bg-muted hover:border-primary/30 transition-colors min-h-[72px]">
                  <Icon size={22} className="text-primary" />
                  <span className="text-xs font-medium text-foreground text-center">{action.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Customer Dashboard — own data only (rendered in CustomerDashboardPage) */
function CustomerDashboard({ openTickets, completedTickets, emergency }: {
  openTickets: number; completedTickets: number; emergency: number;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusCard title="Open Tickets"      value={String(openTickets)}      icon={ClipboardList} variant="primary" />
        <StatusCard title="Completed Tickets" value={String(completedTickets)} icon={CheckCircle2}  variant="success" />
        <StatusCard title="Emergency"         value={String(emergency)}        icon={AlertTriangle} variant="warning" />
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'My Tickets', icon: ClipboardList, path: '/customer/tickets' },
              { label: 'My Assets',  icon: Package,       path: '/customer/assets'  },
              { label: 'Reports',    icon: FileText,       path: '/customer/reports' },
              { label: 'Raise Request', icon: Plus,       path: '/customer/raise-request' },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button key={action.label} onClick={() => navigate(action.path)}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-card hover:bg-muted hover:border-primary/30 transition-colors min-h-[72px]">
                  <Icon size={22} className="text-primary" />
                  <span className="text-xs font-medium text-foreground text-center">{action.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Page skeleton ──────────────────────────────────────────── */
function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

/* ── Main Dashboard Page ────────────────────────────────────── */
export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const [taskStats,    setTaskStats]    = useState<TaskStats | null>(null);
  const [amcStats,     setAmcStats]     = useState<AMCStats | null>(null);
  const [adminCounts,  setAdminCounts]  = useState<AdminCounts | null>(null);
  // Customer-scoped ticket counts
  const [custTickets,  setCustTickets]  = useState({ openTickets: 0, completedTickets: 0, emergency: 0 });
  const [logoSet, setLogoSet] = useState(() => !!companyProfileService.get().logoDataUrl);
  const navigate = useNavigate();

  const isAdmin    = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'manager' || user?.role === 'backoffice';
  const isEngineer = user?.role === 'engineer';
  const isCustomer = user?.role === 'customer';

  useEffect(() => {
    if (!user) return;

    if (isAdmin) {
      // Admin: load global company-wide data
      taskService.getAdminCounts().then(setAdminCounts).catch(() => {});
      taskService.getStats().then(setTaskStats).catch(() => {});
      amcService.getStats().then(setAmcStats).catch(() => {});
    } else if (isEngineer) {
      // Engineer: stats loaded in EngineerDashboardPage — nothing needed here
    } else if (isCustomer && user.customerId) {
      // Customer: load only their own ticket counts
      taskService.getStatsByCustomer(user.customerId).then((s) => {
        setCustTickets({ openTickets: s.openTickets, completedTickets: s.completedTickets, emergency: s.emergency });
      }).catch(() => {});
    }

    return companyProfileService.subscribe((p) => setLogoSet(!!p.logoDataUrl));
  }, [user, isAdmin, isEngineer, isCustomer]);

  const greetingTime = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const canManageBranding = user?.role === 'superadmin' || user?.role === 'admin';

  return (
    <DashboardLayout>
      <PageHeader
        title={`${greetingTime()}, ${user?.name?.split(' ')[0] ?? 'there'}`}
        description="Welcome to Sectore 360. Here's your operational overview."
        breadcrumbs={[{ label: 'Dashboard' }]}
      />

      {canManageBranding && !logoSet && (
        <div className="mb-5 rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground">Company logo not uploaded yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload your logo and favicon to brand the sidebar, login page, reports, and browser tab.
              </p>
            </div>
          </div>
          <Button size="sm" className="gap-2 shrink-0" onClick={() => navigate('/settings/company-profile')}>
            <Building2 size={14} />Upload Logo Now
          </Button>
        </div>
      )}

      <Separator className="mb-6" />

      {isLoading ? (
        <DashboardSkeleton />
      ) : isAdmin ? (
        <AdminDashboard counts={adminCounts} taskStats={taskStats} amcStats={amcStats} />
      ) : isEngineer ? (
        // Engineer sees their full dashboard at /engineer/dashboard — this view is a redirect target
        <EngineerDashboard taskStats={taskStats} />
      ) : (
        <CustomerDashboard {...custTickets} />
      )}

      {isAdmin && (
        <AlertBanner
          variant="success"
          title="Phase 1 RC2"
          message="All dashboards now display live, role-isolated data. Admin sees global stats; Engineers and Customers see only their own records."
          dismissible
        />
      )}
    </DashboardLayout>
  );
}
