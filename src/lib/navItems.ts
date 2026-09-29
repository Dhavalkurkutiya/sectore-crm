/**
 * Navigation Items Definition
 * Sectore 360 — Phase 1, Part 6 (Production Stabilization)
 */
import {
  LayoutDashboard, Settings, Settings2, Search, Building2, Server,
  ClipboardList, FileText, BarChart3,
  HardHat, Fuel, Clock, Bike, Camera, Gauge, BarChart2, ScrollText,
  Users, Home, Package, PlusCircle, Ticket, LayoutTemplate, Database,
} from 'lucide-react';
import type { NavItem } from '@/types/navigation';

export const navItems: NavItem[] = [
  // ── Main ─────────────────────────────────────────────────
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, group: 'Main', roles: ['superadmin', 'admin', 'manager', 'backoffice'] },

  // ── Customer Portal ───────────────────────────────────────
  { id: 'cust-dashboard', label: 'Dashboard',     path: '/customer/dashboard',    icon: Home,       group: 'My Portal', roles: ['customer'] },
  { id: 'cust-assets',    label: 'My Assets',     path: '/customer/assets',       icon: Package,    group: 'My Portal', roles: ['customer'] },
  { id: 'cust-raise',     label: 'Raise Request', path: '/customer/raise-request',icon: PlusCircle, group: 'My Portal', roles: ['customer'] },
  { id: 'cust-tickets',   label: 'My Tickets',    path: '/customer/tickets',      icon: Ticket,     group: 'My Portal', roles: ['customer'] },
  { id: 'cust-reports',   label: 'My Reports',    path: '/customer/reports',      icon: FileText,   group: 'My Portal', roles: ['customer'] },

  // ── Management ───────────────────────────────────────────
  { id: 'customers', label: 'Customers', path: '/customers', icon: Building2, group: 'Management', roles: ['superadmin', 'admin', 'manager', 'backoffice'] },
  { id: 'assets',    label: 'Assets',    path: '/assets',    icon: Server,    group: 'Management', roles: ['superadmin', 'admin', 'manager', 'backoffice'] },

  // ── Operations ───────────────────────────────────────────
  { id: 'tasks',         label: 'Tasks',         path: '/tasks',         icon: ClipboardList, group: 'Operations', roles: ['superadmin', 'admin', 'manager', 'backoffice'] },
  { id: 'amc-dashboard', label: 'AMC Dashboard', path: '/amc/dashboard', icon: BarChart3,     group: 'Operations', roles: ['superadmin', 'admin', 'manager'] },
  { id: 'amc',           label: 'AMC Contracts', path: '/amc',           icon: FileText,      group: 'Operations', roles: ['superadmin', 'admin', 'manager'] },

  // ── Engineer section (Admin view) ────────────────────────
  { id: 'admin-bike-mgmt',     label: 'Bike Management',    path: '/admin/bikes',           icon: Bike,    group: 'Engineer Ops', roles: ['superadmin', 'admin'] },
  { id: 'admin-odometer',      label: 'Odometer Verify',    path: '/admin/odometer',        icon: Gauge,   group: 'Engineer Ops', roles: ['superadmin', 'admin'] },
  { id: 'admin-fuel',          label: 'Fuel Management',    path: '/admin/fuel',            icon: Fuel,    group: 'Engineer Ops', roles: ['superadmin', 'admin'] },
  { id: 'admin-daily-review',  label: 'Daily Review',       path: '/admin/daily-review',    icon: FileText,group: 'Engineer Ops', roles: ['superadmin', 'admin'] },
  { id: 'engineer-attendance', label: 'Attendance',         path: '/engineer/attendance/history', icon: Clock, group: 'Engineer Ops', roles: ['superadmin', 'admin'] },

  // ── Engineer self-service ─────────────────────────────────
  { id: 'eng-dashboard',  label: 'My Dashboard', path: '/engineer/dashboard',         icon: HardHat,     group: 'Field Service', roles: ['engineer'] },
  { id: 'eng-tasks',      label: 'My Tasks',     path: '/engineer/tasks',             icon: ClipboardList,group: 'Field Service', roles: ['engineer'] },
  { id: 'eng-attendance', label: 'Attendance',   path: '/engineer/attendance/history',icon: Clock,       group: 'Field Service', roles: ['engineer'] },
  { id: 'eng-odo',        label: 'Odometer',     path: '/engineer/odometer',          icon: Camera,      group: 'Field Service', roles: ['engineer'] },
  { id: 'eng-report',     label: 'Daily Report', path: '/engineer/daily-report',      icon: FileText,    group: 'Field Service', roles: ['engineer'] },
  { id: 'eng-bike',       label: 'My Bike',      path: '/engineer/bike',              icon: Bike,        group: 'Field Service', roles: ['engineer'] },
  { id: 'eng-fuel',       label: 'Fuel History', path: '/engineer/fuel/history',      icon: Fuel,        group: 'Field Service', roles: ['engineer'] },

  // ── Reports ───────────────────────────────────────────────
  { id: 'reports', label: 'Reports', path: '/reports', icon: BarChart2, group: 'Reports', roles: ['superadmin', 'admin', 'manager'] },

  // ── Admin Tools ───────────────────────────────────────────
  { id: 'audit-log',      label: 'Audit Log',       path: '/audit-log',           icon: ScrollText,   group: 'Admin', roles: ['superadmin', 'admin'] },
  { id: 'users',          label: 'User Management', path: '/users',               icon: Users,        group: 'Admin', roles: ['superadmin', 'admin'] },
  { id: 'task-templates', label: 'Task Templates',  path: '/tasks/templates',     icon: LayoutTemplate,group: 'Admin', roles: ['superadmin', 'admin'] },

  // ── System ────────────────────────────────────────────────
  { id: 'search',          label: 'Search',          path: '/search',                    icon: Search,    group: 'System' },
  { id: 'settings',        label: 'Settings',        path: '/settings',                  icon: Settings,  group: 'System', roles: ['superadmin', 'admin'] },
  { id: 'master-data',     label: 'Master Data',     path: '/settings/master-data',      icon: Database,  group: 'System', roles: ['superadmin', 'admin'] },
  { id: 'custom-fields',   label: 'Custom Fields',   path: '/settings/custom-fields',    icon: Settings2, group: 'System', roles: ['superadmin', 'admin'] },
  { id: 'company-profile', label: 'Company Profile', path: '/settings/company-profile',  icon: Building2, group: 'System', roles: ['superadmin', 'admin'] },
];


