/**
 * Customer Track Tickets Page — Phase 1 RC2
 * Sectore 360 — Strictly filtered to user.customerId
 * NEVER calls taskService.getAll(). All queries: WHERE customerId = loggedInCustomerId
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { taskService } from '@/services/taskService';
import { engineerService } from '@/services/engineerService';
import { customerService } from '@/services/customerService';
import { assetService } from '@/services/assetService';
import { templateService, taskTemplateDataService } from '@/services/templateService';
import { companyProfileService } from '@/services/companyProfileService';
import type { CompanyProfile } from '@/services/companyProfileService';
import { WorkOrderPrint } from '@/components/task/WorkOrderPrint';
import { ServiceActivityTab } from '@/components/task/ServiceActivityTab';
import { TaskStatusBadge, TaskPriorityBadge } from '@/components/task/TaskBadges';
import type { Task } from '@/types/task';
import type { Customer, Asset } from '@/types/customer';
import type { TaskTemplateData } from '@/types/template';
import type { EngineerProfile, EngineerTaskPhoto } from '@/types/engineer';
import {
  Search, Ticket, ChevronRight, CheckCircle2, Clock, AlertCircle,
  FileText, Printer, Download,
} from 'lucide-react';

const STATUS_STEPS = ['Pending', 'Assigned', 'Accepted', 'On The Way', 'Reached Site', 'Working', 'Completed'];

function TicketTimeline({ status }: { status: string }) {
  const idx = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-1 flex-wrap mt-2">
      {STATUS_STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
            i < idx ? 'bg-success/10 text-success' :
            i === idx ? 'bg-primary/10 text-primary font-semibold' :
            'bg-muted text-muted-foreground'
          }`}>
            {i < idx ? <CheckCircle2 size={10} /> : i === idx ? <Clock size={10} /> : null}
            {s}
          </div>
          {i < STATUS_STEPS.length - 1 && <ChevronRight size={10} className="text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}

export default function CustomerTicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected,     setSelected]     = useState<Task | null>(null);
  const [tasks,        setTasks]        = useState<Task[]>([]);
  const [printTask,    setPrintTask]    = useState<Task | null>(null);
  const [company,      setCompany]      = useState<CompanyProfile>(companyProfileService.get());
  const [taskExtras,   setTaskExtras]   = useState<{
    customer: Customer | null;
    asset: Asset | null;
    templateData: TaskTemplateData | null;
    engineerProfile: EngineerProfile | null;
    photos: EngineerTaskPhoto[];
  } | null>(null);

  // customerId is customers.id — NOT companyId
  const customerId = user?.customerId;

  useEffect(() => {
    // Load ONLY this customer's tickets — never the full table
    if (!customerId) { setTasks([]); return; }
    taskService.list({ customerId, includeCancelled: true, limit: 500 })
      .then(setTasks).catch(() => setTasks([]));
    companyProfileService.fetch().then(setCompany).catch(() => {});
  }, [customerId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter !== 'all') {
        const grp = statusFilter === 'open'
          ? !['Completed', 'Closed', 'Cancelled'].includes(t.status)
          : ['Completed', 'Closed'].includes(t.status);
        if (!grp) return false;
      }
      if (q && !t.taskNumber.toLowerCase().includes(q) && !t.issueDescription.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, search, statusFilter]);

  const isCompleted = (t: Task) => ['Completed', 'Closed'].includes(t.status);

  function handleWhatsApp(t: Task) {
    const msg = encodeURIComponent(
      `Service Report — ${t.taskNumber}\nEngineer: ${t.engineerName ?? 'N/A'}\nStatus: ${t.status}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 max-w-3xl mx-auto pb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Ticket size={18} className="text-primary" /> My Tickets
          </h1>
          <p className="text-sm text-muted-foreground">Track all your service requests</p>
        </div>

        <div className="flex gap-3 flex-col md:flex-row">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search by ticket number or issue…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="md:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tickets</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} ticket{filtered.length !== 1 ? 's' : ''}</p>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <AlertCircle size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No tickets found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((t) => (
              <Card
                key={t.id}
                className="cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => {
                  setSelected(t);
                  // Eagerly load extras for PDF/ServiceActivityTab
                  setTaskExtras(null);
                  Promise.all([
                    customerService.getById(t.customerId),
                    assetService.getById(t.assetId),
                    t.engineerId ? engineerService.getProfile(t.engineerId) : Promise.resolve(null),
                    taskService.getPhotos(t.id),
                  ]).then(([cust, ast, ep, dbPhotos]) => {
                    const tmpl = templateService.findByServiceTypeAndCategory(t.taskType, ast?.category ?? '');
                    const td = tmpl
                      ? taskTemplateDataService.getOrInit(t.id, tmpl.id)
                      : taskTemplateDataService.get(t.id);
                    // Convert TaskPhoto (DB) → EngineerTaskPhoto shape for WorkOrderPrint/ServiceActivityTab
                    const CATEGORY_MAP: Record<string, EngineerTaskPhoto['category']> = {
                      Before: 'before', During: 'work_in_progress', After: 'after',
                    };
                    const photos: EngineerTaskPhoto[] = dbPhotos.map((p) => ({
                      id: p.id, taskId: t.id, engineerId: p.uploadedById ?? '',
                      category: CATEGORY_MAP[p.category] ?? 'before',
                      dataUrl: p.url, fileName: p.fileName,
                      fileSizeKB: Math.round(p.fileSize / 1024),
                      capturedAt: p.uploadedAt,
                      uploadedAt: p.uploadedAt,
                      synced: true,
                    }));
                    setTaskExtras({ customer: cust, asset: ast, templateData: td, engineerProfile: ep, photos });
                  }).catch(() => {});
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground font-mono">{t.taskNumber}</p>
                        <TaskPriorityBadge priority={t.priority} />
                        {isCompleted(t) && (
                          <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                            <CheckCircle2 size={9} className="mr-0.5" /> Report Available
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground truncate">{t.issueDescription}</p>
                      {t.expectedVisitDate && <p className="text-xs text-muted-foreground">Scheduled: {t.expectedVisitDate}</p>}
                      {/* Service visit timings inline summary */}
                      {t.siteTimeMinutes != null && (
                        <div className="inline-flex items-center gap-1.5 mt-0.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-xs text-green-700 dark:text-green-400 font-medium">
                          <Clock size={10} className="shrink-0" />
                          {t.siteTimeMinutes >= 60
                            ? `${Math.floor(t.siteTimeMinutes / 60)}h ${t.siteTimeMinutes % 60}m on site`
                            : `${t.siteTimeMinutes} min on site`}
                        </div>
                      )}
                    </div>
                    <TaskStatusBadge status={t.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Ticket detail dialog ─────────────────────────── */}
      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">{selected?.taskNumber}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2 flex-wrap">
                <TaskStatusBadge status={selected.status} />
                <TaskPriorityBadge priority={selected.priority} />
                <Badge variant="outline" className="text-xs">{selected.taskType}</Badge>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground font-medium">Issue Description</p>
                <p className="text-sm text-foreground">{selected.issueDescription}</p>
              </div>

              {selected.engineerName && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-muted-foreground font-medium">Assigned Technician</p>
                  <p className="text-sm text-foreground">{selected.engineerName}</p>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground font-medium">Status Timeline</p>
                <TicketTimeline status={selected.status} />
              </div>

              {/* Service visit timings */}
              {(selected.serviceStartTime || selected.serviceEndTime) && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/40 px-3 py-2 border-b border-border">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Service Visit Timings</p>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-border">
                    <div className="px-3 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase">Reached Site</p>
                      <p className="text-sm font-bold">
                        {selected.serviceStartTime
                          ? new Date(selected.serviceStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </p>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase">Completed</p>
                      <p className="text-sm font-bold">
                        {selected.serviceEndTime
                          ? new Date(selected.serviceEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </p>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase">Time on Site</p>
                      <p className="text-sm font-bold text-primary">
                        {selected.siteTimeMinutes != null
                          ? selected.siteTimeMinutes >= 60
                            ? `${Math.floor(selected.siteTimeMinutes / 60)}h ${selected.siteTimeMinutes % 60}m`
                            : `${selected.siteTimeMinutes} min`
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selected.expectedVisitDate && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-muted-foreground font-medium">Scheduled Date</p>
                  <p className="text-sm text-foreground">{selected.expectedVisitDate}</p>
                </div>
              )}

              {/* Service Activity Timeline — full history for completed tasks */}
              {isCompleted(selected) && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Service History</p>
                  <ServiceActivityTab
                    task={selected}
                    customer={null}
                    asset={null}
                    completion={engineerService.getWorkCompletion(selected.id)}
                    signature={engineerService.getSignature(selected.id)}
                    photos={taskExtras?.photos ?? []}
                    templateData={taskExtras?.templateData ?? null}
                    engineerProfile={taskExtras?.engineerProfile ?? null}
                    role="customer"
                    onTaskUpdated={() => {
                      if (!customerId) return;
                      taskService.list({ customerId, includeCancelled: true, limit: 500 })
                        .then(setTasks).catch(() => {});
                    }}
                  />
                </div>
              )}

              {/* Completed task actions */}
              {isCompleted(selected) ? (
                <div className="flex gap-2 pt-2 border-t border-border flex-wrap">
                  <Button
                    variant="outline"
                    className="gap-2 flex-1"
                    onClick={() => setPrintTask(selected)}
                  >
                    <Printer size={14} /> Print / PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 flex-1"
                    onClick={() => setSelected(null)}
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* WorkOrderPrint — iframe-isolated PDF engine */}
      {printTask && (
        <WorkOrderPrint
          task={printTask}
          customer={taskExtras?.customer ?? null}
          asset={taskExtras?.asset ?? null}
          templateData={taskExtras?.templateData ?? null}
          completion={engineerService.getWorkCompletion(printTask.id)}
          signature={engineerService.getSignature(printTask.id)}
          photos={taskExtras?.photos ?? []}
          engineerProfile={taskExtras?.engineerProfile ?? null}
          company={company}
          onClose={() => setPrintTask(null)}
        />
      )}
    </DashboardLayout>
  );
}
