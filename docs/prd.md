# Requirements Document

## 1. Application Overview

### 1.1 Application Name
Sectore 360 — Phase 1 Part 6 (Production Stabilization Sprint): Customer Portal, Reports, Security, Production Readiness & Engineer Operations Enhancement

### 1.2 Application Description
This document defines Phase 1, Part 6 of Sectore 360, the final part of Phase 1, with Production Stabilization Sprint updates. Part 6 builds upon the foundation established in Parts 1-5 (authentication, role-based access, dashboard layout, navigation, theming, design system, shared component library, Customer Management, Asset Management, Service Task Management, AMC Management, Engineer Operations & Field Service Portal).

Part 6 introduces:
- RBAC Permission System with granular access control
- Customer Portal for customer self-service
- Reports Module for business intelligence
- Audit Log for compliance and tracking
- User Management for admin operations
- Application Settings for system configuration
- Error Pages and Production Readiness features
- Security enhancements at frontend layer
- **Production Stabilization Sprint Enhancements:**
  + Attendance Insert/Update Fix (Highest Priority)
  + Bike Management Module (Admin/SuperAdmin only)
  + Odometer Workflow Redesign (Photo-based, no manual entry)
  + Admin Odometer Verification Page
  + Fuel Management (Admin-only entry)
  + Engineer Daily Report (Mandatory before Check Out)
  + Admin Daily Review Dashboard
  + Engineer Dashboard Updates
  + Database Integrity Verification

**Technical Implementation:**
- Frontend-only mock implementation using service layer with in-memory mock data
- Future-ready architecture for REST API + Prisma + PostgreSQL integration
- **Production Sprint:** Supabase integration for Attendance, Bike, Odometer Photos, Fuel Logs, Daily Reports
- Tech stack: React + TypeScript + Vite + Tailwind CSS + shadcn/ui + React Router 7 + react-hook-form + zod + Sonner toasts + Lucide React
- Responsive design
- Permission-based UI rendering

**Parts 1-5 Foundation (Already Built):**
- Part 1: Authentication, session management, role-based permissions (SuperAdmin/Admin/Manager/Back Office/Engineer/Customer), dashboard shell, sidebar navigation, top navigation bar, theme system, branding system, responsive layout, shared component library, design system
- Part 2: Customer Management, Asset Management, Global Search
- Part 3: Service Task Management, Task Dashboard Widgets
- Part 4: AMC Management, Dashboard AMC Widgets
- Part 5: Engineer Operations & Field Service Portal (Attendance, Task Management, Fuel Management, Bike Management, GPS Capture, Maps Integration, Offline Support)

## 2. Users and Usage Scenarios

### 2.1 Target Users

**SuperAdmin**
- Full system access
- Manage all users, roles, permissions
- View all reports and audit logs
- Configure application settings
- Access all modules
- Manage bike registration, assignment, deletion
- Verify odometer readings
- Enter fuel logs
- Review engineer daily reports

**Admin**
- Manage customers, assets, tasks, AMC, engineers
- View all reports
- View audit logs
- Manage users (except SuperAdmin)
- Configure settings (limited)
- Cannot delete critical data without SuperAdmin approval
- Manage bike registration, assignment, deletion
- Verify odometer readings
- Enter fuel logs
- Review engineer daily reports

**Manager**
- View and create customers, assets, tasks, AMC
- Edit customers, tasks, AMC
- View reports
- Cannot delete data
- Cannot access settings or user management
- Cannot view audit logs
- Cannot manage bikes, odometer verification, fuel logs

**Back Office**
- Create and edit customers, tasks
- View assets
- Upload documents
- Cannot delete data
- Cannot access settings, user management, reports, audit logs
- Cannot manage bikes, odometer verification, fuel logs

**Engineer**
- View and update assigned tasks only
- View assigned customers and assets only
- Manage own attendance (Check In/Check Out with GPS)
- Upload Morning Odometer Photo and Evening Odometer Photo
- Submit Daily Report (mandatory before Check Out)
- View assigned bike (read-only)
- Cannot enter manual odometer readings
- Cannot add fuel entries
- Cannot access admin functions, reports, settings

**Customer**
- View own company data only
- View own assets (read-only)
- Raise service requests
- Track own tickets
- Download own service reports
- Update own contact information
- Change own password
- Cannot see other customers, engineers, internal data

### 2.2 Core Usage Scenarios

**Engineer Attendance & Odometer Workflow (Production Stabilization Sprint):**
Engineer opens mobile app at 09:00 AM, clicks Check In button, system captures GPS location and device info, validates required fields, sends API request to Supabase, inserts attendance record (User ID, Engineer ID, Date, Check In Time, GPS, Device, Status: Checked In, Created At, Updated At), verifies RLS policy, commits to database, returns success response, updates Engineer Dashboard showing Attendance Status: Checked In, Check In Time: 09:00 AM. Engineer clicks Upload Morning Odometer Photo, captures photo of bike odometer, system saves photo with metadata (Engineer ID, Date, Time: 09:00 AM, GPS, Photo URL, Bike ID), uploads to storage, displays confirmation message. Engineer completes assigned tasks throughout the day. At 06:00 PM, Engineer clicks Upload Evening Odometer Photo, captures photo of bike odometer, system saves photo with metadata (Engineer ID, Date, Time: 06:00 PM, GPS, Photo URL, Bike ID), uploads to storage. Engineer clicks Daily Report, system auto-fills read-only fields (Attendance Status: Checked In, Check In Time: 09:00 AM, Check Out Time: Not yet, Assigned Tasks: 5, Completed Tasks: 4, Pending Tasks: 1, Morning Odometer Photo: Uploaded, Evening Odometer Photo: Uploaded), Engineer enters Parts Required, Customer Follow-up, Issues Faced, Tomorrow's Priority, Remarks, optionally uploads Site Photos, Bills, Documents, clicks Submit. System validates all required fields, saves Daily Report, displays success message. Engineer clicks Check Out button, system verifies Daily Report submitted, captures GPS location, sends API request to Supabase, updates attendance record (Check Out Time: 06:00 PM, Working Hours: 9 hours, Status: Checked Out, Updated At), verifies RLS policy, commits to database, returns success response, updates Engineer Dashboard showing Attendance Status: Checked Out, Check Out Time: 06:00 PM, Working Hours: 9 hours.

**Admin Odometer Verification & Fuel Entry (Production Stabilization Sprint):**
Admin logs in at 10:00 AM, navigates to Admin Daily Review Dashboard, views list of engineers with attendance status, odometer photo status, daily report status. Admin clicks Engineer John Doe, views Morning Odometer Photo (uploaded at 09:00 AM with GPS), views Evening Odometer Photo (uploaded at 06:00 PM with GPS), clicks Verify Odometer button, enters Morning Reading: 12345 KM, enters Evening Reading: 12445 KM, system calculates KM Travelled: 100 KM, Running Vehicle KM: 12445 KM, Distance: 100 KM, clicks Save. System updates odometer verification record, displays success message. Admin navigates to Fuel Management, clicks Add Fuel Entry, selects Date: 2026-07-25, selects Vehicle: Bike 001 (John Doe), enters Odometer: 12445 KM, enters Fuel Quantity: 5 Litres, enters Amount: ₹500, enters Fuel Station: Shell Petrol Pump, enters Invoice Number: INV-12345, optionally uploads Fuel Bill Photo, clicks Save. System calculates Mileage: 20 KM/L (100 KM / 5 L), Fuel Cost per KM: ₹5 (₹500 / 100 KM), saves fuel log, displays success message. Admin navigates back to Admin Daily Review Dashboard, views John Doe's record showing Odometer Verified, Fuel Entry Added, clicks Approve Daily Report, system updates daily report status to Approved, displays success message.

**Admin Bike Management (Production Stabilization Sprint):**
Admin logs in, navigates to Bike Management, clicks Register Bike, fills form (Vehicle Number: MH-01-AB-1234, Brand: Honda, Model: Activa, Fuel Type: Petrol, Initial Odometer: 12000 KM, Average Mileage: 40 KM/L, Insurance Expiry: 2027-07-25, PUC Expiry: 2026-12-25, Service Due: 2026-09-25), clicks Save. System creates new bike record, displays success message. Admin clicks Assign Bike, selects Engineer: John Doe, selects Bike: MH-01-AB-1234, clicks Save. System updates bike assignment, displays success message. Engineer John Doe logs in, navigates to Engineer Dashboard, views Assigned Bike: MH-01-AB-1234 (Honda Activa) in read-only mode.

**Customer Self-Service Scenario:**
Customer logs in at 10:00 AM, navigates to Customer Dashboard, views 2 active AMC contracts, 1 open ticket, 3 completed tickets, 2 upcoming visits. Customer clicks Raise Service Request, fills form (asset selection, issue description, priority, preferred visit date), submits request. System creates new task, assigns to back office for review, displays confirmation message with ticket number. Customer navigates to Track Tickets, views newly created ticket with status Pending, clicks ticket to view details.

**Admin Report Generation Scenario:**
Admin logs in, navigates to Reports Dashboard, clicks Task Report, selects date range (2026-07-01 to 2026-07-21), filters by status (Completed), filters by engineer (John Doe), clicks Generate Report. System displays task list with task number, customer, asset, completion date, resolution time. Admin clicks Export PDF, system generates PDF report, downloads to device. Admin navigates to Engineer Performance Report, selects date range (2026-07-01 to 2026-07-21), views metrics (tasks completed: 45, avg resolution time: 2.5 hours, attendance rate: 95%, fuel cost: ₹12,000). Admin clicks Export Excel, system generates Excel file, downloads to device.

