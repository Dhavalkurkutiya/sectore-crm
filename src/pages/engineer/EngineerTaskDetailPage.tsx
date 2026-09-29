/**
 * Engineer Task Detail Page — Phase 1 Final (Single-Page Job Card)
 * Sectore 360 — Accordion layout optimized for field engineers.
 * No wizard. No step navigation. Everything on one page.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEngineerContext } from '@/contexts/EngineerContext';
import { engineerService } from '@/services/engineerService';
import { customerService } from '@/services/customerService';
import { assetService } from '@/services/assetService';
import { templateService, taskTemplateDataService } from '@/services/templateService';
import { assetHealthService } from '@/services/assetHealthService';
import { taskService } from '@/services/taskService';
import { companyProfileService } from '@/services/companyProfileService';
import type { CompanyProfile } from '@/services/companyProfileService';
import { WorkOrderPrint } from '@/components/task/WorkOrderPrint';
import { ServiceActivityTab } from '@/components/task/ServiceActivityTab';
import type { Task, TaskStatus } from '@/types/task';
import type { Customer, Asset } from '@/types/customer';
import type { PartUsed, CustomerSignature, EngineerTaskPhoto, WorkCompletion } from '@/types/engineer';
import type { TaskTemplateData, MaterialUnit } from '@/types/template';
import type { PhotoCategory } from '@/types/task';
import type { PhotoItem } from '@/components/engineer/PhotoUpload';
import { TaskStatusBadge, TaskPriorityBadge } from '@/components/task/TaskBadges';
import { TaskTypeFlagBadge } from '@/components/engineer/EngineerBadges';
import { PhotoUpload } from '@/components/engineer/PhotoUpload';
import { SignatureCanvas } from '@/components/engineer/SignatureCanvas';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronDown, ChevronUp, Phone, MapPin, Navigation,
  Building2, Cpu, ClipboardCheck, Camera, Package, PenLine,
  AlertOctagon, CheckCircle2, Clock, RefreshCw, Wrench, Plus,
  Download, Share2, Printer, MessageCircle, ShieldAlert, Save,
  FileText,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';

type ActionType = 'accept' | 'reject' | 'start_journey' | 'reached_site' | 'start_work' |
  'pause_work' | 'resume_work' | 'complete_work' | 'help' | 'escalate';

interface ActionConfig {
  label: string;
  icon: React.ElementType;
  variant: 'default' | 'outline' | 'destructive';
  requiresReason?: boolean;
}

const ACTION_MAP: Partial<Record<string, ActionType[]>> = {
  'Pending':          ['accept', 'reject'],
  'Assigned':         ['accept', 'reject'],
  'Accepted':         ['start_journey', 'help', 'escalate'],
  'On The Way':       ['reached_site', 'help', 'escalate'],
  'Reached Site':     ['start_work', 'help', 'escalate'],
  'Working':          ['pause_work', 'help', 'escalate'],
  'Waiting Customer': ['resume_work', 'escalate'],
  'Waiting Parts':    ['resume_work', 'escalate'],
  'Waiting Vendor':   ['resume_work', 'escalate'],
};

const ACTION_CONFIG: Record<ActionType, ActionConfig> = {
  accept:        { label: 'Accept Task',   icon: CheckCircle2,   variant: 'default' },
  reject:        { label: 'Reject Task',   icon: AlertOctagon,   variant: 'destructive', requiresReason: true },
  start_journey: { label: 'Start Journey', icon: Navigation,     variant: 'default' },
  reached_site:  { label: 'Reached Site',  icon: MapPin,         variant: 'default' },
  start_work:    { label: 'Start Work',    icon: Wrench,         variant: 'default' },
  pause_work:    { label: 'Pause Work',    icon: Clock,          variant: 'outline' },
  resume_work:   { label: 'Resume Work',   icon: RefreshCw,      variant: 'default' },
  complete_work: { label: 'Complete Work', icon: ClipboardCheck, variant: 'default' },
  help:          { label: 'Request Help',  icon: Phone,          variant: 'outline' },
  escalate:      { label: 'Escalate',      icon: AlertOctagon,   variant: 'outline', requiresReason: true },
};

const STATUS_FOR_ACTION: Partial<Record<ActionType, string>> = {
  accept:        'Accepted',
  start_journey: 'On The Way',
  reached_site:  'Reached Site',
  start_work:    'Working',
  pause_work:    'Waiting Customer',
  resume_work:   'Working',
  complete_work: 'Completed',
};

/* ── Collapsible section helper ─────────────────────────────── */
function Section({
  id, icon: Icon, title, badge, defaultOpen = true, children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badge}
        </div>
        {open ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
      </button>
      {open && <div id={id}>{children}</div>}
    </Card>
  );
}


