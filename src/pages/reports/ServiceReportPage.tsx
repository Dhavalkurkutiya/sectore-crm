/**
 * Service Report Page
 * Sectore 360 — Official Service Work Report shared by Engineer, Admin, and Customer.
 * Path: /tasks/:taskId/report
 * - Shows service visit timings, engineer findings, completed checklist only,
 *   materials used (if any), photos, signatures, customer remarks
 * - Download PDF via window.print()
 * - Share via WhatsApp
 * - Customer can edit their remarks from this page
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEngineerContext } from '@/contexts/EngineerContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { companyProfileService } from '@/services/companyProfileService';
import { engineerService } from '@/services/engineerService';
import { customerService } from '@/services/customerService';
import { assetService } from '@/services/assetService';
import { taskService } from '@/services/taskService';
import { templateService, taskTemplateDataService } from '@/services/templateService';
import type { Task, TaskPhoto } from '@/types/task';
import type { Customer, Asset } from '@/types/customer';
import type { WorkCompletion, CustomerSignature } from '@/types/engineer';
import type { TaskTemplateData } from '@/types/template';
import {
  Building2, ChevronLeft, Printer, MessageCircle, Download,
  CheckCircle2, MapPin, Phone, Mail, Clock, Edit2, Save, X,
} from 'lucide-react';
import { toast } from 'sonner';

/* ── Helpers ───────────────────────────────────────────────── */
function fmtTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtSiteTime(minutes?: number) {
  if (minutes == null) return null;
  if (minutes >= 60) return `${Math.floor(minutes / 60)} Hour${Math.floor(minutes / 60) > 1 ? 's' : ''} ${minutes % 60} Min`;
  return `${minutes} Min`;
}

