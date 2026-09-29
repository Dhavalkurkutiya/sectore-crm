/**
 * Route Configuration
 * Sectore 360 — Phase 1, Complete (Parts 1–6)
 */
import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { RouteGuard } from '@/components/common/RouteGuard';
import { PageLoader } from '@/components/shared/Spinner';
import type { ReactNode } from 'react';

/* ── Part 1 pages ─────────────────────────────────────────── */
const LoginPage     = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SearchPage    = lazy(() => import('./pages/SearchPage'));

/* ── Part 2 — Customer Management ───────────────────────── */
const CustomersPage       = lazy(() => import('./pages/customers/CustomersPage'));
const AddCustomerPage     = lazy(() => import('./pages/customers/AddCustomerPage'));
const EditCustomerPage    = lazy(() => import('./pages/customers/EditCustomerPage'));
const CustomerProfilePage = lazy(() => import('./pages/customers/CustomerProfilePage'));

/* ── Part 2 — Asset Management ──────────────────────────── */
const AssetsPage       = lazy(() => import('./pages/assets/AssetsPage'));
const AddAssetPage     = lazy(() => import('./pages/assets/AddAssetPage'));
const EditAssetPage    = lazy(() => import('./pages/assets/EditAssetPage'));
const AssetProfilePage = lazy(() => import('./pages/assets/AssetProfilePage'));

/* ── Part 3 — Task Management ────────────────────────────── */
const TasksPage      = lazy(() => import('./pages/tasks/TasksPage'));
const AddTaskPage    = lazy(() => import('./pages/tasks/AddTaskPage'));
const EditTaskPage   = lazy(() => import('./pages/tasks/EditTaskPage'));
const TaskDetailPage = lazy(() => import('./pages/tasks/TaskDetailPage'));

/* ── Part 4 — AMC Management ─────────────────────────────── */
const AMCDashboardPage = lazy(() => import('./pages/amc/AMCDashboardPage'));
const AMCsPage         = lazy(() => import('./pages/amc/AMCsPage'));
const AddAMCPage       = lazy(() => import('./pages/amc/AddAMCPage'));
const EditAMCPage      = lazy(() => import('./pages/amc/EditAMCPage'));
const AMCProfilePage   = lazy(() => import('./pages/amc/AMCProfilePage'));

/* ── Part 5 — Engineer Portal ────────────────────────────── */
const EngineerDashboardPage  = lazy(() => import('./pages/engineer/EngineerDashboardPage'));
const EngineerTasksPage      = lazy(() => import('./pages/engineer/EngineerTasksPage'));
const EngineerTaskDetailPage = lazy(() => import('./pages/engineer/EngineerTaskDetailPage'));
const AttendanceCheckInPage  = lazy(() => import('./pages/engineer/AttendanceCheckInPage'));
const AttendanceCheckOutPage = lazy(() => import('./pages/engineer/AttendanceCheckOutPage'));
const AttendanceHistoryPage  = lazy(() => import('./pages/engineer/AttendanceHistoryPage'));
const FuelEntryPage          = lazy(() => import('./pages/engineer/FuelEntryPage'));
const FuelHistoryPage        = lazy(() => import('./pages/engineer/FuelHistoryPage'));
const BikeInfoPage           = lazy(() => import('./pages/engineer/BikeInfoPage'));
const OdometerUploadPage     = lazy(() => import('./pages/engineer/OdometerUploadPage'));
const DailyReportPage        = lazy(() => import('./pages/engineer/DailyReportPage'));
const EngineerProfilePage    = lazy(() => import('./pages/engineer/EngineerProfilePage'));

/* ── Part 6 — Admin: Engineer Ops pages ─────────────────── */
const BikeMgmtPage                   = lazy(() => import('./pages/admin/BikeMgmtPage'));
const AdminOdometerVerificationPage  = lazy(() => import('./pages/admin/AdminOdometerVerificationPage'));
const AdminFuelManagementPage        = lazy(() => import('./pages/admin/AdminFuelManagementPage'));
const AdminDailyReviewPage           = lazy(() => import('./pages/admin/AdminDailyReviewPage'));

/* ── Part 6 — Customer Portal ────────────────────────────── */
const CustomerDashboardPage  = lazy(() => import('./pages/customer/CustomerDashboardPage'));
const CustomerAssetsPage     = lazy(() => import('./pages/customer/CustomerAssetsPage'));
const RaiseRequestPage       = lazy(() => import('./pages/customer/RaiseRequestPage'));
const CustomerTicketsPage    = lazy(() => import('./pages/customer/CustomerTicketsPage'));
const CustomerReportsPage    = lazy(() => import('./pages/customer/CustomerReportsPage'));
const CustomerPPage          = lazy(() => import('./pages/customer/CustomerProfilePage'));

