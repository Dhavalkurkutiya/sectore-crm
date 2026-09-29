/**
 * PartsList — add / display parts used for a task
 * Part 5 — Sectore 360
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Package } from 'lucide-react';
import type { PartUsed, PartUsedFormData } from '@/types/engineer';

interface PartsListProps {
  parts: PartUsed[];
  onAdd: (data: PartUsedFormData) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

const EMPTY: PartUsedFormData = { partName: '', quantity: 1, serialNumber: '', remarks: '' };

export function PartsList({ parts, onAdd, onRemove, disabled = false }: PartsListProps) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<PartUsedFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof PartUsedFormData, string>>>({});

  function validate() {
    const e: typeof errors = {};
    if (!form.partName.trim()) e.partName = 'Required';
    if (!form.quantity || form.quantity < 1) e.quantity = 'Min 1';
    return e;
  }

  function handleAdd() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onAdd({ ...form, quantity: Number(form.quantity) });
    setForm(EMPTY);
    setErrors({});
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {parts.length === 0 && !adding && (
        <div className="flex items-center gap-2 py-3 text-muted-foreground">
          <Package size={16} />
          <span className="text-sm">No parts recorded</span>
        </div>
      )}

      {parts.map((p) => (
        <Card key={p.id} className="bg-muted/40">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{p.partName}</p>
                <p className="text-xs text-muted-foreground">
                  Qty: {p.quantity}
                  {p.serialNumber && ` · S/N: ${p.serialNumber}`}
                  {p.remarks && ` · ${p.remarks}`}
                </p>
              </div>
              {!disabled && (
                <Button
                  type="button" variant="ghost" size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0"
                  onClick={() => onRemove(p.id)}
                >
                  <Trash2 size={13} />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {adding && (
        <Card className="border-primary/30">
          <CardContent className="p-3 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 flex flex-col gap-1">
                <Label className="text-xs">Part Name *</Label>
                <Input
                  placeholder="e.g. Hard Disk Drive 1TB"
                  value={form.partName}
                  onChange={(e) => setForm((f) => ({ ...f, partName: e.target.value }))}
                  className="h-9"
                />
                {errors.partName && <p className="text-xs text-destructive">{errors.partName}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Quantity *</Label>
                <Input
                  type="number" min={1} value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                  className="h-9"
                />
                {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Serial Number</Label>
                <Input
                  placeholder="Optional"
                  value={form.serialNumber ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <Label className="text-xs">Remarks</Label>
                <Input
                  placeholder="Optional"
                  value={form.remarks ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                  className="h-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1"
                onClick={() => { setAdding(false); setForm(EMPTY); setErrors({}); }}>
                Cancel
              </Button>
              <Button type="button" size="sm" className="flex-1" onClick={handleAdd}>
                Add Part
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!disabled && !adding && (
        <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}
          className="w-full border-dashed">
          <Plus size={14} className="mr-1" /> Add Part
        </Button>
      )}
    </div>
  );
}