**SuperAdmin User Management Scenario:**
SuperAdmin logs in, navigates to User Management, clicks Create Engineer, fills form (name: Jane Smith, email: jane@example.com, mobile: 9876543210, specialization: HVAC, role: Engineer), uploads profile photo, clicks Save. System creates new engineer user, sends welcome email with login credentials (structure only). SuperAdmin navigates to Roles & Permissions, views permission matrix table (roles vs resources/actions), updates Manager role to allow viewing audit logs, clicks Save. System updates permission matrix, displays success message.

**Admin Audit Log Review Scenario:**
Admin logs in, navigates to Audit Log, filters by date range (2026-07-20 to 2026-07-21), filters by event type (Delete), views 2 delete events (Customer deleted by Admin at 2026-07-20 14:30, Asset deleted by Admin at 2026-07-21 09:15). Admin clicks first event, views details (user: admin@example.com, role: Admin, IP: 192.168.1.100, resource: Customer ID 123, old value: Company ABC, new value: null). Admin clicks Export CSV, system generates CSV file with all audit log records, downloads to device.

## 3. Page Structure and Functionality

### 3.1 Page Structure

```
Sectore 360 (Part 6 Extension + Production Stabilization Sprint)
├── RBAC Permission System
│   ├── usePermissions Hook
│   ├── PermissionGuard Component
│   └── Permission Matrix
├── Customer Portal
│   ├── Customer Dashboard
│   ├── My Assets
│   ├── Raise Service Request
│   ├── Track Tickets
│   ├── Download Reports
│   ├── Update Contact Person
│   └── Change Password
├── Reports Module
│   ├── Reports Dashboard
│   ├── Task Report
│   ├── Engineer Performance Report
│   ├── AMC Report
│   ├── Attendance Report
│   ├── Fuel Report
│   ├── Asset Report
│   └── Dashboard Analytics
├── Audit Log
│   └── Audit Log List
├── User Management
│   ├── User List
│   ├── Create Engineer
│   ├── Edit Engineer
│   └── User Login History
├── Application Settings
│   ├── Company Profile
│   ├── Roles & Permissions
│   ├── Task Categories
│   ├── Asset Categories
│   ├── Status & Priority
│   └── Email Templates
├── Error Pages
│   ├── 404 Not Found
│   ├── 500 Server Error
│   ├── 403 Unauthorized
│   └── Session Timeout Dialog
├── Security Enhancements
│   ├── Route-Level Permission Guards
│   ├── Input Validation
│   ├── File Upload Validation
│   └── Error Boundaries
└── Production Stabilization Sprint (NEW)
    ├── Bike Management (Admin/SuperAdmin)
    │   ├── Bike List
    │   ├── Register Bike
    │   ├── Edit Bike
    │   ├── Delete Bike
    │   └── Assign Bike to Engineer
    ├── Odometer Management
    │   ├── Engineer: Upload Morning Odometer Photo
    │   ├── Engineer: Upload Evening Odometer Photo
    │   └── Admin: Odometer Verification Page
    ├── Fuel Management (Admin Only)
    │   ├── Fuel Log List
    │   └── Add Fuel Entry
    ├── Engineer Daily Report
    │   ├── Daily Report Form (Engineer)
    │   └── Daily Report Submission
    ├── Admin Daily Review Dashboard
    │   ├── Engineer Daily Summary List
    │   ├── View Engineer Details
    │   ├── Verify Odometer
    │   ├── Review Daily Report
    │   └── Approve/Send Back
    ├── Engineer Dashboard (Updated)
    │   ├── Attendance Status Widget
    │   ├── Tasks Widget
    │   ├── Assigned Bike Widget
    │   ├── Odometer Photo Status Widget
    │   ├── Daily Report Status Widget
    │   └── Quick Actions
    └── Attendance Fix (Highest Priority)
        ├── Check In Flow
        ├── Check Out Flow
        ├── Supabase Insert/Update
        ├── RLS Verification
        └── Dashboard Update
```

### 3.2 RBAC Permission System

#### 3.2.1 usePermissions Hook

**Purpose:** Provide permission checking logic throughout application

**Functionality:**
- Returns can(action, resource) function
- action: view, create, edit, delete, manage, export
- resource: customers, assets, tasks, amc, engineers, reports, settings, audit_log, documents, users, bikes, odometer, fuel, daily_reports
- Checks current user role against permission matrix
- Returns boolean (true if permitted, false if not)

**Usage Example:**
- const { can } = usePermissions()
- if (can('manage', 'bikes')) { display bike management menu }

#### 3.2.2 PermissionGuard Component

**Purpose:** Wrap UI elements with permission-based rendering

**Functionality:**
- Props: action, resource, fallback (optional)
- Renders children if user has permission
- Renders fallback or null if user lacks permission

**Usage Example:**
- <PermissionGuard action=\"manage\" resource=\"bikes\"><Button>Register Bike</Button></PermissionGuard>

#### 3.2.3 Permission Matrix (Updated)

**SuperAdmin:**
- All resources: view, create, edit, delete, manage, export
- bikes, odometer, fuel, daily_reports: view, create, edit, delete, manage, export

**Admin:**
- customers, assets, tasks, amc, engineers, documents: view, create, edit, delete, export
- reports, audit_log: view, export
- settings, users: view, create, edit, manage
- bikes, odometer, fuel, daily_reports: view, create, edit, delete, manage, export

**Manager:**
- customers, assets, tasks, amc: view, create, edit, export
- engineers: view
- reports: view, export
- settings, users, audit_log, documents, bikes, odometer, fuel, daily_reports: no access

**Back Office:**
- customers, tasks: view, create, edit
- assets: view
- documents: view, create
- amc, engineers, reports, settings, users, audit_log, bikes, odometer, fuel, daily_reports: no access

**Engineer:**
- tasks (assigned only): view, edit
- customers (assigned only): view
- assets (assigned only): view
- bikes (assigned only): view (read-only)
- odometer (own only): create (upload photos only)
- daily_reports (own only): create, view
- All other resources: no access

**Customer:**
- tasks (own company only): view, create
- assets (own company only): view
- documents (own company only): view
- reports (own company only): view, export
- All other resources: no access

#### 3.2.4 Route Protection (Updated)

**Functionality:**
- All existing route pages wrapped with permission checks
- Unauthorized access redirects to /403 Unauthorized page
- Routes requiring specific permissions:
  + /customers: require can('view', 'customers')
  + /assets: require can('view', 'assets')
  + /tasks: require can('view', 'tasks')
  + /amc: require can('view', 'amc')
  + /reports: require can('view', 'reports')
  + /audit-log: require can('view', 'audit_log')
  + /users: require can('view', 'users')
  + /settings: require can('view', 'settings')
  + /bikes: require can('manage', 'bikes')
  + /odometer-verification: require can('manage', 'odometer')
  + /fuel: require can('manage', 'fuel')
  + /daily-review: require can('manage', 'daily_reports')

#### 3.2.5 Global Search RBAC Update

**Functionality:**
- Filter search results based on user permissions
- Engineer: search only assigned tasks, customers, assets, own bike
- Customer: search only own company tasks, assets
- Manager/Admin/SuperAdmin: search all data
- Back Office: search customers, tasks, assets (no AMC, engineers, bikes)

### 3.3 Customer Portal Module

(No changes from original PRD)

#### 3.3.1 Customer Dashboard

**Purpose:** Central hub for customer self-service

**Functionality:**
- Display company name
- Display active AMC count
- Display open tickets count
- Display completed tickets count
- Display upcoming visits (next 7 days)
- Display warranty summary (assets under warranty count)
- Quick Action Buttons: Raise Service Request, View My Assets, Track Tickets

**Access Control:**
- Customer only

#### 3.3.2 My Assets

**Purpose:** Display customer's own assets

**Functionality:**
- Display assets in list format
- Each asset shows: Asset Code, Category, Device Type, Brand, Model, Serial Number, Warranty Status
- Filter by category, warranty status
- Search by asset code, serial number
- Click asset opens Asset Detail page (read-only view)
- No edit or delete buttons

**Access Control:**
- Customer: view own company assets only

#### 3.3.3 Raise Service Request

**Purpose:** Allow customer to create service request

**Functionality:**
- Form fields:
  + Asset: Dropdown (own company assets only), required
  + Issue Description: Text area, required
  + Priority: Dropdown (Low, Medium, High), required
  + Preferred Visit Date: Date picker, optional
  + Contact Person: Text input, auto-filled from customer profile, editable
  + Contact Mobile: Text input, auto-filled from customer profile, editable
  + Attachments: File upload (images, PDFs), optional
- Submit button: Validates all required fields, creates new task with status Pending, assigns to back office for review, displays confirmation message with ticket number, redirects to Track Tickets page
- Cancel button: Returns to Customer Dashboard

**Validation:**
- Asset, Issue Description, Priority required
- Contact Mobile must be valid phone number
- Attachments max 5 files, max 10MB per file

**Access Control:**
- Customer only

#### 3.3.4 Track Tickets

**Purpose:** Display customer's own service tickets

**Functionality:**
- Display tickets in list format
- Each ticket shows: Ticket Number, Asset Code, Issue Description, Status, Priority, Created Date, Expected Visit Date
- Filter by status (Pending, In Progress, Completed), priority
- Search by ticket number, asset code
- Click ticket opens Ticket Detail page (customer view)
- Pagination controls

**Ticket Detail Page (Customer View):**
- Display ticket information: Ticket Number, Asset Code, Issue Description, Status, Priority, Created Date, Expected Visit Date
- Display assigned engineer (name only, no contact)
- Display status timeline (Pending → Accepted → In Progress → Completed)
- Display resolution (if completed): Problem Found, Resolution, Work Performed
- Display uploaded photos (if completed): Before, After
- No internal notes, engineer contact, parts used, customer signature visible

