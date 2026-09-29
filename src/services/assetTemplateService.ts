/**
 * Asset Template Service
 * Sectore 360 — Template-based asset creation
 */
import { assetTemplatesApi, assetRelationshipsApi, assetTimelineApi } from '@/lib/api';
import type { AssetTemplate, AssetTemplateFormData, AssetRelationship, AssetTimelineEvent, AssetTimelineEventFormData } from '@/lib/api';

// In-memory cache
const templateCache = new Map<string, { items: AssetTemplate[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export const assetTemplateService = {
  async list(category?: string): Promise<AssetTemplate[]> {
    const key = `templates:${category ?? 'all'}`;
    const cached = templateCache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.items;
    const items = await assetTemplatesApi.list(category);
    templateCache.set(key, { items, ts: Date.now() });
    return items;
  },

  async getById(id: string): Promise<AssetTemplate | null> {
    return assetTemplatesApi.getById(id);
  },

  async create(data: AssetTemplateFormData, createdBy: string): Promise<AssetTemplate> {
    const item = await assetTemplatesApi.create(data, createdBy);
    templateCache.clear();
    return item;
  },

  async update(id: string, data: Partial<AssetTemplateFormData>): Promise<AssetTemplate> {
    const item = await assetTemplatesApi.update(id, data);
    templateCache.clear();
    return item;
  },

  async delete(id: string): Promise<void> {
    await assetTemplatesApi.delete(id);
    templateCache.clear();
  },

  clearCache() { templateCache.clear(); },
};

export const assetRelationshipService = {
  async getChildren(parentId: string): Promise<AssetRelationship[]> {
    return assetRelationshipsApi.getByParent(parentId);
  },

  async getParent(childId: string): Promise<AssetRelationship | null> {
    const rels = await assetRelationshipsApi.getByChild(childId);
    return rels[0] ?? null;
  },

  async addRelationship(parentId: string, childId: string, relationship: string, createdBy: string): Promise<void> {
    return assetRelationshipsApi.add(parentId, childId, relationship, createdBy);
  },

  async removeRelationship(id: string): Promise<void> {
    return assetRelationshipsApi.remove(id);
  },
};

export const assetTimelineService = {
  async list(assetId: string): Promise<AssetTimelineEvent[]> {
    return assetTimelineApi.list(assetId);
  },

  async addEvent(data: AssetTimelineEventFormData, createdBy: string): Promise<AssetTimelineEvent> {
    return assetTimelineApi.add(data, createdBy);
  },

  async deleteEvent(id: string): Promise<void> {
    return assetTimelineApi.delete(id);
  },

  /** Log installation automatically on asset creation */
  async logInstallation(assetId: string, assetCode: string, createdBy: string): Promise<void> {
    await assetTimelineApi.add({
      assetId,
      eventType: 'installation',
      title: `Asset ${assetCode} installed`,
      performedBy: createdBy,
      eventDate: new Date().toISOString(),
    }, createdBy);
  },
};

export type { AssetTemplate, AssetTemplateFormData, AssetRelationship, AssetTimelineEvent };
