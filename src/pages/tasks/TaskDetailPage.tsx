/**
 * Task Detail Page
 * Sectore 360 — Phase 1, Part 7 (Template Engine Enhancement)
 * New tabs: Checklist · Materials · WhatsApp · Work Order
 * Tabs: Overview | Customer | Asset | Timeline | Checklist | Materials | Photos | Documents | Notes | WhatsApp | Activity Log
 */
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageLoader } from '@/components/shared/Spinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { TaskStatusBadge, TaskPriorityBadge, TaskTypeBadge } from '@/components/task/TaskBadges';
import { WorkOrderPrint } from '@/components/task/WorkOrderPrint';
import { ServiceActivityTab } from '@/components/task/ServiceActivityTab';
import { taskService } from '@/services/taskService';
import { customerService } from '@/services/customerService';
import { assetService } from '@/services/assetService';
import { engineerService } from '@/services/engineerService';
import { templateService, taskTemplateDataService } from '@/services/templateService';
import { companyProfileService } from '@/services/companyProfileService';
import type { CompanyProfile } from '@/services/companyProfileService';
import type { EngineerProfile } from '@/types/engineer';
import { usersApi } from '@/lib/api';
import { generateWAMessages, openWhatsApp } from '@/lib/whatsapp';
import type {
  Task, TaskTimelineEvent, TaskNote, TaskPhoto,
  TaskDocument, TaskActivity, TaskStatus, NoteType, PhotoCategory,
} from '@/types/task';
import { TASK_STATUSES, ENGINEER_ALLOWED_STATUSES } from '@/types/task';
import type { Customer, Asset } from '@/types/customer';
import type { TaskTemplateData, PlannedMaterial, MaterialUnit } from '@/types/template';
import { toast } from 'sonner';
import {
  Pencil, Trash2, ClipboardList, Building2, Server,
  Clock, Image, FileText, MessageSquare, Activity,
  Phone, Mail, MapPin, ExternalLink, Download, Plus,
  Shield, AlertTriangle, CheckCircle2, RefreshCw,
  UserCheck, Calendar, Info, Eye,
  CheckSquare, Package, MessageCircle, Printer, Share2, Trophy,
} from 'lucide-react';