**Access Control:**
- Customer: view own company tickets only

#### 3.3.5 Download Reports

**Purpose:** Allow customer to download own service reports

**Functionality:**
- Display report types: Service History Report, AMC Summary Report, Asset Warranty Report
- Each report type shows: Report Name, Description, Last Generated Date
- Generate Report button: Opens report generation dialog, selects date range, clicks Generate, system generates PDF report, downloads to device
- View Past Reports: List of previously generated reports with download links

**Access Control:**
- Customer: download own company reports only

#### 3.3.6 Update Contact Person

**Purpose:** Allow customer to edit own contact information

**Functionality:**
- Form fields:
  + Contact Person Name: Text input, required
  + Mobile Number: Text input, required
  + Email: Text input, required
  + Alternate Mobile: Text input, optional
- Save button: Validates all required fields, updates customer profile, displays success message
- Cancel button: Returns to Customer Dashboard

**Validation:**
- Contact Person Name, Mobile Number, Email required
- Mobile Number must be valid phone number
- Email must be valid email address

**Access Control:**
- Customer only

#### 3.3.7 Change Password

**Purpose:** Allow customer to change own password

**Functionality:**
- Form fields:
  + Current Password: Password input, required
  + New Password: Password input, required
  + Confirm New Password: Password input, required
- Change Password button: Validates all required fields, verifies current password, updates password, displays success message, logs out user
- Cancel button: Returns to Customer Dashboard

**Validation:**
- All fields required
- New Password must be at least 8 characters
- Confirm New Password must match New Password
- Current Password must be correct

**Access Control:**
- Customer only

### 3.4 Reports Module

(No changes from original PRD)

#### 3.4.1 Reports Dashboard

**Purpose:** Overview of all report types

**Functionality:**
- Display report categories: Task Reports, Engineer Reports, AMC Reports, Attendance Reports, Fuel Reports, Asset Reports, Analytics
- Each category shows: Report Name, Description, Last Generated Date, Quick Generate button
- Click category opens respective report page

**Access Control:**
- Admin, Manager only

#### 3.4.2 Task Report

**Purpose:** Generate task reports with filters

**Functionality:**
- Filter options:
  + Date Range: Date picker (From Date, To Date), required
  + Status: Multi-select dropdown (Pending, In Progress, Completed, Overdue), optional
  + Engineer: Dropdown (all engineers), optional
  + Customer: Dropdown (all customers), optional
  + Priority: Multi-select dropdown (Low, Medium, High, Emergency), optional
- Generate Report button: Validates date range, fetches task data, displays task list in table format
- Task list columns: Task Number, Customer, Asset, Engineer, Status, Priority, Created Date, Completion Date, Resolution Time
- Export options: PDF, Excel, CSV, Print
- Clear Filters button: Resets all filters

**Access Control:**
- Admin, Manager only

#### 3.4.3 Engineer Performance Report

**Purpose:** Generate engineer performance metrics

**Functionality:**
- Filter options:
  + Date Range: Date picker (From Date, To Date), required
  + Engineer: Dropdown (all engineers), optional
- Generate Report button: Validates date range, fetches engineer data, displays metrics in table format
- Metrics columns: Engineer Name, Tasks Completed, Avg Resolution Time, Attendance Rate, Total Working Hours, Fuel Cost
- Export options: PDF, Excel, CSV, Print
- Clear Filters button: Resets all filters

**Access Control:**
- Admin, Manager only

#### 3.4.4 AMC Report

**Purpose:** Generate AMC contract reports

**Functionality:**
- Filter options:
  + Date Range: Date picker (From Date, To Date), required
  + Status: Multi-select dropdown (Active, Expiring, Expired), optional
  + Customer: Dropdown (all customers), optional
- Generate Report button: Validates date range, fetches AMC data, displays AMC list in table format
- AMC list columns: AMC Number, Customer, Contract Type, Start Date, End Date, Status, Visit Compliance (completed visits / total visits)
- Export options: PDF, Excel, CSV, Print
- Clear Filters button: Resets all filters

**Access Control:**
- Admin, Manager only

#### 3.4.5 Attendance Report

**Purpose:** Generate engineer attendance reports

**Functionality:**
- Filter options:
  + Date Range: Date picker (From Date, To Date), required
  + Engineer: Dropdown (all engineers), optional
- Generate Report button: Validates date range, fetches attendance data, displays attendance list in table format
- Attendance list columns: Engineer Name, Date, Check-In Time, Check-Out Time, Working Hours, Status
- Export options: PDF, Excel, CSV, Print
- Clear Filters button: Resets all filters

**Access Control:**
- Admin, Manager only

#### 3.4.6 Fuel Report

**Purpose:** Generate engineer fuel log reports

**Functionality:**
- Filter options:
  + Date Range: Date picker (From Date, To Date), required
  + Engineer: Dropdown (all engineers), optional
- Generate Report button: Validates date range, fetches fuel log data, displays fuel log list in table format
- Fuel log list columns: Engineer Name, Date, Opening KM, Closing KM, Distance Travelled, Fuel Filled, Fuel Cost
- Export options: PDF, Excel, CSV, Print
- Clear Filters button: Resets all filters

**Access Control:**
- Admin, Manager only

#### 3.4.7 Asset Report

**Purpose:** Generate asset reports

**Functionality:**
- Filter options:
  + Customer: Dropdown (all customers), optional
  + Category: Multi-select dropdown (all categories), optional
  + Warranty Status: Multi-select dropdown (Under Warranty, Expired, No Warranty), optional
- Generate Report button: Fetches asset data, displays asset list in table format
- Asset list columns: Asset Code, Customer, Category, Device Type, Brand, Model, Serial Number, Warranty Status
- Export options: PDF, Excel, CSV, Print
- Clear Filters button: Resets all filters

**Access Control:**
- Admin, Manager only

#### 3.4.8 Dashboard Analytics

**Purpose:** Display visual analytics with charts

**Functionality:**
- Task Trends Chart: Line chart showing task count by status over time (last 30 days)
- Engineer Utilisation Chart: Bar chart showing tasks completed per engineer (current month)
- AMC Coverage Chart: Pie chart showing active vs expiring vs expired AMC contracts
- Filter by date range (last 7 days, last 30 days, last 90 days, custom range)
- Refresh button: Reloads chart data

**Access Control:**
- Admin, Manager only

### 3.5 Audit Log Module

(No changes from original PRD)

#### 3.5.1 Audit Log List

**Purpose:** Display system audit log for compliance and tracking

**Functionality:**
- Display audit log records in table format
- Columns: Event Type, User, Role, Timestamp, IP Address, Resource, Old Value Summary, New Value Summary
- Event Types: Login, Logout, Create, Update, Delete, Restore, Assignment, Status Change
- Filter options:
  + Date Range: Date picker (From Date, To Date), required
  + Event Type: Multi-select dropdown (all event types), optional
  + User: Dropdown (all users), optional
- Search by resource (e.g., Customer ID, Task Number)
- Click record opens Audit Log Detail dialog showing full old/new value comparison
- Export to CSV
- Pagination controls

**Access Control:**
- Admin, SuperAdmin only

### 3.6 User Management Module

(No changes from original PRD)

#### 3.6.1 User List

**Purpose:** Display all system users

**Functionality:**
- Display users in table format
- Columns: Name, Email, Mobile, Role, Status (Active/Disabled), Last Login
- Filter by role, status
- Search by name, email, mobile
- Actions: Edit, Disable/Enable, Reset Password, View Login History
- Create Engineer button: Opens Create Engineer page
- Pagination controls

**Access Control:**
- Admin, SuperAdmin only

#### 3.6.2 Create Engineer

**Purpose:** Create new engineer user

**Functionality:**
- Form fields:
  + Name: Text input, required
  + Email: Text input, required
  + Mobile: Text input, required
  + Specialization: Text input, optional
  + Role: Dropdown (Engineer), required
  + Profile Photo: Image upload, optional
- Save button: Validates all required fields, creates new engineer user, sends welcome email with login credentials (structure only), displays success message, redirects to User List
- Cancel button: Returns to User List

**Validation:**
- Name, Email, Mobile, Role required
- Email must be valid and unique
- Mobile must be valid phone number
- Profile Photo max 5MB

**Access Control:**
- Admin, SuperAdmin only

#### 3.6.3 Edit Engineer

**Purpose:** Edit existing engineer user

**Functionality:**
- Form fields: Same as Create Engineer, all fields editable except Email
- Save button: Validates all required fields, updates engineer user, displays success message, redirects to User List
- Cancel button: Returns to User List

**Access Control:**
- Admin, SuperAdmin only

#### 3.6.4 Disable/Enable Engineer

**Functionality:**
- Disable button: Opens confirmation dialog, disables engineer user, prevents login, displays success message
- Enable button: Opens confirmation dialog, enables engineer user, allows login, displays success message

**Access Control:**
- Admin, SuperAdmin only

#### 3.6.5 Reset Password

**Functionality:**
- Reset Password button: Opens confirmation dialog, generates temporary password, sends password reset email (structure only), displays success message

**Access Control:**
- Admin, SuperAdmin only

#### 3.6.6 User Login History

**Purpose:** Display user login history

**Functionality:**
- Display login records in table format
- Columns: Login Date, Login Time, IP Address, Device Info, Status (Success/Failed)
- Filter by date range
- Pagination controls

**Access Control:**
- Admin, SuperAdmin only

#### 3.6.7 Assign Role

**Functionality:**
- Assign Role button: Opens role assignment dialog, selects new role from dropdown, clicks Save, updates user role, displays success message

**Access Control:**
- SuperAdmin only

### 3.7 Application Settings Module