export default function EngineerTaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { engineerId: ENGINEER_ID } = useEngineerContext();
  const ENGINEER_NAME = user?.name ?? 'Engineer';

  /* ── Data state ─────────────────────────────────────────── */
  const [task, setTask]               = useState<Task | null>(null);
  const [customer, setCustomer]       = useState<Customer | null>(null);
  const [asset, setAsset]             = useState<Asset | null>(null);
  const [parts, setParts]             = useState<PartUsed[]>([]);
  const [signature, setSignature]     = useState<CustomerSignature | null>(null);
  const [photos, setPhotos]           = useState<EngineerTaskPhoto[]>([]);
  const [templateData, setTemplateData] = useState<TaskTemplateData | null>(null);

  /* ── Form state ─────────────────────────────────────────── */
  const [workPerformed,   setWorkPerformed]   = useState('');
  const [problemFound,    setProblemFound]    = useState('');
  const [rootCause,       setRootCause]       = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [customerRemarks, setCustomerRemarks] = useState('');
  const [internalNotes,   setInternalNotes]   = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<WorkCompletion['resolutionStatus']>(undefined);
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [isCompleted, setIsCompleted]           = useState(false);

  const [printOpen, setPrintOpen]             = useState(false);
  const [company,   setCompany]               = useState<CompanyProfile>(companyProfileService.get());

  /* ── Extra material ─────────────────────────────────────── */
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraItem, setExtraItem] = useState({ name: '', qty: 1, unit: 'pcs' as MaterialUnit, reason: '' });

  /* ── Reason dialog ──────────────────────────────────────── */
  const [reasonDialog, setReasonDialog] = useState<{ open: boolean; action: ActionType | null }>({ open: false, action: null });
  const [reason, setReason]             = useState('');

  /* ── Local photos ───────────────────────────────────────── */
  const [localPhotos, setLocalPhotos] = useState<Record<string, PhotoItem[]>>({
    before: [], work_in_progress: [], after: [], equipment: [], serial_number: [],
  });

  /* ── Load ───────────────────────────────────────────────── */
  const loadTask = useCallback(async () => {
    if (!taskId) return;
    const t = await taskService.getById(taskId);
    if (!t) { toast.error('Task not found'); navigate('/engineer/tasks'); return; }
    setTask(t);
    setIsCompleted(t.status === 'Completed' || t.status === 'Closed');

    const [c, a] = await Promise.all([
      customerService.getById(t.customerId),
      assetService.getById(t.assetId),
    ]);
    setCustomer(c);
    setAsset(a);
    engineerService.getPartsUsed(taskId).then(setParts).catch(() => {});
    setSignature(engineerService.getSignature(taskId));
    setPhotos(engineerService.getPhotos(taskId));
    companyProfileService.fetch().then(setCompany).catch(() => {});

    const wc = engineerService.getWorkCompletion(taskId);
    if (wc) {
      setWorkPerformed(wc.workPerformed ?? '');
      setProblemFound(wc.problemFound ?? '');
      setRootCause(wc.rootCause ?? '');
      setRecommendations(wc.recommendations ?? '');
      setCustomerRemarks(wc.customerRemarks ?? '');
      setInternalNotes(wc.internalNotes ?? '');
      if (wc.resolutionStatus) setResolutionStatus(wc.resolutionStatus);
    }

    if (t && a) {
      const tmpl = templateService.findByServiceTypeAndCategory(t.taskType, a.category ?? '');
      if (tmpl) setTemplateData(taskTemplateDataService.getOrInit(taskId, tmpl.id));
      else setTemplateData(taskTemplateDataService.get(taskId));
    }
  }, [taskId, navigate]);

  useEffect(() => { loadTask(); }, [loadTask]);

  /* ── Actions ────────────────────────────────────────────── */
  function handleAction(action: ActionType) {
    if (ACTION_CONFIG[action].requiresReason) { setReasonDialog({ open: true, action }); return; }
    applyAction(action);
  }

  function applyAction(action: ActionType, actionReason?: string) {
    if (!task) return;
    const newStatus = STATUS_FOR_ACTION[action];
    const patch: Partial<Task> = {};
    if (newStatus) patch.status = newStatus as TaskStatus;
    if (action === 'reject'   && actionReason) patch.rejectionReason  = actionReason;
    if (action === 'escalate' && actionReason) patch.escalationReason = actionReason;

    // ── Service visit timing: capture Reached Site time ──
    if (action === 'reached_site') {
      taskService.recordServiceStart(task.id).catch(() => {/* non-blocking */});
    }

    taskService.update(task.id, patch, ENGINEER_NAME).then(() => {
      toast.success(`${ACTION_CONFIG[action].label} — status updated`);
      loadTask();
    }).catch(() => toast.error('Failed to update status'));
    setReasonDialog({ open: false, action: null });
    setReason('');
  }

  /* ── Photos ─────────────────────────────────────────────── */
  // Map engineer photo category keys → TaskPhoto PhotoCategory for DB persistence
  const ENG_TO_TASK_CATEGORY: Record<string, PhotoCategory> = {
    before:           'Before',
    work_in_progress: 'During',
    after:            'After',
  };

  async function addLocalPhoto(category: string, photo: PhotoItem) {
    if (!task) return;
    // 1. Persist to task_photos table so admin/customer see it immediately
    const dbCategory: PhotoCategory = ENG_TO_TASK_CATEGORY[category] ?? 'Before';
    taskService.addPhoto(
      task.id, dbCategory, photo.fileName,
      photo.fileSizeKB * 1024, photo.dataUrl,
      ENGINEER_NAME, ENGINEER_ID || '',
    ).catch(() => {/* non-blocking — local store is fallback */});
    // 2. Also write to in-memory store for immediate local display
    engineerService.addPhoto(task.id, ENGINEER_ID || '', photo.category, photo.dataUrl, photo.fileName, photo.fileSizeKB);
    setLocalPhotos((prev) => ({ ...prev, [category]: [...(prev[category] ?? []), photo] }));
    setPhotos(engineerService.getPhotos(task.id));
  }

  function removeLocalPhoto(category: string, id: string) {
    engineerService.deletePhoto(id);
    // Also delete from task_photos DB
    taskService.deletePhoto(id, ENGINEER_NAME, ENGINEER_ID || '').catch(() => {});
    setLocalPhotos((prev) => ({ ...prev, [category]: (prev[category] ?? []).filter((p) => p.id !== id) }));
    if (task) setPhotos(engineerService.getPhotos(task.id));
  }

  /* ── Signature ──────────────────────────────────────────── */
  function handleSignatureSave(dataUrl: string) {
    if (!task) return;
    const sig = engineerService.saveSignature(task.id, dataUrl, customer?.companyName);
    setSignature(sig);
    setSignatureDataUrl(dataUrl);
    toast.success('Signature saved');
  }

  /* ── Extra material ─────────────────────────────────────── */
  function handleAddExtra() {
    if (!task || !templateData || !extraItem.name.trim()) { toast.error('Item name required'); return; }
    const updated = taskTemplateDataService.addMaterial(task.id, {
      itemName: extraItem.name.trim(), plannedQty: 0, unit: extraItem.unit,
      usedQty: extraItem.qty, extraQty: extraItem.qty, extraReason: extraItem.reason, returnedQty: 0,
    }, ENGINEER_NAME);
    setTemplateData(updated);
    setExtraItem({ name: '', qty: 1, unit: 'pcs', reason: '' });
    setExtraOpen(false);
    toast.success('Extra item added');
  }

  /* ── Save Draft ─────────────────────────────────────────── */
  function handleSaveDraft() {
    if (!task || !workPerformed.trim()) { toast.info('Fill in Work Performed to save draft'); return; }
    engineerService.saveWorkCompletion(task.id, ENGINEER_ID, {
      problemFound, rootCause, resolution: workPerformed,
      workPerformed, recommendations, customerRemarks, internalNotes,
      partsReplaced: '', signatureId: signature?.id,
      resolutionStatus,
    });
    toast.success('Draft saved');
  }

  /* ── Complete Task ──────────────────────────────────────── */
  function handleCompleteTask() {
    if (!task) return;
    if (!workPerformed.trim()) { toast.error('Work Performed is required'); return; }
    if (!signatureDataUrl && !signature?.signatureDataUrl) { toast.error('Customer signature is required'); return; }
    engineerService.saveWorkCompletion(task.id, ENGINEER_ID, {
      problemFound, rootCause, resolution: workPerformed,
      workPerformed, recommendations, customerRemarks, internalNotes,
      partsReplaced: parts.map((p) => `${p.partName} x${p.quantity}`).join(', ') || 'None',
      signatureId: signature?.id,
      resolutionStatus,
    });
    // Record service end time then update status
    taskService.recordServiceEnd(task.id, task.serviceStartTime)
      .then(() => taskService.updateStatus(task.id, 'Completed' as TaskStatus, ENGINEER_NAME))
      .then(() => { toast.success('Task completed successfully!'); loadTask(); })
      .catch(() => toast.error('Failed to update task status'));
  }

  /* ── WhatsApp share ─────────────────────────────────────── */
  function handleShareWhatsApp() {
    if (!task) return;
    const msg = encodeURIComponent(
      `Sectore 360 — Work Order ${task.taskNumber}\nCustomer: ${customer?.companyName ?? ''}\nEngineer: ${ENGINEER_NAME}\nStatus: Completed\nWork Performed: ${workPerformed || 'N/A'}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  /* ── Loading ────────────────────────────────────────────── */
  if (!task) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading task…</div>
      </DashboardLayout>
    );
  }

  const availableActions = ACTION_MAP[task.status] ?? [];
  const materials        = templateData?.materials ?? [];
  const checklistDone    = templateData?.checklist.filter((c) => c.checked).length ?? 0;
  const checklistTotal   = templateData?.checklist.length ?? 0;
  const photoCount       = photos.length;
  const health = asset ? assetHealthService.getHealth(asset, []) : null;
  const mapsUrl          = customer?.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`
    : '#';

  const PHOTO_CATS = [
    { key: 'before'           as const, label: 'Before Photos'    },
    { key: 'work_in_progress' as const, label: 'Work in Progress' },
    { key: 'after'            as const, label: 'After Photos'     },
    { key: 'equipment'        as const, label: 'Equipment Photos' },
    { key: 'serial_number'    as const, label: 'Serial Number'    },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-[calc(100vh-4rem)]">

        {/* ── Scrollable content ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto pb-20">
          <div className="max-w-3xl mx-auto px-3 md:px-6 py-4 flex flex-col gap-3">

            {/* ── Page header ───────────────────────────────── */}
            <div className="flex items-start gap-2">
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0 mt-0.5"
                onClick={() => navigate('/engineer/tasks')}>
                <ChevronLeft size={18} />
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-xs font-mono text-muted-foreground">{task.taskNumber}</span>
                  <TaskTypeFlagBadge isAMC={!!task.amcId} />
                  <TaskStatusBadge status={task.status} />
                  <TaskPriorityBadge priority={task.priority} />
                </div>
                <h1 className="text-base font-bold leading-snug">{task.issueDescription}</h1>
              </div>
            </div>

            {/* ── Breakdown alert ───────────────────────────── */}
            {health?.frequentBreakdownAlert && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                <ShieldAlert size={15} className="text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive font-medium">
                  ⚠ Frequent Breakdown Alert — {health.breakdownCount} incidents · Health {health.score}% ({health.level})
                </p>
              </div>
            )}

            {/* ── Workflow actions ──────────────────────────── */}
            {!isCompleted && availableActions.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {availableActions.map((action) => {
                  const { label, icon: Icon, variant } = ACTION_CONFIG[action];
                  return (
                    <Button key={action} variant={variant} size="lg" className="h-11 gap-1.5"
                      onClick={() => handleAction(action)}>
                      <Icon size={15} className="shrink-0" />{label}
                    </Button>
                  );
                })}
              </div>
            )}
            {isCompleted && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-400 font-semibold">Task Completed</p>
              </div>
            )}

            {/* ══════════════════════════════════════════════ */}
            {/* 1. TASK SUMMARY                               */}
            {/* ══════════════════════════════════════════════ */}
            <Section id="summary" icon={FileText} title="Task Summary" defaultOpen>
              <CardContent className="px-4 py-3 flex flex-col gap-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  {([
                    ['Task No.',      task.taskNumber],
                    ['Service Type',  task.taskType],
                    ['Customer',      customer?.companyName ?? '—'],
                    ['Contact',       customer?.contactPerson ?? '—'],
                    ['Asset',         asset ? `${asset.deviceType} · ${asset.serialNumber}` : '—'],
                    ['Priority',      task.priority],
                    ['Engineer',      task.engineerName ?? ENGINEER_NAME],
                    ['Expected Date', task.expectedVisitDate ?? '—'],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label} className="flex gap-2 min-w-0">
                      <span className="text-muted-foreground shrink-0 w-28 text-xs pt-px">{label}</span>
                      <span className="text-sm font-medium break-words flex-1">{value}</span>
                    </div>
                  ))}
                </div>

                {/* ── Service visit timings ────────────────── */}
                {(task.serviceStartTime || task.serviceEndTime) && (
                  <div className="border border-border rounded-lg p-3 bg-muted/30 flex flex-col gap-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Service Visit Timings</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {task.serviceStartTime && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Reached Site</span>
                          <span className="text-sm font-semibold">{new Date(task.serviceStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                      {task.serviceEndTime && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Task Completed</span>
                          <span className="text-sm font-semibold">{new Date(task.serviceEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                      {task.siteTimeMinutes != null && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Time on Site</span>
                          <span className="text-sm font-semibold text-primary">
                            {task.siteTimeMinutes >= 60
                              ? `${Math.floor(task.siteTimeMinutes / 60)}h ${task.siteTimeMinutes % 60}m`
                              : `${task.siteTimeMinutes} min`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {customer?.address && (
                  <a
                    href={customer.googleMapLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([customer.address, customer.city, customer.state, customer.country].filter(Boolean).join(', '))}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-md bg-primary text-primary-foreground font-semibold text-base py-3.5 hover:bg-primary/90 transition-colors">
                    <MapPin size={18} /> Open in Google Maps
                  </a>
                )}
              </CardContent>
            </Section>

            {/* ══════════════════════════════════════════════ */}
            {/* 2. CHECKLIST                                  */}
            {/* ══════════════════════════════════════════════ */}
            {templateData && (
              <Section id="checklist" icon={ClipboardCheck} title="Checklist" defaultOpen
                badge={
                  <Badge variant={checklistDone === checklistTotal && checklistTotal > 0 ? 'default' : 'secondary'}
                    className="text-[10px] px-1.5 py-0 h-4">
                    {checklistDone}/{checklistTotal}
                  </Badge>
                }>
                <CardContent className="px-4 py-1 divide-y divide-border">
                  {templateData.checklist.length === 0
                    ? <p className="text-sm text-muted-foreground py-4 text-center">No checklist items.</p>
                    : templateData.checklist.map((item) => (
                      <label key={item.id} className="flex items-center gap-3 py-3 cursor-pointer min-h-[52px]">
                        <Checkbox
                          checked={item.checked ?? false}
                          disabled={isCompleted}
                          onCheckedChange={(v) => {
                            const updated = taskTemplateDataService.toggleChecklist(task.id, item.id, !!v);
                            setTemplateData(updated);
                          }}
                          className="h-5 w-5 rounded shrink-0"
                        />
                        <span className={`text-sm flex-1 leading-snug ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                          {item.label}
                        </span>
                        {item.required && !item.checked && (
                          <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 px-1 py-0 shrink-0">req</Badge>
                        )}
                      </label>
                    ))
                  }
                </CardContent>
              </Section>
            )}

            {/* ══════════════════════════════════════════════ */}
            {/* 3. PHOTOS                                     */}
            {/* ══════════════════════════════════════════════ */}
            <Section id="photos" icon={Camera} title="Photos" defaultOpen={false}
              badge={photoCount > 0
                ? <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{photoCount}</Badge>
                : undefined}>
              <CardContent className="px-4 py-3 flex flex-col gap-4">
                {PHOTO_CATS.map(({ key, label }) => {
                  const saved = photos.filter((p) => p.category === key).map((p) => ({
                    id: p.id, dataUrl: p.dataUrl, fileName: p.fileName,
                    fileSizeKB: p.fileSizeKB, category: p.category,
                  }));
                  const local = localPhotos[key] ?? [];
                  const all = [...saved.filter((s) => !local.find((l) => l.id === s.id)), ...local];
                  return (
                    <PhotoUpload key={key} category={key} label={label} photos={all}
                      onAdd={(p) => addLocalPhoto(key, p)}
                      onRemove={(id) => removeLocalPhoto(key, id)}
                      disabled={isCompleted} />
                  );
                })}
              </CardContent>
            </Section>

            {/* ══════════════════════════════════════════════ */}
            {/* 4. MATERIALS                                  */}
            {/* ══════════════════════════════════════════════ */}
            <Section id="materials" icon={Package} title="Materials" defaultOpen={materials.length > 0}>
              <CardContent className="px-4 py-3 flex flex-col gap-3">
                {materials.length === 0
                  ? <p className="text-sm text-muted-foreground text-center py-2">No materials planned.</p>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[400px]">
                        <thead>
                          <tr className="border-b border-border">
                            {['Item', 'Planned', 'Used', 'Remaining', 'Unit'].map((h) => (
                              <th key={h} className="py-2 px-3 text-xs font-semibold text-muted-foreground text-left whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {materials.map((m) => {
                            const isExtra  = m.plannedQty === 0 && (m.extraQty ?? 0) > 0;
                            const used      = m.usedQty ?? 0;
                            const remaining = Math.max(0, m.plannedQty - used);
                            return (
                              <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                                <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                                  {m.itemName}
                                  {isExtra && (
                                    <Badge variant="outline" className="ml-1.5 text-[10px] text-amber-600 border-amber-400 px-1 py-0">extra</Badge>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center text-muted-foreground tabular-nums">
                                  {isExtra ? '—' : m.plannedQty}
                                </td>
                                <td className="py-2.5 px-3">
                                  <Input
                                    type="number" min={0} value={used}
                                    disabled={isCompleted}
                                    onChange={(e) => {
                                      const updated = taskTemplateDataService.updateMaterial(
                                        task.id, m.id, { usedQty: Number(e.target.value) }, ENGINEER_NAME,
                                      );
                                      setTemplateData(updated);
                                    }}
                                    className="w-16 h-8 text-center text-sm px-1"
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-center tabular-nums">
                                  {isExtra ? '—' : (
                                    <span className={remaining > 0 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                                      {remaining}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-muted-foreground text-xs">{m.unit}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                }

                {/* Add Extra Item */}
                {!isCompleted && !extraOpen && (
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 self-start h-9"
                    onClick={() => setExtraOpen(true)}>
                    <Plus size={13} /> Add Extra Item
                  </Button>
                )}
                {!isCompleted && extraOpen && (
                  <div className="border border-amber-300 dark:border-amber-700 rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 flex flex-col gap-2">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Extra Material Request</p>
                    <Input placeholder="Item name *" value={extraItem.name}
                      onChange={e => setExtraItem(p => ({ ...p, name: e.target.value }))} className="h-9 text-sm" />
                    <div className="flex gap-2">
                      <Input type="number" min={1} value={extraItem.qty}
                        onChange={e => setExtraItem(p => ({ ...p, qty: Number(e.target.value) }))} className="h-9 w-20 text-sm" />
                      <select value={extraItem.unit}
                        onChange={e => setExtraItem(p => ({ ...p, unit: e.target.value as MaterialUnit }))}
                        className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm">
                        {(['pcs','mtrs','rolls','sets','boxes','ltrs','kg','units'] as MaterialUnit[]).map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    <Input placeholder="Reason for extra material"
                      value={extraItem.reason}
                      onChange={e => setExtraItem(p => ({ ...p, reason: e.target.value }))} className="h-9 text-sm" />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 h-9" onClick={handleAddExtra}>Add Item</Button>
                      <Button size="sm" variant="outline" className="h-9" onClick={() => setExtraOpen(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Section>

            {/* ══════════════════════════════════════════════ */}
            {/* 5. WORK SUMMARY                               */}
            {/* ══════════════════════════════════════════════ */}
            <Section id="work-summary" icon={Wrench} title="Work Summary" defaultOpen>
              <CardContent className="px-4 py-3 flex flex-col gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    Work Performed <span className="text-destructive">*</span>
                  </Label>
                  <Textarea placeholder="Describe exactly what was done…"
                    value={workPerformed} onChange={e => setWorkPerformed(e.target.value)}
                    disabled={isCompleted} rows={4} className="resize-none text-sm" />
                </div>
                {([
                  { val: problemFound,    set: setProblemFound,    label: 'Problem Found',    ph: 'What was the problem?' },
                  { val: rootCause,       set: setRootCause,       label: 'Root Cause',       ph: 'Why did it happen?' },
                  { val: recommendations, set: setRecommendations, label: 'Recommendations',  ph: 'Future actions…' },
                  { val: customerRemarks, set: setCustomerRemarks, label: 'Customer Remarks', ph: 'Customer feedback…' },
                  { val: internalNotes,   set: setInternalNotes,   label: 'Internal Notes',   ph: 'Back office notes…' },
                ] as { val: string; set: (v: string) => void; label: string; ph: string }[]).map(({ val, set, label, ph }) => (
                  <div key={label}>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      {label} <span className="font-normal">(optional)</span>
                    </Label>
                    <Textarea placeholder={ph} value={val} onChange={e => set(e.target.value)}
                      disabled={isCompleted} rows={2} className="resize-none text-sm" />
                  </div>
                ))}
                {/* Resolution Status */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Resolution Status</Label>
                  <div className="flex flex-wrap gap-2">
                    {(['Resolved', 'Temporary Fix', 'Parts Required', 'Follow-up Required'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={isCompleted}
                        onClick={() => setResolutionStatus(s)}
                        className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                          resolutionStatus === s
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                        }`}
                      >{s}</button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Section>

            {/* ══════════════════════════════════════════════ */}
            {/* 6. CUSTOMER SIGNATURE                         */}
            {/* ══════════════════════════════════════════════ */}
            <Section id="signature" icon={PenLine} title="Customer Signature" defaultOpen
              badge={
                (signatureDataUrl || signature?.signatureDataUrl)
                  ? <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-500/15 text-green-700 dark:text-green-400 border border-green-400/30">Captured</Badge>
                  : undefined
              }>
              <CardContent className="px-4 py-3">
                {(signatureDataUrl || signature?.signatureDataUrl) ? (
                  <div className="flex flex-col items-start gap-3">
                    <div className="border border-border rounded-lg p-2 bg-white dark:bg-muted/20 inline-block">
                      <img src={signatureDataUrl || signature!.signatureDataUrl}
                        alt="Customer signature" className="max-h-28 max-w-full object-contain" />
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-green-600" />
                      <span className="text-sm text-green-700 dark:text-green-400 font-medium">Signature captured</span>
                    </div>
                    {!isCompleted && (
                      <Button variant="outline" size="sm" className="h-8" onClick={() => setSignatureDataUrl('')}>
                        Re-capture Signature
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground">Ask the customer to sign in the box below.</p>
                    <SignatureCanvas onSave={handleSignatureSave} />
                  </div>
                )}
              </CardContent>
            </Section>

            {/* ══════════════════════════════════════════════ */}
            {/* 7. SHARE (visible after completion)           */}
            {/* ══════════════════════════════════════════════ */}
            {isCompleted && (
              <Section id="share" icon={Share2} title="Download & Share Report" defaultOpen>
                <CardContent className="px-4 py-3 flex flex-wrap gap-2">
                  <Button variant="outline" className="gap-2 h-10" onClick={handleShareWhatsApp}>
                    <MessageCircle size={15} className="text-green-600" /> WhatsApp
                  </Button>
                  <Button variant="outline" className="gap-2 h-10" onClick={() => setPrintOpen(true)}>
                    <Printer size={15} /> Print / PDF
                  </Button>
                </CardContent>
              </Section>
            )}

          </div>
        </div>

        {/* ══════════════════════════════════════════════════ */}
        {/* BOTTOM ACTION BAR — always visible                */}
        {/* ══════════════════════════════════════════════════ */}
        <div className="sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-3 md:px-6 py-3 flex items-center gap-2">
            {!isCompleted ? (
              <>
                <Button variant="outline" className="gap-1.5 h-11 flex-1 min-w-0" onClick={handleSaveDraft}>
                  <Save size={15} className="shrink-0" />
                  <span className="truncate">Save Draft</span>
                </Button>
                <Button className="gap-1.5 h-11 flex-[1.4] min-w-0 font-semibold" onClick={handleCompleteTask}>
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span className="truncate">Complete Task</span>
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="gap-1.5 h-11 flex-1" onClick={handleShareWhatsApp}>
                  <MessageCircle size={15} className="text-green-600 shrink-0" />
                  <span className="truncate">WhatsApp</span>
                </Button>
                <Button variant="outline" className="gap-1.5 h-11 flex-1" onClick={() => setPrintOpen(true)}>
                  <Printer size={15} className="shrink-0" />
                  <span className="truncate">Print</span>
                </Button>
                <Button className="gap-1.5 h-11 flex-1 font-semibold" onClick={() => setPrintOpen(true)}>
                  <Download size={15} className="shrink-0" />
                  <span className="truncate">PDF</span>
                </Button>
              </>
            )}
          </div>
        </div>

      </div>

      {/* ── Reason Dialog ─────────────────────────────────── */}
      <Dialog open={reasonDialog.open} onOpenChange={(o) => setReasonDialog({ open: o, action: null })}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{reasonDialog.action ? ACTION_CONFIG[reasonDialog.action].label : ''}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Label className="text-sm">Reason *</Label>
            <Textarea rows={3} placeholder="Enter reason…" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setReasonDialog({ open: false, action: null })}>Cancel</Button>
            <Button onClick={() => {
              if (!reason.trim()) { toast.error('Reason is required'); return; }
              if (reasonDialog.action) applyAction(reasonDialog.action, reason);
            }}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WorkOrderPrint — iframe-isolated PDF engine */}
      {printOpen && task && (
        <WorkOrderPrint
          task={task}
          customer={customer}
          asset={asset}
          templateData={templateData}
          completion={engineerService.getWorkCompletion(task.id)}
          signature={engineerService.getSignature(task.id)}
          photos={photos}
          company={company}
          onClose={() => setPrintOpen(false)}
        />
      )}
    </DashboardLayout>
  );
}