/* ── Part 6 — Reports ────────────────────────────────────── */
const ReportsPage              = lazy(() => import('./pages/reports/ReportsPage'));
const TaskReportPage           = lazy(() => import('./pages/reports/TaskReportPage'));
const EngineerPerformancePage  = lazy(() => import('./pages/reports/EngineerPerformancePage'));
const AMCReportPage            = lazy(() => import('./pages/reports/AMCReportPage'));
const AttendanceReportPage     = lazy(() => import('./pages/reports/AttendanceReportPage'));
const FuelReportPage           = lazy(() => import('./pages/reports/FuelReportPage'));
const AssetReportPage          = lazy(() => import('./pages/reports/AssetReportPage'));
const DashboardAnalyticsPage   = lazy(() => import('./pages/reports/DashboardAnalyticsPage'));

/* ── Master Data Management ──────────────────────────────── */
const MasterDataPage       = lazy(() => import('./pages/settings/MasterDataPage'));

/* ── Part 6 — Admin Tools ────────────────────────────────── */
const AuditLogPage         = lazy(() => import('./pages/AuditLogPage'));
const UserManagementPage   = lazy(() => import('./pages/UserManagementPage'));
const AppSettingsPage      = lazy(() => import('./pages/AppSettingsPage'));
const TaskTemplatePage     = lazy(() => import('./pages/tasks/TaskTemplatePage'));
const CompanyProfilePage   = lazy(() => import('./pages/settings/CompanyProfilePage'));
const CustomFieldsPage     = lazy(() => import('./pages/settings/CustomFieldsPage'));


/* ── Part 6 — Error Pages ────────────────────────────────── */
const NotFoundPage      = lazy(() => import('./pages/NotFoundPage'));
const ServerErrorPage   = lazy(() => import('./pages/ServerErrorPage'));
const UnauthorizedPage  = lazy(() => import('./pages/UnauthorizedPage'));

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  public?: boolean;
}