(No changes from original PRD)

#### 3.7.1 Company Profile

**Purpose:** Configure company branding and information

**Functionality:**
- Form fields:
  + Company Name: Text input, required
  + Logo: Image upload, optional
  + Address: Text area, required
  + Brand Primary Color: Color picker, required
  + Brand Secondary Color: Color picker, required
  + Theme: Dropdown (Light, Dark), required
- Save button: Validates all required fields, updates company profile, applies branding changes, displays success message
- Cancel button: Discards changes

**Validation:**
- Company Name, Address, Brand Colors, Theme required
- Logo max 2MB

**Access Control:**
- Admin, SuperAdmin only

#### 3.7.2 Roles & Permissions

**Purpose:** Visual permission matrix management

**Functionality:**
- Display permission matrix in table format
- Rows: Roles (SuperAdmin, Admin, Manager, Back Office, Engineer, Customer)
- Columns: Resources (customers, assets, tasks, amc, engineers, reports, settings, audit_log, documents, users, bikes, odometer, fuel, daily_reports)
- Cells: Checkboxes for actions (view, create, edit, delete, manage, export)
- Edit Mode: Click Edit button, enable checkboxes, modify permissions, click Save, updates permission matrix, displays success message
- Read-Only Mode: Display current permissions without checkboxes

**Access Control:**
- SuperAdmin only

#### 3.7.3 Task Categories

**Purpose:** Manage task categories

**Functionality:**
- Display task categories in list format
- Each category shows: Category Name, Description, Status (Active/Inactive)
- Add Category button: Opens Add Category dialog, enters category name and description, clicks Save, creates new category, displays success message
- Edit Category button: Opens Edit Category dialog, modifies category name and description, clicks Save, updates category, displays success message
- Delete Category button: Opens confirmation dialog, deletes category, displays success message
- Activate/Deactivate button: Toggles category status

**Access Control:**
- Admin, SuperAdmin only

#### 3.7.4 Asset Categories

**Purpose:** Manage asset categories

**Functionality:**
- Same as Task Categories, applied to asset categories

**Access Control:**
- Admin, SuperAdmin only

#### 3.7.5 Status & Priority

**Purpose:** Manage task status and priority options

**Functionality:**
- Display status options in list format: Pending, In Progress, Completed, Overdue, Rejected, Escalated
- Display priority options in list format: Low, Medium, High, Emergency
- Add Status/Priority button: Opens Add dialog, enters name and color, clicks Save, creates new option, displays success message
- Edit Status/Priority button: Opens Edit dialog, modifies name and color, clicks Save, updates option, displays success message
- Delete Status/Priority button: Opens confirmation dialog, deletes option, displays success message

**Access Control:**
- Admin, SuperAdmin only

#### 3.7.6 Email Templates

**Purpose:** View and edit email templates

**Functionality:**
- Display email template types: Task Assigned, AMC Expiry, Ticket Raised, Password Reset, Welcome Email
- Each template shows: Template Name, Subject, Body Preview
- Edit Template button: Opens Edit Template dialog, modifies subject and body (supports placeholders like {{customer_name}}, {{task_number}}), clicks Save, updates template, displays success message
- Preview button: Opens preview dialog showing rendered email with sample data

**Access Control:**
- Admin, SuperAdmin only

### 3.8 Error Pages Module

(No changes from original PRD)

#### 3.8.1 404 Not Found Page

**Purpose:** Display when user navigates to non-existent route

**Functionality:**
- Display 404 error message
- Display \"Page not found\" description
- Back to Home button: Redirects to dashboard

#### 3.8.2 500 Server Error Page

**Purpose:** Display when server error occurs

**Functionality:**
- Display 500 error message
- Display \"Something went wrong\" description
- Retry button: Reloads current page
- Back to Home button: Redirects to dashboard

#### 3.8.3 403 Unauthorized Page

**Purpose:** Display when user attempts unauthorized access

**Functionality:**
- Display 403 error message
- Display \"You do not have permission to access this page\" description
- Back to Home button: Redirects to dashboard

#### 3.8.4 Session Timeout Dialog

**Purpose:** Warn user before session expires

**Functionality:**
- Display dialog 5 minutes before session expiry
- Display countdown timer (5:00, 4:59, 4:58, ...)
- Display \"Your session will expire soon\" message
- Stay Logged In button: Extends session, closes dialog
- Logout button: Logs out user, redirects to login page
- Auto-logout: If user does not respond, auto-logout after countdown reaches 0:00

### 3.9 Security Enhancements

(No changes from original PRD)

#### 3.9.1 Route-Level Permission Guards

**Functionality:**
- All routes wrapped with permission checks
- Unauthorized access redirects to /403 Unauthorized page
- Routes requiring specific permissions:
  + /customers: require can('view', 'customers')
  + /assets: require can('view', 'assets')
  + /tasks: require can('view', 'tasks')
  + /amc: require can('view', 'amc')
  + /reports: require can('view', 'reports')
  + /audit-log: require can('view', 'audit_log')
  + /users: require can('view', 'users')
  + /settings: require can('view', 'settings')
  + /customer: require role === 'customer'
  + /bikes: require can('manage', 'bikes')
  + /odometer-verification: require can('manage', 'odometer')
  + /fuel: require can('manage', 'fuel')
  + /daily-review: require can('manage', 'daily_reports')

#### 3.9.2 Input Validation

**Functionality:**
- All forms use zod schema validation
- Validate required fields, data types, formats (email, phone, URL)
- Display validation errors inline
- Prevent form submission if validation fails

#### 3.9.3 File Upload Validation

**Functionality:**
- Validate file type (images: jpg, png, gif; documents: pdf, doc, docx)
- Validate file size (max 10MB per file)
- Display validation errors if file type or size invalid
- Prevent upload if validation fails

#### 3.9.4 Error Boundaries

**Functionality:**
- Wrap all lazy-loaded routes with error boundaries
- Catch JavaScript errors during rendering
- Display fallback UI with error message
- Provide \"Reload Page\" button

#### 3.9.5 Loading Skeletons

**Functionality:**
- Display loading skeletons on all data-fetching pages
- Skeleton components match page layout (table skeleton, card skeleton, form skeleton)
- Replace skeleton with actual content when data loaded

#### 3.9.6 No Sensitive Data in localStorage

**Functionality:**
- Store only non-sensitive data in localStorage (theme preference, language preference)
- Do not store passwords, tokens, personal information in localStorage
- Use secure session storage for authentication tokens

### 3.10 Production Stabilization Sprint: Bike Management Module (NEW)

#### 3.10.1 Bike List

**Purpose:** Display all registered bikes

**Functionality:**
- Display bikes in table format
- Columns: Vehicle Number, Brand, Model, Fuel Type, Current Odometer, Assigned Engineer, Insurance Expiry, PUC Expiry, Service Due, Status (Active/Inactive)
- Filter by status, assigned engineer
- Search by vehicle number, brand, model
- Actions: Edit, Delete, Assign to Engineer
- Register Bike button: Opens Register Bike page
- Pagination controls

**Access Control:**
- Admin, SuperAdmin only

#### 3.10.2 Register Bike

**Purpose:** Register new bike

**Functionality:**
- Form fields:
  + Vehicle Number: Text input, required
  + Brand: Text input, required
  + Model: Text input, required
  + Fuel Type: Dropdown (Petrol, Diesel, Electric), required
  + Initial Odometer: Number input, required
  + Average Mileage: Number input (KM/L), required
  + Insurance Expiry: Date picker, required
  + PUC Expiry: Date picker, required
  + Service Due: Date picker, required
- Save button: Validates all required fields, creates new bike record, displays success message, redirects to Bike List
- Cancel button: Returns to Bike List

**Validation:**
- All fields required
- Vehicle Number must be unique
- Initial Odometer must be positive number
- Average Mileage must be positive number
- Insurance Expiry, PUC Expiry, Service Due must be future dates

**Access Control:**
- Admin, SuperAdmin only

#### 3.10.3 Edit Bike

**Purpose:** Edit existing bike

**Functionality:**
- Form fields: Same as Register Bike, all fields editable except Vehicle Number
- Save button: Validates all required fields, updates bike record, displays success message, redirects to Bike List
- Cancel button: Returns to Bike List

**Access Control:**
- Admin, SuperAdmin only

#### 3.10.4 Delete Bike

**Functionality:**
- Delete button: Opens confirmation dialog, deletes bike record, displays success message
- Cannot delete bike if assigned to engineer

**Access Control:**
- Admin, SuperAdmin only

#### 3.10.5 Assign Bike to Engineer

**Purpose:** Assign bike to engineer

**Functionality:**
- Assign button: Opens assignment dialog, selects engineer from dropdown, clicks Save, updates bike assignment, displays success message
- Unassign button: Opens confirmation dialog, removes bike assignment, displays success message

**Access Control:**
- Admin, SuperAdmin only

#### 3.10.6 Engineer View Assigned Bike

**Purpose:** Display assigned bike information (read-only)

**Functionality:**
- Display bike information: Vehicle Number, Brand, Model, Fuel Type, Current Odometer, Insurance Expiry, PUC Expiry, Service Due
- No edit or delete buttons
- Display in Engineer Dashboard as widget

**Access Control:**
- Engineer: view assigned bike only

### 3.11 Production Stabilization Sprint: Odometer Management Module (NEW)

#### 3.11.1 Engineer: Upload Morning Odometer Photo

**Purpose:** Engineer uploads morning odometer photo

**Functionality:**
- Upload Morning Odometer Photo button: Opens camera or file picker, captures/selects photo, validates file type (jpg, png), validates file size (max 10MB), captures GPS location, captures timestamp, saves photo with metadata (Engineer ID, Date, Time, GPS, Photo URL, Bike ID), uploads to storage, displays success message
- Display uploaded photo with timestamp and GPS location
- Cannot upload if already uploaded for current date

