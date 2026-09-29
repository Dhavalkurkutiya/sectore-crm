/**
 * Task Template Manager
 * Sectore 360 — Admin-only page
 *
 * Displays all task templates (built-in + custom).
 * Admin can: Create · Edit · Duplicate · Enable/Disable · Delete (custom only)
 */
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { templateService } from '@/services/templateService';
import { TASK_TYPES } from '@/types/task';
import type { TaskTemplate, ChecklistItem, TaskTemplateConfig } from '@/types/template';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus, Pencil, Copy, Trash2, Search, LayoutTemplate,
  CheckSquare, Package, ShieldCheck, Lock, Check,
  ToggleLeft, ToggleRight,
} from 'lucide-react';

/* ── Helpers ────────────────────────────────────────────────── */
function id() { return `ci_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

const DEFAULT_CONFIG: TaskTemplateConfig = {
  requireSerialNumber:       false,
  photosRequired:            false,
  photosOptional:            true,
  requireCustomerSignature:  false,
  requireEngineerSignature:  false,
  requireOldItemReturn:      false,
  materialsEnabled:          false,
  dailyProgressEnabled:      false,
  arrivalDepartureTracking:  true,
  gpsTracking:               false,
  isRemoteSession:           false,
  hideIssueDescription:      false,
  showDeliveredQty:          false,
  showSystemHealth:          false,
  defaultExpectedDays:       1,
  showWarrantyCapture:       false,
};

/* ── Config toggle rows ─────────────────────────────────────── */
const CONFIG_FIELDS: { key: keyof TaskTemplateConfig; label: string; description: string }[] = [
  { key: 'requireSerialNumber',      label: 'Serial Number Required',   description: 'Engineer must capture asset serial number' },
  { key: 'photosRequired',           label: 'Photos — Mandatory',       description: 'Photos cannot be skipped at completion' },
  { key: 'photosOptional',           label: 'Photos — Optional',        description: 'Show photo upload, but not required' },
  { key: 'requireCustomerSignature', label: 'Customer Signature',       description: 'Signature required to close task' },
  { key: 'requireEngineerSignature', label: 'Engineer Signature',       description: 'Engineer sign-off required' },
  { key: 'requireOldItemReturn',     label: 'Old Item Return',          description: 'Show "old component returned" field' },
  { key: 'materialsEnabled',         label: 'Materials Section',        description: 'Show planned and used materials' },
  { key: 'dailyProgressEnabled',     label: 'Daily Progress',           description: 'Enable multi-day progress entries' },
  { key: 'arrivalDepartureTracking', label: 'Arrival / Departure',      description: 'Track engineer arrival and departure times' },
  { key: 'isRemoteSession',          label: 'Remote Session Mode',      description: 'Hide onsite fields, show remote session notes' },
  { key: 'hideIssueDescription',     label: 'Hide Issue Description',   description: 'Useful for Delivery templates' },
  { key: 'showDeliveredQty',         label: 'Delivered Quantity',       description: 'Show quantity field (for deliveries)' },
  { key: 'showSystemHealth',         label: 'System Health Section',    description: 'Show health summary for AMC/PMC templates' },
  { key: 'showWarrantyCapture',      label: 'Warranty Capture',         description: 'Engineer can record warranty end date' },
];

/* ──────────────────────────────────────────────────────────────
   Edit / Create Dialog
────────────────────────────────────────────────────────────── */
interface TemplateDialogProps {
  open: boolean;
  onClose: () => void;
  template: TaskTemplate | null;  // null = create new
  onSaved: () => void;
}

function TemplateDialog({ open, onClose, template, onSaved }: TemplateDialogProps) {
  const { user } = useAuth();
  const isBuiltIn = template?.isBuiltIn ?? false;

  const [name,         setName]         = useState('');
  const [description,  setDescription]  = useState('');
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [checklist,    setChecklist]    = useState<ChecklistItem[]>([]);
  const [config,       setConfig]       = useState<TaskTemplateConfig>({ ...DEFAULT_CONFIG });
  const [saving,       setSaving]       = useState(false);
  const [newItem,      setNewItem]      = useState('');

  // Seed values when dialog opens
  useEffect(() => {
    if (!open) return;
    if (template) {
      setName(template.name);
      setDescription(template.description ?? '');
      setServiceTypes([...template.serviceTypes]);
      setChecklist(template.checklist.map((c) => ({ ...c })));
      setConfig({ ...template.config });
    } else {
      setName(''); setDescription(''); setServiceTypes([]);
      setChecklist([]); setConfig({ ...DEFAULT_CONFIG });
    }
    setNewItem('');
  }, [open, template]);

  function addChecklistItem() {
    if (!newItem.trim()) return;
    setChecklist((prev) => [...prev, { id: id(), label: newItem.trim(), required: false }]);
    setNewItem('');
  }
  function removeItem(cid: string) { setChecklist((p) => p.filter((c) => c.id !== cid)); }
  function toggleRequired(cid: string) {
    setChecklist((p) => p.map((c) => c.id === cid ? { ...c, required: !c.required } : c));
  }
  function moveItem(cid: string, dir: 'up' | 'down') {
    setChecklist((prev) => {
      const idx = prev.findIndex((c) => c.id === cid);
      if (idx === -1) return prev;
      const next = [...prev];
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }
  function toggleServiceType(st: string) {
    setServiceTypes((p) => p.includes(st) ? p.filter((s) => s !== st) : [...p, st]);
  }

  async function handleSave() {
    if (!name.trim())             { toast.error('Template name is required.'); return; }
    if (serviceTypes.length === 0) { toast.error('Select at least one service type.'); return; }
    setSaving(true);
    try {
      const by = user?.name ?? 'Admin';
      if (template && !template.isBuiltIn) {
        templateService.update(template.id, { name, description, serviceTypes, checklist, config });
        toast.success('Template updated.');
      } else if (!template) {
        templateService.create({
          name, description, serviceTypes, checklist, assetCategories: [],
          defaultMaterials: [], config, isActive: true, createdBy: by,
        }, by);
        toast.success('Template created.');
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const configToggle = (key: keyof TaskTemplateConfig) => {
    if (typeof config[key] === 'boolean') {
      setConfig((p) => ({ ...p, [key]: !p[key] }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[90dvh] overflow-y-auto flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate size={18} className="text-primary" />
            {template ? (template.isBuiltIn ? `View: ${template.name}` : `Edit: ${template.name}`) : 'Create Template'}
          </DialogTitle>
          {isBuiltIn && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
              <Lock size={12} /> Built-in templates are read-only. Duplicate to customise.
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

          {/* ── Basic Info ─── */}
          <div className="flex flex-col gap-4">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Template Name <span className="text-destructive">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Laptop Repair" disabled={isBuiltIn} className="h-11" />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} disabled={isBuiltIn} className="resize-none" />
            </div>
          </div>

          <Separator />

          {/* ── Service Types ─── */}
          <div>
            <p className="text-sm font-semibold mb-2">
              Service Types <span className="text-destructive">*</span>
              <span className="font-normal text-muted-foreground text-xs ml-2">Select all that apply</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {TASK_TYPES.map((st) => (
                <button
                  key={st} type="button"
                  disabled={isBuiltIn}
                  onClick={() => toggleServiceType(st)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-full border transition-colors',
                    serviceTypes.includes(st)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40',
                    isBuiltIn ? 'cursor-not-allowed opacity-70' : '',
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* ── Checklist ─── */}
          <div>
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <CheckSquare size={15} className="text-primary" /> Checklist Items
            </p>
            <div className="flex flex-col gap-2 mb-3">
              {checklist.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3 border border-dashed rounded-lg">
                  No checklist items yet.
                </p>
              )}
              {checklist.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                  <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                  <span className="flex-1 text-sm min-w-0">{item.label}</span>
                  {!isBuiltIn && (
                    <>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Checkbox
                          checked={item.required}
                          onCheckedChange={() => toggleRequired(item.id)}
                          id={`req-${item.id}`}
                        />
                        <label htmlFor={`req-${item.id}`} className="text-xs text-muted-foreground cursor-pointer">Req</label>
                      </div>
                      <button type="button" onClick={() => moveItem(item.id, 'up')}
                        disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs px-1">↑</button>
                      <button type="button" onClick={() => moveItem(item.id, 'down')}
                        disabled={idx === checklist.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs px-1">↓</button>
                      <button type="button" onClick={() => removeItem(item.id)}
                        className="text-destructive hover:text-destructive/80 shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                  {item.required && <Badge variant="outline" className="text-[10px] shrink-0 text-destructive border-destructive/30">Required</Badge>}
                </div>
              ))}
            </div>
            {!isBuiltIn && (
              <div className="flex gap-2">
                <Input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                  placeholder="Add checklist item and press Enter or +"
                  className="flex-1 h-10"
                />
                <Button type="button" onClick={addChecklistItem} size="sm" className="h-10 gap-1.5">
                  <Plus size={14} /> Add
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* ── Behaviour Config ─── */}
          <div>
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ShieldCheck size={15} className="text-primary" /> Template Behaviour
            </p>
            <div className="flex flex-col gap-3">
              {CONFIG_FIELDS.filter((f) => typeof config[f.key] === 'boolean').map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-4 py-1">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-xs text-muted-foreground">{f.description}</p>
                  </div>
                  <Switch
                    checked={config[f.key] as boolean}
                    onCheckedChange={() => configToggle(f.key)}
                    disabled={isBuiltIn}
                    className="shrink-0"
                  />
                </div>
              ))}
              {/* Expected Duration */}
              <div className="flex items-center justify-between gap-4 py-1">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Default Expected Duration (days)</p>
                  <p className="text-xs text-muted-foreground">Sets multi-day threshold; daily progress enabled if &gt; 1</p>
                </div>
                <Input
                  type="number" min={1} max={30}
                  value={config.defaultExpectedDays}
                  onChange={(e) => setConfig((p) => ({ ...p, defaultExpectedDays: Number(e.target.value) }))}
                  disabled={isBuiltIn}
                  className="w-20 h-9 text-center shrink-0"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0 flex-row gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 h-11">Cancel</Button>
          {!isBuiltIn && (
            <Button onClick={handleSave} disabled={saving} className="flex-1 h-11">
              {saving ? 'Saving…' : template ? 'Save Changes' : 'Create Template'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main Page
══════════════════════════════════════════════════════════════ */
export default function TaskTemplatePage() {
  const { user } = useAuth();
  const [templates,     setTemplates]     = useState<TaskTemplate[]>([]);
  const [search,        setSearch]        = useState('');
  const [dialogOpen,    setDialogOpen]    = useState(false);
  const [editTemplate,  setEditTemplate]  = useState<TaskTemplate | null>(null);
  const [deleteId,      setDeleteId]      = useState<string | null>(null);

  const load = () => setTemplates(templateService.list());
  useEffect(load, []);

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.serviceTypes.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  function handleDuplicate(tmpl: TaskTemplate) {
    templateService.duplicate(tmpl.id, user?.name ?? 'Admin');
    toast.success(`"${tmpl.name}" duplicated. Edit and enable the copy.`);
    load();
  }

  function handleToggleActive(tmpl: TaskTemplate) {
    templateService.setActive(tmpl.id, !tmpl.isActive);
    toast.success(`Template ${tmpl.isActive ? 'disabled' : 'enabled'}.`);
    load();
  }

  function handleDelete() {
    if (!deleteId) return;
    try {
      templateService.delete(deleteId);
      toast.success('Template deleted.');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setDeleteId(null); load();
    }
  }

  const openCreate = () => { setEditTemplate(null); setDialogOpen(true); };
  const openEdit   = (t: TaskTemplate) => { setEditTemplate(t); setDialogOpen(true); };
  const onSaved    = () => { setDialogOpen(false); load(); };

  const builtIn = filtered.filter((t) => t.isBuiltIn);
  const custom  = filtered.filter((t) => !t.isBuiltIn);

  return (
    <DashboardLayout>
      <PageHeader
        title="Task Templates"
        description="Define the fields, checklists and behaviours for each service type. The Task Manager auto-loads the right template when an engineer selects a service type."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Task Templates' }]}
        actions={
          <Button onClick={openCreate} className="gap-1.5 h-9">
            <Plus size={15} /> New Template
          </Button>
        }
      />

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates…"
          className="pl-9 h-10"
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Templates',  value: templates.length,                    icon: LayoutTemplate },
          { label: 'Built-in',         value: templates.filter((t) => t.isBuiltIn).length, icon: Lock },
          { label: 'Custom',           value: templates.filter((t) => !t.isBuiltIn).length, icon: Package },
          { label: 'Active',           value: templates.filter((t) => t.isActive).length,   icon: Check },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Icon size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Built-in templates */}
      {builtIn.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Built-in Templates ({builtIn.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {builtIn.map((t) => (
              <TemplateCard
                key={t.id} template={t}
                onView={openEdit}
                onDuplicate={handleDuplicate}
                onToggle={handleToggleActive}
                onDelete={() => setDeleteId(t.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom templates */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Custom Templates ({custom.length})
        </h2>
        {custom.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 border-2 border-dashed border-border rounded-2xl text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <LayoutTemplate size={22} className="text-muted-foreground" />
            </div>
            <p className="font-semibold">No Custom Templates Yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Create a new template or duplicate and customise a built-in template.
            </p>
            <Button onClick={openCreate} className="gap-1.5 mt-1">
              <Plus size={14} /> Create Template
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {custom.map((t) => (
              <TemplateCard
                key={t.id} template={t}
                onView={openEdit}
                onDuplicate={handleDuplicate}
                onToggle={handleToggleActive}
                onDelete={() => setDeleteId(t.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <TemplateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        template={editTemplate}
        onSaved={onSaved}
      />
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Existing tasks that used this template will retain their checklist data.
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
    </DashboardLayout>
  );
}

/* ── Template Card ──────────────────────────────────────────── */
function TemplateCard({
  template, onView, onDuplicate, onToggle, onDelete,
}: {
  template: TaskTemplate;
  onView:      (t: TaskTemplate) => void;
  onDuplicate: (t: TaskTemplate) => void;
  onToggle:    (t: TaskTemplate) => void;
  onDelete:    (t: TaskTemplate) => void;
}) {
  const configBadges = [
    template.config.requireCustomerSignature && 'Signature',
    template.config.materialsEnabled         && 'Materials',
    template.config.dailyProgressEnabled     && 'Daily Progress',
    template.config.photosRequired           && 'Photos Required',
    template.config.requireSerialNumber      && 'Serial No.',
    template.config.isRemoteSession          && 'Remote',
  ].filter(Boolean) as string[];

  return (
    <Card className={cn('h-full flex flex-col', !template.isActive && 'opacity-60')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{template.name}</CardTitle>
            {template.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {template.isBuiltIn && (
              <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                <Lock size={9} /> Built-in
              </Badge>
            )}
            <Badge variant={template.isActive ? 'default' : 'secondary'} className="text-[10px]">
              {template.isActive ? 'Active' : 'Disabled'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Service types */}
        <div className="flex flex-wrap gap-1.5">
          {template.serviceTypes.map((s) => (
            <Badge key={s} variant="outline" className="text-[10px] font-normal">{s}</Badge>
          ))}
        </div>

        {/* Checklist count */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckSquare size={12} className="text-primary" />
            {template.checklist.length} checklist items
          </span>
          {template.defaultMaterials.length > 0 && (
            <span className="flex items-center gap-1.5">
              <Package size={12} className="text-primary" />
              {template.defaultMaterials.length} materials
            </span>
          )}
        </div>

        {/* Config badges */}
        {configBadges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {configBadges.map((b) => (
              <span key={b} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {b}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8" onClick={() => onView(template)}>
            <Pencil size={12} /> {template.isBuiltIn ? 'View' : 'Edit'}
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8" onClick={() => onDuplicate(template)}>
            <Copy size={12} /> Duplicate
          </Button>
          <Button
            variant="ghost" size="sm"
            className={cn('gap-1.5 text-xs h-8 ml-auto', template.isActive ? 'text-muted-foreground' : 'text-success')}
            onClick={() => onToggle(template)}
          >
            {template.isActive
              ? <><ToggleLeft size={12} /> Disable</>
              : <><ToggleRight size={12} /> Enable</>
            }
          </Button>
          {!template.isBuiltIn && (
            <Button
              variant="ghost" size="sm"
              className="gap-1.5 text-xs h-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(template)}
            >
              <Trash2 size={12} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


