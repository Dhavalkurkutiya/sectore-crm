/**
 * CustomerProfilePage
 * Sectore 360 — Phase 1, Part 2
 * Tabs: Overview · Assets · AMC · Service Tasks · Timeline · Documents · Settings
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge, CustomerTypeBadge } from '@/components/customer/StatusBadge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageLoader } from '@/components/shared/Spinner';
import { AlertBanner } from '@/components/shared/AlertBanner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { customerService } from '@/services/customerService';
import { assetService } from '@/services/assetService';
import { timelineService } from '@/services/timelineService';
import { documentService } from '@/services/documentService';
import { taskService } from '@/services/taskService';
import { amcService } from '@/services/amcService';
import type { Customer, Asset, TimelineEvent, UploadedDocument } from '@/types/customer';
import type { Task } from '@/types/task';
import type { AMC } from '@/types/amc';
import { remainingDays } from '@/types/amc';
import { AMCStatusBadge, AMCContractTypeBadge, AMCFrequencyBadge, RemainingDaysBadge } from '@/components/amc/AMCBadges';
import { toast } from 'sonner';
import {
  Pencil, Trash2, RefreshCw, Plus, Phone, Mail,
  Globe, MapPin, Server, ClipboardList, CheckCircle2,
  Clock, Calendar, Building2, AlertTriangle,
  FileText, Download, Trash, Eye, ArrowRight,
  History, Zap, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge as AssetStatusBadge } from '@/components/customer/StatusBadge';
import { TaskStatusBadge, TaskPriorityBadge, TaskTypeBadge } from '@/components/task/TaskBadges';

/* ── Customer Tasks Tab ──────────────────────────────────────── */
function CustomerTasksTab({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    taskService.list({ customerId, includeCancelled: true })
      .then((t) => { setTasks(t); setLoading(false); })
      .catch(() => setLoading(false));
  }, [customerId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        <Button size="sm" className="gap-1.5 h-8 text-xs"
          onClick={() => navigate(`/tasks/new?customerId=${customerId}`)}>
          <Plus size={12} /> New Task
        </Button>
      </div>
      {tasks.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No tasks found"
          description="No service tasks have been created for this customer yet." />
      ) : (
        <div className="w-full overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Task #</th>
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Type</th>
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Priority</th>
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Status</th>
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Engineer</th>
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Visit Date</th>
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Created</th>
                <th className="py-2 px-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}
                  className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/tasks/${task.id}`)}>
                  <td className="py-2 px-3 whitespace-nowrap font-mono text-xs text-primary font-medium">{task.taskNumber}</td>
                  <td className="py-2 px-3 whitespace-nowrap"><TaskTypeBadge type={task.taskType} /></td>
                  <td className="py-2 px-3 whitespace-nowrap"><TaskPriorityBadge priority={task.priority} /></td>
                  <td className="py-2 px-3 whitespace-nowrap"><TaskStatusBadge status={task.status} /></td>
                  <td className="py-2 px-3 whitespace-nowrap text-sm">{task.engineerName ?? <span className="text-muted-foreground text-xs">—</span>}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-xs text-muted-foreground">{task.expectedVisitDate ?? '—'}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-xs text-muted-foreground">{task.createdAt.slice(0, 10)}</td>
                  <td className="py-2 px-3"><ArrowRight size={13} className="text-muted-foreground" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────── */
function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
      {Icon && <Icon size={14} className="mt-0.5 text-muted-foreground shrink-0" />}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className="text-sm text-foreground break-words">{value}</span>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, sub }: { title: string; value: string | number; icon: React.ElementType; sub?: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
      <div className="p-2 rounded-md bg-primary/10 shrink-0">
        <Icon size={16} className="text-primary" />
      </div>
      <div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const icons: Record<string, React.ElementType> = {
    created: Building2, updated: Pencil, deleted: Trash2, restored: RefreshCw,
    asset_added: Server, document_uploaded: FileText, document_deleted: Trash,
    amc_created: ClipboardList, service_visit: Calendar, engineer_assigned: Clock,
    task_completed: CheckCircle2, warranty_updated: History, config_updated: Settings,
    part_changed: Zap,
  };
  const Icon = icons[event.eventType] ?? History;
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="p-1.5 rounded-full bg-muted border border-border shrink-0">
          <Icon size={12} className="text-muted-foreground" />
        </div>
        <div className="w-px flex-1 bg-border/60 mt-1" />
      </div>
      <div className="pb-4 min-w-0">
        <p className="text-sm font-medium text-foreground">{event.title}</p>
        {event.description && <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>}
        <p className="text-[11px] text-muted-foreground mt-1">
          By {event.performedBy} · {new Date(event.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function DocRow({ doc, canDelete, onDelete }: { doc: UploadedDocument; canDelete: boolean; onDelete: (id: string) => void }) {
  const sizeLabel = doc.fileSize < 1024 * 1024
    ? `${(doc.fileSize / 1024).toFixed(1)} KB`
    : `${(doc.fileSize / 1024 / 1024).toFixed(1)} MB`;
  return (
    <div className="flex items-center gap-3 p-3 rounded-md border border-border bg-card hover:bg-muted/40 transition-colors">
      <FileText size={16} className="text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {doc.fileName}
          {doc.version > 1 && <span className="ml-1 text-[10px] text-muted-foreground">(v{doc.version})</span>}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {doc.category} · {sizeLabel} · {new Date(doc.uploadedAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <a href={doc.url} target="_blank" rel="noreferrer">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Preview">
            <Eye size={13} />
          </Button>
        </a>
        <a href={doc.url} download={doc.fileName}>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Download">
            <Download size={13} />
          </Button>
        </a>
        {canDelete && (
          <Button
            variant="ghost" size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            title="Delete"
            onClick={() => onDelete(doc.id)}
          >
            <Trash size={13} />
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── AMC Tab ──────────────────────────────────────────────────── */
function CustomerAMCTab({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const [amcs, setAMCs] = useState<AMC[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    amcService.getAMCsForCustomer(customerId)
      .then((list) => { setAMCs(list); setLoading(false); })
      .catch(() => setLoading(false));
  }, [customerId]);

  if (loading) {
    return <div className="flex flex-col gap-2">{[1,2,3].map((i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{amcs.length} contract{amcs.length !== 1 ? 's' : ''}</p>
        <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => navigate(`/amc/new?customerId=${customerId}`)}>
          <Plus size={12} /> New AMC
        </Button>
      </div>
      {amcs.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No AMC contracts" description="No Annual Maintenance Contracts have been created for this customer." />
      ) : (
        <div className="w-full overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">AMC #</th>
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Contract Type</th>
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Frequency</th>
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">End Date</th>
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Remaining</th>
                <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-left whitespace-nowrap">Status</th>
                <th className="py-2 px-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {amcs.map((amc) => (
                <tr key={amc.id}
                  className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/amc/${amc.id}`)}>
                  <td className="py-2 px-3 font-mono text-xs text-primary font-medium whitespace-nowrap">{amc.amcNumber}</td>
                  <td className="py-2 px-3 whitespace-nowrap"><AMCContractTypeBadge type={amc.contractType} /></td>
                  <td className="py-2 px-3 whitespace-nowrap"><AMCFrequencyBadge frequency={amc.visitFrequency} /></td>
                  <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">{amc.endDate}</td>
                  <td className="py-2 px-3 whitespace-nowrap"><RemainingDaysBadge endDate={amc.endDate} /></td>
                  <td className="py-2 px-3 whitespace-nowrap"><AMCStatusBadge status={amc.status} /></td>
                  <td className="py-2 px-3"><ArrowRight size={13} className="text-muted-foreground" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────── */
export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [amcs, setAMCs] = useState<AMC[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [c, a, amcList, tl, docs] = await Promise.all([
      customerService.getById(id),
      assetService.getByCustomer(id),
      amcService.getAMCsForCustomer(id),
      timelineService.getByEntity(id),
      documentService.getByEntity(id),
    ]);
    setCustomer(c);
    setAssets(a);
    setAMCs(amcList);
    setTimeline(tl);
    setDocuments(docs);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!customer || !user) return;
    await customerService.softDelete(customer.id, user.name);
    toast.success(`${customer.companyName} deactivated`);
    navigate('/customers');
  };

  const handleRestore = async () => {
    if (!customer || !user) return;
    await customerService.restore(customer.id, user.name);
    toast.success(`${customer.companyName} restored`);
    load();
  };

  const handleDeleteDoc = async (docId: string) => {
    await documentService.delete(docId, user?.name ?? 'Admin');
    documentService.getByEntity(id!).then(setDocuments).catch(() => {});
    toast.success('Document deleted');
  };

  if (loading) return <DashboardLayout><PageLoader /></DashboardLayout>;
  if (!customer) {
    return (
      <DashboardLayout>
        <EmptyState icon={AlertTriangle} title="Customer not found" />
      </DashboardLayout>
    );
  }

  const activeAssets = assets.filter((a) => a.status === 'Active').length;
  const activeAMCs   = amcs.filter((a) => a.status === 'Active').length;
  const expiringAMC  = amcs.filter((a) => a.status === 'Active' && remainingDays(a.endDate) <= 30).length;

  return (
    <DashboardLayout>
      {/* ── Header ──────────────────────────────────────────── */}
      <PageHeader
        title={customer.companyName}
        description={`${customer.code} · ${customer.city}, ${customer.state}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Customers', href: '/customers' },
          { label: customer.companyName },
        ]}
        actions={
          isAdmin && (
            <div className="flex items-center gap-2">
              {customer.status === 'Inactive' ? (
                <Button variant="outline" onClick={() => setRestoreOpen(true)} className="gap-2">
                  <RefreshCw size={14} /> Restore
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => navigate(`/customers/${id}/edit`)} className="gap-2">
                    <Pencil size={14} /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteOpen(true)}
                    className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <Trash2 size={14} /> Delete
                  </Button>
                </>
              )}
            </div>
          )
        }
      />

      {/* Status/type badges row */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <CustomerTypeBadge type={customer.customerType} />
        <StatusBadge status={customer.status} />
        {customer.status === 'Inactive' && (
          <AlertBanner variant="warning" message="This customer is currently inactive (soft-deleted)." />
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto mb-4 gap-1">
          {['overview', 'assets', 'amc', 'tasks', 'timeline', 'documents', 'settings'].map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize text-xs">
              {t === 'amc' ? 'AMC' : t === 'tasks' ? 'Service Tasks' : t}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Overview ────────────────────────────────────── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Company & Contact */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Building2 size={14} className="text-primary" /> Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <div>
                    <InfoRow label="Customer Code" value={customer.code} />
                    <InfoRow label="Company Name" value={customer.companyName} />
                    <InfoRow label="Customer Type" value={customer.customerType} />
                    <InfoRow label="GST Number" value={customer.gstNumber} />
                    <InfoRow label="Website" value={customer.website} icon={Globe} />
                  </div>
                  <div>
                    <InfoRow label="Contact Person" value={customer.contactPerson} />
                    <InfoRow label="Designation" value={customer.designation} />
                    <InfoRow label="Primary Mobile" value={customer.primaryMobile} icon={Phone} />
                    <InfoRow label="Secondary Mobile" value={customer.secondaryMobile} icon={Phone} />
                    <InfoRow label="WhatsApp" value={customer.whatsappNumber} icon={Phone} />
                    <InfoRow label="Email" value={customer.email} icon={Mail} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MapPin size={14} className="text-primary" /> Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InfoRow label="Address" value={customer.address} />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6">
                    <InfoRow label="City" value={customer.city} />
                    <InfoRow label="State" value={customer.state} />
                    <InfoRow label="Country" value={customer.country} />
                    <InfoRow label="Pincode" value={customer.pincode} />
                  </div>
                  {customer.googleMapLink && (
                    <a href={customer.googleMapLink} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-2">
                      <MapPin size={12} /> View on Google Maps
                    </a>
                  )}
                </CardContent>
              </Card>

              {customer.notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{customer.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Quick stats */}
            <div className="flex flex-col gap-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Quick Statistics</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <StatCard title="Total Assets" value={assets.length} icon={Server} />
                  <StatCard title="Active Assets" value={activeAssets} icon={CheckCircle2} />
                  <StatCard title="Active AMC" value={activeAMCs} icon={ClipboardList} />
                  {expiringAMC > 0 && (
                    <StatCard title="Expiring AMC (30d)" value={expiringAMC} icon={AlertTriangle} />
                  )}
                  <StatCard title="Open Tickets" value="—" icon={AlertTriangle} sub="Coming in Part 4" />
                  <StatCard title="Last Visit" value="—" icon={Calendar} sub="Coming in Part 4" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Account Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <InfoRow label="Created" value={new Date(customer.createdAt).toLocaleDateString()} />
                  <InfoRow label="Created By" value={customer.createdBy} />
                  <InfoRow label="Last Updated" value={new Date(customer.updatedAt).toLocaleDateString()} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Assets tab ───────────────────────────────────── */}
        <TabsContent value="assets">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {assets.length} asset{assets.length !== 1 ? 's' : ''} linked to this customer
            </p>
            {isAdmin && (
              <Button size="sm" onClick={() => navigate(`/assets/new?customerId=${id}`)} className="gap-2">
                <Plus size={13} /> Add Asset
              </Button>
            )}
          </div>
          {assets.length === 0 ? (
            <EmptyState icon={Server} title="No assets yet" description="Assets linked to this customer will appear here." />
          ) : (
            <div className="rounded-md border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    {['Code', 'Category', 'Device Type', 'Brand', 'Model', 'Serial No.', 'Location', 'Status', ''].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr key={asset.id} className="border-b border-border hover:bg-muted/40 cursor-pointer" onClick={() => navigate(`/assets/${asset.id}`)}>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{asset.code}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{asset.category}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{asset.deviceType}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{asset.brand ?? '—'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{asset.model ?? '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">{asset.serialNumber}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{asset.location ?? '—'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap"><AssetStatusBadge status={asset.status} /></td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <ArrowRight size={13} className="text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── AMC ─────────────────────────────────────────── */}
        <TabsContent value="amc">
          <CustomerAMCTab customerId={customer?.id ?? ''} />
        </TabsContent>

        {/* ── Tasks ────────────────────────────────────────── */}
        <TabsContent value="tasks">
          <CustomerTasksTab customerId={customer?.id ?? ''} />
        </TabsContent>

        {/* ── Timeline ─────────────────────────────────────── */}
        <TabsContent value="timeline">
          {timeline.length === 0 ? (
            <EmptyState icon={History} title="No activity yet" description="Timeline events for this customer will appear here." />
          ) : (
            <Card>
              <CardContent className="pt-4">
                {timeline.map((event) => <TimelineItem key={event.id} event={event} />)}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Documents ────────────────────────────────────── */}
        <TabsContent value="documents">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {documents.length} document{documents.length !== 1 ? 's' : ''}
            </p>
          </div>
          {documents.length === 0 ? (
            <EmptyState icon={FileText} title="No documents" description="Documents uploaded for this customer will appear here." />
          ) : (
            <div className="flex flex-col gap-2">
              {documents.map((doc) => (
                <DocRow key={doc.id} doc={doc} canDelete={isAdmin} onDelete={handleDeleteDoc} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Settings placeholder ─────────────────────────── */}
        <TabsContent value="settings">
          <EmptyState icon={Settings} title="Customer Settings" description="Customer-specific settings and configuration coming soon." />
        </TabsContent>
      </Tabs>

      {/* Delete dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{customer.companyName}</strong>?
              This can be undone by restoring the customer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore dialog */}
      <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Restore <strong>{customer.companyName}</strong> and make them active?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
