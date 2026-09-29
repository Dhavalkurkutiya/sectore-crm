/**
 * EngineerCompletionWizard
 * Sectore 360 — Phase 1 Final Enhancement
 *
 * 7-step wizard for completing a task on mobile or desktop.
 * Steps: Checklist → Photos → Materials → Work Performed → Customer Signature → Summary → Complete
 *
 * Work Performed is the only mandatory field.
 * All others are optional (but shown per template config).
 */
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { SignatureCanvas } from '@/components/engineer/SignatureCanvas';
import { toast } from 'sonner';
import {
  CheckSquare, Camera, Package, ClipboardCheck, PenLine,
  FileCheck, CheckCircle2, ChevronLeft, ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import type { TaskTemplateData, PlannedMaterial, MaterialUnit } from '@/types/template';

export interface WizardCompletionData {
  checklist:           TaskTemplateData['checklist'];
  workDoneSummary:     string;
  problemFound:        string;
  rootCause:           string;
  recommendations:     string;
  customerRemarks:     string;
  internalNotes:       string;
  signatureDataUrl:    string;
  materials:           PlannedMaterial[];
}

interface Step {
  id: number;
  label: string;
  icon: React.ElementType;
  optional?: boolean;
}

const STEPS: Step[] = [
  { id: 1, label: 'Checklist',  icon: CheckSquare  },
  { id: 2, label: 'Photos',     icon: Camera,       optional: true },
  { id: 3, label: 'Materials',  icon: Package,      optional: true },
  { id: 4, label: 'Work Done',  icon: ClipboardCheck },
  { id: 5, label: 'Signature',  icon: PenLine       },
  { id: 6, label: 'Review',     icon: FileCheck     },
  { id: 7, label: 'Complete',   icon: CheckCircle2  },
];

interface Props {
  templateData:       TaskTemplateData | null;
  onUpdateTemplate:   (updated: TaskTemplateData) => void;
  onComplete:         (data: WizardCompletionData) => void;
  onCancel:           () => void;
}

export function EngineerCompletionWizard({ templateData, onUpdateTemplate, onComplete, onCancel }: Props) {
  const [step, setStep]           = useState(1);
  const [workDone, setWorkDone]   = useState(templateData?.workDoneSummary ?? '');
  const [problemFound, setProblem]= useState('');
  const [rootCause, setRootCause] = useState('');
  const [recommendations, setRecs]= useState(templateData?.recommendations ?? '');
  const [custRemarks, setCustRems]= useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [signatureDataUrl, setSig]= useState('');
  const [extraItem, setExtraItem] = useState({ name: '', qty: 1, unit: 'pcs' as MaterialUnit, reason: '' });
  const [showExtraForm, setShowExtraForm] = useState(false);

  const checklist = templateData?.checklist ?? [];
  const materials = templateData?.materials ?? [];

  const handleChecklistToggle = useCallback((id: string, checked: boolean) => {
    if (!templateData) return;
    const updated = {
      ...templateData,
      checklist: templateData.checklist.map((c) => c.id === id ? { ...c, checked } : c),
    };
    onUpdateTemplate(updated);
  }, [templateData, onUpdateTemplate]);

  const handleUsedQtyChange = useCallback((matId: string, usedQty: number) => {
    if (!templateData) return;
    const updated = {
      ...templateData,
      materials: templateData.materials.map((m) => m.id === matId ? { ...m, usedQty } : m),
    };
    onUpdateTemplate(updated);
  }, [templateData, onUpdateTemplate]);

  const handleAddExtra = () => {
    if (!templateData || !extraItem.name.trim()) { toast.error('Item name required'); return; }
    const newMat: PlannedMaterial = {
      id: `mat_extra_${Date.now()}`,
      itemName: extraItem.name.trim(),
      plannedQty: 0,
      unit: extraItem.unit,
      usedQty: extraItem.qty,
      extraQty: extraItem.qty,
      extraReason: extraItem.reason,
      returnedQty: 0,
      history: [{
        id: `mh_${Date.now()}`,
        action: 'extra',
        qty: extraItem.qty,
        by: 'Engineer',
        at: new Date().toISOString(),
        note: extraItem.reason,
      }],
    };
    const updated = { ...templateData, materials: [...templateData.materials, newMat] };
    onUpdateTemplate(updated);
    setExtraItem({ name: '', qty: 1, unit: 'pcs', reason: '' });
    setShowExtraForm(false);
    toast.success('Extra item added.');
  };

  const canAdvance = () => {
    if (step === 4 && !workDone.trim()) return false;
    if (step === 5 && !signatureDataUrl) return false;
    return true;
  };

  const advance = () => {
    if (!canAdvance()) {
      if (step === 4) toast.error('Work Performed is required.');
      if (step === 5) toast.error('Customer signature is required.');
      return;
    }
    if (step < 7) setStep((s) => s + 1);
  };

  const handleComplete = () => {
    if (!workDone.trim()) { toast.error('Work Performed is required.'); setStep(4); return; }
    if (!signatureDataUrl) { toast.error('Customer signature is required.'); setStep(5); return; }
    onComplete({
      checklist: templateData?.checklist ?? [],
      workDoneSummary: workDone,
      problemFound,
      rootCause,
      recommendations,
      customerRemarks: custRemarks,
      internalNotes,
      signatureDataUrl,
      materials: templateData?.materials ?? [],
    });
  };

  const progressPct = Math.round((step / 7) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Progress bar ─────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Step {step} of 7 — {STEPS[step - 1].label}</span>
          <span className="text-xs text-muted-foreground">{progressPct}%</span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        {/* Step pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const done = step > s.id;
            const active = step === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-1 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  done    ? 'bg-primary/20 text-primary' :
                  active  ? 'bg-primary text-primary-foreground' :
                            'bg-muted text-muted-foreground'
                }`}
              >
                <Icon size={11} />
                <span className="hidden sm:inline">{s.label}</span>
                {s.optional && <span className="text-[9px] opacity-60">(opt)</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Step content ─────────────────────────────── */}

      {/* Step 1: Checklist */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckSquare size={14} /> Checklist
              <span className="text-xs text-muted-foreground font-normal ml-1">
                {checklist.filter(c => c.checked).length}/{checklist.length} done
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {checklist.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No checklist for this template.</p>
            ) : checklist.map((item) => (
              <label key={item.id} className="flex items-start gap-3 py-2.5 cursor-pointer">
                <Checkbox
                  checked={item.checked ?? false}
                  onCheckedChange={(v) => handleChecklistToggle(item.id, !!v)}
                  className="mt-0.5 shrink-0"
                />
                <span className={`text-sm flex-1 ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                  {item.label}
                  {item.required && !item.checked && (
                    <Badge variant="outline" className="ml-1.5 text-[10px] text-destructive border-destructive/30 px-1 py-0">required</Badge>
                  )}
                </span>
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Photos (optional - just a note, actual upload is in the Photos tab) */}
      {step === 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Camera size={14} /> Photos
              <Badge variant="secondary" className="text-[10px] font-normal">Optional</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/40 border border-border p-4 text-center flex flex-col items-center gap-2">
              <Camera size={24} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Use the <strong>Photos</strong> tab to upload before/after photos.
              </p>
              <p className="text-xs text-muted-foreground">You can upload photos now or after completing this wizard.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Materials */}
      {step === 3 && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package size={14} /> Materials Used
            </CardTitle>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowExtraForm(true)}>
              + Add Extra
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {materials.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">No materials planned for this task.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Item', 'Planned', 'Used', 'Unit'].map(h => (
                        <th key={h} className="py-2 px-2 text-xs text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m) => {
                      const isExtra = (m.plannedQty === 0 && (m.extraQty ?? 0) > 0);
                      return (
                        <tr key={m.id} className="border-b border-border last:border-0">
                          <td className="py-2 px-2 font-medium whitespace-nowrap">
                            {m.itemName}
                            {isExtra && <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 text-amber-600 border-amber-400">extra</Badge>}
                          </td>
                          <td className="py-2 px-2 text-center text-muted-foreground">{m.plannedQty || '—'}</td>
                          <td className="py-2 px-2">
                            <Input
                              type="number" min={0}
                              value={m.usedQty ?? 0}
                              onChange={(e) => handleUsedQtyChange(m.id, Number(e.target.value))}
                              className="w-16 h-7 text-center text-xs px-1"
                            />
                          </td>
                          <td className="py-2 px-2 text-muted-foreground text-xs">{m.unit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Extra item form */}
            {showExtraForm && (
              <div className="border border-amber-300 rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 flex flex-col gap-2 mt-1">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Add Extra Item</p>
                <Input placeholder="Item name" value={extraItem.name} onChange={e => setExtraItem(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" />
                <div className="flex gap-2">
                  <Input type="number" min={1} value={extraItem.qty} onChange={e => setExtraItem(p => ({ ...p, qty: Number(e.target.value) }))} className="h-8 w-20 text-sm" />
                  <select value={extraItem.unit} onChange={e => setExtraItem(p => ({ ...p, unit: e.target.value as MaterialUnit }))}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm flex-1">
                    {(['pcs','mtrs','rolls','sets','boxes','ltrs','kg','units'] as MaterialUnit[]).map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <Input placeholder="Reason for extra material" value={extraItem.reason} onChange={e => setExtraItem(p => ({ ...p, reason: e.target.value }))} className="h-8 text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-8" onClick={handleAddExtra}>Add Item</Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setShowExtraForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Work Performed */}
      {step === 4 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardCheck size={14} /> Work Done
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold mb-1.5 block">
                Work Performed <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Describe exactly what was done…"
                value={workDone}
                onChange={(e) => setWorkDone(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block text-muted-foreground">Problem Found <span className="font-normal">(optional)</span></label>
              <Textarea placeholder="What was the root problem?" value={problemFound} onChange={e => setProblem(e.target.value)} rows={2} className="resize-none" />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block text-muted-foreground">Root Cause <span className="font-normal">(optional)</span></label>
              <Textarea placeholder="Why did it happen?" value={rootCause} onChange={e => setRootCause(e.target.value)} rows={2} className="resize-none" />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block text-muted-foreground">Recommendations <span className="font-normal">(optional)</span></label>
              <Textarea placeholder="Future actions for the customer…" value={recommendations} onChange={e => setRecs(e.target.value)} rows={2} className="resize-none" />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block text-muted-foreground">Customer Remarks <span className="font-normal">(optional)</span></label>
              <Textarea placeholder="Any remarks from the customer…" value={custRemarks} onChange={e => setCustRems(e.target.value)} rows={2} className="resize-none" />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block text-muted-foreground">Internal Notes <span className="font-normal">(optional)</span></label>
              <Textarea placeholder="Notes for the back office…" value={internalNotes} onChange={e => setInternalNotes(e.target.value)} rows={2} className="resize-none" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Signature */}
      {step === 5 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PenLine size={14} /> Customer Signature <span className="text-destructive text-sm">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {signatureDataUrl ? (
              <div className="flex flex-col items-center gap-3">
                <div className="border border-border rounded-lg p-2 bg-muted/30">
                  <img src={signatureDataUrl} alt="Customer signature" className="max-h-28 max-w-full object-contain" />
                </div>
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 size={16} /> <span className="text-sm font-medium">Signature captured</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSig('')}>Re-capture</Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">Ask the customer to sign in the box below.</p>
                <SignatureCanvas onSave={(dataUrl) => setSig(dataUrl)} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 6: Review Summary */}
      {step === 6 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileCheck size={14} /> Review Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {/* Checklist status */}
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Checklist</span>
              <span className="font-medium">
                {checklist.filter(c => c.checked).length}/{checklist.length} items
              </span>
            </div>
            {checklist.some(c => c.required && !c.checked) && (
              <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-md p-2">
                <AlertTriangle size={12} className="shrink-0" />
                {checklist.filter(c => c.required && !c.checked).length} required checklist item(s) not completed.
              </div>
            )}
            {/* Materials */}
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Materials Used</span>
              <span className="font-medium">{materials.filter(m => (m.usedQty ?? 0) > 0).length} items</span>
            </div>
            {/* Work done */}
            <div className="border-b border-border pb-2">
              <p className="text-muted-foreground mb-0.5">Work Performed</p>
              <p className="font-medium text-xs leading-relaxed">{workDone || <span className="text-destructive">— Not filled (required)</span>}</p>
            </div>
            {/* Signature */}
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Customer Signature</span>
              {signatureDataUrl
                ? <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle2 size={12} /> Captured</span>
                : <span className="text-destructive font-medium">Not captured</span>
              }
            </div>
            {signatureDataUrl && (
              <img src={signatureDataUrl} alt="Signature preview" className="h-16 border rounded object-contain bg-white" />
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 7: Complete */}
      {step === 7 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-500" /> Ready to Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 items-center text-center py-4">
            <CheckCircle2 size={48} className="text-green-500" />
            <div>
              <p className="font-semibold text-base">All steps completed!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click <strong>Complete Task</strong> to submit the work and mark this task as done.
              </p>
            </div>
            <Button size="lg" className="w-full h-12" onClick={handleComplete}>
              <CheckCircle2 size={16} className="mr-2" /> Complete Task
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Navigation ───────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={step === 1 ? onCancel : () => setStep((s) => s - 1)}
          className="gap-1.5"
        >
          <ChevronLeft size={14} />
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>
        {step < 7 && (
          <Button size="sm" onClick={advance} className="gap-1.5" disabled={!canAdvance()}>
            {step === 6 ? 'Final Review' : 'Next'}
            <ChevronRight size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}