**Validation:**
- Photo required
- File type must be jpg or png
- File size max 10MB
- GPS location required

**Access Control:**
- Engineer only

#### 3.11.2 Engineer: Upload Evening Odometer Photo

**Purpose:** Engineer uploads evening odometer photo

**Functionality:**
- Upload Evening Odometer Photo button: Opens camera or file picker, captures/selects photo, validates file type (jpg, png), validates file size (max 10MB), captures GPS location, captures timestamp, saves photo with metadata (Engineer ID, Date, Time, GPS, Photo URL, Bike ID), uploads to storage, displays success message
- Display uploaded photo with timestamp and GPS location
- Cannot upload if already uploaded for current date
- Cannot upload if morning odometer photo not uploaded

**Validation:**
- Photo required
- File type must be jpg or png
- File size max 10MB
- GPS location required
- Morning odometer photo must be uploaded first

**Access Control:**
- Engineer only

#### 3.11.3 Admin: Odometer Verification Page

**Purpose:** Admin verifies odometer readings from photos

**Functionality:**
- Display list of engineers with pending odometer verification
- Each record shows: Engineer Name, Date, Morning Photo Status, Evening Photo Status, Verification Status (Pending/Verified)
- Click record opens Odometer Verification Detail page
- Odometer Verification Detail page:
  + Display Morning Odometer Photo with timestamp and GPS location
  + Display Evening Odometer Photo with timestamp and GPS location
  + Form fields:
    - Morning Reading: Number input, required
    - Evening Reading: Number input, required
  + System calculates:
    - KM Travelled: Evening Reading - Morning Reading
    - Running Vehicle KM: Evening Reading
    - Distance: KM Travelled
  + Save button: Validates all required fields, saves odometer verification record, displays success message, redirects to Odometer Verification List
  + Cancel button: Returns to Odometer Verification List

**Validation:**
- Morning Reading, Evening Reading required
- Evening Reading must be greater than Morning Reading
- KM Travelled must be positive number

**Access Control:**
- Admin, SuperAdmin only

### 3.12 Production Stabilization Sprint: Fuel Management Module (NEW)

#### 3.12.1 Fuel Log List

**Purpose:** Display all fuel log entries

**Functionality:**
- Display fuel logs in table format
- Columns: Date, Engineer, Vehicle, Odometer, Fuel Quantity (Litres), Amount (₹), Fuel Station, Invoice Number, Mileage (KM/L), Fuel Cost per KM (₹), Monthly Fuel Cost (₹)
- Filter by date range, engineer, vehicle
- Search by invoice number, fuel station
- Actions: Edit, Delete
- Add Fuel Entry button: Opens Add Fuel Entry page
- Pagination controls

**Access Control:**
- Admin, SuperAdmin only

#### 3.12.2 Add Fuel Entry

**Purpose:** Admin adds fuel log entry

**Functionality:**
- Form fields:
  + Date: Date picker, required
  + Vehicle: Dropdown (all bikes), required
  + Odometer: Number input, required
  + Fuel Quantity (Litres): Number input, required
  + Amount (₹): Number input, required
  + Fuel Station: Text input, required
  + Invoice Number: Text input, required
  + Fuel Bill Photo: Image upload, optional
- System calculates:
  + Mileage (KM/L): KM Travelled / Fuel Quantity
  + Fuel Cost per KM (₹): Amount / KM Travelled
  + Monthly Fuel Cost (₹): Sum of all fuel entries for current month
- Save button: Validates all required fields, saves fuel log entry, displays success message, redirects to Fuel Log List
- Cancel button: Returns to Fuel Log List

**Validation:**
- Date, Vehicle, Odometer, Fuel Quantity, Amount, Fuel Station, Invoice Number required
- Odometer must be positive number
- Fuel Quantity must be positive number
- Amount must be positive number
- Fuel Bill Photo max 10MB

**Access Control:**
- Admin, SuperAdmin only

#### 3.12.3 Edit Fuel Entry

**Purpose:** Admin edits existing fuel log entry

**Functionality:**
- Form fields: Same as Add Fuel Entry, all fields editable
- Save button: Validates all required fields, updates fuel log entry, displays success message, redirects to Fuel Log List
- Cancel button: Returns to Fuel Log List

**Access Control:**
- Admin, SuperAdmin only

#### 3.12.4 Delete Fuel Entry

**Functionality:**
- Delete button: Opens confirmation dialog, deletes fuel log entry, displays success message

**Access Control:**
- Admin, SuperAdmin only

### 3.13 Production Stabilization Sprint: Engineer Daily Report Module (NEW)

#### 3.13.1 Daily Report Form (Engineer)

**Purpose:** Engineer submits daily report before check out

**Functionality:**
- Auto-filled fields (read-only):
  + Attendance Status: Checked In / Checked Out
  + Check In Time: HH:MM AM/PM
  + Check Out Time: HH:MM AM/PM (if checked out)
  + Assigned Tasks: Count
  + Completed Tasks: Count
  + Pending Tasks: Count
  + Morning Odometer Photo: Uploaded / Not Uploaded
  + Evening Odometer Photo: Uploaded / Not Uploaded
- Engineer-entered fields:
  + Parts Required: Text area, optional
  + Customer Follow-up: Text area, optional
  + Issues Faced: Text area, optional
  + Tomorrow's Priority: Text area, optional
  + Remarks: Text area, optional
  + Site Photos: Image upload (multiple), optional
  + Bills: File upload (PDF, images), optional
  + Documents: File upload (PDF, doc, docx), optional
- Submit button: Validates all required fields, saves daily report, displays success message, enables Check Out button
- Cancel button: Returns to Engineer Dashboard

**Validation:**
- No required fields for engineer-entered section (all optional)
- Site Photos max 10 files, max 10MB per file
- Bills max 5 files, max 10MB per file
- Documents max 5 files, max 10MB per file

**Access Control:**
- Engineer only

#### 3.13.2 Daily Report Submission

**Functionality:**
- Engineer cannot check out without submitting daily report
- Check Out button disabled until daily report submitted
- Display message: \"Please submit daily report before checking out\"

**Access Control:**
- Engineer only

### 3.14 Production Stabilization Sprint: Admin Daily Review Dashboard (NEW)

#### 3.14.1 Engineer Daily Summary List

**Purpose:** Display daily summary for all engineers

**Functionality:**
- Display engineers in table format
- Columns: Engineer Name, Attendance Status, Check In Time, Check Out Time, Morning Odometer Photo, Evening Odometer Photo, Daily Report Status, Tasks Completed, Tasks Pending, KM Travelled, Fuel Details, Review Status (Pending/Approved/Sent Back)
- Filter by date, attendance status, review status
- Search by engineer name
- Actions: View Details, Approve, Send Back
- Pagination controls

**Access Control:**
- Admin, SuperAdmin only

#### 3.14.2 View Engineer Details

**Purpose:** View detailed daily summary for single engineer

**Functionality:**
- Display engineer information: Name, Date, Attendance Status, Check In Time, Check Out Time, Working Hours
- Display Morning Odometer Photo with timestamp and GPS location
- Display Evening Odometer Photo with timestamp and GPS location
- Display Odometer Verification: Morning Reading, Evening Reading, KM Travelled, Running Vehicle KM, Distance
- Display Daily Report: Parts Required, Customer Follow-up, Issues Faced, Tomorrow's Priority, Remarks, Site Photos, Bills, Documents
- Display Tasks: Assigned Tasks, Completed Tasks, Pending Tasks
- Display Fuel Details: Fuel Quantity, Amount, Fuel Station, Invoice Number, Mileage, Fuel Cost per KM
- Actions: Verify Odometer, Approve Daily Report, Send Back for Correction

**Access Control:**
- Admin, SuperAdmin only

#### 3.14.3 Verify Odometer

**Purpose:** Admin verifies odometer readings from photos

**Functionality:**
- Display Morning Odometer Photo with timestamp and GPS location
- Display Evening Odometer Photo with timestamp and GPS location
- Form fields:
  + Morning Reading: Number input, required
  + Evening Reading: Number input, required
- System calculates:
  + KM Travelled: Evening Reading - Morning Reading
  + Running Vehicle KM: Evening Reading
  + Distance: KM Travelled
- Save button: Validates all required fields, saves odometer verification record, displays success message, updates Engineer Details page
- Cancel button: Returns to Engineer Details page

**Validation:**
- Morning Reading, Evening Reading required
- Evening Reading must be greater than Morning Reading
- KM Travelled must be positive number

**Access Control:**
- Admin, SuperAdmin only

#### 3.14.4 Approve Daily Report

**Functionality:**
- Approve button: Opens confirmation dialog, updates daily report status to Approved, displays success message, updates Engineer Daily Summary List

**Access Control:**
- Admin, SuperAdmin only

#### 3.14.5 Send Back for Correction

**Functionality:**
- Send Back button: Opens dialog, enters correction notes, clicks Send, updates daily report status to Sent Back, displays success message, sends notification to engineer (structure only), updates Engineer Daily Summary List

**Access Control:**
- Admin, SuperAdmin only

### 3.15 Production Stabilization Sprint: Engineer Dashboard Updates (NEW)

#### 3.15.1 Attendance Status Widget

**Purpose:** Display current attendance status

**Functionality:**
- Display Attendance Status: Checked In / Checked Out / Not Checked In
- Display Check In Time: HH:MM AM/PM (if checked in)
- Display Check Out Time: HH:MM AM/PM (if checked out)
- Display Working Hours: HH:MM (if checked out)
- Quick Action: Check In button (if not checked in), Check Out button (if checked in and daily report submitted)

