/**
 * Master Data Service — Sectore 360
 * Provides CRUD + recently-used caching for all master lookup tables.
 */
import { masterDataApi, assetCustomFieldsApi } from '@/lib/api';
import type { MasterItem, MasterItemFormData, AssetCustomField, AssetCustomFieldFormData } from '@/types/master';

// In-memory cache: masterType → items[]
const cache = new Map<string, { items: MasterItem[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function isFresh(ts: number) { return Date.now() - ts < CACHE_TTL; }
function invalidate(masterType: string) { cache.delete(masterType); }

export const masterDataService = {
  async list(masterType: string, includeInactive = false): Promise<MasterItem[]> {
    const key = `${masterType}:${includeInactive}`;
    const cached = cache.get(key);
    if (cached && isFresh(cached.ts)) return cached.items;
    const items = await masterDataApi.listByType(masterType, includeInactive);
    cache.set(key, { items, ts: Date.now() });
    return items;
  },

  async search(masterType: string, query: string): Promise<MasterItem[]> {
    if (!query) return this.list(masterType);
    return masterDataApi.search(masterType, query);
  },

  async create(data: MasterItemFormData, createdBy: string): Promise<MasterItem> {
    const item = await masterDataApi.create(data, createdBy);
    invalidate(data.masterType);
    invalidate(`${data.masterType}:true`);
    return item;
  },

  async update(id: string, masterType: string, data: Partial<MasterItemFormData>): Promise<MasterItem> {
    const item = await masterDataApi.update(id, data);
    invalidate(masterType);
    invalidate(`${masterType}:true`);
    return item;
  },

  async setActive(id: string, masterType: string, isActive: boolean): Promise<void> {
    await masterDataApi.setActive(id, isActive);
    invalidate(masterType);
    invalidate(`${masterType}:true`);
  },

  async delete(id: string, masterType: string): Promise<void> {
    await masterDataApi.delete(id);
    invalidate(masterType);
    invalidate(`${masterType}:true`);
  },

  async quickAdd(masterType: string, value: string, createdBy: string): Promise<MasterItem> {
    const item = await masterDataApi.quickAdd(masterType, value, createdBy);
    invalidate(masterType);
    return item;
  },

  exportCsv(items: MasterItem[]): void {
    const csv = masterDataApi.exportCsv(items);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `master-data-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  clearCache() { cache.clear(); },
};

export const assetCustomFieldService = {
  async listByCategory(category: string): Promise<AssetCustomField[]> {
    return assetCustomFieldsApi.listByCategory(category);
  },

  async create(data: AssetCustomFieldFormData): Promise<AssetCustomField> {
    return assetCustomFieldsApi.create(data);
  },

  async update(id: string, data: Partial<AssetCustomFieldFormData>): Promise<AssetCustomField> {
    return assetCustomFieldsApi.update(id, data);
  },

  async delete(id: string): Promise<void> {
    return assetCustomFieldsApi.delete(id);
  },
};
