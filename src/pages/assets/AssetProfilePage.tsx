/**
 * AssetProfilePage
 * Sectore 360 — v2 (Phase 2)
 * Tabs: Overview · Specifications · Service History · AMC · Relationships · Timeline · QR Label · Documents
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/customer/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageLoader } from '@/components/shared/Spinner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { assetService } from '@/services/assetService';
import { customerService } from '@/services/customerService';
import { timelineService } from '@/services/timelineService';
import { documentService } from '@/services/documentService';
import { taskService } from '@/services/taskService';
import { assetHealthService } from '@/services/assetHealthService';
import { AssetHealthCard } from '@/components/asset/AssetHealthCard';
import { AssetRelationshipsPanel } from '@/components/asset/AssetRelationshipsPanel';
import { AssetTimeline } from '@/components/asset/AssetTimeline';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
import { amcService } from '@/services/amcService';
import type { Asset, Customer, TimelineEvent, UploadedDocument } from '@/types/customer';
import type { Task } from '@/types/task';
import type { AMC } from '@/types/amc';
import { AMCStatusBadge, AMCContractTypeBadge, RemainingDaysBadge } from '@/components/amc/AMCBadges';
import { toast } from 'sonner';
import {
  Pencil, Trash2, RefreshCw, Building2, AlertTriangle,
  Calendar, Shield, Server, MapPin, Network, Lock,
  Eye, EyeOff, FileText, Download, Trash, History,
  ClipboardList, Wrench, Zap, Settings, Plus, ArrowRight,
  QrCode, GitBranch, Heart,
} from 'lucide-react';
import { TaskStatusBadge, TaskPriorityBadge, TaskTypeBadge } from '@/components/task/TaskBadges';

/* ── Inline QR Label Tab (no modal needed on profile page) ── */
function AssetQRLabelTab({ asset }: { asset: Asset }) {
  const qrData = JSON.stringify({ id: asset.id, code: asset.code, assetNumber: asset.assetNumber ?? '' });
  const printLabel = () => {
    const w = window.open('', '_blank', 'width=400,height=300');
    if (!w) return;
    w.document.write(`
      <html><head><title>Asset Label — ${asset.code}</title>
      <style>body{font-family:monospace;padding:16px;text-align:center}
      h2{font-size:14px;margin:4px 0}p{font-size:11px;margin:2px 0}</style>
      </head><body>
      <h2>${asset.code}${asset.assetNumber ? ' / ' + asset.assetNumber : ''}</h2>
      <p>${asset.deviceType}${asset.brand ? ' · ' + asset.brand : ''}${asset.model ? ' ' + asset.model : ''}</p>
      <p>S/N: ${asset.serialNumber ?? '—'}</p>
      <script>window.onload=()=>window.print()</script>
      </body></html>`);
    w.document.close();
  };
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <QrCode size={14} className="text-primary" /> Asset QR Label
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="p-3 bg-white rounded-lg border border-border">
            <QRCodeDataUrl text={qrData} width={140} />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold font-mono">{asset.code}{asset.assetNumber ? ` / ${asset.assetNumber}` : ''}</p>
            <p className="text-xs text-muted-foreground">{asset.deviceType}{asset.brand ? ` · ${asset.brand}` : ''}{asset.model ? ` ${asset.model}` : ''}</p>
            <p className="text-xs text-muted-foreground mt-0.5">S/N: {asset.serialNumber ?? '—'}</p>
          </div>
          <Button size="sm" variant="outline" onClick={printLabel} className="gap-2 w-full max-w-xs">
            <Wrench size={13} /> Print Label
          </Button>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground text-center max-w-sm">
        Scan this QR code to instantly open the asset profile, view history, AMC status, and previous tickets.
      </p>
    </div>
  );
}

/* ── Asset Tasks Tab ─────────────────────────────────────────── */
function AssetTasksTab({ assetId }: { assetId: string }) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assetId) return;
    taskService.list({ assetId, includeCancelled: true })
      .then((t) => { setTasks(t); setLoading(false); })
      .catch(() => setLoading(false));
  }, [assetId]);

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
        <p className="text-sm text-muted-foreground">{tasks.length} service record{tasks.length !== 1 ? 's' : ''}</p>
        <Button size="sm" className="gap-1.5 h-8 text-xs"
          onClick={() => navigate(`/tasks/new?assetId=${assetId}`)}>
          <Plus size={12} /> New Task
        </Button>
      </div>
      {tasks.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No service history"
          description="No service tasks have been recorded for this asset yet." />
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

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-border/50 last:border-0">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm text-foreground break-words">{value}</span>
    </div>
  );
}