**Access Control:**
- Engineer only

#### 3.15.2 Tasks Widget

**Purpose:** Display task summary

**Functionality:**
- Display Today's Tasks: Count
- Display Completed Tasks: Count
- Display Pending Tasks: Count
- Quick Action: My Tasks button (navigates to Task List)

**Access Control:**
- Engineer only

#### 3.15.3 Assigned Bike Widget

**Purpose:** Display assigned bike information

**Functionality:**
- Display Vehicle Number
- Display Brand and Model
- Display Current Odometer
- Display Insurance Expiry
- Display PUC Expiry
- Display Service Due
- Read-only view

**Access Control:**
- Engineer only

#### 3.15.4 Odometer Photo Status Widget

**Purpose:** Display odometer photo upload status

**Functionality:**
- Display Morning Odometer Photo Status: Uploaded / Not Uploaded
- Display Evening Odometer Photo Status: Uploaded / Not Uploaded
- Quick Actions: Upload Morning Odometer button (if not uploaded), Upload Evening Odometer button (if morning uploaded and evening not uploaded)

**Access Control:**
- Engineer only

#### 3.15.5 Daily Report Status Widget

**Purpose:** Display daily report submission status

**Functionality:**
- Display Daily Report Status: Submitted / Not Submitted / Sent Back
- Display Submission Time: HH:MM AM/PM (if submitted)
- Display Correction Notes (if sent back)
- Quick Action: Daily Report button (navigates to Daily Report Form)

**Access Control:**
- Engineer only

#### 3.15.6 Quick Actions

**Purpose:** Provide quick access to common actions

**Functionality:**
- Check In button: Opens Check In dialog, captures GPS location, validates required fields, sends API request to Supabase, inserts attendance record, displays success message, updates Attendance Status Widget
- My Tasks button: Navigates to Task List
- Upload Morning Odometer button: Opens camera or file picker, captures/selects photo, uploads to storage, displays success message, updates Odometer Photo Status Widget
- Upload Evening Odometer button: Opens camera or file picker, captures/selects photo, uploads to storage, displays success message, updates Odometer Photo Status Widget
- Daily Report button: Navigates to Daily Report Form
- Check Out button: Opens Check Out dialog, verifies daily report submitted, captures GPS location, validates required fields, sends API request to Supabase, updates attendance record, displays success message, updates Attendance Status Widget

**Access Control:**
- Engineer only

### 3.16 Production Stabilization Sprint: Attendance Fix (HIGHEST PRIORITY)

#### 3.16.1 Check In Flow

**Purpose:** Fix attendance insert failing in Supabase

**Functionality:**
- Engineer clicks Check In button
- Frontend validates required fields (GPS location, device info)
- Frontend sends API request to Supabase with payload:
  + User ID
  + Engineer ID
  + Date (YYYY-MM-DD)
  + Check In Time (HH:MM:SS)
  + GPS Location (latitude, longitude)
  + Device Info (device model, OS version)
  + Status: Checked In
  + Created At (timestamp)
  + Updated At (timestamp)
- API inserts attendance record into Supabase table
- Supabase verifies RLS policy (engineer can insert own attendance record)
- Database commits transaction
- API returns success response with attendance record ID
- Frontend updates Engineer Dashboard showing Attendance Status: Checked In, Check In Time: HH:MM AM/PM
- Frontend displays success message: \"Checked in successfully\"
- No success message displayed until database commit confirmed

**Validation:**
- GPS location required
- Device info required
- Date, Check In Time, User ID, Engineer ID required

**Error Handling:**
- If API request fails, display error message: \"Failed to check in. Please try again.\"
- If RLS policy fails, display error message: \"Unauthorized. Please contact admin.\"
- If database commit fails, display error message: \"Failed to save attendance. Please try again.\"

**Access Control:**
- Engineer only

#### 3.16.2 Check Out Flow

**Purpose:** Fix attendance update failing in Supabase

**Functionality:**
- Engineer clicks Check Out button
- Frontend verifies daily report submitted
- Frontend validates required fields (GPS location, device info)
- Frontend sends API request to Supabase with payload:
  + Attendance ID
  + Check Out Time (HH:MM:SS)
  + GPS Location (latitude, longitude)
  + Working Hours (calculated: Check Out Time - Check In Time)
  + Status: Checked Out
  + Updated At (timestamp)
- API updates attendance record in Supabase table
- Supabase verifies RLS policy (engineer can update own attendance record)
- Database commits transaction
- API returns success response with updated attendance record
- Frontend updates Engineer Dashboard showing Attendance Status: Checked Out, Check Out Time: HH:MM AM/PM, Working Hours: HH:MM
- Frontend displays success message: \"Checked out successfully\"
- No success message displayed until database commit confirmed

**Validation:**
- Daily report must be submitted
- GPS location required
- Device info required
- Check Out Time, Attendance ID required
- Check Out Time must be after Check In Time

**Error Handling:**
- If daily report not submitted, display error message: \"Please submit daily report before checking out.\"
- If API request fails, display error message: \"Failed to check out. Please try again.\"
- If RLS policy fails, display error message: \"Unauthorized. Please contact admin.\"
- If database commit fails, display error message: \"Failed to save attendance. Please try again.\"

**Access Control:**
- Engineer only

#### 3.16.3 Supabase Insert/Update

**Purpose:** Ensure attendance records inserted/updated correctly in Supabase

**Functionality:**
- Attendance table schema:
  + id: UUID, primary key
  + user_id: UUID, foreign key to users table
  + engineer_id: UUID, foreign key to engineers table
  + date: DATE, required
  + check_in_time: TIME, required
  + check_out_time: TIME, optional
  + gps_location: JSONB (latitude, longitude), required
  + device_info: JSONB (device model, OS version), required
  + working_hours: INTERVAL, optional
  + status: TEXT (Checked In, Checked Out), required
  + created_at: TIMESTAMP, required
  + updated_at: TIMESTAMP, required
- Insert operation: INSERT INTO attendance (user_id, engineer_id, date, check_in_time, gps_location, device_info, status, created_at, updated_at) VALUES (...)
- Update operation: UPDATE attendance SET check_out_time = ..., working_hours = ..., status = ..., updated_at = ... WHERE id = ...

**RLS Policy:**
- Engineer can insert own attendance record: user_id = auth.uid()
- Engineer can update own attendance record: user_id = auth.uid()
- Admin/SuperAdmin can view all attendance records

**Access Control:**
- Engineer: insert/update own attendance records
- Admin, SuperAdmin: view all attendance records

#### 3.16.4 RLS Verification

**Purpose:** Verify RLS policy applied correctly

**Functionality:**
- Test insert operation with engineer user: should succeed
- Test insert operation with different engineer user: should fail
- Test update operation with engineer user: should succeed
- Test update operation with different engineer user: should fail
- Test view operation with admin user: should succeed
- Test view operation with engineer user: should only see own records

**Access Control:**
- Engineer: insert/update own attendance records
- Admin, SuperAdmin: view all attendance records

#### 3.16.5 Dashboard Update

**Purpose:** Update Engineer Dashboard after attendance insert/update

**Functionality:**
- After successful check in, update Attendance Status Widget showing Checked In, Check In Time
- After successful check out, update Attendance Status Widget showing Checked Out, Check Out Time, Working Hours
- Refresh dashboard data from Supabase

**Access Control:**
- Engineer only

#### 3.16.6 History

**Purpose:** Display attendance history

**Functionality:**
- Display attendance records in table format
- Columns: Date, Check In Time, Check Out Time, Working Hours, Status
- Filter by date range
- Pagination controls

**Access Control:**
- Engineer: view own attendance history
- Admin, SuperAdmin: view all attendance history

### 3.17 Navigation Updates

#### 3.17.1 Admin Sidebar (Updated)

**New Menu Items:**
- Reports (icon: BarChart, route: /reports)
- Audit Log (icon: FileText, route: /audit-log)
- User Management (icon: Users, route: /users)
- Settings (icon: Settings, route: /settings)
- Bike Management (icon: Bike, route: /bikes)
- Odometer Verification (icon: Gauge, route: /odometer-verification)
- Fuel Management (icon: Fuel, route: /fuel)
- Daily Review (icon: ClipboardCheck, route: /daily-review)

#### 3.17.2 Engineer Sidebar (Updated)

**Menu Items:**
- Dashboard (icon: Home, route: /engineer/dashboard)
- My Tasks (icon: CheckSquare, route: /engineer/tasks)
- Attendance (icon: Clock, route: /engineer/attendance)
- My Bike (icon: Bike, route: /engineer/bike)
- Odometer Photos (icon: Camera, route: /engineer/odometer)
- Daily Report (icon: FileText, route: /engineer/daily-report)

#### 3.17.3 Customer Sidebar (No Changes)

**Menu Items:**
- Dashboard (icon: Home, route: /customer/dashboard)
- My Assets (icon: Package, route: /customer/assets)
- Raise Request (icon: Plus, route: /customer/raise-request)
- My Tickets (icon: Ticket, route: /customer/tickets)
- Reports (icon: FileText, route: /customer/reports)
- Profile (icon: User, route: /customer/profile)

## 4. Business Rules and Logic

### 4.1 RBAC Permission Rules (Updated)

**Permission Checking:**
- usePermissions hook checks current user role against permission matrix
- Returns true if user has permission, false otherwise
- PermissionGuard component renders children only if user has permission

**Route Protection:**
- All routes check permissions before rendering
- Unauthorized access redirects to /403 Unauthorized page

