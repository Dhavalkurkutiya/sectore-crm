/**
 * ServiceActivityTab
 * Sectore 360 — Unified chronological service history timeline.
 * Used by Admin (TaskDetailPage), Engineer (EngineerTaskDetailPage),
 * and Customer (CustomerTicketsPage).
 *
 * Role-based visibility:
 *   admin    → full access
 *   engineer → full access except internalNotes
 *   customer → read-only; can edit customerRemarks
 */
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import type { Task } from '@/types/task';
import type { Customer, Asset } from '@/types/customer';
import type { WorkCompletion, CustomerSignature, EngineerTaskPhoto, EngineerProfile } from '@/types/engineer';
import type { TaskTemplateData } from '@/types/template';
import { taskService } from '@/services/taskService';
import {
  CheckCircle2, Clock, MapPin, User, Package, Camera,
  PenLine, Star, ChevronDown, ChevronUp, Wrench,
  AlertTriangle, Lightbulb, MessageSquare, Shield, Edit2, Save, X,
} from 'lucide-react';
import { toast } from 'sonner';

/* ── Types ──────────────────────────────────────────────────── */
export type ServiceActivityRole = 'admin' | 'engineer' | 'customer';

interface Props {
  task: Task;
  customer: Customer | null;
  asset: Asset | null;
  completion: WorkCompletion | null;
  signature: CustomerSignature | null;
  photos: EngineerTaskPhoto[];
  templateData: TaskTemplateData | null;
  engineerProfile: EngineerProfile | null;
  role: ServiceActivityRole;
  onTaskUpdated?: () => void;
}

/* ── Timeline event definition ─────────────────────────────── */
interface TimelineEvent {
  id: string;
  icon: React.ReactNode;
  color: string;
  title: string;
  time?: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
  content?: React.ReactNode;
}

/* ── Helpers ────────────────────────────────────────────────── */
function fmtDateTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}
function fmtTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDuration(min?: number) {
  if (min == null) return null;
  if (min >= 60) return `${Math.floor(min / 60)} hr ${min % 60} min`;
  return `${min} min`;
}

