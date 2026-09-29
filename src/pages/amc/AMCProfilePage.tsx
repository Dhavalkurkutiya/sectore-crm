/**
 * AMC Profile Page
 * Sectore 360 — Phase 1, Part 4
 * Tabs: Overview · Covered Assets · Visit Schedule · Generated Tasks · Completed Visits · Timeline · Documents · Renewal History
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageLoader } from '@/components/shared/Spinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AMCStatusBadge, AMCContractTypeBadge, AMCFrequencyBadge,
  AMCVisitStatusBadge, RemainingDaysBadge,
} from '@/components/amc/AMCBadges';
import { TaskStatusBadge, TaskPriorityBadge } from '@/components/task/TaskBadges';
import { StatusBadge } from '@/components/customer/StatusBadge';
import { amcService } from '@/services/amcService';
import { assetService } from '@/services/assetService';
import type { AMC, AMCVisitSchedule, AMCTimelineEvent, AMCDocument, AMCRenewal, AMCDocumentType } from '@/types/amc';
import { remainingDays, renewalStatus, RENEWAL_THRESHOLDS } from '@/types/amc';
import type { Asset } from '@/types/customer';
import type { Task } from '@/types/task';
import { toast } from 'sonner';
import {
  Pencil, Trash2, RefreshCw, Building2, Server, ClipboardList,
  CalendarDays, FileText, Download, History, CheckCircle2,
  AlertTriangle, Clock, Upload, ArrowRight, Shield,
  Wrench, User, ChevronDown, ChevronUp,
} from 'lucide-react';

/* ── InfoRow helper ───────────────────────────────────────────── */
function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-border/50 last:border-0">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className={`text-sm text-foreground break-words ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
function BoolRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant="outline" className={value
        ? 'text-xs bg-success/10 text-success border-success/20'
        : 'text-xs text-muted-foreground border-border'}>
        {value ? 'Yes' : 'No'}
      </Badge>
    </div>
  );
}

/* ── Timeline icon map ────────────────────────────────────────── */
const TL_ICONS: Record<string, React.ElementType> = {
  amc_created: FileText, amc_updated: Pencil, status_changed: RefreshCw,
  asset_added: Server, asset_removed: Trash2,
  document_uploaded: Upload, document_deleted: Trash2,
  contract_renewed: RefreshCw, visit_completed: CheckCircle2,
  visit_missed: AlertTriangle, visit_generated: CalendarDays, engineer_assigned: User,
};

