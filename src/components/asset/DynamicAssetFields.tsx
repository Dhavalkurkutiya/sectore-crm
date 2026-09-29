/**
 * DynamicAssetFields
 * Renders category-specific spec fields + custom DB fields
 * All values stored in specifications jsonb
 * Sectore 360 — Enterprise Asset Master
 */
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SmartCombobox } from '@/components/master/SmartCombobox';
import { assetCustomFieldService } from '@/services/masterDataService';
import type { AssetCustomField, CategoryFieldConfig } from '@/types/master';
import { CATEGORY_FIELDS } from '@/types/master';

interface DynamicAssetFieldsProps {
  category: string;
  specs: Record<string, unknown>;
  onChange: (specs: Record<string, unknown>) => void;
}

export function DynamicAssetFields({ category, specs, onChange }: DynamicAssetFieldsProps) {
  const [customFields, setCustomFields] = useState<AssetCustomField[]>([]);

  // Load DB-configured custom fields for this category
  useEffect(() => {
    if (!category) { setCustomFields([]); return; }
    assetCustomFieldService.listByCategory(category)
      .then(setCustomFields)
      .catch(() => setCustomFields([]));
  }, [category]);

  const staticFields: CategoryFieldConfig[] = CATEGORY_FIELDS[category] ?? [];
  if (staticFields.length === 0 && customFields.length === 0) return null;

  const set = (key: string, value: unknown) => onChange({ ...specs, [key]: value });

  // Group static fields by their "group" key
  const groups: Record<string, CategoryFieldConfig[]> = {};
  for (const f of staticFields) {
    const g = f.group ?? 'General';
    if (!groups[g]) groups[g] = [];
    groups[g].push(f);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Static category fields grouped by section */}
      {Object.entries(groups).map(([groupName, fields]) => (
        <Card key={groupName}>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {groupName}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((f) => (
                <SpecField
                  key={f.key}
                  field={f}
                  value={specs[f.key]}
                  onChange={(v) => set(f.key, v)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* DB-configured custom fields */}
      {customFields.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Custom Fields
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customFields.map((f) => (
                <CustomFieldInput
                  key={f.id}
                  field={f}
                  value={specs[f.fieldKey]}
                  onChange={(v) => set(f.fieldKey, v)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ── Static spec field renderer ────────────────────────── */
function SpecField({ field, value, onChange }: {
  field: CategoryFieldConfig;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.type === 'boolean') {
    return (
      <div className="flex items-center gap-3">
        <Switch
          checked={!!(value)}
          onCheckedChange={onChange}
          id={field.key}
        />
        <Label htmlFor={field.key} className="cursor-pointer">{field.label}</Label>
      </div>
    );
  }

  if (field.type === 'select') {
    if (field.masterType) {
      return (
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm">{field.label}</Label>
          <SmartCombobox
            masterType={field.masterType}
            value={(value as string) ?? ''}
            onChange={onChange}
            placeholder={`Select ${field.label}`}
          />
        </div>
      );
    }
    // static options
    return (
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm">{field.label}</Label>
        <SmartCombobox
          masterType={`__static__${field.key}`}
          value={(value as string) ?? ''}
          onChange={onChange}
          placeholder={`Select ${field.label}`}
          allowAddNew={false}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm">{field.label}</Label>
      <Input
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        value={(value as string) ?? ''}
        onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
        placeholder={field.placeholder ?? field.label}
      />
    </div>
  );
}

/* ── Custom field renderer (DB-driven) ─────────────────── */
function CustomFieldInput({ field, value, onChange }: {
  field: AssetCustomField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.fieldType === 'boolean') {
    return (
      <div className="flex items-center gap-3">
        <Switch checked={!!(value)} onCheckedChange={onChange} id={field.fieldKey} />
        <Label htmlFor={field.fieldKey} className="cursor-pointer">
          {field.fieldLabel}{field.isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
      </div>
    );
  }

  if (field.fieldType === 'select' && field.fieldOptions?.length) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm">
          {field.fieldLabel}{field.isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
        <select
          className="border border-input rounded-md px-3 py-1.5 text-sm bg-background"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select…</option>
          {field.fieldOptions.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm">
        {field.fieldLabel}{field.isRequired && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'}
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.fieldLabel}
        required={field.isRequired}
      />
    </div>
  );
}
