/**
 * Navigation & Sidebar Types
 * Sectore 360 — Phase 1, Part 1
 */
import type { LucideIcon } from 'lucide-react';
import type { UserRole } from './auth';

/** A single sidebar navigation item */
export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  /** Roles that can see this nav item. If undefined, all roles see it. */
  roles?: UserRole[];
  /** Child items for grouped navigation (future use) */
  children?: NavItem[];
  /** Badge count (e.g. pending tasks) */
  badge?: number;
  /** Visual group separator label */
  group?: string;
}

/** Sidebar display state */
export interface SidebarState {
  isCollapsed: boolean;
  isMobileOpen: boolean;
}
