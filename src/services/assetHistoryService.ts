/**
 * Asset History Service — Sectore 360
 * Writes change records to asset_history table.
 * Called by assetService.update / create / softDelete / restore.
 */
import { supabase } from '@/lib/supabase';
import type { Asset, AssetFormData } from '@/types/customer';

export interface AssetHistoryRecord {
  id: string;
  assetId: string;
  action: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  performedBy: string;
  performedAt: string;
  notes?: string;
}

/** Fields we track changes on, mapped to human-readable labels */
const TRACKED_FIELDS: Array<{ key: keyof Asset; label: string }> = [
  { key: 'location',         label: 'Location' },
  { key: 'department',       label: 'Department' },
  { key: 'floor',            label: 'Floor / Building' },
  { key: 'status',           label: 'Status' },
  { key: 'warrantyEnd',      label: 'Warranty End' },
  { key: 'warrantyStart',    label: 'Warranty Start' },
  { key: 'assignedUser',     label: 'Assigned User' },
  { key: 'ipAddress',        label: 'IP Address' },
  { key: 'macAddress',       label: 'MAC Address' },
  { key: 'configurationNotes', label: 'Configuration' },
  { key: 'brand',            label: 'Brand' },
  { key: 'model',            label: 'Model' },
  { key: 'serialNumber',     label: 'Serial Number' },
  { key: 'installationDate', label: 'Installation Date' },
  { key: 'purchaseDate',     label: 'Purchase Date' },
  { key: 'vendor',           label: 'Vendor' },
  { key: 'remarks',          label: 'Notes / Remarks' },
];

function str(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

async function insertRecord(record: Omit<AssetHistoryRecord, 'id' | 'performedAt'>): Promise<void> {
  await supabase.from('asset_history').insert({
    id:           crypto.randomUUID(),
    asset_id:     record.assetId,
    action:       record.action,
    field_name:   record.fieldName ?? null,
    old_value:    record.oldValue ?? null,
    new_value:    record.newValue ?? null,
    performed_by: record.performedBy,
    performed_at: new Date().toISOString(),
    notes:        record.notes ?? null,
  });
}

export const assetHistoryService = {
  /** Called after asset create */
  async logCreated(asset: Asset, performedBy: string): Promise<void> {
    await insertRecord({
      assetId:     asset.id,
      action:      'Asset Created',
      fieldName:   undefined,
      oldValue:    undefined,
      newValue:    `${asset.code} — ${asset.deviceType}${asset.brand ? ' · ' + asset.brand : ''}`,
      performedBy,
      notes:       `Serial: ${asset.serialNumber}`,
    });
  },

  /** Diffs old vs new asset and writes one record per changed field */
  async logUpdated(oldAsset: Asset, newData: Partial<AssetFormData>, performedBy: string): Promise<void> {
    const inserts: Promise<void>[] = [];

    for (const { key, label } of TRACKED_FIELDS) {
      const oldVal = str(oldAsset[key]);
      const newVal = str((newData as Record<string, unknown>)[key] ?? oldAsset[key]);
      if (oldVal !== newVal && (oldVal !== '' || newVal !== '')) {
        inserts.push(
          insertRecord({
            assetId:    oldAsset.id,
            action:     `${label} Changed`,
            fieldName:  key,
            oldValue:   oldVal || '(empty)',
            newValue:   newVal || '(empty)',
            performedBy,
          })
        );
      }
    }

    if (inserts.length > 0) await Promise.all(inserts);
  },

  /** Called when asset is soft-deleted (Retired) */
  async logDeactivated(assetId: string, performedBy: string): Promise<void> {
    await insertRecord({
      assetId,
      action:     'Asset Deactivated',
      oldValue:   'Active',
      newValue:   'Retired',
      performedBy,
    });
  },

  /** Called when asset is restored from Retired */
  async logRestored(assetId: string, performedBy: string): Promise<void> {
    await insertRecord({
      assetId,
      action:     'Asset Restored',
      oldValue:   'Retired',
      newValue:   'Active',
      performedBy,
    });
  },

  /** Fetch full history for an asset, newest first */
  async getByAsset(assetId: string): Promise<AssetHistoryRecord[]> {
    const { data, error } = await supabase
      .from('asset_history')
      .select('*')
      .eq('asset_id', assetId)
      .order('performed_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id:          r.id as string,
      assetId:     r.asset_id as string,
      action:      r.action as string,
      fieldName:   r.field_name as string | undefined,
      oldValue:    r.old_value as string | undefined,
      newValue:    r.new_value as string | undefined,
      performedBy: r.performed_by as string,
      performedAt: r.performed_at as string,
      notes:       r.notes as string | undefined,
    }));
  },
};
