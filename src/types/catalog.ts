/**
 * Catalog Types — Asset Categories & Device Types
 * Sectore 360 — Phase 1, Part 6 Enhancement
 *
 * Replaces the hardcoded AssetCategory string union with a fully managed
 * catalog that admins can extend without code changes.
 */

export interface ManagedCategory {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ManagedDeviceType {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type CategoryFormData = Omit<ManagedCategory, 'id' | 'createdAt' | 'updatedAt'>;
export type DeviceTypeFormData = Omit<ManagedDeviceType, 'id' | 'createdAt' | 'updatedAt'>;
