/**
 * CustomFieldsPage
 * Settings > Custom Fields
 * Admin configures per-category custom fields stored in asset_custom_fields table.
 * Fields are rendered dynamically in AssetForm / DynamicAssetFields.
 */
import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState } from '@/components/shared/EmptyState';
import { Spinner } from '@/components/shared/Spinner';
import { assetCustomFieldsApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { masterDataService } from '@/services/masterDataService';
import type { AssetCustomField, AssetCustomFieldFormData } from '@/types/master';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, ChevronRight, Settings2,
  ToggleLeft, ToggleRight, GripVertical, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const FIELD_TYPES: { value: AssetCustomField['fieldType']; label: string }[] = [
  { value: 'text',    label: 'Text' },
  { value: 'number',  label: 'Number' },
  { value: 'date',    label: 'Date' },
  { value: 'select',  label: 'Dropdown (Select)' },
  { value: 'boolean', label: 'Yes / No (Boolean)' },
];

/* ── Field Dialog (Add / Edit) ───────────────────────────── */
interface FieldDialogProps {
  open: boolean;
  category: string;
  editField?: AssetCustomField;
  onClose: () => void;
  onSaved: () => void;
}

function FieldDialog({ open, category, editField, onClose, onSaved }: FieldDialogProps) {
  const [label,     setLabel]     = useState('');
  const [fieldKey,  setFieldKey]  = useState('');
  const [type,      setType]      = useState<AssetCustomField['fieldType']>('text');
  const [options,   setOptions]   = useState('');   // comma-separated for select
  const [required,  setRequired]  = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (editField) {
      setLabel(editField.fieldLabel);
      setFieldKey(editField.fieldKey);
      setType(editField.fieldType);
      setOptions((editField.fieldOptions ?? []).join(', '));
      setRequired(editField.isRequired);
      setSortOrder(editField.sortOrder);
    } else {
      setLabel(''); setFieldKey(''); setType('text');
      setOptions(''); setRequired(false); setSortOrder(0);
    }
  }, [editField, open]);

  // Auto-derive fieldKey from label
  const handleLabelChange = (v: string) => {
    setLabel(v);
    if (!editField) {
      setFieldKey(v.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
    }
  };

  const handleSave = async () => {
    if (!label.trim()) { toast.error('Field label is required'); return; }
    if (!fieldKey.trim()) { toast.error('Field key is required'); return; }
    setSaving(true);
    try {
      const data: AssetCustomFieldFormData = {
        category,
        fieldKey:     fieldKey.trim(),
        fieldLabel:   label.trim(),
        fieldType:    type,
        fieldOptions: type === 'select' ? options.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        isRequired:   required,
        sortOrder,
      };
      if (editField) {
        await assetCustomFieldsApi.update(editField.id, data);
        toast.success('Custom field updated');
      } else {
        await assetCustomFieldsApi.create(data);
        toast.success('Custom field added');
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editField ? 'Edit' : 'Add'} Custom Field — {category}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-1">
          <div className="flex flex-col gap-1.5">
            <Label>Field Label <span className="text-destructive">*</span></Label>
            <Input
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g. ISP Circuit ID"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Field Key <span className="text-destructive">*</span></Label>
            <Input
              value={fieldKey}
              onChange={(e) => setFieldKey(e.target.value)}
              placeholder="e.g. isp_circuit_id"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">Unique identifier used in database. Use lowercase_underscore.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Field Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as AssetCustomField['fieldType'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === 'select' && (
            <div className="flex flex-col gap-1.5">
              <Label>Options (comma-separated)</Label>
              <Input
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                placeholder="Option A, Option B, Option C"
              />
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch id="req" checked={required} onCheckedChange={setRequired} />
              <Label htmlFor="req" className="cursor-pointer">Required field</Label>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Sort Order</Label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-24"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-[100px]">
            {saving ? <Loader2 size={14} className="animate-spin" /> : editField ? 'Save Changes' : 'Add Field'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function CustomFieldsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [categories,     setCategories]     = useState<string[]>([]);
  const [selectedCat,    setSelectedCat]    = useState<string>('');
  const [fields,         setFields]         = useState<AssetCustomField[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [dialogOpen,     setDialogOpen]     = useState(false);
  const [editField,      setEditField]      = useState<AssetCustomField | undefined>();
  const [deleteTarget,   setDeleteTarget]   = useState<AssetCustomField | null>(null);
  const [deleteOpen,     setDeleteOpen]     = useState(false);

  // Load categories from master data
  useEffect(() => {
    masterDataService.list('asset_category').then((items) => {
      const cats = items.map((i) => i.value);
      setCategories(cats);
      if (cats.length > 0) setSelectedCat(cats[0]);
    }).catch(() => {
      const defaults = ['Computers', 'Laptops', 'Servers', 'Firewall', 'Networking', 'CCTV', 'NVR/DVR', 'Printer', 'UPS', 'Storage'];
      setCategories(defaults);
      setSelectedCat(defaults[0]);
    });
  }, []);

  const loadFields = useCallback(async () => {
    if (!selectedCat) return;
    setLoading(true);
    try {
      // Load both active and inactive — use a wider query
      const { data } = await supabase
        .from('asset_custom_fields')
        .select('*')
        .eq('category', selectedCat)
        .order('sort_order');
      const all: AssetCustomField[] = (data ?? []).map((row: Record<string, unknown>) => ({
        id:           row.id as string,
        category:     row.category as string,
        fieldKey:     row.field_key as string,
        fieldLabel:   row.field_label as string,
        fieldType:    row.field_type as AssetCustomField['fieldType'],
        fieldOptions: row.field_options as string[] | undefined,
        isRequired:   Boolean(row.is_required),
        sortOrder:    Number(row.sort_order ?? 0),
        isActive:     Boolean(row.is_active),
        createdAt:    row.created_at as string,
        updatedAt:    row.updated_at as string,
      }));
      setFields(all);
    } catch {
      toast.error('Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  }, [selectedCat]);

  useEffect(() => { loadFields(); }, [loadFields]);

  const handleToggleActive = async (field: AssetCustomField) => {
    try {
      await assetCustomFieldsApi.update(field.id, { fieldLabel: field.fieldLabel } as AssetCustomFieldFormData);
      // Toggle via direct Supabase update
      const { supabase: sb } = await import('@/lib/supabase');
      await sb.from('asset_custom_fields')
        .update({ is_active: !field.isActive, updated_at: new Date().toISOString() })
        .eq('id', field.id);
      toast.success(`Field ${field.isActive ? 'deactivated' : 'activated'}`);
      loadFields();
    } catch {
      toast.error('Failed to update field');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await assetCustomFieldsApi.delete(deleteTarget.id);
      toast.success('Custom field deleted');
      setDeleteTarget(null);
      setDeleteOpen(false);
      loadFields();
    } catch {
      toast.error('Failed to delete field');
    }
  };

  const fieldTypeBadge = (type: AssetCustomField['fieldType']) => {
    const map: Record<string, string> = {
      text: 'bg-blue-50 text-blue-700 border-blue-200',
      number: 'bg-purple-50 text-purple-700 border-purple-200',
      date: 'bg-amber-50 text-amber-700 border-amber-200',
      select: 'bg-green-50 text-green-700 border-green-200',
      boolean: 'bg-slate-50 text-slate-700 border-slate-200',
    };
    const label = FIELD_TYPES.find((f) => f.value === type)?.label ?? type;
    return (
      <Badge variant="outline" className={cn('text-[10px] px-1.5', map[type] ?? '')}>
        {label}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Custom Fields"
        description="Configure per-category custom fields that appear in the asset form."
        breadcrumbs={[
          { label: 'Settings', href: '/settings' },
          { label: 'Custom Fields' },
        ]}
        actions={
          isAdmin && (
            <Button onClick={() => { setEditField(undefined); setDialogOpen(true); }}
              disabled={!selectedCat} className="gap-2">
              <Plus size={14} /> Add Field
            </Button>
          )
        }
      />

      <div className="flex gap-0 border border-border rounded-lg overflow-hidden min-h-[500px]">
        {/* ── Category Sidebar ─────────────────────────────── */}
        <aside className="w-52 shrink-0 border-r border-border flex flex-col bg-muted/20">
          <div className="p-3 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Categories</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="py-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors mx-0',
                    selectedCat === cat
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-accent text-foreground'
                  )}
                >
                  <span className="truncate">{cat}</span>
                  {selectedCat === cat && <ChevronRight size={12} className="shrink-0 ml-1" />}
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* ── Fields Panel ─────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
            <div>
              <p className="text-sm font-semibold text-foreground">{selectedCat}</p>
              <p className="text-xs text-muted-foreground">
                {fields.length} field{fields.length !== 1 ? 's' : ''} configured
              </p>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => { setEditField(undefined); setDialogOpen(true); }}
                disabled={!selectedCat} className="gap-1.5 h-8 text-xs">
                <Plus size={12} /> Add Field
              </Button>
            )}
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Spinner size="md" />
              </div>
            ) : fields.length === 0 ? (
              <EmptyState
                icon={Settings2}
                title="No custom fields"
                description={`Add custom fields for the "${selectedCat}" category. These appear in the asset form below standard fields.`}
                action={isAdmin ? {
                  label: 'Add First Field',
                  onClick: () => { setEditField(undefined); setDialogOpen(true); },
                } : undefined}
              />
            ) : (
              <div className="flex flex-col gap-2">
                {/* Header row */}
                <div className="grid grid-cols-[1.5rem_1fr_1fr_6rem_4rem_5rem_5rem] gap-2 px-2 pb-1 border-b border-border">
                  <span />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Label</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Key</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Type</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-center">Req.</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-center">Active</span>
                  <span />
                </div>
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className={cn(
                      'grid grid-cols-[1.5rem_1fr_1fr_6rem_4rem_5rem_5rem] gap-2 items-center px-2 py-2 rounded-md border transition-colors',
                      field.isActive
                        ? 'border-border bg-card hover:bg-muted/30'
                        : 'border-border/50 bg-muted/10 opacity-60'
                    )}
                  >
                    {/* drag handle hint */}
                    <GripVertical size={14} className="text-muted-foreground/40 shrink-0" />

                    {/* Label */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{field.fieldLabel}</p>
                    </div>

                    {/* Key */}
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-muted-foreground truncate">{field.fieldKey}</p>
                    </div>

                    {/* Type */}
                    <div>{fieldTypeBadge(field.fieldType)}</div>

                    {/* Required */}
                    <div className="text-center">
                      {field.isRequired
                        ? <Badge variant="outline" className="text-[10px] px-1 bg-destructive/10 text-destructive border-destructive/20">Yes</Badge>
                        : <span className="text-xs text-muted-foreground">—</span>
                      }
                    </div>

                    {/* Active toggle */}
                    <div className="flex justify-center">
                      {isAdmin ? (
                        <button
                          onClick={() => handleToggleActive(field)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title={field.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {field.isActive
                            ? <ToggleRight size={18} className="text-primary" />
                            : <ToggleLeft size={18} />
                          }
                        </button>
                      ) : (
                        <Badge variant="outline" className={cn('text-[10px]', field.isActive ? 'text-primary' : 'text-muted-foreground')}>
                          {field.isActive ? 'Active' : 'Off'}
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 justify-end">
                      {isAdmin && (
                        <>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                            onClick={() => { setEditField(field); setDialogOpen(true); }}>
                            <Pencil size={12} />
                          </Button>
                          <Button variant="ghost" size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => { setDeleteTarget(field); setDeleteOpen(true); }}>
                            <Trash2 size={12} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info card */}
          <div className="border-t border-border p-4 bg-muted/20">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">How it works:</strong> Custom fields appear in the Asset Form below standard fields.
                  Field values are stored in the <code className="font-mono bg-muted px-1 rounded text-xs">custom_fields</code> JSON column
                  and are visible in the asset detail page.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Field Dialog ─────────────────────────────────── */}
      <FieldDialog
        open={dialogOpen}
        category={selectedCat}
        editField={editField}
        onClose={() => setDialogOpen(false)}
        onSaved={loadFields}
      />

      {/* ── Delete Confirmation ──────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Field</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.fieldLabel}</strong>? Existing asset data using this field
              will remain in the database but the field will no longer appear in the form.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
