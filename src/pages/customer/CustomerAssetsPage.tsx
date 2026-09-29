/**
 * Customer My Assets Page — Sectore 360
 * Full read-only asset detail with:
 *  - Asset list with search/filter
 *  - Detail sheet: General · Manufacturer · Configuration · Warranty · Documents · Service History · Asset History
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { assetService } from '@/services/assetService';
import { taskService } from '@/services/taskService';
import { assetHistoryService } from '@/services/assetHistoryService';
import type { Asset } from '@/types/customer';
import type { Task } from '@/types/task';
import type { AssetHistoryRecord } from '@/services/assetHistoryService';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search, Package, Server, ChevronRight, MapPin, Shield,
  Cpu, HardDrive, Calendar, FileText, Clock, Wrench, History,
  ExternalLink, Download,
} from 'lucide-react';
import { TaskStatusBadge } from '@/components/task/TaskBadges';

/* ── small helpers ─────────────────────────────────────────── */
function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-foreground break-words flex-1">{value}</span>
    </div>
  );
}

function SectionHead({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
      <Icon size={14} className="text-primary shrink-0" />
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
    </div>
  );
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDT(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

/* ── Asset Detail Sheet ────────────────────────────────────── */
function AssetDetailSheet({
  asset,
  open,
  onClose,
}: {
  asset: Asset | null;
  open: boolean;
  onClose: () => void;
}) {
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [history, setHistory] = useState<AssetHistoryRecord[]>([]);
  const [loadingTasks, setLoadingTasks]     = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!asset || !open) return;
    setLoadingTasks(true);
    setLoadingHistory(true);
    taskService.list({ assetId: asset.id, includeCancelled: true, limit: 100 })
      .then(setTasks).catch(() => setTasks([])).finally(() => setLoadingTasks(false));
    assetHistoryService.getByAsset(asset.id)
      .then(setHistory).catch(() => setHistory([])).finally(() => setLoadingHistory(false));
  }, [asset, open]);

  if (!asset) return null;

  const specs = asset.specifications ?? {};
  const osType   = (specs.os_type   ?? '') as string;
  const osVer    = (specs.os_version ?? '') as string;
  const proc     = (specs.processor  ?? '') as string;
  const ramGb    = (specs.ram_gb     ?? '') as string | number;
  const storage  = (specs.storage    ?? '') as string;
  const instSw   = (specs.installed_software ?? '') as string;
  const osLabel  = osType ? `${osType}${osVer ? ' ' + osVer : ''}` : undefined;
  const ramLabel = ramGb  ? `${ramGb} GB` : undefined;

  /* warranty status colour */
  const now = new Date();
  const wEnd = asset.warrantyEnd ? new Date(asset.warrantyEnd) : null;
  const warrantyColor = !wEnd ? 'text-muted-foreground'
    : wEnd < now ? 'text-destructive'
    : wEnd < new Date(now.getTime() + 90 * 86400000) ? 'text-amber-500'
    : 'text-success';

  /* photos from custom_fields or photoUrls */
  const photos: string[] = [
    ...(asset.photoUrls ?? []),
    ...((asset.customFields?.photos ?? []) as string[]),
  ].filter(Boolean);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full max-w-[calc(100%-2rem)] md:max-w-2xl overflow-y-auto p-0">
        {/* Sheet header */}
        <SheetHeader className="px-5 py-4 border-b border-border bg-card sticky top-0 z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-base font-bold font-mono">{asset.code}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {asset.deviceType}{asset.brand ? ` · ${asset.brand}` : ''}{asset.model ? ` ${asset.model}` : ''}
              </p>
            </div>
            <Badge className={
              asset.status === 'Active'
                ? 'bg-success/10 text-success border-0 shrink-0'
                : 'bg-muted text-muted-foreground border-0 shrink-0'
            }>{asset.status}</Badge>
          </div>
        </SheetHeader>

        <Tabs defaultValue="general" className="px-5 pt-4 pb-8">
          <TabsList className="w-full grid grid-cols-4 md:grid-cols-7 h-auto mb-4">
            {[
              ['general',  'General'],
              ['config',   'Config'],
              ['warranty', 'Warranty'],
              ['docs',     'Docs'],
              ['service',  'Service'],
              ['history',  'History'],
            ].map(([v, l]) => (
              <TabsTrigger key={v} value={v} className="text-xs py-1.5">{l}</TabsTrigger>
            ))}
          </TabsList>

          {/* ── GENERAL ─────────────────────────────────── */}
          <TabsContent value="general" className="mt-0">
            <SectionHead icon={Server} title="General" />
            <InfoRow label="Asset Number"  value={asset.assetNumber ?? asset.code} />
            <InfoRow label="Asset Name"    value={asset.deviceType} />
            <InfoRow label="Category"      value={asset.category} />
            <InfoRow label="Status"        value={asset.status} />

            <SectionHead icon={MapPin} title="Location" />
            <InfoRow label="Site / Location" value={asset.location} />
            <InfoRow label="Department"      value={asset.department} />
            <InfoRow label="Floor / Building" value={asset.floor} />
            <InfoRow label="Landmark"        value={(asset.customFields?.landmark ?? '') as string || undefined} />
            <InfoRow label="Assigned User"   value={asset.assignedUser} />

            <SectionHead icon={Package} title="Manufacturer" />
            <InfoRow label="Brand"         value={asset.brand} />
            <InfoRow label="Model"         value={asset.model} />
            <InfoRow label="Serial Number" value={asset.serialNumber} />
            <InfoRow label="Asset Tag"     value={asset.serviceTag} />
            <InfoRow label="Vendor"        value={asset.vendor} />
          </TabsContent>

          {/* ── CONFIGURATION ───────────────────────────── */}
          <TabsContent value="config" className="mt-0">
            <SectionHead icon={Cpu} title="Hardware" />
            <InfoRow label="Processor / CPU"   value={proc || undefined} />
            <InfoRow label="RAM"               value={ramLabel} />
            <InfoRow label="Storage"           value={storage || undefined} />
            <InfoRow label="Operating System"  value={osLabel} />

            <SectionHead icon={HardDrive} title="Network" />
            <InfoRow label="IP Address"  value={asset.ipAddress} />
            <InfoRow label="MAC Address" value={asset.macAddress} />

            {instSw && (
              <>
                <SectionHead icon={FileText} title="Installed Software" />
                <p className="text-sm text-foreground whitespace-pre-wrap">{instSw}</p>
              </>
            )}
            {asset.configurationNotes && (
              <>
                <SectionHead icon={FileText} title="Configuration Notes" />
                <p className="text-sm text-foreground whitespace-pre-wrap">{asset.configurationNotes}</p>
              </>
            )}
          </TabsContent>

          {/* ── WARRANTY ────────────────────────────────── */}
          <TabsContent value="warranty" className="mt-0">
            <SectionHead icon={Shield} title="Warranty &amp; Lifecycle" />
            <InfoRow label="Purchase Date"    value={fmtDate(asset.purchaseDate)} />
            <InfoRow label="Installation Date" value={fmtDate(asset.installationDate)} />
            <InfoRow label="Warranty Start"   value={fmtDate(asset.warrantyStart)} />

            <div className="flex gap-2 py-1.5 border-b border-border/40">
              <span className="text-xs text-muted-foreground w-36 shrink-0 pt-0.5">Warranty End</span>
              <span className={`text-sm font-medium ${warrantyColor}`}>
                {fmtDate(asset.warrantyEnd)}
                {wEnd && wEnd < now && ' (Expired)'}
              </span>
            </div>

            <SectionHead icon={Shield} title="AMC" />
            <InfoRow label="AMC Status" value={(asset.customFields?.amcStatus ?? 'Not Available') as string} />
            <InfoRow label="AMC Number" value={(asset.customFields?.amcNumber ?? '') as string || undefined} />
            <InfoRow label="AMC Expiry" value={fmtDate((asset.customFields?.amcExpiry ?? '') as string || undefined)} />
          </TabsContent>

          {/* ── DOCUMENTS & IMAGES ──────────────────────── */}
          <TabsContent value="docs" className="mt-0">
            {photos.length > 0 ? (
              <>
                <SectionHead icon={FileText} title="Images" />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="block aspect-video rounded-md overflow-hidden border border-border hover:opacity-90 transition-opacity">
                      <img src={url} alt={`Asset photo ${i + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <FileText size={28} className="mx-auto mb-2 opacity-20" />
                No photos available
              </div>
            )}

            {asset.documentUrls && asset.documentUrls.length > 0 && (
              <>
                <SectionHead icon={FileText} title="Documents" />
                <div className="flex flex-col gap-2">
                  {asset.documentUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Download size={13} /> Document {i + 1}
                      <ExternalLink size={11} className="opacity-50" />
                    </a>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* ── SERVICE HISTORY ─────────────────────────── */}
          <TabsContent value="service" className="mt-0">
            <SectionHead icon={Wrench} title="Service Visits" />
            {loadingTasks ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Wrench size={24} className="mx-auto mb-2 opacity-20" />
                No service visits recorded
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {tasks.map((t) => (
                  <Card key={t.id} className="border border-border/60">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-bold text-foreground">{t.taskNumber}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{t.taskType}</p>
                        </div>
                        <TaskStatusBadge status={t.status} />
                      </div>
                      <Separator className="my-2" />
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Date</p>
                          <p className="text-xs font-medium">{fmtDate(t.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Engineer</p>
                          <p className="text-xs font-medium">{t.engineerName ?? '—'}</p>
                        </div>
                        {t.siteTimeMinutes != null && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Duration</p>
                            <p className="text-xs font-medium flex items-center gap-1">
                              <Clock size={10} />
                              {t.siteTimeMinutes >= 60
                                ? `${Math.floor(t.siteTimeMinutes / 60)}h ${t.siteTimeMinutes % 60}m`
                                : `${t.siteTimeMinutes}m`}
                            </p>
                          </div>
                        )}
                        {t.priority && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Priority</p>
                            <p className="text-xs font-medium">{t.priority}</p>
                          </div>
                        )}
                      </div>
                      {t.issueDescription && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">
                          "{t.issueDescription}"
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── ASSET HISTORY TIMELINE ──────────────────── */}
          <TabsContent value="history" className="mt-0">
            <SectionHead icon={History} title="Change History" />
            {loadingHistory ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <History size={24} className="mx-auto mb-2 opacity-20" />
                No history recorded yet
              </div>
            ) : (
              <ol className="relative border-l border-border/60 ml-3 flex flex-col gap-0">
                {history.map((h, i) => (
                  <li key={h.id} className="ml-4 pb-5 last:pb-0">
                    {/* dot */}
                    <span className={`absolute -left-[7px] flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-background
                      ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs font-semibold text-foreground">{h.action}</p>
                      {h.fieldName && h.oldValue && h.newValue && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-muted-foreground line-through">{h.oldValue}</span>
                          <ChevronRight size={10} className="text-muted-foreground shrink-0" />
                          <span className="text-xs font-medium text-foreground">{h.newValue}</span>
                        </div>
                      )}
                      {(!h.fieldName) && h.newValue && (
                        <p className="text-xs text-muted-foreground">{h.newValue}</p>
                      )}
                      {h.notes && <p className="text-xs text-muted-foreground italic">{h.notes}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {h.performedBy} · {fmtDT(h.performedAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */
export default function CustomerAssetsPage() {
  const { user } = useAuth();
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('all');
  const [assets,   setAssets]   = useState<Asset[]>([]);
  const [selected, setSelected] = useState<Asset | null>(null);

  useEffect(() => {
    if (!user?.customerId) return;
    // Fetch only this customer's assets — never the full table
    assetService.getByCustomer(user.customerId)
      .then(setAssets)
      .catch(() => setAssets([]));
  }, [user?.customerId]);

  const categories = useMemo(() => Array.from(new Set(assets.map((a) => a.category))), [assets]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return assets.filter((a) => {
      if (category !== 'all' && a.category !== category) return false;
      if (q && !a.code.toLowerCase().includes(q) &&
          !a.serialNumber.toLowerCase().includes(q) &&
          !(a.brand ?? '').toLowerCase().includes(q) &&
          !(a.model ?? '').toLowerCase().includes(q) &&
          !a.deviceType.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [assets, search, category]);

  const open = useCallback((a: Asset) => setSelected(a), []);
  const close = useCallback(() => setSelected(null), []);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 max-w-3xl mx-auto pb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Package size={18} className="text-primary" /> My Assets
          </h1>
          <p className="text-sm text-muted-foreground">View all assets registered under your account — read only</p>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-col md:flex-row">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by code, serial, brand, model…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="md:w-48">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} asset{filtered.length !== 1 ? 's' : ''}</p>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Server size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No assets found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((a) => (
              <Card key={a.id} className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => open(a)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground font-mono">{a.code}</p>
                        {a.assetNumber && <p className="text-xs text-muted-foreground font-mono">{a.assetNumber}</p>}
                        <Badge variant="outline" className="text-xs">{a.category}</Badge>
                      </div>
                      <p className="text-sm text-foreground">
                        {a.deviceType}{a.brand ? ` · ${a.brand}` : ''}{a.model ? ` ${a.model}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">SN: {a.serialNumber}</p>
                      {a.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin size={10} /> {a.location}{a.department ? ` · ${a.department}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge className={
                        a.status === 'Active'
                          ? 'bg-success/10 text-success border-0'
                          : 'bg-muted text-muted-foreground border-0'
                      }>{a.status}</Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1">
                        Details <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AssetDetailSheet asset={selected} open={!!selected} onClose={close} />
    </DashboardLayout>
  );
}