**Data Filtering:**
- Engineer: view only assigned tasks, customers, assets, own bike, own attendance, own odometer photos, own daily reports
- Customer: view only own company tasks, assets, reports
- Manager/Admin/SuperAdmin: view all data
- Back Office: view customers, tasks, assets (no AMC, engineers, reports, bikes, odometer, fuel, daily reports)

### 4.2 Customer Portal Rules (No Changes)

**Customer Data Scope:**
- Customer can only view own company data
- Customer cannot see other customers, engineers, internal notes, AMC pricing, internal documents, internal reports, timeline, engineer attendance, fuel, admin info

**Service Request Creation:**
- Customer can create service request for own company assets only
- Service request creates new task with status Pending
- Task assigned to back office for review

**Ticket Tracking:**
- Customer can view own company tickets only
- Customer can view ticket status, assigned engineer name (no contact), resolution (if completed)
- Customer cannot view internal notes, parts used, customer signature, engineer contact

### 4.3 Reports Module Rules (No Changes)

**Report Generation:**
- Date range required for all reports
- Filters optional
- Generate Report button fetches data and displays in table format
- Export options: PDF, Excel, CSV, Print

**Report Access:**
- Admin, Manager can generate all reports
- Customer can generate own company reports only

### 4.4 Audit Log Rules (No Changes)

**Event Logging:**
- Log all critical events: Login, Logout, Create, Update, Delete, Restore, Assignment, Status Change
- Capture user, role, timestamp, IP address, resource, old/new value summary

**Audit Log Access:**
- Admin, SuperAdmin can view all audit log records
- Other roles cannot access audit log

### 4.5 User Management Rules (No Changes)

**User Creation:**
- Admin, SuperAdmin can create engineer users
- Email must be unique
- Welcome email sent with login credentials (structure only)

**User Editing:**
- Admin, SuperAdmin can edit engineer users
- Email cannot be changed

**User Disable/Enable:**
- Admin, SuperAdmin can disable/enable engineer users
- Disabled users cannot login

**Password Reset:**
- Admin, SuperAdmin can reset engineer passwords
- Temporary password generated and sent via email (structure only)

**Role Assignment:**
- SuperAdmin can assign roles to users
- Admin cannot assign SuperAdmin role

### 4.6 Application Settings Rules (No Changes)

**Company Profile:**
- Admin, SuperAdmin can update company profile
- Branding changes applied immediately

**Roles & Permissions:**
- SuperAdmin can modify permission matrix
- Admin cannot modify permission matrix

**Task/Asset Categories:**
- Admin, SuperAdmin can add, edit, delete, activate/deactivate categories

**Status & Priority:**
- Admin, SuperAdmin can add, edit, delete status and priority options

**Email Templates:**
- Admin, SuperAdmin can edit email templates
- Templates support placeholders (e.g., {{customer_name}}, {{task_number}})

### 4.7 Error Handling Rules (No Changes)

**404 Not Found:**
- Display when user navigates to non-existent route
- Provide Back to Home button

**500 Server Error:**
- Display when server error occurs
- Provide Retry and Back to Home buttons

**403 Unauthorized:**
- Display when user attempts unauthorized access
- Provide Back to Home button

**Session Timeout:**
- Warn user 5 minutes before session expiry
- Auto-logout if user does not respond

### 4.8 Security Rules (No Changes)

**Route Protection:**
- All routes check permissions before rendering
- Unauthorized access redirects to /403 Unauthorized page

**Input Validation:**
- All forms use zod schema validation
- Validate required fields, data types, formats

**File Upload Validation:**
- Validate file type and size
- Prevent upload if validation fails

**Error Boundaries:**
- Catch JavaScript errors during rendering
- Display fallback UI with error message

**No Sensitive Data in localStorage:**
- Store only non-sensitive data in localStorage
- Use secure session storage for authentication tokens

### 4.9 Bike Management Rules (NEW)

**Bike Registration:**
- Admin, SuperAdmin can register new bikes
- Vehicle Number must be unique
- All fields required

**Bike Assignment:**
- Admin, SuperAdmin can assign bike to engineer
- One bike can be assigned to one engineer at a time
- Engineer can view assigned bike (read-only)

**Bike Deletion:**
- Admin, SuperAdmin can delete bike
- Cannot delete bike if assigned to engineer

### 4.10 Odometer Management Rules (NEW)

**Odometer Photo Upload:**
- Engineer uploads morning odometer photo at start of day
- Engineer uploads evening odometer photo at end of day
- Cannot upload evening photo without morning photo
- Cannot upload duplicate photos for same date
- GPS location and timestamp captured automatically

**Odometer Verification:**
- Admin verifies odometer readings from photos
- Admin enters morning and evening readings
- System calculates KM Travelled, Running Vehicle KM, Distance
- Engineer cannot edit calculated values

### 4.11 Fuel Management Rules (NEW)

**Fuel Entry:**
- Admin only can add fuel entries
- Engineer cannot add fuel entries
- All fields required except Fuel Bill Photo
- System calculates Mileage, Fuel Cost per KM, Monthly Fuel Cost

**Fuel Deletion:**
- Admin, SuperAdmin can delete fuel entries

### 4.12 Engineer Daily Report Rules (NEW)

**Daily Report Submission:**
- Engineer must submit daily report before check out
- Auto-filled fields are read-only
- Engineer-entered fields are optional
- Site Photos, Bills, Documents are optional

**Daily Report Review:**
- Admin reviews daily report
- Admin can approve or send back for correction
- If sent back, engineer must resubmit

### 4.13 Attendance Rules (NEW)

**Check In:**
- Engineer checks in at start of day
- GPS location and device info captured automatically
- Attendance record inserted into Supabase
- RLS policy verifies engineer can insert own attendance record
- No success message until database commit confirmed

**Check Out:**
- Engineer checks out at end of day
- Daily report must be submitted before check out
- GPS location and device info captured automatically
- Attendance record updated in Supabase
- RLS policy verifies engineer can update own attendance record
- No success message until database commit confirmed

**Attendance History:**
- Engineer can view own attendance history
- Admin, SuperAdmin can view all attendance history

### 4.14 Database Integrity Rules (NEW)

**Table Relationships:**
- All tables linked via Engineer ID, Attendance ID, Bike ID, Date
- No orphan records allowed
- Foreign key constraints enforced

**Insert/Update Verification:**
- Verify all insert/update operations for: Attendance, Bike, Odometer Photos, Fuel Logs, Daily Reports
- Verify RLS policies applied correctly
- Verify database commit confirmed before displaying success message

## 5. Exceptions and Edge Cases

| Scenario | Handling |
|----------|----------|
| Customer attempts to view other customer's data | Access denied, redirect to /403 Unauthorized page |
| Engineer attempts to view unassigned task | Task not visible in list, direct URL access blocked |
| Manager attempts to delete customer | Delete button hidden, display \"You do not have permission to delete\" message |
| Back Office attempts to access reports | Reports menu hidden, direct URL access redirects to /403 Unauthorized page |
| Admin attempts to assign SuperAdmin role | Role dropdown does not include SuperAdmin option |
| SuperAdmin attempts to delete own account | Display error message: \"Cannot delete own account\" |
| User attempts to upload file larger than 10MB | Validation error: \"File size must be less than 10MB\" |
| User attempts to upload unsupported file type | Validation error: \"File type not supported\" |
| Customer raises service request without selecting asset | Validation error: \"Asset is required\" |
| Customer raises service request with invalid mobile number | Validation error: \"Invalid mobile number\" |
| Admin generates report without selecting date range | Validation error: \"Date range is required\" |
| Admin exports report with no data | Display message: \"No data to export\" |
| User session expires during form submission | Display session timeout dialog, redirect to login page after logout |
| User clicks Stay Logged In button before session expires | Session extended, dialog closed |
| User does not respond to session timeout dialog | Auto-logout after countdown reaches 0:00 |
| Error boundary catches JavaScript error | Display fallback UI with error message and Reload Page button |
| Loading skeleton displayed for more than 10 seconds | Display \"Loading is taking longer than expected\" message |
| User navigates to non-existent route | Display 404 Not Found page with Back to Home button |
| Server error occurs during data fetch | Display 500 Server Error page with Retry and Back to Home buttons |
| User attempts to access route without permission | Display 403 Unauthorized page with Back to Home button |
| Customer attempts to download report for other customer | Access denied, report not generated |
| Engineer attempts to view audit log | Audit Log menu hidden, direct URL access redirects to /403 Unauthorized page |
| Admin attempts to edit SuperAdmin user | Edit button hidden for SuperAdmin users |
| Admin attempts to disable SuperAdmin user | Disable button hidden for SuperAdmin users |
| User attempts to reset own password from User Management | Reset Password button hidden for own account |
| User attempts to change email during edit | Email field disabled, display \"Email cannot be changed\" message |
| User attempts to create engineer with duplicate email | Validation error: \"Email already exists\" |
| User attempts to save company profile without logo | Logo optional, profile saved without logo |
| User attempts to modify permission matrix without SuperAdmin role | Permission matrix read-only, Edit button hidden |
| User attempts to delete active task category | Display error message: \"Cannot delete active category\" |
| User attempts to delete status option used in existing tasks | Display error message: \"Cannot delete status option in use\" |
| User attempts to edit email template with invalid placeholder | Validation error: \"Invalid placeholder\" |
| Customer attempts to raise service request for asset not owned | Asset dropdown shows only own company assets |
| Customer attempts to track ticket not owned | Ticket not visible in list, direct URL access blocked |
| Customer attempts to download report for date range with no data | Display message: \"No data available for selected date range\" |
| User attempts to upload profile photo larger than 5MB | Validation error: \"Profile photo must be less than 5MB\" |
| User attempts to save company profile with invalid color | Validation error: \"Invalid color format\" |
| User attempts to generate report with invalid date range (From Date > To Date) | Validation error: \"From Date must be before To Date\" |
| User attempts to export report in unsupported format | Export options limited to PDF, Excel, CSV, Print |
| User attempts to view login history for other user | Login History button hidden for other users (Admin/SuperAdmin only) |
| User attempts to assign role to own account | Assign Role button hidden for own account |
| User attempts to disable own account | Disable button hidden for own account |
| User attempts to reset own password from User Management | Reset Password button hidden for own account |
| Admin attempts to register bike with duplicate vehicle number | Validation error: \"Vehicle Number already exists\" |
| Admin attempts to delete bike assigned to engineer | Display error message: \"Cannot delete bike assigned to engineer\" |
| Engineer attempts to upload evening odometer photo without morning photo | Validation error: \"Please upload morning odometer photo first\" |
| Engineer attempts to upload duplicate odometer photo for same date | Validation error: \"Odometer photo already uploaded for today\" |
| Admin attempts to verify odometer with evening reading less than morning reading | Validation error: \"Evening Reading must be greater than Morning Reading\" |
| Admin attempts to add fuel entry with negative odometer | Validation error: \"Odometer must be positive number\" |
| Admin attempts to add fuel entry with negative fuel quantity | Validation error: \"Fuel Quantity must be positive number\" |
| Engineer attempts to check out without submitting daily report | Display error message: \"Please submit daily report before checking out\" |
| Engineer attempts to check in without GPS location | Validation error: \"GPS location required\" |
| Engineer attempts to check out before check in | Display error message: \"Please check in first\" |
| Attendance insert fails in Supabase | Display error message: \"Failed to check in. Please try again.\" |
| Attendance update fails in Supabase | Display error message: \"Failed to check out. Please try again.\" |
| RLS policy fails during attendance insert | Display error message: \"Unauthorized. Please contact admin.\" |
| RLS policy fails during attendance update | Display error message: \"Unauthorized. Please contact admin.\" |
| Database commit fails during attendance insert | Display error message: \"Failed to save attendance. Please try again.\" |
| Database commit fails during attendance update | Display error message: \"Failed to save attendance. Please try again.\" |
| Engineer attempts to view other engineer's attendance | Attendance not visible in list, direct URL access blocked |
| Engineer attempts to view other engineer's bike | Bike not visible, direct URL access blocked |
| Engineer attempts to view other engineer's odometer photos | Odometer photos not visible, direct URL access blocked |
| Engineer attempts to view other engineer's daily report | Daily report not visible, direct URL access blocked |
| Admin attempts to approve daily report without verifying odometer | Display warning message: \"Please verify odometer first\" |
| Admin attempts to send back daily report without correction notes | Validation error: \"Correction notes required\" |