function WarrantyBadge({ end }: { end?: string }) {
  if (!end) return <span className="text-xs text-muted-foreground">Unknown</span>;
  const expired = new Date(end) < new Date();
  return (
    <Badge variant="outline" className={expired
      ? 'bg-destructive/10 text-destructive border-destructive/30 text-xs'
      : 'bg-success/10 text-success border-success/30 text-xs'
    }>
      {expired ? 'Expired' : 'Active'} · {new Date(end).toLocaleDateString()}
    </Badge>
  );
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const icons: Record<string, React.ElementType> = {
    created: Server, updated: Pencil, deleted: Trash2, restored: RefreshCw,
    document_uploaded: FileText, document_deleted: Trash,
    warranty_updated: Shield, config_updated: Settings,
    engineer_visit: Wrench, part_changed: Zap, asset_added: Server,
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

export default function AssetProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [asset, setAsset] = useState<Asset | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [assetTasks, setAssetTasks] = useState<Task[]>([]);
  const [activeAMC, setActiveAMC] = useState<AMC | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const a = await assetService.getById(id);
    if (a) {
      const [c, tl, docs, amc, taskList] = await Promise.all([
        customerService.getById(a.customerId),
        timelineService.getByEntity(id),
        documentService.getByEntity(id),
        amcService.getAMCForAsset(id),
        taskService.list({ assetId: id, includeCancelled: true }),
      ]);
      setAsset(a); setCustomer(c); setTimeline(tl); setDocuments(docs);
      setActiveAMC(amc); setAssetTasks(taskList);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!asset || !user) return;
    await assetService.softDelete(asset.id, user.name);
    toast.success(`Asset ${asset.code} retired`);
    navigate('/assets');
  };

  const handleRestore = async () => {
    if (!asset || !user) return;
    await assetService.restore(asset.id, user.name);
    toast.success(`Asset ${asset.code} restored`);
    load();
  };

  const handleDeleteDoc = async (docId: string) => {
    await documentService.delete(docId, user?.name ?? 'Admin');
    documentService.getByEntity(id!).then(setDocuments).catch(() => {});
    toast.success('Document deleted');
  };

  if (loading) return <DashboardLayout><PageLoader /></DashboardLayout>;
  if (!asset) return <DashboardLayout><EmptyState icon={AlertTriangle} title="Asset not found" /></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader
        title={asset.code}
        description={`${asset.deviceType}${asset.brand ? ` · ${asset.brand}` : ''}${asset.model ? ` ${asset.model}` : ''}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Assets', href: '/assets' },
          { label: asset.code },
        ]}
        actions={
          isAdmin && (
            <div className="flex items-center gap-2">
              {asset.status === 'Retired' ? (
                <Button variant="outline" onClick={() => setRestoreOpen(true)} className="gap-2">
                  <RefreshCw size={14} /> Restore
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => navigate(`/assets/${id}/edit`)} className="gap-2">
                    <Pencil size={14} /> Edit
                  </Button>
                  <Button variant="outline" onClick={() => setDeleteOpen(true)} className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Trash2 size={14} /> Retire
                  </Button>
                </>
              )}
            </div>
          )
        }
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">{asset.category}</Badge>
        <StatusBadge status={asset.status} />
        {customer && (
          <Link to={`/customers/${customer.id}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Building2 size={12} /> {customer.companyName}
          </Link>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto mb-4 gap-1">
          {[
            { value: 'overview',        label: 'Overview' },
            { value: 'amc',             label: 'AMC' },
            { value: 'specifications',  label: 'Specifications' },
            { value: 'service-history', label: 'Service History' },
            { value: 'insights',        label: <span className="flex items-center gap-1"><Heart size={11} />Insights</span> },
            { value: 'relationships',   label: <span className="flex items-center gap-1"><GitBranch size={11} />Relationships</span> },
            { value: 'asset-timeline',  label: <span className="flex items-center gap-1"><History size={11} />Timeline</span> },
            { value: 'qr-label',        label: <span className="flex items-center gap-1"><QrCode size={11} />QR Label</span> },
            { value: 'documents',       label: 'Documents' },
          ].map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className="text-xs">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Overview ─────────────────────────────────────── */}
        <TabsContent value="overview">
          {asset && (() => {
            const h = assetHealthService.getHealth(asset, assetTasks);
            return h.frequentBreakdownAlert || h.score < 70 ? (
              <div className="mb-4"><AssetHealthCard asset={asset} tasks={assetTasks} /></div>
            ) : (
              <div className="mb-4"><AssetHealthCard asset={asset} tasks={assetTasks} compact /></div>
            );
          })()}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Basic */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Server size={14} className="text-primary" /> Basic Information</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Asset Code" value={asset.code} />
                <InfoRow label="Category" value={asset.category} />
                <InfoRow label="Device Type" value={asset.deviceType} />
                <InfoRow label="Brand" value={asset.brand} />
                <InfoRow label="Model" value={asset.model} />
                <InfoRow label="Serial Number" value={asset.serialNumber} />
                <InfoRow label="Service Tag" value={asset.serviceTag} />
                {customer && (
                  <div className="flex flex-col gap-0.5 py-2 border-b border-border/50">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Customer</span>
                    <Link to={`/customers/${customer.id}`} className="text-sm text-primary hover:underline">
                      {customer.companyName} ({customer.code})
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Warranty */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Shield size={14} className="text-primary" /> Warranty & Purchase</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Purchase Date" value={asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : undefined} />
                <InfoRow label="Installation Date" value={asset.installationDate ? new Date(asset.installationDate).toLocaleDateString() : undefined} />
                <InfoRow label="Warranty Start" value={asset.warrantyStart ? new Date(asset.warrantyStart).toLocaleDateString() : undefined} />
                <div className="flex flex-col gap-0.5 py-2 border-b border-border/50">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Warranty Status</span>
                  <WarrantyBadge end={asset.warrantyEnd} />
                </div>
                <InfoRow label="Vendor" value={asset.vendor} />
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><MapPin size={14} className="text-primary" /> Location</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Site / Location" value={asset.location} />
                <InfoRow label="Floor" value={asset.floor} />
                <InfoRow label="Department" value={asset.department} />
              </CardContent>
            </Card>

            {/* Network */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Network size={14} className="text-primary" /> Network & Access</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="IP Address" value={asset.ipAddress} />
                <InfoRow label="MAC Address" value={asset.macAddress} />
                <InfoRow label="Username" value={asset.username} />
                {asset.password && (
                  <div className="flex flex-col gap-1 py-2">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Password</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-foreground">
                        {showPassword ? asset.password : '••••••••'}
                      </span>
                      <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {(asset.configurationNotes || asset.remarks) && (
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Notes</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {asset.configurationNotes && (
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Configuration Notes</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{asset.configurationNotes}</p>
                    </div>
                  )}
                  {asset.remarks && (
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Remarks</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{asset.remarks}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── Specifications ───────────────────────────────── */}
        <TabsContent value="specifications">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Full Asset Specifications</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8">
              {[
                ['Asset Code', asset.code],
                ['Customer', customer?.companyName],
                ['Category', asset.category],
                ['Device Type', asset.deviceType],
                ['Brand', asset.brand],
                ['Model', asset.model],
                ['Serial Number', asset.serialNumber],
                ['Service Tag', asset.serviceTag],
                ['Status', asset.status],
                ['Purchase Date', asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : undefined],
                ['Installation Date', asset.installationDate ? new Date(asset.installationDate).toLocaleDateString() : undefined],
                ['Warranty Start', asset.warrantyStart ? new Date(asset.warrantyStart).toLocaleDateString() : undefined],
                ['Warranty End', asset.warrantyEnd ? new Date(asset.warrantyEnd).toLocaleDateString() : undefined],
                ['Vendor', asset.vendor],
                ['Location', asset.location],
                ['Floor', asset.floor],
                ['Department', asset.department],
                ['IP Address', asset.ipAddress],
                ['MAC Address', asset.macAddress],
                ['Username', asset.username],
                ['Created By', asset.createdBy],
                ['Created At', new Date(asset.createdAt).toLocaleDateString()],
                ['Last Updated', new Date(asset.updatedAt).toLocaleDateString()],
              ].map(([label, value]) => value ? <InfoRow key={label as string} label={label as string} value={value as string} /> : null)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AMC Status ───────────────────────────────────── */}
        <TabsContent value="amc">
          {activeAMC ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Shield size={14} className="text-primary" /> Active AMC Coverage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2 mb-4">
                    <AMCStatusBadge status={activeAMC.status} />
                    <div className="flex items-center gap-2 flex-wrap">
                      <AMCContractTypeBadge type={activeAMC.contractType} />
                      <RemainingDaysBadge endDate={activeAMC.endDate} />
                    </div>
                  </div>
                  <div className="flex flex-col divide-y divide-border/50">
                    {[
                      ['AMC Number', activeAMC.amcNumber, true],
                      ['Customer',   activeAMC.customerName, false],
                      ['Start Date', activeAMC.startDate, false],
                      ['End Date',   activeAMC.endDate, false],
                      ['Frequency',  activeAMC.visitFrequency, false],
                      ['SLA Response', activeAMC.slaResponseTime ?? '—', false],
                    ].map(([label, value, mono]) => (
                      <div key={label as string} className="py-2">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                        <p className={`text-sm text-foreground ${mono ? 'font-mono' : ''}`}>{value as string}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs w-full"
                      onClick={() => navigate(`/amc/${activeAMC.id}`)}>
                      <ArrowRight size={12} /> Open AMC Contract
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Coverage Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {[
                    ['Labour Included',     activeAMC.labourIncluded],
                    ['Travel Included',     activeAMC.travelIncluded],
                    ['Emergency Support',   activeAMC.emergencySupportIncluded],
                    ['Remote Support',      activeAMC.remoteSupportIncluded],
                  ].map(([label, val]) => (
                    <div key={label as string} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <span className="text-sm text-muted-foreground">{label as string}</span>
                      <Badge variant="outline" className={val
                        ? 'text-xs bg-success/10 text-success border-success/20'
                        : 'text-xs text-muted-foreground border-border'}>
                        {val ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : (
            <EmptyState
              icon={Shield}
              title="Not covered by AMC"
              description="This asset is not currently covered under any active Annual Maintenance Contract."
            />
          )}
        </TabsContent>

        {/* ── Service History ───────────────────────────────── */}
        <TabsContent value="service-history">
          <AssetTasksTab assetId={asset?.id ?? ''} />
        </TabsContent>

        {/* ── Smart Insights ───────────────────────────────── */}
        <TabsContent value="insights">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AssetHealthCard asset={asset} tasks={assetTasks} />
            {/* Summary stats card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Heart size={14} className="text-primary" /> Service Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const h = assetHealthService.getHealth(asset, assetTasks);
                  const totalCost = assetTasks.reduce((sum, t) => sum + (Number((t as unknown as Record<string,unknown>).cost) || 0), 0);
                  const lastVisit = assetTasks.filter((t) => t.expectedVisitDate).sort((a, b) =>
                    (b.expectedVisitDate ?? '').localeCompare(a.expectedVisitDate ?? '')
                  )[0];
                  return (
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Total Tasks',      value: h.totalServiceCalls.toString() },
                        { label: 'Breakdowns',       value: h.breakdownCount.toString(),   danger: h.breakdownCount >= 4 },
                        { label: 'Repairs',          value: h.repairCount.toString() },
                        { label: 'Asset Age',        value: `${h.ageYears.toFixed(1)} yrs` },
                        { label: 'Repair Cost',      value: totalCost > 0 ? `₹${totalCost.toLocaleString()}` : '—' },
                        { label: 'Last Visit',       value: lastVisit?.expectedVisitDate ?? '—' },
                      ].map(({ label, value, danger }) => (
                        <div key={label} className={`rounded-lg border p-3 ${danger ? 'border-destructive/30 bg-destructive/5' : 'bg-muted/30'}`}>
                          <p className={`text-lg font-bold tabular-nums ${danger ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Relationships ────────────────────────────────── */}
        <TabsContent value="relationships">
          <AssetRelationshipsPanel
            assetId={asset.id}
            customerId={asset.customerId}
            assetCode={asset.code}
          />
        </TabsContent>

        {/* ── Asset Timeline ───────────────────────────────── */}
        <TabsContent value="asset-timeline">
          <AssetTimeline assetId={asset.id} />
        </TabsContent>

        {/* ── QR Label ─────────────────────────────────────── */}
        <TabsContent value="qr-label">
          <AssetQRLabelTab asset={asset} />
        </TabsContent>

        {/* ── Documents ────────────────────────────────────── */}
        <TabsContent value="documents">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
          </div>
          {documents.length === 0 ? (
            <EmptyState icon={FileText} title="No documents" description="Documents for this asset will appear here." />
          ) : (
            <div className="flex flex-col gap-2">
              {documents.map((doc) => {
                const sizeLabel = doc.fileSize < 1024 * 1024
                  ? `${(doc.fileSize / 1024).toFixed(1)} KB`
                  : `${(doc.fileSize / 1024 / 1024).toFixed(1)} MB`;
                return (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-md border border-border bg-card hover:bg-muted/40 transition-colors">
                    <FileText size={16} className="text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {doc.fileName}{doc.version > 1 && <span className="ml-1 text-[10px] text-muted-foreground">(v{doc.version})</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{doc.category} · {sizeLabel} · {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a href={doc.url} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye size={13} /></Button>
                      </a>
                      <a href={doc.url} download={doc.fileName}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Download size={13} /></Button>
                      </a>
                      {isAdmin && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteDoc(doc.id)}>
                          <Trash size={13} />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Timeline (audit log) ─────────────────────────── */}
        <TabsContent value="timeline">
          {timeline.length === 0 ? (
            <EmptyState icon={History} title="No activity yet" />
          ) : (
            <Card>
              <CardContent className="pt-4">
                {timeline.map((event) => <TimelineItem key={event.id} event={event} />)}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Retire Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Retire <strong>{asset.code}</strong>? This can be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Retire</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Asset</AlertDialogTitle>
            <AlertDialogDescription>Restore <strong>{asset.code}</strong>?</AlertDialogDescription>
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