export default function AMCProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const canEdit   = user?.role === 'admin';
  const canCreate = user?.role === 'admin' || user?.role === 'engineer' || user?.role === 'customer' ? false : true;

  const [amc, setAMC] = useState<AMC | null>(null);
  const [visits, setVisits] = useState<AMCVisitSchedule[]>([]);
  const [timeline, setTimeline] = useState<AMCTimelineEvent[]>([]);
  const [docs, setDocs] = useState<AMCDocument[]>([]);
  const [renewals, setRenewals] = useState<AMCRenewal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [coveredAssets, setCoveredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [renewEndDate, setRenewEndDate] = useState('');
  const [uploadDocType, setUploadDocType] = useState<AMCDocumentType>('Signed Contract');
  const [uploadFileName, setUploadFileName] = useState('');

  const DOC_TYPES: AMCDocumentType[] = ['Signed Contract','Quotation','Renewal Documents','Supporting Files'];

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [amcData, v, tl, d, r, t, allAssets] = await Promise.all([
      amcService.getById(id),
      amcService.getVisitSchedule(id),
      amcService.getTimeline(id),
      amcService.getDocuments(id),
      amcService.getRenewals(id),
      amcService.getGeneratedTasks(id),
      assetService.getAll(),
    ]);
    setAMC(amcData);
    setVisits(v); setTimeline(tl); setDocs(d); setRenewals(r); setTasks(t as Task[]);
    if (amcData) {
      setCoveredAssets(allAssets.filter((a) => amcData.coveredAssetIds.includes(a.id)));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    if (!id) return;
    await amcService.softDelete(id, user?.name ?? 'Admin');
    toast.success('AMC contract cancelled');
    navigate('/amc');
  }

  async function handleRenew() {
    if (!id || !renewEndDate) { toast.error('Please select a new end date'); return; }
    if (amc && renewEndDate <= amc.endDate) { toast.error('New end date must be after current end date'); return; }
    await amcService.renew(id, renewEndDate, user?.name ?? 'Admin');
    toast.success('AMC contract renewed successfully');
    setRenewOpen(false);
    load();
  }

  async function handleUploadDoc() {
    if (!id || !uploadFileName) { toast.error('Please enter a file name'); return; }
    await amcService.addDocument(id, {
      fileName: uploadFileName,
      documentType: uploadDocType,
      fileSize: 102400,
    }, user?.name ?? 'Admin');
    toast.success('Document uploaded');
    setUploadOpen(false);
    setUploadFileName('');
    load();
  }

  async function handleDeleteDoc(docId: string) {
    if (!id) return;
    await amcService.deleteDocument(id, docId, user?.name ?? 'Admin');
    toast.success('Document deleted');
    load();
  }

  if (loading) return <DashboardLayout><PageLoader /></DashboardLayout>;
  if (!amc)   return <DashboardLayout><p className="text-center py-16 text-muted-foreground">AMC not found.</p></DashboardLayout>;

  const days = remainingDays(amc.endDate);
  const renewStat = renewalStatus(amc.endDate);
  const completedVisits = visits.filter((v) => v.status === 'Completed');

  return (
    <DashboardLayout>
      <PageHeader
        title={amc.amcNumber}
        description={`${amc.contractType} · ${amc.customerName}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'AMC', href: '/amc' },
          { label: amc.amcNumber },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <>
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => navigate(`/amc/${id}/edit`)}>
                  <Pencil size={13} /> Edit
                </Button>
                <Button size="sm" className="gap-1.5 h-8" onClick={() => setRenewOpen(true)}>
                  <RefreshCw size={13} /> Renew
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 border-destructive/40 text-destructive hover:bg-destructive/5"
                  onClick={() => setDeleteOpen(true)}>
                  <Trash2 size={13} /> Cancel
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* ── Header Info Strip ──────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-6">
        <AMCStatusBadge status={amc.status} />
        <AMCContractTypeBadge type={amc.contractType} />
        <AMCFrequencyBadge frequency={amc.visitFrequency} />
        <RemainingDaysBadge endDate={amc.endDate} />
        {renewStat !== 'Not Due' && (
          <Badge variant="outline" className={`text-xs ${renewStat === 'Overdue' ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
            {renewStat === 'Overdue' ? 'Renewal Overdue' : 'Renewal Due Soon'}
          </Badge>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assets">Covered Assets <Badge variant="outline" className="ml-1 text-[10px]">{coveredAssets.length}</Badge></TabsTrigger>
          <TabsTrigger value="schedule">Visit Schedule <Badge variant="outline" className="ml-1 text-[10px]">{visits.length}</Badge></TabsTrigger>
          <TabsTrigger value="tasks">Tasks <Badge variant="outline" className="ml-1 text-[10px]">{tasks.length}</Badge></TabsTrigger>
          <TabsTrigger value="completed">Completed <Badge variant="outline" className="ml-1 text-[10px]">{completedVisits.length}</Badge></TabsTrigger>
          <TabsTrigger value="timeline">Timeline <Badge variant="outline" className="ml-1 text-[10px]">{timeline.length}</Badge></TabsTrigger>
          <TabsTrigger value="documents">Documents <Badge variant="outline" className="ml-1 text-[10px]">{docs.length}</Badge></TabsTrigger>
          <TabsTrigger value="renewal">Renewal <Badge variant="outline" className="ml-1 text-[10px]">{renewals.length}</Badge></TabsTrigger>
        </TabsList>

        {/* ── Overview ──────────────────────────────────────── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold">Contract Details</CardTitle></CardHeader>
              <CardContent className="flex flex-col divide-y divide-border/0">
                <InfoRow label="AMC Number" value={amc.amcNumber} mono />
                <InfoRow label="Customer" value={amc.customerName} />
                <InfoRow label="Contract Type" value={amc.contractType} />
                <InfoRow label="Status" value={amc.status} />
                <InfoRow label="Start Date" value={amc.startDate} />
                <InfoRow label="End Date" value={amc.endDate} />
                <InfoRow label="Days Remaining" value={days < 0 ? `Expired ${Math.abs(days)} days ago` : `${days} days`} />
                <InfoRow label="Visit Frequency" value={amc.visitFrequency} />
                <InfoRow label="Included Visits" value={String(amc.numberOfIncludedVisits)} />
                <InfoRow label="SLA Response Time" value={amc.slaResponseTime} />
                <InfoRow label="SLA Resolution Time" value={amc.slaResolutionTime} />
                <InfoRow label="Working Hours" value={amc.workingHours} />
                <InfoRow label="Holiday Rules" value={amc.holidayRules} />
                {amc.remarks && <InfoRow label="Remarks" value={amc.remarks} />}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm font-semibold">Coverage Options</CardTitle></CardHeader>
                <CardContent>
                  <BoolRow label="Labour Included" value={amc.labourIncluded} />
                  <BoolRow label="Travel Included" value={amc.travelIncluded} />
                  <BoolRow label="Emergency Support" value={amc.emergencySupportIncluded} />
                  <BoolRow label="Remote Support" value={amc.remoteSupportIncluded} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm font-semibold">Services & Parts</CardTitle></CardHeader>
                <CardContent className="flex flex-col divide-y divide-border/0">
                  {amc.includedServices && (
                    <div className="py-2">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Included Services</p>
                      {amc.includedServices.split('\n').map((s, i) => <p key={i} className="text-sm">✓ {s}</p>)}
                    </div>
                  )}
                  {amc.excludedServices && (
                    <div className="py-2">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Excluded Services</p>
                      {amc.excludedServices.split('\n').map((s, i) => <p key={i} className="text-sm text-muted-foreground">✗ {s}</p>)}
                    </div>
                  )}
                  {amc.coveredParts && (
                    <div className="py-2">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Covered Parts</p>
                      {amc.coveredParts.split('\n').map((s, i) => <p key={i} className="text-sm">✓ {s}</p>)}
                    </div>
                  )}
                  {amc.excludedParts && (
                    <div className="py-2">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Excluded Parts</p>
                      {amc.excludedParts.split('\n').map((s, i) => <p key={i} className="text-sm text-muted-foreground">✗ {s}</p>)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Covered Assets ─────────────────────────────────── */}
        <TabsContent value="assets">
          {coveredAssets.length === 0 ? (
            <EmptyState icon={Server} title="No covered assets" description="No assets are linked to this AMC contract." />
          ) : (
            <div className="w-full overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Code</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Category</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Device</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Brand / Model</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Serial No.</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Status</th>
                    <th className="py-2 px-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {coveredAssets.map((asset) => (
                    <tr key={asset.id} className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/assets/${asset.id}`)}>
                      <td className="py-2 px-3 font-mono text-xs text-primary">{asset.code}</td>
                      <td className="py-2 px-3 text-xs whitespace-nowrap">{asset.category}</td>
                      <td className="py-2 px-3 text-xs whitespace-nowrap">{asset.deviceType}</td>
                      <td className="py-2 px-3 text-sm whitespace-nowrap">{asset.brand} {asset.model ?? ''}</td>
                      <td className="py-2 px-3 font-mono text-xs whitespace-nowrap">{asset.serialNumber}</td>
                      <td className="py-2 px-3 whitespace-nowrap"><StatusBadge status={asset.status} /></td>
                      <td className="py-2 px-3"><ArrowRight size={13} className="text-muted-foreground" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Visit Schedule ─────────────────────────────────── */}
        <TabsContent value="schedule">
          {visits.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No visits scheduled" description="Visit schedule will be generated when the contract is activated." />
          ) : (
            <div className="w-full overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Visit #</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Scheduled Date</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Status</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Task</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Completed</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Engineer</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => (
                    <tr key={v.id} className="border-b border-border">
                      <td className="py-2 px-3 font-mono text-xs text-primary font-medium">#{v.visitNumber}</td>
                      <td className="py-2 px-3 text-xs whitespace-nowrap">{v.scheduledDate}</td>
                      <td className="py-2 px-3 whitespace-nowrap"><AMCVisitStatusBadge status={v.status} /></td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {v.generatedTaskNumber
                          ? <Link to={`/tasks/${v.generatedTaskId}`} onClick={(e) => e.stopPropagation()} className="text-xs text-primary font-mono hover:underline">{v.generatedTaskNumber}</Link>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">{v.completedDate ?? '—'}</td>
                      <td className="py-2 px-3 text-xs whitespace-nowrap">{v.engineerName ?? <span className="text-muted-foreground">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Generated Tasks ────────────────────────────────── */}
        <TabsContent value="tasks">
          {tasks.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No tasks generated" description="Tasks will be auto-generated when the contract is activated." />
          ) : (
            <div className="w-full overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Task #</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Priority</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Status</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Engineer</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Visit Date</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Created</th>
                    <th className="py-2 px-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id} className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/tasks/${t.id}`)}>
                      <td className="py-2 px-3 font-mono text-xs text-primary font-medium">{t.taskNumber}</td>
                      <td className="py-2 px-3 whitespace-nowrap"><TaskPriorityBadge priority={t.priority} /></td>
                      <td className="py-2 px-3 whitespace-nowrap"><TaskStatusBadge status={t.status} /></td>
                      <td className="py-2 px-3 text-sm whitespace-nowrap">{t.engineerName ?? <span className="text-muted-foreground text-xs">—</span>}</td>
                      <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">{t.expectedVisitDate ?? '—'}</td>
                      <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">{t.createdAt.slice(0,10)}</td>
                      <td className="py-2 px-3"><ArrowRight size={13} className="text-muted-foreground" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Completed Visits ───────────────────────────────── */}
        <TabsContent value="completed">
          {completedVisits.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No completed visits" description="Visits will appear here once engineers complete preventive maintenance tasks." />
          ) : (
            <div className="w-full overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Visit #</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Scheduled</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Completed</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Task</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Engineer</th>
                  </tr>
                </thead>
                <tbody>
                  {completedVisits.map((v) => (
                    <tr key={v.id} className="border-b border-border">
                      <td className="py-2 px-3 font-mono text-xs text-primary font-medium">#{v.visitNumber}</td>
                      <td className="py-2 px-3 text-xs whitespace-nowrap">{v.scheduledDate}</td>
                      <td className="py-2 px-3 text-xs text-success whitespace-nowrap">{v.completedDate ?? '—'}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {v.generatedTaskNumber
                          ? <Link to={`/tasks/${v.generatedTaskId}`} className="text-xs text-primary font-mono hover:underline">{v.generatedTaskNumber}</Link>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2 px-3 text-xs whitespace-nowrap">{v.engineerName ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Timeline ──────────────────────────────────────── */}
        <TabsContent value="timeline">
          {timeline.length === 0 ? (
            <EmptyState icon={History} title="No activity yet" description="Timeline events will appear here as the contract progresses." />
          ) : (
            <div className="flex flex-col gap-0">
              {timeline.map((event, idx) => {
                const Icon = TL_ICONS[event.eventType] ?? History;
                return (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="p-1.5 rounded-full bg-muted border border-border shrink-0">
                        <Icon size={12} className="text-muted-foreground" />
                      </div>
                      {idx < timeline.length - 1 && <div className="w-px flex-1 bg-border/60 mt-1" />}
                    </div>
                    <div className="pb-4 min-w-0">
                      <p className="text-sm font-medium text-foreground">{event.title}</p>
                      {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                      {event.oldValue && event.newValue && (
                        <p className="text-xs text-muted-foreground">{event.oldValue} → {event.newValue}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {event.performedBy} · {new Date(event.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Documents ─────────────────────────────────────── */}
        <TabsContent value="documents">
          <div className="flex justify-end mb-3">
            {canEdit && (
              <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setUploadOpen(true)}>
                <Upload size={12} /> Upload Document
              </Button>
            )}
          </div>
          {docs.length === 0 ? (
            <EmptyState icon={FileText} title="No documents" description="No documents have been uploaded for this AMC contract." />
          ) : (
            <div className="flex flex-col gap-2">
              {docs.map((doc) => (
                <Card key={doc.id} className="flex items-center gap-3 px-4 py-3">
                  <FileText size={16} className="text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.documentType} · {(doc.fileSize / 1024).toFixed(0)} KB · {doc.uploadedAt.slice(0,10)} · {doc.uploadedBy}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Download"
                      onClick={() => {}}>
                      <Download size={13} />
                    </Button>
                    {canEdit && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        title="Delete" onClick={() => handleDeleteDoc(doc.id)}>
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Renewal History ────────────────────────────────── */}
        <TabsContent value="renewal">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium">Renewal Status: <span className={renewStat === 'Overdue' ? 'text-destructive' : renewStat === 'Due Soon' ? 'text-warning' : 'text-success'}>{renewStat}</span></p>
              <p className="text-xs text-muted-foreground">Current end date: {amc.endDate} · {days >= 0 ? `${days} days remaining` : `Expired ${Math.abs(days)} days ago`}</p>
            </div>
            {canEdit && (
              <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setRenewOpen(true)}>
                <RefreshCw size={12} /> Renew Contract
              </Button>
            )}
          </div>

          {/* Renewal reminders */}
          <Card className="mb-4">
            <CardHeader><CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Renewal Reminder Schedule</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col divide-y divide-border">
                {RENEWAL_THRESHOLDS.map((d) => (
                  <div key={d} className="flex items-center justify-between py-2">
                    <span className="text-sm">{d === 0 ? 'On expiry date' : `${d} days before expiry`}</span>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Template only</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {renewals.length === 0 ? (
            <EmptyState icon={RefreshCw} title="No renewal history" description="Renewal records will appear here after the contract is renewed." />
          ) : (
            <div className="w-full overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Renewal Date</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Previous End</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">New End</th>
                    <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Renewed By</th>
                  </tr>
                </thead>
                <tbody>
                  {renewals.map((r) => (
                    <tr key={r.id} className="border-b border-border">
                      <td className="py-2 px-3 text-xs whitespace-nowrap">{r.renewalDate}</td>
                      <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">{r.previousEndDate}</td>
                      <td className="py-2 px-3 text-xs text-success whitespace-nowrap">{r.newEndDate}</td>
                      <td className="py-2 px-3 text-xs whitespace-nowrap">{r.renewedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Delete / Cancel Dialog ─────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {amc.amcNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the contract as Cancelled. The record remains accessible. This action can be undone by editing the contract status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancel Contract
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Renew Dialog ───────────────────────────────────── */}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Renew {amc.amcNumber}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current end date: <strong>{amc.endDate}</strong></p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">New End Date <span className="text-destructive">*</span></label>
              <Input type="date" value={renewEndDate} onChange={(e) => setRenewEndDate(e.target.value)} min={amc.endDate} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewOpen(false)}>Cancel</Button>
            <Button onClick={handleRenew} disabled={!renewEndDate} className="gap-2">
              <RefreshCw size={13} /> Renew Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Upload Document Dialog ─────────────────────────── */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Document Type</label>
              <Select value={uploadDocType} onValueChange={(v) => setUploadDocType(v as AMCDocumentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">File Name <span className="text-destructive">*</span></label>
              <Input placeholder="e.g. Contract_Signed.pdf" value={uploadFileName}
                onChange={(e) => setUploadFileName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleUploadDoc} disabled={!uploadFileName} className="gap-2">
              <Upload size={13} /> Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