/* ── EventCard ──────────────────────────────────────────────── */
function EventCard({ event }: { event: TimelineEvent }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex gap-3 min-w-0">
      {/* dot + line */}
      <div className="flex flex-col items-center">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${event.color}`}>
          {event.icon}
        </div>
      </div>
      {/* card */}
      <div className="flex-1 min-w-0 border border-border rounded-lg overflow-hidden mb-1">
        <button
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
          onClick={() => setOpen((v) => !v)}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-sm font-semibold truncate">{event.title}</span>
            {event.badge && (
              <Badge variant={event.badgeVariant ?? 'secondary'} className="text-[10px] shrink-0">{event.badge}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {event.time && <span className="text-xs text-muted-foreground hidden md:block">{event.time}</span>}
            {event.content && (open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />)}
          </div>
        </button>
        {event.time && <p className="text-xs text-muted-foreground px-3 pb-1 md:hidden">{event.time}</p>}
        {open && event.content && (
          <div className="border-t border-border px-3 py-3 bg-muted/10">
            {event.content}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Detail rows helper ─────────────────────────────────────── */
function DR({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 min-w-0">
      <span className="text-[11px] text-muted-foreground shrink-0 w-28">{label}</span>
      <span className="text-sm flex-1 break-words">{value}</span>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */
export function ServiceActivityTab({
  task, customer, asset, completion, signature, photos,
  templateData, engineerProfile, role, onTaskUpdated,
}: Props) {
  const [editingRemarks, setEditingRemarks]   = useState(false);
  const [remarksValue,   setRemarksValue]     = useState(task.customerRemarks ?? '');
  const [savingRemarks,  setSavingRemarks]    = useState(false);
  const [expandedPhoto,  setExpandedPhoto]    = useState<string | null>(null);

  const isAdmin    = role === 'admin';
  const isEngineer = role === 'engineer';
  const isCustomer = role === 'customer';

  const checkedItems  = templateData?.checklist.filter((c) => c.checked) ?? [];
  const materialsUsed = (templateData?.materials ?? []).filter(
    (m) => (m.usedQty ?? 0) > 0
  );
  const beforePhotos  = photos.filter((p) => p.category === 'before');
  const workPhotos    = photos.filter((p) => p.category === 'work_in_progress');
  const afterPhotos   = photos.filter((p) => p.category === 'after');
  const equipPhotos   = photos.filter((p) => p.category === 'equipment' || p.category === 'serial_number');
  const allPhotos     = [...beforePhotos, ...workPhotos, ...afterPhotos, ...equipPhotos];

  const siteTimeFmt = fmtDuration(task.siteTimeMinutes);

  async function handleSaveRemarks() {
    setSavingRemarks(true);
    try {
      await taskService.updateCustomerRemarks(task.id, remarksValue);
      setEditingRemarks(false);
      toast.success('Remarks saved');
      onTaskUpdated?.();
    } catch {
      toast.error('Failed to save remarks');
    } finally {
      setSavingRemarks(false);
    }
  }

  /* ── Build timeline events ─────────────────────────────────── */
  const events: TimelineEvent[] = [];

  // 1. Task Created
  events.push({
    id: 'created',
    icon: <CheckCircle2 size={15} className="text-white" />,
    color: 'bg-slate-500',
    title: 'Task Created',
    time: fmtDateTime(task.createdAt),
    badge: task.taskNumber,
    badgeVariant: 'outline',
    content: (
      <div className="flex flex-col gap-1.5">
        <DR label="Created By"   value={task.createdBy} />
        <DR label="Service Type" value={task.taskType} />
        <DR label="Priority"     value={task.priority} />
        <DR label="Issue"        value={task.issueDescription} />
        {task.remarks && <DR label="Remarks" value={task.remarks} />}
      </div>
    ),
  });

  // 2. Assigned
  if (task.engineerName) {
    events.push({
      id: 'assigned',
      icon: <User size={15} className="text-white" />,
      color: 'bg-blue-500',
      title: 'Engineer Assigned',
      badge: task.engineerName,
      content: engineerProfile ? (
        <div className="flex items-start gap-3">
          {engineerProfile.photoUrl ? (
            <img src={engineerProfile.photoUrl} alt={engineerProfile.name} className="w-10 h-10 rounded-full object-cover shrink-0 border border-border" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User size={18} className="text-primary" />
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold">{engineerProfile.name}</p>
            {engineerProfile.designation  && <p className="text-xs text-muted-foreground">{engineerProfile.designation}</p>}
            {engineerProfile.employeeId   && <p className="text-xs text-muted-foreground">ID: {engineerProfile.employeeId}</p>}
            {engineerProfile.mobile       && <p className="text-xs text-muted-foreground">{engineerProfile.mobile}</p>}
            {engineerProfile.specialization && <p className="text-xs text-muted-foreground">{engineerProfile.specialization}</p>}
          </div>
        </div>
      ) : (
        <DR label="Engineer" value={task.engineerName} />
      ),
    });
  }

  // 3. Accepted
  if (['Accepted','On The Way','Reached Site','Working','Completed','Closed'].includes(task.status)) {
    events.push({
      id: 'accepted',
      icon: <CheckCircle2 size={15} className="text-white" />,
      color: 'bg-teal-500',
      title: 'Task Accepted by Engineer',
      badge: 'Accepted',
      badgeVariant: 'secondary',
    });
  }

  // 4. On The Way
  if (['On The Way','Reached Site','Working','Completed','Closed'].includes(task.status)) {
    events.push({
      id: 'on_way',
      icon: <MapPin size={15} className="text-white" />,
      color: 'bg-orange-400',
      title: 'Engineer On The Way',
      badge: 'En Route',
      badgeVariant: 'secondary',
      content: customer?.address ? (
        <a
          href={customer.googleMapLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([customer.address, customer.city].filter(Boolean).join(', '))}`}
          target="_blank" rel="noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <MapPin size={11} /> {[customer.address, customer.city, customer.state].filter(Boolean).join(', ')}
        </a>
      ) : undefined,
    });
  }

  // 5. Reached Site
  if (['Reached Site','Working','Completed','Closed'].includes(task.status) || task.serviceStartTime) {
    events.push({
      id: 'reached',
      icon: <Clock size={15} className="text-white" />,
      color: 'bg-primary',
      title: 'Reached Site',
      time: task.serviceStartTime ? fmtTime(task.serviceStartTime) : undefined,
      badge: task.serviceStartTime ? 'Service Started' : 'Reached',
      badgeVariant: 'default',
      content: task.serviceStartTime ? (
        <DR label="Site Arrival" value={fmtDateTime(task.serviceStartTime)} />
      ) : undefined,
    });
  }

  // 6. Checklist Progress
  if (checkedItems.length > 0) {
    events.push({
      id: 'checklist',
      icon: <CheckCircle2 size={15} className="text-white" />,
      color: 'bg-emerald-500',
      title: 'Checklist Completed',
      badge: `${checkedItems.length} items`,
      badgeVariant: 'secondary',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {checkedItems.map((item) => (
            <div key={item.id} className="flex items-start gap-2 text-sm">
              <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      ),
    });
  }

  // 7. Photos Uploaded
  if (allPhotos.length > 0) {
    events.push({
      id: 'photos',
      icon: <Camera size={15} className="text-white" />,
      color: 'bg-violet-500',
      title: 'Photos Captured',
      badge: `${allPhotos.length} photos`,
      badgeVariant: 'secondary',
      content: (
        <div className="flex flex-col gap-3">
          {[
            { label: 'Before', items: beforePhotos },
            { label: 'During Work', items: workPhotos },
            { label: 'After', items: afterPhotos },
            { label: 'Equipment', items: equipPhotos },
          ].filter(({ items }) => items.length > 0).map(({ label, items }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">{label}</p>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {items.map((p) => (
                  <div
                    key={p.id}
                    className="aspect-[4/3] rounded overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setExpandedPhoto(p.dataUrl)}
                  >
                    <img src={p.dataUrl} alt={label} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ),
    });
  }

  // 8. Materials Used
  if (materialsUsed.length > 0) {
    events.push({
      id: 'materials',
      icon: <Package size={15} className="text-white" />,
      color: 'bg-amber-500',
      title: 'Materials Used',
      badge: `${materialsUsed.length} items`,
      badgeVariant: 'secondary',
      content: (
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                {['Item','Planned','Used','Extra','Returned','Unit','Remarks'].map((h) => (
                  <th key={h} className="pb-1.5 pr-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {materialsUsed.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="py-1.5 pr-3 font-medium">{m.itemName}</td>
                  <td className="py-1.5 pr-3 text-center text-muted-foreground">{m.plannedQty ?? 0}</td>
                  <td className="py-1.5 pr-3 text-center font-bold text-primary">{m.usedQty ?? 0}</td>
                  <td className="py-1.5 pr-3 text-center text-muted-foreground">{m.extraQty ?? 0}</td>
                  <td className="py-1.5 pr-3 text-center text-muted-foreground">{m.returnedQty ?? 0}</td>
                  <td className="py-1.5 text-muted-foreground">{m.unit}</td>
                  <td className="py-1.5 text-muted-foreground text-xs">{m.remarks ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    });
  }

  // 9. Findings
  if (completion) {
    const findingRows = [
      { label: 'Fault Found',    value: completion.problemFound,    icon: <AlertTriangle size={13} className="text-amber-500" /> },
      { label: 'Root Cause',     value: completion.rootCause,       icon: <Lightbulb size={13} className="text-orange-500" /> },
      { label: 'Work Performed', value: completion.workPerformed,   icon: <Wrench size={13} className="text-primary" /> },
      { label: 'Resolution',     value: completion.resolution !== completion.workPerformed ? completion.resolution : undefined, icon: <CheckCircle2 size={13} className="text-emerald-600" /> },
      { label: 'Recommendations',value: completion.recommendations, icon: <Lightbulb size={13} className="text-blue-500" /> },
    ].filter((r) => !!r.value);

    if (findingRows.length > 0) {
      events.push({
        id: 'findings',
        icon: <Wrench size={15} className="text-white" />,
        color: 'bg-orange-500',
        title: 'Engineer Findings',
        badge: 'Work Done',
        badgeVariant: 'secondary',
        content: (
          <div className="flex flex-col gap-3">
            {findingRows.map(({ label, value, icon }) => (
              <div key={label} className="border-l-2 border-border pl-3">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {icon}
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                </div>
                <p className="text-sm leading-relaxed">{value}</p>
              </div>
            ))}
            {(isAdmin || isEngineer) && completion.internalNotes && isAdmin && (
              <>
                <Separator />
                <div className="border-l-2 border-amber-400 pl-3">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Internal Notes (Admin only)</p>
                  <p className="text-sm leading-relaxed">{completion.internalNotes}</p>
                </div>
              </>
            )}
          </div>
        ),
      });
    }
  }

  // 10. Customer Signature
  if (signature) {
    events.push({
      id: 'signature',
      icon: <PenLine size={15} className="text-white" />,
      color: 'bg-indigo-500',
      title: 'Customer Signature Captured',
      time: fmtDateTime(signature.signedAt),
      badge: 'Signed',
      badgeVariant: 'default',
      content: (
        <div className="flex flex-col gap-2">
          <div className="bg-white dark:bg-muted/10 rounded border border-border p-2 inline-block">
            <img src={signature.signatureDataUrl} alt="Customer Signature" className="max-h-20 object-contain" />
          </div>
          {signature.signatoryName && <p className="text-xs text-muted-foreground">{signature.signatoryName}</p>}
          <p className="text-xs text-muted-foreground">{fmtDateTime(signature.signedAt)}</p>
        </div>
      ),
    });
  }

  // 11. Task Completed
  if (['Completed', 'Closed'].includes(task.status) || task.serviceEndTime) {
    const resStatus = completion?.resolutionStatus;
    const resColor: Record<string, string> = {
      'Resolved':           'bg-green-500/15 text-green-700 border-green-400/40',
      'Temporary Fix':      'bg-amber-500/15 text-amber-700 border-amber-400/40',
      'Parts Required':     'bg-orange-500/15 text-orange-700 border-orange-400/40',
      'Follow-up Required': 'bg-red-500/15 text-red-700 border-red-400/40',
    };
    events.push({
      id: 'completed',
      icon: <Shield size={15} className="text-white" />,
      color: 'bg-green-600',
      title: 'Task Completed',
      time: task.serviceEndTime ? fmtTime(task.serviceEndTime) : (task.completedAt ? fmtDateTime(task.completedAt) : undefined),
      badge: 'Completed',
      badgeVariant: 'default',
      content: (
        <div className="flex flex-col gap-2">
          {task.serviceEndTime && <DR label="Completed At" value={fmtDateTime(task.serviceEndTime)} />}
          {siteTimeFmt && (
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
              <Clock size={14} className="text-green-600 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Service Duration</p>
                <p className="text-sm font-bold text-green-700 dark:text-green-400">{siteTimeFmt}</p>
              </div>
            </div>
          )}
          {resStatus && (
            <div className={`inline-flex items-center gap-2 border rounded-lg px-3 py-2 ${resColor[resStatus] ?? 'bg-muted text-muted-foreground border-border'}`}>
              <CheckCircle2 size={13} className="shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wide opacity-70">Resolution Status</p>
                <p className="text-sm font-semibold">{resStatus}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Shield size={11} className="text-green-600" />
            <span>Verified by Sectore Tecknologies</span>
          </div>
        </div>
      ),
    });
  }

  // 12. Customer Remarks
  const remarksEvent: TimelineEvent = {
    id: 'remarks',
    icon: <MessageSquare size={15} className="text-white" />,
    color: 'bg-sky-500',
    title: 'Customer Remarks',
    badge: task.customerRemarks ? 'Added' : isCustomer ? 'Tap to Add' : 'Pending',
    badgeVariant: task.customerRemarks ? 'default' : 'outline',
    content: (
      <div className="flex flex-col gap-2">
        {/* Star Rating (display-only, future-ready) */}
        {task.customerFeedback && (
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-muted-foreground">Satisfaction:</p>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map((s) => (
                <Star key={s} size={14} className={Number(task.customerFeedback) >= s ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'} />
              ))}
            </div>
          </div>
        )}
        {editingRemarks ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={remarksValue}
              onChange={(e) => setRemarksValue(e.target.value)}
              placeholder="Add your feedback or remarks about this service visit…"
              rows={3}
              className="text-sm resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" className="gap-1.5 h-8" onClick={handleSaveRemarks} disabled={savingRemarks}>
                <Save size={12} /> {savingRemarks ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => { setRemarksValue(task.customerRemarks ?? ''); setEditingRemarks(false); }}>
                <X size={12} /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <p className="text-sm text-muted-foreground flex-1">
              {task.customerRemarks || (isCustomer ? 'No remarks yet. Tap Edit to add feedback.' : 'No remarks from customer.')}
            </p>
            {isCustomer && (
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs shrink-0" onClick={() => setEditingRemarks(true)}>
                <Edit2 size={11} /> Edit
              </Button>
            )}
          </div>
        )}
      </div>
    ),
  };
  if (['Completed', 'Closed'].includes(task.status)) {
    events.push(remarksEvent);
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Header summary badge */}
      {siteTimeFmt && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5">
            <Clock size={13} className="text-primary shrink-0" />
            <span className="text-xs font-semibold text-primary">Service Duration: {siteTimeFmt}</span>
          </div>
          {task.serviceStartTime && (
            <div className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5">
              <span className="text-xs text-muted-foreground">
                {fmtTime(task.serviceStartTime)} → {task.serviceEndTime ? fmtTime(task.serviceEndTime) : 'In Progress'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="relative flex flex-col gap-0">
        {/* vertical guide line */}
        <div className="absolute left-[15px] top-8 bottom-8 w-px bg-border z-0" />
        <div className="relative z-10 flex flex-col gap-2">
          {events.map((ev) => <EventCard key={ev.id} event={ev} />)}
        </div>
      </div>

      {/* Photo lightbox */}
      {expandedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setExpandedPhoto(null)}
        >
          <div className="relative max-w-3xl w-full">
            <img src={expandedPhoto} alt="Photo" className="w-full max-h-[80vh] object-contain rounded-lg" />
            <button
              className="absolute top-2 right-2 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
              onClick={() => setExpandedPhoto(null)}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