function InfoRow({ label, value, className }: { label: string; value?: React.ReactNode; className?: string }) {
  if (!value) return null;
  return (
    <div className={`flex flex-col gap-0.5 ${className ?? ''}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground font-medium">{value}</span>
    </div>
  );
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

/** Convert DB TaskPhoto[] → EngineerTaskPhoto[] for WorkOrderPrint / ServiceActivityTab */
const TASK_TO_ENG_CATEGORY: Record<string, import('@/types/engineer').EngineerTaskPhoto['category']> = {
  Before: 'before', During: 'work_in_progress', After: 'after',
};
function toEngineerPhotos(dbPhotos: import('@/types/task').TaskPhoto[], taskId: string): import('@/types/engineer').EngineerTaskPhoto[] {
  return dbPhotos.map((p) => ({
    id:          p.id,
    taskId,
    engineerId:  p.uploadedById ?? '',
    category:    TASK_TO_ENG_CATEGORY[p.category] ?? 'before',
    dataUrl:     p.url,
    fileName:    p.fileName,
    fileSizeKB:  Math.round(p.fileSize / 1024),
    capturedAt:  p.uploadedAt,
    uploadedAt:  p.uploadedAt,
    synced:      true,
  }));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

/* ── Warranty helper ─────────────────────────────────────────── */
function warrantyStatus(end?: string) {
  if (!end) return null;
  const exp = new Date(end) < new Date();
  return (
    <Badge variant="outline" className={exp
      ? 'text-destructive border-destructive/30 bg-destructive/10 text-xs'
      : 'text-success border-success/30 bg-success/10 text-xs'}>
      {exp ? 'Expired' : 'Active'}
    </Badge>
  );
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { user } = useAuth();
  const byName = user?.name ?? 'System';
  const byId   = user?.id   ?? '';

  const [task, setTask]       = useState<Task | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [asset, setAsset]     = useState<Asset | null>(null);
  const [timeline, setTimeline] = useState<TaskTimelineEvent[]>([]);
  const [notes, setNotes]     = useState<TaskNote[]>([]);
  const [photos, setPhotos]   = useState<TaskPhoto[]>([]);
  const [docs, setDocs]       = useState<TaskDocument[]>([]);
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [engineers, setEngineers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    usersApi.getEngineers()
      .then((list) => setEngineers(list.map((u) => ({ id: u.id, name: u.name }))))
      .catch(() => {});
  }, []);

  // Template Engine state
  const [templateData, setTemplateData] = useState<TaskTemplateData | null>(null);
  const [addMatOpen, setAddMatOpen]     = useState(false);
  const [newMatName, setNewMatName]     = useState('');
  const [newMatQty,  setNewMatQty]      = useState(1);
  const [newMatUnit, setNewMatUnit]     = useState<MaterialUnit>('pcs');
  const [printOpen,  setPrintOpen]      = useState(false);
  const [engineerProfile, setEngineerProfile] = useState<EngineerProfile | null>(null);
  const [company, setCompany]           = useState<CompanyProfile>(companyProfileService.get());

  // Dialogs
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [statusOpen, setStatusOpen]     = useState(false);
  const [assignOpen, setAssignOpen]     = useState(false);
  const [noteOpen, setNoteOpen]         = useState(false);
  const [photoOpen, setPhotoOpen]       = useState(false);
  const [docOpen, setDocOpen]           = useState(false);
  const [noteDeleteId, setNoteDeleteId] = useState<string | null>(null);
  const [photoDeleteId, setPhotoDeleteId] = useState<string | null>(null);
  const [docDeleteId, setDocDeleteId]   = useState<string | null>(null);

  // Form state
  const [newStatus, setNewStatus]     = useState<TaskStatus | ''>('');
  const [newEngineer, setNewEngineer] = useState('');
  const [noteType, setNoteType]       = useState<NoteType>('Internal');
  const [noteContent, setNoteContent] = useState('');
  const [photoCategory, setPhotoCategory] = useState<PhotoCategory>('Before');
  const [saving, setSaving]           = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef   = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const t = await taskService.getById(id);
    if (!t) { setLoading(false); return; }
    setTask(t);
    const [cust, ast, tl, n, ph, dc, act] = await Promise.all([
      customerService.getById(t.customerId),
      assetService.getById(t.assetId),
      taskService.getTimeline(id),
      taskService.getNotes(id),
      taskService.getPhotos(id),
      taskService.getDocuments(id),
      taskService.getActivity(id),
    ]);
    setCustomer(cust); setAsset(ast); setTimeline(tl);
    setNotes(n); setPhotos(ph); setDocs(dc); setActivity(act);
    // Load engineer profile
    if (t.engineerId) {
      engineerService.getProfile(t.engineerId).then(setEngineerProfile).catch(() => {});
    }
    // Load company profile
    companyProfileService.fetch().then(setCompany).catch(() => {});
    // Load or initialise template data — match on BOTH service type AND asset category
    const assetCat = ast?.category ?? '';
    const tmpl = templateService.findByServiceTypeAndCategory(t.taskType, assetCat);
    if (tmpl) {
      const td = taskTemplateDataService.getOrInit(t.id, tmpl.id);
      setTemplateData(td);
    } else {
      setTemplateData(taskTemplateDataService.get(t.id));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line

  if (loading) return <DashboardLayout><PageLoader /></DashboardLayout>;
  if (!task) return (
    <DashboardLayout>
      <EmptyState icon={ClipboardList} title="Task not found" description="The task you are looking for does not exist." />
    </DashboardLayout>
  );

  /* ── Actions ──────────────────────────────────────────────── */
  const handleDelete = async () => {
    await taskService.softDelete(task.id, byName);
    toast.success(`Task ${task.taskNumber} cancelled.`);
    navigate('/tasks');
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setSaving(true);
    try {
      await taskService.updateStatus(task.id, newStatus, byName);
      toast.success('Status updated.');
      setStatusOpen(false); setNewStatus('');
      load();
    } finally { setSaving(false); }
  };

  const handleAssign = async () => {
    if (!newEngineer) return;
    setSaving(true);
    try {
      const eng = engineers.find((e) => e.id === newEngineer);
      if (!eng) return;
      await taskService.assignEngineer(task.id, eng.id, eng.name, byName);
      toast.success(`Assigned to ${eng.name}.`);
      setAssignOpen(false); setNewEngineer('');
      load();
    } finally { setSaving(false); }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setSaving(true);
    try {
      await taskService.addNote(task.id, noteType, noteContent.trim(), byName, byId);
      toast.success('Note added.');
      setNoteOpen(false); setNoteContent('');
      load();
    } finally { setSaving(false); }
  };

  const handleDeleteNote = async () => {
    if (!noteDeleteId) return;
    await taskService.deleteNote(noteDeleteId, byName, byId);
    toast.success('Note deleted.'); setNoteDeleteId(null); load();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File size exceeds 10 MB limit.'); return; }
    if (!['image/jpeg', 'image/png'].includes(file.type)) { toast.error('Only JPG and PNG files allowed.'); return; }
    const url = URL.createObjectURL(file);
    await taskService.addPhoto(task.id, photoCategory, file.name, file.size, url, byName, byId);
    toast.success('Photo uploaded.'); setPhotoOpen(false); load();
    e.target.value = '';
  };

  const handleDeletePhoto = async () => {
    if (!photoDeleteId) return;
    await taskService.deletePhoto(photoDeleteId, byName, byId);
    toast.success('Photo deleted.'); setPhotoDeleteId(null); load();
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File size exceeds 10 MB limit.'); return; }
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) { toast.error('Only PDF and DOCX files allowed.'); return; }
    const url = URL.createObjectURL(file);
    await taskService.addDocument(task.id, file.name, file.type, file.size, url, byName, byId);
    toast.success('Document uploaded.'); setDocOpen(false); load();
    e.target.value = '';
  };

  const handleDeleteDoc = async () => {
    if (!docDeleteId) return;
    await taskService.deleteDocument(docDeleteId, byName, byId);
    toast.success('Document deleted.'); setDocDeleteId(null); load();
  };

  const photosByCategory = (cat: PhotoCategory) => photos.filter((p) => p.category === cat);

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = task.expectedVisitDate && task.expectedVisitDate < today &&
    !['Completed', 'Closed', 'Cancelled'].includes(task.status);

  return (
    <DashboardLayout>
      <PageHeader
        title={task.taskNumber}
        description="Service task details and management."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Tasks', href: '/tasks' },
          { label: task.taskNumber },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/tasks/${task.id}/edit`)} className="gap-1.5">
              <Pencil size={14} /> Edit
            </Button>
            <Button variant="outline" size="sm"
              className="gap-1.5 text-destructive hover:text-destructive border-destructive/30"
              onClick={() => setDeleteOpen(true)}>
              <Trash2 size={14} /> Cancel
            </Button>
          </div>
        }
      />

      {/* ── Hero Header ───────────────────────────────────────── */}
      <Card className="mb-4">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-start">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-sm font-semibold text-primary">{task.taskNumber}</span>
                <TaskPriorityBadge priority={task.priority} />
                <TaskStatusBadge status={task.status} />
                <TaskTypeBadge type={task.taskType} />
                {isOverdue && (
                  <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 text-xs gap-1">
                    <AlertTriangle size={10} /> Overdue
                  </Badge>
                )}
              </div>
              <p className="text-sm text-foreground line-clamp-2">{task.issueDescription}</p>
            </div>
            <div className="flex flex-col gap-1 text-sm shrink-0">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Building2 size={13} />
                <span className="font-medium text-foreground">{customer?.companyName ?? task.customerId}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <UserCheck size={13} />
                <span>{task.engineerName ?? 'Unassigned'}</span>
              </div>
              {task.expectedVisitDate && (
                <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                  <Calendar size={13} />
                  <span>{task.expectedVisitDate}{task.expectedVisitTime ? ` at ${task.expectedVisitTime}` : ''}</span>
                </div>
              )}
            </div>
          </div>
          <Separator className="my-3" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
              onClick={() => setStatusOpen(true)}>
              <RefreshCw size={12} /> Update Status
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
              onClick={() => setAssignOpen(true)}>
              <UserCheck size={12} /> {task.engineerName ? 'Reassign Engineer' : 'Assign Engineer'}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
              onClick={() => setPrintOpen(true)}>
              <Printer size={12} /> Work Order
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="mb-4 whitespace-nowrap inline-flex">
            <TabsTrigger value="overview" className="gap-1.5"><Info size={13} />Overview</TabsTrigger>
            <TabsTrigger value="customer" className="gap-1.5"><Building2 size={13} />Customer</TabsTrigger>
            <TabsTrigger value="asset" className="gap-1.5"><Server size={13} />Asset</TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5"><Clock size={13} />Timeline</TabsTrigger>
            {templateData && <TabsTrigger value="checklist" className="gap-1.5"><CheckSquare size={13} />Checklist <Badge variant="secondary" className="text-xs px-1 py-0 h-4 ml-0.5">{templateData.checklist.filter(c=>c.checked).length}/{templateData.checklist.length}</Badge></TabsTrigger>}
            {templateData?.materials && templateData.materials.length > 0 && <TabsTrigger value="materials" className="gap-1.5"><Package size={13} />Materials</TabsTrigger>}
            <TabsTrigger value="photos" className="gap-1.5"><Image size={13} />Photos <Badge variant="secondary" className="text-xs px-1 py-0 h-4 ml-0.5">{photos.length}</Badge></TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5"><FileText size={13} />Documents <Badge variant="secondary" className="text-xs px-1 py-0 h-4 ml-0.5">{docs.length}</Badge></TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5"><MessageSquare size={13} />Notes <Badge variant="secondary" className="text-xs px-1 py-0 h-4 ml-0.5">{notes.length}</Badge></TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-1.5"><MessageCircle size={13} />WhatsApp</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5"><Activity size={13} />Activity</TabsTrigger>
            {(task.status === 'Completed' || task.status === 'Closed') && (
              <TabsTrigger value="completed" className="gap-1.5 text-green-700 dark:text-green-400">
                <Trophy size={13} />Completed
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* ── Overview ──────────────────────────────────────── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Task Information</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <InfoRow label="Task Number" value={<span className="font-mono text-primary">{task.taskNumber}</span>} />
                <InfoRow label="Task Type" value={<TaskTypeBadge type={task.taskType} />} />
                <InfoRow label="Priority" value={<TaskPriorityBadge priority={task.priority} />} />
                <InfoRow label="Status" value={<TaskStatusBadge status={task.status} />} />
                <InfoRow label="Engineer" value={task.engineerName ?? '—'} />
                <InfoRow label="Visit Date" value={task.expectedVisitDate ?? '—'} />
                <InfoRow label="Visit Time" value={task.expectedVisitTime ?? '—'} />
                <InfoRow label="Created By" value={task.createdBy} />
                <InfoRow label="Created" value={formatDate(task.createdAt)} />
                <InfoRow label="Last Updated" value={formatDate(task.updatedAt)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Issue Description</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap">{task.issueDescription}</p>
                {task.remarks && (
                  <>
                    <Separator className="my-3" />
                    <p className="text-xs text-muted-foreground mb-1">Remarks</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{task.remarks}</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* ── Service Visit Timings ─────────────────────── */}
            {(task.serviceStartTime || task.serviceEndTime) && (
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock size={13} className="text-primary" /> Service Visit Timings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 divide-x divide-border border border-border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 flex flex-col gap-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Reached Site</p>
                      <p className="text-base font-bold">
                        {task.serviceStartTime
                          ? new Date(task.serviceStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </p>
                    </div>
                    <div className="px-4 py-3 flex flex-col gap-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Task Completed</p>
                      <p className="text-base font-bold">
                        {task.serviceEndTime
                          ? new Date(task.serviceEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </p>
                    </div>
                    <div className="px-4 py-3 flex flex-col gap-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Time on Site</p>
                      <p className="text-base font-bold text-primary">
                        {task.siteTimeMinutes != null
                          ? task.siteTimeMinutes >= 60
                            ? `${Math.floor(task.siteTimeMinutes / 60)}h ${task.siteTimeMinutes % 60}m`
                            : `${task.siteTimeMinutes} min`
                          : '—'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Engineer Findings (from WorkCompletion) ────── */}
            {(() => {
              const wc = engineerService.getWorkCompletion(task.id);
              if (!wc) return null;
              const rows = [
                { label: 'Fault Found',     value: wc.problemFound },
                { label: 'Root Cause',      value: wc.rootCause },
                { label: 'Work Performed',  value: wc.workPerformed },
                { label: 'Resolution',      value: wc.resolution !== wc.workPerformed ? wc.resolution : undefined },
                { label: 'Recommendations', value: wc.recommendations },
                { label: 'Customer Remarks',value: wc.customerRemarks },
              ].filter((r) => !!r.value);
              if (!rows.length) return null;
              return (
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Engineer Findings</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {rows.map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })()}

            {/* ── Customer remarks ─────────────────────────── */}
            {task.customerRemarks && (
              <Card className="md:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Customer Remarks</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{task.customerRemarks}</p>
                </CardContent>
              </Card>
            )}

            {task.customerNotes && (
              <Card className="md:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Eye size={13} />Customer Notes</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{task.customerNotes}</p>
                </CardContent>
              </Card>
            )}


          </div>
        </TabsContent>

        {/* ── Customer ──────────────────────────────────────── */}
        <TabsContent value="customer">
          {!customer ? <EmptyState icon={Building2} title="Customer not found" /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Company Information</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <InfoRow label="Company" value={
                    <button className="text-primary hover:underline text-sm font-medium text-left"
                      onClick={() => navigate(`/customers/${customer.id}`)}>
                      {customer.companyName}
                    </button>
                  } />
                  <InfoRow label="Customer Code" value={<span className="font-mono text-xs">{customer.code}</span>} />
                  <InfoRow label="Type" value={customer.customerType} />
                  <InfoRow label="Status" value={customer.status} />
                  <InfoRow label="GST Number" value={customer.gstNumber} />
                  <InfoRow label="Website" value={customer.website ?
                    <a href={customer.website} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
                      {customer.website} <ExternalLink size={10} />
                    </a> : undefined} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Contact &amp; Address</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <InfoRow label="Contact Person" value={customer.contactPerson} />
                  <InfoRow label="Designation" value={customer.designation} />
                  <div className="flex flex-col gap-1.5">
                    <a href={`tel:${customer.primaryMobile}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Phone size={13} /> {customer.primaryMobile}
                    </a>
                    {customer.secondaryMobile && (
                      <a href={`tel:${customer.secondaryMobile}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary hover:underline">
                        <Phone size={13} /> {customer.secondaryMobile}
                      </a>
                    )}
                    <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Mail size={13} /> {customer.email}
                    </a>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin size={13} className="mt-0.5 shrink-0" />
                    <span>{[customer.address, customer.city, customer.state, customer.pincode, customer.country].filter(Boolean).join(', ')}</span>
                  </div>
                  {(customer.googleMapLink || customer.address) && (
                    <a
                      href={customer.googleMapLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([customer.address, customer.city, customer.state, customer.country].filter(Boolean).join(', '))}`}
                      target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full mt-1 rounded-md bg-primary text-primary-foreground font-semibold text-sm py-3 hover:bg-primary/90 transition-colors">
                      <MapPin size={16} /> Open in Google Maps
                    </a>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ── Asset ─────────────────────────────────────────── */}
        <TabsContent value="asset">
          {!asset ? <EmptyState icon={Server} title="Asset not found" /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Asset Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <InfoRow label="Asset Code" value={
                    <button className="text-primary hover:underline text-sm font-medium font-mono text-left"
                      onClick={() => navigate(`/assets/${asset.id}`)}>
                      {asset.code}
                    </button>
                  } />
                  <InfoRow label="Category" value={asset.category} />
                  <InfoRow label="Device Type" value={asset.deviceType} />
                  <InfoRow label="Brand" value={asset.brand} />
                  <InfoRow label="Model" value={asset.model} />
                  <InfoRow label="Serial Number" value={<span className="font-mono text-xs">{asset.serialNumber}</span>} />
                  <InfoRow label="Service Tag" value={asset.serviceTag} />
                  <InfoRow label="Status" value={asset.status} />
                  <InfoRow label="Location" value={asset.location} />
                  <InfoRow label="Floor" value={asset.floor} />
                  <InfoRow label="Department" value={asset.department} />
                  <InfoRow label="IP Address" value={asset.ipAddress ? <span className="font-mono text-xs">{asset.ipAddress}</span> : undefined} />
                  <InfoRow label="MAC Address" value={asset.macAddress ? <span className="font-mono text-xs">{asset.macAddress}</span> : undefined} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Warranty Information</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <InfoRow label="Purchase Date" value={asset.purchaseDate} />
                  <InfoRow label="Installation Date" value={asset.installationDate} />
                  <InfoRow label="Warranty Start" value={asset.warrantyStart} />
                  <InfoRow label="Warranty End" value={asset.warrantyEnd} />
                  <InfoRow label="Warranty Status" value={warrantyStatus(asset.warrantyEnd)} />
                  <InfoRow label="Vendor" value={asset.vendor} />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ── Timeline ──────────────────────────────────────── */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Task Timeline</CardTitle></CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No activity yet.</p>
              ) : (
                <div className="flex flex-col gap-0">
                  {timeline.map((event, i) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        {i < timeline.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div className="pb-4 flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{event.title}</p>
                        {(event.oldValue || event.newValue) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {event.oldValue && <span className="line-through mr-1">{event.oldValue}</span>}
                            {event.newValue && <span className="text-primary font-medium">{event.newValue}</span>}
                          </p>
                        )}
                        {event.description && <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.performedBy} · {formatDate(event.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Photos ────────────────────────────────────────── */}
        <TabsContent value="photos">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Photos</CardTitle>
              <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setPhotoOpen(true)}>
                <Plus size={12} /> Upload Photo
              </Button>
            </CardHeader>
            <CardContent>
              {photos.length === 0 ? (
                <EmptyState icon={Image} title="No photos uploaded" description="Upload before, during, and after photos for this task." />
              ) : (
                (['Before', 'During', 'After'] as PhotoCategory[]).map((cat) => {
                  const catPhotos = photosByCategory(cat);
                  if (!catPhotos.length) return null;
                  return (
                    <div key={cat} className="mb-6">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{cat}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {catPhotos.map((photo) => (
                          <div key={photo.id} className="group relative rounded-lg overflow-hidden border border-border bg-muted aspect-[4/3]">
                            <img src={photo.url} alt={photo.fileName} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <a href={photo.url} download={photo.fileName}>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/20">
                                  <Download size={14} />
                                </Button>
                              </a>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/20"
                                onClick={() => setPhotoDeleteId(photo.id)}>
                                <Trash2 size={14} />
                              </Button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                              <p className="text-white text-xs truncate">{photo.fileName}</p>
                              <p className="text-white/60 text-xs">{formatBytes(photo.fileSize)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Documents ─────────────────────────────────────── */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Documents</CardTitle>
              <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setDocOpen(true)}>
                <Plus size={12} /> Upload Document
              </Button>
            </CardHeader>
            <CardContent>
              {docs.length === 0 ? (
                <EmptyState icon={FileText} title="No documents uploaded" description="Upload PDFs or DOCX files related to this task." />
              ) : (
                <div className="flex flex-col gap-2">
                  {docs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/40 transition-colors">
                      <FileText size={18} className="text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(doc.fileSize)} · Uploaded by {doc.uploadedBy} · {formatDate(doc.uploadedAt)}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <a href={doc.url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                            <Eye size={13} />
                          </Button>
                        </a>
                        <a href={doc.url} download={doc.fileName}>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                            <Download size={13} />
                          </Button>
                        </a>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setDocDeleteId(doc.id)}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notes ─────────────────────────────────────────── */}
        <TabsContent value="notes">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Notes</CardTitle>
              <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setNoteOpen(true)}>
                <Plus size={12} /> Add Note
              </Button>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <EmptyState icon={MessageSquare} title="No notes added" description="Add internal, customer, or engineer notes for this task." />
              ) : (
                <div className="flex flex-col gap-3">
                  {notes.map((note) => {
                    const badge = {
                      Internal: 'bg-muted text-muted-foreground border-border',
                      Customer: 'bg-primary/10 text-primary border-primary/20',
                      Engineer: 'bg-success/10 text-success border-success/20',
                    }[note.noteType];
                    return (
                      <div key={note.id} className="border border-border rounded-lg p-3 flex gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Badge variant="outline" className={`text-xs ${badge}`}>{note.noteType}</Badge>
                            <span className="text-xs text-muted-foreground">{note.addedBy} · {formatDate(note.createdAt)}</span>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => setNoteDeleteId(note.id)}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Checklist ──────────────────────────────────── */}
        {templateData && (
          <TabsContent value="checklist">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-semibold">Service Checklist</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {templateData.checklist.filter(c => c.checked).length} of {templateData.checklist.length} items completed
                    </p>
                  </div>
                  <CheckCircle2 size={18} className={templateData.checklist.every(c => c.checked) ? 'text-green-500' : 'text-muted-foreground'} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {templateData.checklist.length === 0 ? (
                  <EmptyState icon={CheckSquare} title="No checklist items" description="Template has no checklist defined." />
                ) : (
                  templateData.checklist.map((item) => (
                    <label key={item.id} className="flex items-start gap-3 cursor-pointer py-1.5 border-b border-border last:border-0">
                      <Checkbox
                        checked={item.checked ?? false}
                        onCheckedChange={(checked) => {
                          const updated = taskTemplateDataService.toggleChecklist(task.id, item.id, !!checked);
                          setTemplateData(updated);
                        }}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm ${item.checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {item.label}
                        </span>
                        {item.required && !item.checked && (
                          <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 ml-2">Required</Badge>
                        )}
                      </div>
                    </label>
                  ))
                )}
                <Separator className="my-1" />
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Work Done Summary</p>
                    <Textarea
                      placeholder="Describe the work completed…"
                      value={templateData.workDoneSummary ?? ''}
                      onChange={(e) => {
                        const updated = { ...templateData, workDoneSummary: e.target.value };
                        setTemplateData(taskTemplateDataService.save(updated));
                      }}
                      rows={3}
                      className="resize-none text-sm"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Recommendations</p>
                    <Textarea
                      placeholder="Any recommendations for the customer…"
                      value={templateData.recommendations ?? ''}
                      onChange={(e) => {
                        const updated = { ...templateData, recommendations: e.target.value };
                        setTemplateData(taskTemplateDataService.save(updated));
                      }}
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── Materials ──────────────────────────────────── */}
        {templateData && templateData.materials.length > 0 && (
          <TabsContent value="materials">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Materials</CardTitle>
                <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setAddMatOpen(true)}>
                  <Plus size={12} /> Add Item
                </Button>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        {['Item', 'Planned', 'Used', 'Extra', 'Returned', 'Unit'].map(h => (
                          <th key={h} className="py-2 px-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {templateData.materials.map((m) => (
                        <tr key={m.id} className="border-b border-border hover:bg-muted/30">
                          <td className="py-2 px-3 font-medium whitespace-nowrap">{m.itemName}</td>
                          <td className="py-2 px-3 whitespace-nowrap text-center">{m.plannedQty}</td>
                          <td className="py-2 px-3 whitespace-nowrap text-center">
                            <Input
                              type="number" min={0} value={m.usedQty ?? 0}
                              onChange={(e) => {
                                const updated = taskTemplateDataService.updateMaterial(task.id, m.id, { usedQty: Number(e.target.value) }, 'Engineer');
                                setTemplateData(updated);
                              }}
                              className="w-16 h-7 text-center text-xs px-1"
                            />
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-center text-muted-foreground">{m.extraQty ?? 0}</td>
                          <td className="py-2 px-3 whitespace-nowrap text-center text-muted-foreground">{m.returnedQty ?? 0}</td>
                          <td className="py-2 px-3 whitespace-nowrap text-muted-foreground text-xs">{m.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── WhatsApp ──────────────────────────────────── */}
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageCircle size={15} className="text-green-500" /> WhatsApp Quick Messages
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click any button to open WhatsApp with a pre-filled message. You just press Send.
              </p>
            </CardHeader>
            <CardContent>
              {(() => {
                const mobile = customer?.primaryMobile ?? '';
                if (!mobile) return (
                  <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                    <Phone size={24} />
                    <p className="text-sm">No mobile number found for this customer.</p>
                  </div>
                );
                const msgs = generateWAMessages({
                  taskNumber: task.taskNumber,
                  customerName: customer?.contactPerson ?? customer?.companyName ?? 'Customer',
                  contactMobile: mobile,
                  engineerName: task.engineerName,
                  visitDate: task.expectedVisitDate,
                  visitTime: task.expectedVisitTime,
                  serviceType: task.taskType,
                  issueTitle: task.issueDescription?.slice(0, 60),
                  companyName: 'Sectore 360',
                });
                return (
                  <div className="flex flex-col gap-3">
                    {msgs.map((msg) => (
                      <div key={msg.type} className="border border-border rounded-lg p-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">{msg.label}</p>
                          <Button
                            size="sm"
                            className="gap-1.5 h-8 text-xs shrink-0"
                            style={{ background: '#16a34a', color: '#fff' }}
                            onClick={() => openWhatsApp(msg.url)}
                          >
                            <MessageCircle size={12} /> Send via WhatsApp
                          </Button>
                        </div>
                        <pre className="text-xs text-muted-foreground bg-muted/40 rounded p-2 whitespace-pre-wrap font-sans leading-relaxed">
                          {msg.message}
                        </pre>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Activity / Service History ─────────────────────── */}
        <TabsContent value="activity">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity size={14} /> Service Activity Timeline
                </CardTitle>
                {(task.status === 'Completed' || task.status === 'Closed') && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => setPrintOpen(true)}>
                      <Printer size={12} /> Print / PDF
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => {
                      const msg = encodeURIComponent(`Service Report for ${task.taskNumber} — ${customer?.companyName ?? ''}\nStatus: ${task.status}\nEngineer: ${task.engineerName ?? ''}`);
                      window.open(`https://wa.me/?text=${msg}`, '_blank');
                    }}>
                      <Share2 size={12} /> Share
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ServiceActivityTab
                task={task}
                customer={customer}
                asset={asset}
                completion={engineerService.getWorkCompletion(task.id)}
                signature={engineerService.getSignature(task.id)}
                photos={toEngineerPhotos(photos, task.id)}
                templateData={templateData}
                engineerProfile={engineerProfile}
                role="admin"
                onTaskUpdated={load}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Completed Summary Tab ───────────────────────────── */}
        {(task.status === 'Completed' || task.status === 'Closed') && (() => {
          const wc = engineerService.getWorkCompletion(task.id);
          const sig = engineerService.getSignature(task.id);
          const taskPhotos = toEngineerPhotos(photos, task.id);
          const beforePh = taskPhotos.filter((p) => p.category === 'before');
          const afterPh  = taskPhotos.filter((p) => p.category === 'after');
          const mats = (templateData?.materials ?? []).filter((m) => (m.usedQty ?? 0) > 0);
          const checkedItems = templateData?.checklist.filter((c) => c.checked) ?? [];
          const fmtTime = (iso?: string) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
          const fmtDT   = (iso?: string) => iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
          const durationFmt = task.siteTimeMinutes != null
            ? task.siteTimeMinutes >= 60
              ? `${Math.floor(task.siteTimeMinutes / 60)}h ${task.siteTimeMinutes % 60}m`
              : `${task.siteTimeMinutes} min`
            : null;
          const resColor: Record<string, string> = {
            'Resolved':           'bg-green-500/15 text-green-700 border-green-400/40',
            'Temporary Fix':      'bg-amber-500/15 text-amber-700 border-amber-400/40',
            'Parts Required':     'bg-orange-500/15 text-orange-700 border-orange-400/40',
            'Follow-up Required': 'bg-red-500/15 text-red-700 border-red-400/40',
          };
          return (
            <TabsContent value="completed">
              <div className="flex flex-col gap-4">

                {/* ── Header card: timings + actions ─────── */}
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardContent className="px-4 py-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                        <Trophy size={18} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-green-700 dark:text-green-400">Task Completed</p>
                        <p className="text-xs text-muted-foreground">{fmtDT(task.serviceEndTime ?? task.completedAt)}</p>
                      </div>
                      {wc?.resolutionStatus && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${resColor[wc.resolutionStatus] ?? ''}`}>
                          {wc.resolutionStatus}
                        </span>
                      )}
                    </div>

                    {/* Timings grid */}
                    <div className="grid grid-cols-3 divide-x divide-green-500/20 border border-green-500/20 rounded-lg overflow-hidden">
                      {[
                        { label: 'Reached Site', val: fmtTime(task.serviceStartTime) },
                        { label: 'Completed',    val: fmtTime(task.serviceEndTime)   },
                        { label: 'Duration',     val: durationFmt ?? '—'            },
                      ].map(({ label, val }) => (
                        <div key={label} className="px-3 py-2.5 flex flex-col gap-0.5">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                          <p className="text-sm font-bold text-green-700 dark:text-green-400">{val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => setPrintOpen(true)}>
                        <Printer size={12} /> Print / PDF
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => {
                        const msg = encodeURIComponent(`Service Report — ${task.taskNumber}\nCustomer: ${customer?.companyName ?? ''}\nEngineer: ${task.engineerName ?? ''}\nStatus: Completed`);
                        window.open(`https://wa.me/?text=${msg}`, '_blank');
                      }}>
                        <Share2 size={12} /> WhatsApp
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* ── Service details: engineer + visit ──── */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Service Details</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2">
                    {([
                      ['Engineer',      task.engineerName ?? engineerProfile?.name ?? '—'],
                      ['Task Type',     task.taskType],
                      ['Priority',      task.priority],
                      ['Visit Date',    task.expectedVisitDate ?? '—'],
                      ['Reached Site',  task.serviceStartTime ? fmtTime(task.serviceStartTime) : '—'],
                      ['Completed At',  task.serviceEndTime   ? fmtTime(task.serviceEndTime)   : '—'],
                      ['Duration',      durationFmt ?? '—'],
                      ['Resolution',    wc?.resolutionStatus  ?? '—'],
                    ] as [string, string][]).map(([label, value]) => (
                      <div key={label} className="flex gap-2 min-w-0">
                        <span className="text-xs text-muted-foreground shrink-0 w-28 pt-px">{label}</span>
                        <span className="text-sm font-medium flex-1 break-words">{value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* ── Engineer Findings ──────────────────── */}
                {wc && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Engineer Findings</CardTitle></CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      {[
                        { label: 'Fault Found',     value: wc.problemFound },
                        { label: 'Root Cause',      value: wc.rootCause },
                        { label: 'Work Performed',  value: wc.workPerformed },
                        { label: 'Resolution',      value: wc.resolution !== wc.workPerformed ? wc.resolution : undefined },
                        { label: 'Recommendations', value: wc.recommendations },
                      ].filter((r) => !!r.value).map(({ label, value }) => (
                        <div key={label} className="border-l-2 border-primary/30 pl-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
                          <p className="text-sm whitespace-pre-wrap">{value}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* ── Customer Remarks ───────────────────── */}
                {(task.customerRemarks || wc?.customerRemarks) && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Customer Remarks</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{task.customerRemarks || wc?.customerRemarks}</p>
                    </CardContent>
                  </Card>
                )}

                {/* ── Completed Checklist ────────────────── */}
                {checkedItems.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <CheckSquare size={14} className="text-green-600" /> Completed Checklist
                        <Badge variant="secondary" className="text-xs ml-auto">{checkedItems.length} items</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {checkedItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 size={13} className="text-green-600 shrink-0" />
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ── Materials Used ─────────────────────── */}
                {mats.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Package size={14} className="text-primary" /> Materials Used
                        <Badge variant="secondary" className="text-xs ml-auto">{mats.length} item{mats.length !== 1 ? 's' : ''}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-border">
                              {['Item','Planned','Used','Extra','Returned','Unit','Remarks'].map((h) => (
                                <th key={h} className="text-left py-1.5 pr-3 text-xs text-muted-foreground font-medium last:pr-0">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {mats.map((m) => (
                              <tr key={m.id} className="border-b border-border last:border-0">
                                <td className="py-1.5 pr-3 font-medium">{m.itemName}</td>
                                <td className="py-1.5 pr-3 text-center text-muted-foreground">{m.plannedQty ?? 0}</td>
                                <td className="py-1.5 pr-3 text-center font-bold text-primary">{m.usedQty ?? 0}</td>
                                <td className="py-1.5 pr-3 text-center text-muted-foreground">{m.extraQty ?? 0}</td>
                                <td className="py-1.5 pr-3 text-center text-muted-foreground">{m.returnedQty ?? 0}</td>
                                <td className="py-1.5 pr-3 text-muted-foreground">{m.unit}</td>
                                <td className="py-1.5 text-muted-foreground text-xs whitespace-normal">{m.remarks ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ── Photos ─────────────────────────────── */}
                {(beforePh.length > 0 || afterPh.length > 0) && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Photos</CardTitle></CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      {[{ label: 'Before', items: beforePh }, { label: 'After', items: afterPh }]
                        .filter(({ items }) => items.length > 0)
                        .map(({ label, items }) => (
                          <div key={label}>
                            <p className="text-xs text-muted-foreground font-medium mb-2">{label}</p>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                              {items.map((p) => (
                                <a key={p.id} href={p.dataUrl} target="_blank" rel="noreferrer"
                                  className="block aspect-square rounded-md overflow-hidden border border-border hover:opacity-90 transition-opacity">
                                  <img src={p.dataUrl} alt={label} className="w-full h-full object-cover" />
                                </a>
                              ))}
                            </div>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                )}

                {/* ── Customer Signature ─────────────────── */}
                {sig?.signatureDataUrl && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Customer Signature</CardTitle></CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      <div className="inline-block border border-border rounded-lg p-2 bg-white dark:bg-muted/20">
                        <img src={sig.signatureDataUrl} alt="Customer signature" className="max-h-28 max-w-full object-contain" />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 size={12} className="text-green-600" />
                        <span>{sig.signatoryName ?? sig.customerName ?? customer?.contactPerson ?? 'Customer'}</span>
                        {sig.signedAt && <span>· {new Date(sig.signedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ── Engineer Signature ─────────────────── */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Engineer Signature</CardTitle></CardHeader>
                  <CardContent className="flex flex-col gap-1">
                    <div className="h-12 border-b border-border/60 mb-2" />
                    <p className="text-sm font-semibold">{engineerProfile?.name ?? task.engineerName ?? '—'}</p>
                    {engineerProfile?.designation && <p className="text-xs text-muted-foreground">{engineerProfile.designation}</p>}
                    {engineerProfile?.employeeId  && <p className="text-xs text-muted-foreground">ID: {engineerProfile.employeeId}</p>}
                  </CardContent>
                </Card>

              </div>
            </TabsContent>
          );
        })()}

      </Tabs>

      {/* ── Dialogs ───────────────────────────────────────────── */}

      {/* Delete */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Task {task.taskNumber}?</AlertDialogTitle>
            <AlertDialogDescription>The task will be marked as Cancelled. This can be undone via Edit.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Cancel Task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Status */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>Update Status</DialogTitle></DialogHeader>
          <Select value={newStatus} onValueChange={(v) => setNewStatus(v as TaskStatus)}>
            <SelectTrigger><SelectValue placeholder="Select new status" /></SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOpen(false)}>Cancel</Button>
            <Button onClick={handleStatusUpdate} disabled={!newStatus || saving}>
              {saving ? 'Saving…' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Engineer */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>Assign Engineer</DialogTitle></DialogHeader>
          <Select value={newEngineer} onValueChange={setNewEngineer}>
            <SelectTrigger><SelectValue placeholder="Select engineer" /></SelectTrigger>
            <SelectContent>
              {engineers.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!newEngineer || saving}>{saving ? 'Saving…' : 'Assign'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>Add Note</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <Select value={noteType} onValueChange={(v) => setNoteType(v as NoteType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Internal">Internal Note</SelectItem>
                <SelectItem value="Customer">Customer Note</SelectItem>
                <SelectItem value="Engineer">Engineer Note</SelectItem>
              </SelectContent>
            </Select>
            <Textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Enter note…" rows={4} className="px-2 resize-none" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button>
            <Button onClick={handleAddNote} disabled={!noteContent.trim() || saving}>{saving ? 'Saving…' : 'Add Note'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Photo */}
      <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>Upload Photo</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <Select value={photoCategory} onValueChange={(v) => setPhotoCategory(v as PhotoCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Before">Before</SelectItem>
                <SelectItem value="During">During</SelectItem>
                <SelectItem value="After">After</SelectItem>
              </SelectContent>
            </Select>
            <input ref={photoInputRef} type="file" accept=".jpg,.jpeg,.png" className="hidden"
              onChange={handlePhotoUpload} />
            <Button variant="outline" onClick={() => photoInputRef.current?.click()} className="gap-2">
              <Plus size={14} /> Choose Photo (JPG / PNG, max 10 MB)
            </Button>
            <p className="text-xs text-muted-foreground">Selecting a file will upload it immediately.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotoOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Document */}
      <Dialog open={docOpen} onOpenChange={setDocOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <input ref={docInputRef} type="file" accept=".pdf,.docx" className="hidden"
              onChange={handleDocUpload} />
            <Button variant="outline" onClick={() => docInputRef.current?.click()} className="gap-2">
              <Plus size={14} /> Choose Document (PDF / DOCX, max 10 MB)
            </Button>
            <p className="text-xs text-muted-foreground">Selecting a file will upload it immediately.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note delete confirm */}
      <AlertDialog open={!!noteDeleteId} onOpenChange={(o) => !o && setNoteDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader><AlertDialogTitle>Delete Note?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeleteNote}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Photo delete confirm */}
      <AlertDialog open={!!photoDeleteId} onOpenChange={(o) => !o && setPhotoDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader><AlertDialogTitle>Delete Photo?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeletePhoto}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Doc delete confirm */}
      <AlertDialog open={!!docDeleteId} onOpenChange={(o) => !o && setDocDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader><AlertDialogTitle>Delete Document?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeleteDoc}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Material */}
      <Dialog open={addMatOpen} onOpenChange={setAddMatOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>Add Material Item</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Item Name</label>
              <Input value={newMatName} onChange={e => setNewMatName(e.target.value)} placeholder="e.g. Cat6 Cable" className="h-10" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Planned Qty</label>
                <Input type="number" min={1} value={newMatQty} onChange={e => setNewMatQty(Number(e.target.value))} className="h-10" />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Unit</label>
                <Select value={newMatUnit} onValueChange={v => setNewMatUnit(v as MaterialUnit)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['pcs','mtrs','rolls','sets','boxes','ltrs','kg','units'] as MaterialUnit[]).map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMatOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!newMatName.trim()) { toast.error('Item name required'); return; }
              if (!templateData) { toast.error('No template data loaded'); return; }
              const updated = taskTemplateDataService.addMaterial(task.id, { itemName: newMatName.trim(), plannedQty: newMatQty, unit: newMatUnit, usedQty: 0, extraQty: 0, returnedQty: 0 }, 'Admin');
              setTemplateData(updated);
              setNewMatName(''); setNewMatQty(1); setNewMatUnit('pcs');
              setAddMatOpen(false); toast.success('Material item added.');
            }}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Work Order Print */}
      {printOpen && (
        <WorkOrderPrint
          task={task}
          customer={customer}
          asset={asset}
          templateData={templateData}
          completion={engineerService.getWorkCompletion(task.id)}
          signature={engineerService.getSignature(task.id)}
          photos={toEngineerPhotos(photos, task.id)}
          engineerProfile={engineerProfile}
          company={company}
          onClose={() => setPrintOpen(false)}
        />
      )}
    </DashboardLayout>
  );
}