export default function ServiceReportPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const { engineerId } = useEngineerContext();
  const company    = companyProfileService.get();

  const [task,         setTask]         = useState<Task | null>(null);
  const [customer,     setCustomer]     = useState<Customer | null>(null);
  const [asset,        setAsset]        = useState<Asset | null>(null);
  const [completion,   setCompletion]   = useState<WorkCompletion | null>(null);
  const [signature,    setSignature]    = useState<CustomerSignature | null>(null);
  const [photos,       setPhotos]       = useState<TaskPhoto[]>([]);
  const [templateData, setTemplateData] = useState<TaskTemplateData | null>(null);
  const [engineer,     setEngineer]     = useState<{ name: string; designation?: string } | null>(null);

  // Customer remarks editing
  const [editingRemarks, setEditingRemarks] = useState(false);
  const [remarksValue,   setRemarksValue]   = useState('');
  const [savingRemarks,  setSavingRemarks]  = useState(false);

  const isCustomer = user?.role === 'customer';

  useEffect(() => {
    if (!taskId) return;
    (async () => {
      const t = await taskService.getById(taskId).catch(() => null);
      setTask(t);
      if (!t) return;
      setRemarksValue(t.customerRemarks ?? '');

      const [c, a] = await Promise.all([
        customerService.getById(t.customerId),
        assetService.getById(t.assetId),
      ]);
      setCustomer(c);
      setAsset(a);

      const wc  = engineerService.getWorkCompletion(taskId);
      const sig = engineerService.getSignature(taskId);
      // Load photos from task_photos DB table — single source of truth for all roles
      const ph  = await taskService.getPhotos(taskId);
      setCompletion(wc);
      setSignature(sig);
      setPhotos(ph);

      const ep = await engineerService.getProfile(engineerId || task?.engineerId || '');
      if (ep) setEngineer({ name: ep.name, designation: ep.designation });

      if (t && a) {
        const tmpl = templateService.findByServiceTypeAndCategory(t.taskType, a.category ?? '');
        if (tmpl) setTemplateData(taskTemplateDataService.getOrInit(taskId, tmpl.id));
        else       setTemplateData(taskTemplateDataService.get(taskId));
      }
    })();
  }, [taskId]);  // eslint-disable-line

  /* ── Customer remarks save ─────────────────────────────── */
  async function handleSaveRemarks() {
    if (!task) return;
    setSavingRemarks(true);
    try {
      await taskService.updateCustomerRemarks(task.id, remarksValue);
      setTask((prev) => prev ? { ...prev, customerRemarks: remarksValue } : prev);
      setEditingRemarks(false);
      toast.success('Remarks saved');
    } catch {
      toast.error('Failed to save remarks');
    } finally {
      setSavingRemarks(false);
    }
  }

  /* ── WhatsApp ──────────────────────────────────────────── */
  function handleWhatsApp() {
    if (!task) return;
    const msg = encodeURIComponent(
      `Work Order Report — ${task.taskNumber}\n${company.name}\nCustomer: ${customer?.companyName ?? ''}\nEngineer: ${engineer?.name ?? task.engineerName ?? ''}\nStatus: ${task.status}\nWork Performed: ${completion?.workPerformed ?? 'N/A'}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  if (!task) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading report…</div>
      </DashboardLayout>
    );
  }

  const completedAt   = task.completedAt ? new Date(task.completedAt).toLocaleString() : '—';
  const generatedAt   = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
  const afterPhotos   = photos.filter((p) => p.category === 'After');
  const beforePhotos  = photos.filter((p) => p.category === 'Before');
  const duringPhotos  = photos.filter((p) => p.category === 'During');
  // Completed checklist items ONLY
  const completedItems = templateData?.checklist.filter((c) => c.checked) ?? [];
  // Materials used — only rows with usedQty > 0 or plannedQty > 0
  const materialsUsed = (templateData?.materials ?? []).filter(
    (m) => (m.usedQty ?? 0) > 0 || (m.plannedQty ?? 0) > 0
  );
  const siteTimeFmt = fmtSiteTime(task.siteTimeMinutes);

  const findings = completion ? [
    { label: 'Problem Reported', value: task.issueDescription },
    { label: 'Fault Found',      value: completion.problemFound },
    { label: 'Root Cause',       value: completion.rootCause },
    { label: 'Work Performed',   value: completion.workPerformed },
    { label: 'Resolution',       value: completion.resolution !== completion.workPerformed ? completion.resolution : undefined },
    { label: 'Recommendations',  value: completion.recommendations },
  ].filter((f) => !!f.value) : [{ label: 'Problem Reported', value: task.issueDescription }];

  return (
    <DashboardLayout>
      {/* ── Action bar (hidden on print) ─────────────────── */}
      <div className="flex items-center gap-2 mb-6 print:hidden flex-wrap">
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0" onClick={() => navigate(-1)}>
          <ChevronLeft size={18} />
        </Button>
        <span className="text-sm font-semibold flex-1 truncate">Service Report — {task.taskNumber}</span>
        <Button variant="outline" className="gap-2 h-9" onClick={() => window.print()}>
          <Printer size={14} /> Print / Download PDF
        </Button>
        <Button variant="outline" className="gap-2 h-9" onClick={handleWhatsApp}>
          <MessageCircle size={14} className="text-green-600" /> WhatsApp
        </Button>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* REPORT DOCUMENT                                   */}
      {/* ══════════════════════════════════════════════════ */}
      <div
        className="max-w-3xl mx-auto bg-card border border-border rounded-xl overflow-hidden print:border-0 print:rounded-none print:shadow-none"
        id="service-report"
      >

        {/* ── HEADER ────────────────────────────────────── */}
        <div className="bg-[#0B1229] text-white px-6 py-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {company.logoDataUrl ? (
              <img src={company.logoDataUrl} alt={company.name} className="h-12 object-contain" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Building2 size={24} className="text-white" />
              </div>
            )}
            <div>
              <p className="font-bold text-lg leading-tight">{company.name}</p>
              <p className="text-xs text-white/70 italic">{company.tagline || 'Securing Today. Powering Tomorrow.'}</p>
              <p className="text-[10px] text-white/50 mt-0.5">{company.footerText}</p>
            </div>
          </div>
          <div className="text-right text-xs text-white/70 space-y-0.5 shrink-0">
            <p className="font-semibold text-white text-sm">Service Work Report</p>
            <p className="font-bold text-base text-white">#{task.taskNumber}</p>
            <p>{new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">

          {/* ── Work Order meta ───────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              ['Work Order',   task.taskNumber],
              ['Service Type', task.taskType],
              ['Priority',     task.priority],
              ['Status',       task.status],
              ['Completed',    completedAt],
              ['AMC',          task.amcId ? 'Yes' : 'No'],
            ].map(([label, value]) => (
              <div key={label} className="bg-muted/30 rounded-lg p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* ── Service Visit Timings ─────────────────────── */}
          {(task.serviceStartTime || task.serviceEndTime || siteTimeFmt) && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/40 px-4 py-2.5 flex items-center gap-2 border-b border-border">
                <Clock size={13} className="text-primary" />
                <p className="text-xs font-semibold uppercase tracking-wide">Service Visit Timings</p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border p-0">
                <div className="px-4 py-3 flex flex-col gap-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Reached Site</p>
                  <p className="text-sm font-bold">{fmtTime(task.serviceStartTime)}</p>
                </div>
                <div className="px-4 py-3 flex flex-col gap-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Task Completed</p>
                  <p className="text-sm font-bold">{fmtTime(task.serviceEndTime)}</p>
                </div>
                <div className="px-4 py-3 flex flex-col gap-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Time on Site</p>
                  <p className="text-sm font-bold text-primary">{siteTimeFmt ?? '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Customer + Asset ─────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-border rounded-lg p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Customer</p>
              <p className="font-semibold text-sm">{customer?.companyName ?? '—'}</p>
              {customer?.contactPerson && <p className="text-xs text-muted-foreground">{customer.contactPerson}</p>}
              {customer?.address && (
                <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                  <MapPin size={10} className="mt-0.5 shrink-0" />{customer.address}
                </p>
              )}
            </div>
            <div className="border border-border rounded-lg p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Asset / Device</p>
              <p className="font-semibold text-sm">{asset?.deviceType ?? '—'}</p>
              {asset?.brand   && <p className="text-xs text-muted-foreground">{asset.brand} {asset.model}</p>}
              {asset?.serialNumber && <p className="text-xs text-muted-foreground">S/N: {asset.serialNumber}</p>}
              {asset?.location && <p className="text-xs text-muted-foreground">Location: {asset.location}</p>}
            </div>
          </div>

          {/* ── Engineer Findings ─────────────────────────── */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/40 px-4 py-2.5 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-wide">Engineer Findings</p>
            </div>
            <div className="flex flex-col divide-y divide-border">
              {findings.map(({ label, value }) => (
                <div key={label} className="px-4 py-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-sm leading-relaxed">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Completed Checklist (selected items only) ─── */}
          {completedItems.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide">Completed Checklist</p>
                <Badge variant="outline" className="text-[10px]">{completedItems.length} items</Badge>
              </div>
              <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {completedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 size={13} className="text-green-600 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Materials Used ────────────────────────────── */}
          {materialsUsed.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/40 px-4 py-2.5 border-b border-border">
                <p className="text-xs font-semibold uppercase tracking-wide">Materials Used</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      {['Item', 'Planned', 'Used', 'Extra', 'Returned', 'Unit'].map((h) => (
                        <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {materialsUsed.map((m) => (
                      <tr key={m.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2 font-medium">{m.itemName}</td>
                        <td className="px-4 py-2 text-center text-muted-foreground">{m.plannedQty ?? 0}</td>
                        <td className="px-4 py-2 text-center font-semibold">{m.usedQty ?? 0}</td>
                        <td className="px-4 py-2 text-center text-muted-foreground">{m.extraQty ?? 0}</td>
                        <td className="px-4 py-2 text-center text-muted-foreground">{m.returnedQty ?? 0}</td>
                        <td className="px-4 py-2 text-muted-foreground">{m.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Photos ────────────────────────────────────── */}
          {(beforePhotos.length > 0 || duringPhotos.length > 0 || afterPhotos.length > 0) && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/40 px-4 py-2.5 border-b border-border">
                <p className="text-xs font-semibold uppercase tracking-wide">Photos</p>
              </div>
              <div className="p-3 flex flex-col gap-3">
                {[
                  { label: 'Before', items: beforePhotos },
                  { label: 'During', items: duringPhotos },
                  { label: 'After',  items: afterPhotos  },
                ].filter(({ items }) => items.length > 0).map(({ label, items }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {items.slice(0, 6).map((p) => (
                        <div key={p.id} className="aspect-[4/3] rounded overflow-hidden bg-muted">
                          <img src={p.url} alt={label} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Signatures ────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-border rounded-lg p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Customer Signature</p>
              {signature?.signatureDataUrl ? (
                <>
                  <div className="bg-white dark:bg-muted/10 rounded border border-border p-2 inline-block">
                    <img src={signature.signatureDataUrl} alt="Signature" className="max-h-20 max-w-full object-contain" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {signature.signatoryName && `${signature.signatoryName} · `}
                    {new Date(signature.signedAt).toLocaleString()}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Not captured</p>
              )}
            </div>
            <div className="border border-border rounded-lg p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Engineer</p>
              <p className="font-semibold text-sm">{engineer?.name ?? task.engineerName ?? '—'}</p>
              {engineer?.designation && <p className="text-xs text-muted-foreground">{engineer.designation}</p>}
              <p className="text-xs text-muted-foreground mt-2">Completion Time</p>
              <p className="text-sm font-medium">{completedAt}</p>
            </div>
          </div>

          {/* ── Customer Remarks (editable by customer) ───── */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide">Customer Remarks</p>
              {isCustomer && !editingRemarks && (
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setEditingRemarks(true)}>
                  <Edit2 size={11} /> Edit
                </Button>
              )}
            </div>
            <div className="px-4 py-3">
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
                <p className="text-sm text-muted-foreground">
                  {task.customerRemarks || (isCustomer ? 'Tap Edit to add your remarks.' : 'No remarks from customer.')}
                </p>
              )}
            </div>
          </div>

          {/* ── FOOTER ───────────────────────────────────── */}
          <div className="border-t-2 border-foreground/20 pt-5 mt-2 space-y-3 print:pt-6">
            <div className="text-center">
              {company.logoDataUrl
                ? <img src={company.logoDataUrl} alt={company.name} className="h-10 object-contain mx-auto mb-1" style={{ maxWidth: '200px' }} />
                : <p className="font-bold text-sm tracking-wide">{company.name.toUpperCase()}</p>
              }
              <p className="text-xs font-semibold mt-0.5">{company.name}</p>
              <p className="text-xs text-muted-foreground italic">{company.tagline || 'Securing Today. Powering Tomorrow.'}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">IT Infrastructure | Managed Services | AMC | Security Solutions</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground border-t border-border pt-3">
              <div>
                <p className="font-semibold text-foreground text-[11px] uppercase tracking-wide mb-1">Registered Office</p>
                <p className="whitespace-pre-line leading-relaxed">{company.address}</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground text-[11px] uppercase tracking-wide mb-1">Contact</p>
                {company.contactPerson && <p className="font-medium text-foreground">{company.contactPerson}</p>}
                <p className="flex items-center gap-1"><Phone size={10} /><span>+91 {company.primaryPhone}</span></p>
                {company.secondaryPhone && <p className="flex items-center gap-1"><Phone size={10} /><span>+91 {company.secondaryPhone}</span></p>}
                <p className="flex items-center gap-1"><Mail size={10} /><span>{company.supportEmail}</span></p>
                {company.website && <p className="text-primary text-[10px]">{company.website}</p>}
              </div>
            </div>

            <div className="text-center border-t border-border pt-2 space-y-0.5">
              <p className="text-[10px] text-muted-foreground">Generated by Sectore 360 ERP · {generatedAt}</p>
              <p className="text-[10px] text-muted-foreground">This report has been digitally generated. No manual signature required unless specifically requested.</p>
              <p className="text-[10px] font-medium text-muted-foreground mt-1">Thank you for choosing {company.name}.</p>
            </div>
          </div>

        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#service-report-wrapper) { display: none !important; }
          .print\\:hidden { display: none !important; }
          @page { margin: 12mm; size: A4; }
        }
      `}</style>

    </DashboardLayout>
  );
}