export const routes: RouteConfig[] = [
  /* ── Root redirect ─────────────────────────────── */
  { name: 'Root', path: '/', element: <Navigate to="/dashboard" replace />, public: true },

  /* ── Public / Error ────────────────────────────── */
  {
    name: 'Login', path: '/login', public: true,
    element: (
      <RouteGuard requireAuth={false} redirectIfAuth>
        <Lazy><LoginPage /></Lazy>
      </RouteGuard>
    ),
  },
  { name: '403', path: '/403', public: true, element: <Lazy><UnauthorizedPage /></Lazy> },
  { name: '500', path: '/500', public: true, element: <Lazy><ServerErrorPage /></Lazy> },
  { name: '404', path: '/404', public: true, element: <Lazy><NotFoundPage /></Lazy> },

  /* ── Part 1 — Core ──────────────────────────────── */
  {
    name: 'Dashboard', path: '/dashboard',
    element: <RouteGuard><Lazy><DashboardPage /></Lazy></RouteGuard>,
  },
  {
    name: 'Search', path: '/search',
    element: <RouteGuard><Lazy><SearchPage /></Lazy></RouteGuard>,
  },

  /* ── Part 2 — Customers ────────────────────────── */
  {
    name: 'Customers', path: '/customers',
    element: (
      <RouteGuard requireAction="view" requireResource="customers">
        <Lazy><CustomersPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Add Customer', path: '/customers/new',
    element: (
      <RouteGuard requireAction="create" requireResource="customers">
        <Lazy><AddCustomerPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Edit Customer', path: '/customers/:id/edit',
    element: (
      <RouteGuard requireAction="edit" requireResource="customers">
        <Lazy><EditCustomerPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Customer Profile', path: '/customers/:id',
    element: (
      <RouteGuard requireAction="view" requireResource="customers">
        <Lazy><CustomerProfilePage /></Lazy>
      </RouteGuard>
    ),
  },

  /* ── Part 2 — Assets ───────────────────────────── */
  {
    name: 'Assets', path: '/assets',
    element: (
      <RouteGuard requireAction="view" requireResource="assets">
        <Lazy><AssetsPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Add Asset', path: '/assets/new',
    element: (
      <RouteGuard requireAction="create" requireResource="assets">
        <Lazy><AddAssetPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Edit Asset', path: '/assets/:id/edit',
    element: (
      <RouteGuard requireAction="edit" requireResource="assets">
        <Lazy><EditAssetPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Asset Profile', path: '/assets/:id',
    element: (
      <RouteGuard requireAction="view" requireResource="assets">
        <Lazy><AssetProfilePage /></Lazy>
      </RouteGuard>
    ),
  },

  /* ── Part 3 — Tasks ────────────────────────────── */
  {
    name: 'Tasks', path: '/tasks',
    element: (
      <RouteGuard requireAction="view" requireResource="tasks">
        <Lazy><TasksPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Add Task', path: '/tasks/new',
    element: (
      <RouteGuard requireAction="create" requireResource="tasks">
        <Lazy><AddTaskPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Edit Task', path: '/tasks/:id/edit',
    element: (
      <RouteGuard requireAction="edit" requireResource="tasks">
        <Lazy><EditTaskPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Task Detail', path: '/tasks/:id',
    element: (
      <RouteGuard requireAction="view" requireResource="tasks">
        <Lazy><TaskDetailPage /></Lazy>
      </RouteGuard>
    ),
  },

  /* ── Part 4 — AMC ──────────────────────────────── */
  {
    name: 'AMC Dashboard', path: '/amc/dashboard',
    element: (
      <RouteGuard requireAction="view" requireResource="amc">
        <Lazy><AMCDashboardPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'AMC Contracts', path: '/amc',
    element: (
      <RouteGuard requireAction="view" requireResource="amc">
        <Lazy><AMCsPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Add AMC', path: '/amc/new',
    element: (
      <RouteGuard requireAction="create" requireResource="amc">
        <Lazy><AddAMCPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Edit AMC', path: '/amc/:id/edit',
    element: (
      <RouteGuard requireAction="edit" requireResource="amc">
        <Lazy><EditAMCPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'AMC Profile', path: '/amc/:id',
    element: (
      <RouteGuard requireAction="view" requireResource="amc">
        <Lazy><AMCProfilePage /></Lazy>
      </RouteGuard>
    ),
  },

  /* ── Part 5 — Engineer Portal ──────────────────── */
  {
    name: 'Engineer Dashboard', path: '/engineer/dashboard',
    element: <RouteGuard><Lazy><EngineerDashboardPage /></Lazy></RouteGuard>,
  },
  {
    name: 'Engineer Tasks', path: '/engineer/tasks',
    element: <RouteGuard><Lazy><EngineerTasksPage /></Lazy></RouteGuard>,
  },
  {
    name: 'Engineer Task Detail', path: '/engineer/tasks/:taskId',
    element: <RouteGuard><Lazy><EngineerTaskDetailPage /></Lazy></RouteGuard>,
  },
  {
    name: 'Attendance Check-In', path: '/engineer/attendance/checkin',
    element: <RouteGuard><Lazy><AttendanceCheckInPage /></Lazy></RouteGuard>,
  },
  {
    name: 'Attendance Check-Out', path: '/engineer/attendance/checkout',
    element: <RouteGuard><Lazy><AttendanceCheckOutPage /></Lazy></RouteGuard>,
  },
  {
    name: 'Attendance History', path: '/engineer/attendance/history',
    element: <RouteGuard><Lazy><AttendanceHistoryPage /></Lazy></RouteGuard>,
  },
  {
    name: 'Fuel Entry', path: '/engineer/fuel/new',
    element: <RouteGuard><Lazy><FuelEntryPage /></Lazy></RouteGuard>,
  },
  {
    name: 'Fuel History', path: '/engineer/fuel/history',
    element: <RouteGuard><Lazy><FuelHistoryPage /></Lazy></RouteGuard>,
  },
  {
    name: 'Bike Info', path: '/engineer/bike',
    element: <RouteGuard><Lazy><BikeInfoPage /></Lazy></RouteGuard>,
  },
  {
    name: 'Odometer Upload', path: '/engineer/odometer',
    element: <RouteGuard><Lazy><OdometerUploadPage /></Lazy></RouteGuard>,
  },
  {
    name: 'Daily Report', path: '/engineer/daily-report',
    element: <RouteGuard><Lazy><DailyReportPage /></Lazy></RouteGuard>,
  },
  {
    name: 'Engineer Profile', path: '/engineer/profile',
    element: <RouteGuard><Lazy><EngineerProfilePage /></Lazy></RouteGuard>,
  },

  /* ── Admin — Engineer Ops ──────────────────────── */
  {
    name: 'Bike Management', path: '/admin/bikes',
    element: (
      <RouteGuard requireAction="view" requireResource="settings">
        <Lazy><BikeMgmtPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Odometer Verification', path: '/admin/odometer',
    element: (
      <RouteGuard requireAction="view" requireResource="settings">
        <Lazy><AdminOdometerVerificationPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Fuel Management', path: '/admin/fuel',
    element: (
      <RouteGuard requireAction="view" requireResource="settings">
        <Lazy><AdminFuelManagementPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Daily Review', path: '/admin/daily-review',
    element: (
      <RouteGuard requireAction="view" requireResource="settings">
        <Lazy><AdminDailyReviewPage /></Lazy>
      </RouteGuard>
    ),
  },

  /* ── Part 6 — Customer Portal ─────────────────── */
  {
    name: 'Customer Dashboard', path: '/customer/dashboard',
    element: <RouteGuard><Lazy><CustomerDashboardPage /></Lazy></RouteGuard>,
  },
  {
    name: 'Customer Assets', path: '/customer/assets',
    element: <RouteGuard><Lazy><CustomerAssetsPage /></Lazy></RouteGuard>,
  },
  {
    name: 'Raise Request', path: '/customer/raise-request',
    element: <RouteGuard><Lazy><RaiseRequestPage /></Lazy></RouteGuard>,
  },
  {
    name: 'Customer Tickets', path: '/customer/tickets',
    element: <RouteGuard><Lazy><CustomerTicketsPage /></Lazy></RouteGuard>,
  },
  {
    name: 'Customer Reports', path: '/customer/reports',
    element: <RouteGuard><Lazy><CustomerReportsPage /></Lazy></RouteGuard>,
  },
  {
    name: 'Customer Profile', path: '/customer/profile',
    element: <RouteGuard><Lazy><CustomerPPage /></Lazy></RouteGuard>,
  },

  /* ── Part 6 — Reports ──────────────────────────── */
  {
    name: 'Reports', path: '/reports',
    element: (
      <RouteGuard requireAction="view" requireResource="reports">
        <Lazy><ReportsPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Task Report', path: '/reports/tasks',
    element: (
      <RouteGuard requireAction="view" requireResource="reports">
        <Lazy><TaskReportPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Engineer Performance', path: '/reports/engineer-performance',
    element: (
      <RouteGuard requireAction="view" requireResource="reports">
        <Lazy><EngineerPerformancePage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'AMC Report', path: '/reports/amc',
    element: (
      <RouteGuard requireAction="view" requireResource="reports">
        <Lazy><AMCReportPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Attendance Report', path: '/reports/attendance',
    element: (
      <RouteGuard requireAction="view" requireResource="reports">
        <Lazy><AttendanceReportPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Fuel Report', path: '/reports/fuel',
    element: (
      <RouteGuard requireAction="view" requireResource="reports">
        <Lazy><FuelReportPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Asset Report', path: '/reports/assets',
    element: (
      <RouteGuard requireAction="view" requireResource="reports">
        <Lazy><AssetReportPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Dashboard Analytics', path: '/reports/analytics',
    element: (
      <RouteGuard requireAction="view" requireResource="reports">
        <Lazy><DashboardAnalyticsPage /></Lazy>
      </RouteGuard>
    ),
  },

  /* ── Intelligent Task Templates (Admin) ───────── */
  {
    name: 'Task Templates', path: '/tasks/templates',
    element: (
      <RouteGuard requireAction="view" requireResource="settings">
        <Lazy><TaskTemplatePage /></Lazy>
      </RouteGuard>
    ),
  },

  /* ── Part 6 — Admin Tools ──────────────────────── */
  {
    name: 'Audit Log', path: '/audit-log',
    element: (
      <RouteGuard requireAction="view" requireResource="audit_log">
        <Lazy><AuditLogPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'User Management', path: '/users',
    element: (
      <RouteGuard requireAction="view" requireResource="users">
        <Lazy><UserManagementPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Settings', path: '/settings',
    element: (
      <RouteGuard requireAction="view" requireResource="settings">
        <Lazy><AppSettingsPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Master Data', path: '/settings/master-data',
    element: (
      <RouteGuard requireAction="view" requireResource="settings">
        <Lazy><MasterDataPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Custom Fields', path: '/settings/custom-fields',
    element: (
      <RouteGuard requireAction="view" requireResource="settings">
        <Lazy><CustomFieldsPage /></Lazy>
      </RouteGuard>
    ),
  },
  {
    name: 'Company Profile', path: '/settings/company-profile',
    element: (
      <RouteGuard requireAction="view" requireResource="settings">
        <Lazy><CompanyProfilePage /></Lazy>
      </RouteGuard>
    ),
  },
  /* ── Catch-all 404 ─────────────────────────────── */
  { name: 'Not Found', path: '*', public: true, element: <Lazy><NotFoundPage /></Lazy> },
];