## 6. Acceptance Criteria

1. Engineer logs in at 09:00 AM, clicks Check In button, system captures GPS location and device info, validates required fields, sends API request to Supabase, inserts attendance record (User ID, Engineer ID, Date: 2026-07-25, Check In Time: 09:00 AM, GPS, Device, Status: Checked In, Created At, Updated At), verifies RLS policy, commits to database, returns success response, updates Engineer Dashboard showing Attendance Status: Checked In, Check In Time: 09:00 AM, displays success message: \"Checked in successfully\"
2. Engineer clicks Upload Morning Odometer Photo, captures photo of bike odometer, system validates file type (jpg), validates file size (5MB), captures GPS location, captures timestamp (09:05 AM), saves photo with metadata (Engineer ID, Date: 2026-07-25, Time: 09:05 AM, GPS, Photo URL, Bike ID), uploads to storage, displays success message, updates Odometer Photo Status Widget showing Morning Odometer Photo: Uploaded
3. Engineer completes 4 assigned tasks throughout the day, at 06:00 PM clicks Upload Evening Odometer Photo, captures photo of bike odometer, system validates file type (jpg), validates file size (5MB), captures GPS location, captures timestamp (06:00 PM), saves photo with metadata (Engineer ID, Date: 2026-07-25, Time: 06:00 PM, GPS, Photo URL, Bike ID), uploads to storage, displays success message, updates Odometer Photo Status Widget showing Evening Odometer Photo: Uploaded
4. Engineer clicks Daily Report, system auto-fills read-only fields (Attendance Status: Checked In, Check In Time: 09:00 AM, Check Out Time: Not yet, Assigned Tasks: 5, Completed Tasks: 4, Pending Tasks: 1, Morning Odometer Photo: Uploaded, Evening Odometer Photo: Uploaded), Engineer enters Parts Required: \"AC filter\", Customer Follow-up: \"Follow up with Customer ABC\", Issues Faced: \"Traffic delay\", Tomorrow's Priority: \"Complete pending task\", Remarks: \"Good day\", uploads 2 Site Photos, clicks Submit, system validates all required fields, saves daily report, displays success message, enables Check Out button
5. Engineer clicks Check Out button, system verifies daily report submitted, captures GPS location, validates required fields, sends API request to Supabase, updates attendance record (Check Out Time: 06:00 PM, Working Hours: 9 hours, Status: Checked Out, Updated At), verifies RLS policy, commits to database, returns success response, updates Engineer Dashboard showing Attendance Status: Checked Out, Check Out Time: 06:00 PM, Working Hours: 9 hours, displays success message: \"Checked out successfully\"
6. Admin logs in at 10:00 AM, navigates to Admin Daily Review Dashboard, views list of engineers with attendance status, clicks Engineer John Doe, views Morning Odometer Photo (uploaded at 09:05 AM with GPS), views Evening Odometer Photo (uploaded at 06:00 PM with GPS), clicks Verify Odometer button, enters Morning Reading: 12345 KM, enters Evening Reading: 12445 KM, system calculates KM Travelled: 100 KM, Running Vehicle KM: 12445 KM, Distance: 100 KM, clicks Save, system updates odometer verification record, displays success message
7. Admin navigates to Fuel Management, clicks Add Fuel Entry, selects Date: 2026-07-25, selects Vehicle: Bike 001 (John Doe), enters Odometer: 12445 KM, enters Fuel Quantity: 5 Litres, enters Amount: ₹500, enters Fuel Station: Shell Petrol Pump, enters Invoice Number: INV-12345, clicks Save, system calculates Mileage: 20 KM/L, Fuel Cost per KM: ₹5, saves fuel log, displays success message
8. Admin navigates back to Admin Daily Review Dashboard, views John Doe's record showing Odometer Verified, Fuel Entry Added, clicks Approve Daily Report, system updates daily report status to Approved, displays success message

## 7. Out of Scope for Part 6

The following features and modules are explicitly NOT included in Part 6 and will be implemented in subsequent development phases:

- Actual notification provider integration (Email, WhatsApp, Push, SMS) — templates and structure only
- Quotation generation module
- Invoice generation module
- Payment tracking module
- Parts inventory management
- Spare parts tracking
- Customer feedback and ratings
- Advanced SLA tracking and alerts
- Real-time engineer location tracking on map
- Barcode/QR code scanning for assets
- Real backend API integration (mock data only for non-Production Sprint features)
- Multi-language support
- Data backup and recovery
- Performance optimization
- Security hardening (backend layer)
- Accessibility compliance audit
- Engineer payroll integration
- Engineer leave management
- Engineer training and certification tracking
- Engineer route optimization
- Engineer workload balancing
- Advanced offline sync conflict resolution
- Voice notes recording
- Video recording for task documentation
- Live chat with back office
- Augmented reality for asset identification
- Predictive maintenance recommendations
- AI-powered issue diagnosis
- Integration with third-party field service platforms
- Wearable device support (smartwatch)
- Biometric authentication (fingerprint, face recognition)
- Geofencing for automatic check-in/check-out
- Automated mileage calculation from GPS tracking
- Fuel efficiency analytics
- Carbon footprint tracking
- Customer satisfaction surveys
- Engineer gamification and rewards
- Social features (engineer community, knowledge sharing)
- Advanced search with natural language processing
- Bulk task assignment
- Task scheduling optimization
- Dynamic task prioritization based on SLA
- Integration with accounting systems
- Integration with CRM systems
- Integration with ERP systems
- Multi-tenant support
- White-label customization
- API for third-party integrations
- Webhook support
- Custom workflow builder
- Advanced reporting with custom dashboards
- Scheduled reports
- Email reports
- Mobile app native versions (iOS, Android)
- Progressive Web App (PWA) optimization
- Push notification service integration
- SMS gateway integration
- WhatsApp Business API integration
- Email service provider integration
- Cloud storage integration (AWS S3, Google Cloud Storage)
- CDN integration for photo delivery
- Real-time collaboration features
- Version control for task updates
- Approval workflows
- Role-based field visibility
- Custom fields and forms
- Advanced filtering with saved filters
- Bulk actions (bulk status update, bulk assignment)
- Import data from CSV/Excel
- Data migration tools
- System health monitoring
- Error tracking and logging
- Performance monitoring
- User activity tracking
- Compliance and regulatory reporting
- GDPR compliance tools
- Data encryption at rest and in transit
- Two-factor authentication (2FA)
- Single Sign-On (SSO) integration
- OAuth integration
- API rate limiting
- API versioning
- API documentation (Swagger/OpenAPI)
- Developer portal
- Sandbox environment
- Staging environment
- Continuous integration/continuous deployment (CI/CD) pipeline
- Automated testing (unit tests, integration tests, end-to-end tests)
- Load testing
- Security testing
- Penetration testing
- Code review process
- Documentation portal
- User training materials
- Video tutorials
- In-app help and tooltips
- Chatbot support
- 24/7 customer support
- SLA monitoring and enforcement
- Incident management
- Change management
- Release management
- Disaster recovery plan
- Business continuity plan