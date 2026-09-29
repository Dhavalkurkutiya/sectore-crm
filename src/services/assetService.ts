/**
 * Asset Service — Supabase-backed
 * Sectore 360 — Production
 * Cache: assets:all (5 min TTL), assets:cust:<id> (5 min TTL)
 * Invalidated on create / update / softDelete / restore
 */
import type { Asset, AssetFormData } from '@/types/customer';
import { assetsApi } from '@/lib/api';
import { cached, invalidate, invalidatePrefix, CK } from '@/lib/appCache';
import { assetHistoryService } from '@/services/assetHistoryService';

export const assetService = {
  async list(includeRetired = false): Promise<Asset[]> {
    const all = await cached(CK.assets, () => assetsApi.list(true));
    return includeRetired ? all : all.filter((a) => a.status !== 'Retired');
  },

  /** All assets (including retired). Cache-first. */
  async getAll(): Promise<Asset[]> {
    return cached(CK.assets, () => assetsApi.list(true));
  },

  async getById(id: string): Promise<Asset | null> {
    return assetsApi.getById(id);
  },

  /** Assets for a specific customer. Cache-first per customer. */
  async getByCustomer(customerId: string, includeRetired = false): Promise<Asset[]> {
    const all = await cached(
      CK.assetsByCustomer(customerId),
      () => assetsApi.getByCustomer(customerId, true),
    );
    return includeRetired ? all : all.filter((a) => a.status !== 'Retired');
  },

  async checkDuplicateSerial(serial: string, excludeId?: string): Promise<boolean> {
    return assetsApi.checkDuplicateSerial(serial, excludeId);
  },

  async create(data: AssetFormData, createdBy: string): Promise<Asset> {
    const asset = await assetsApi.create(data, createdBy);
    // Invalidate global + per-customer caches so next read is fresh
    invalidate(CK.assets);
    if (data.customerId) invalidate(CK.assetsByCustomer(data.customerId));
    // Log history — fire-and-forget, never block caller
    assetHistoryService.logCreated(asset, createdBy).catch(() => undefined);
    return asset;
  },

  async update(id: string, data: Partial<AssetFormData>, updatedBy = 'Admin'): Promise<Asset> {
    // Fetch old state for diff before overwriting
    const oldAsset = await assetsApi.getById(id);
    const asset = await assetsApi.update(id, data as unknown as Record<string, unknown>);
    invalidate(CK.assets);
    if (data.customerId) invalidate(CK.assetsByCustomer(data.customerId));
    // Diff and log only changed fields
    if (oldAsset) {
      assetHistoryService.logUpdated(oldAsset, data, updatedBy).catch(() => undefined);
    }
    return asset;
  },

  async softDelete(id: string, deletedBy = 'Admin'): Promise<void> {
    await assetsApi.setStatus(id, 'Retired');
    invalidate(CK.assets);
    invalidatePrefix('assets:cust:');
    assetHistoryService.logDeactivated(id, deletedBy).catch(() => undefined);
  },

  async restore(id: string, restoredBy = 'Admin'): Promise<void> {
    await assetsApi.setStatus(id, 'Active');
    invalidate(CK.assets);
    invalidatePrefix('assets:cust:');
    assetHistoryService.logRestored(id, restoredBy).catch(() => undefined);
  },

  getAllSync(): Asset[] { return []; },

  search(query: string): Asset[] { void query; return []; },
};
