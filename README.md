# Sectore 360 — Enterprise Field Service & CRM Platform

<div align="center">

![Sectore 360 Banner](https://img.shields.io/badge/Sectore_360-Enterprise_CRM-2563EB?style=for-the-badge&logo=shield&logoColor=white)

[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Proprietary-gray?style=flat-square)](LICENSE)

**Securing Today, Powering Tomorrow**  
*A modern, comprehensive Field Service Management & Customer Relationship Management platform built for enterprise operations, asset tracking, AMC lifecycle, and mobile field engineering.*

[Features](#-key-features) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [Project Structure](#-project-structure) • [RBAC](#-user-roles--access-control) • [Environment Variables](#-environment-variables)

---
</div>

## 📌 Overview

**Sectore 360** is an enterprise-grade CRM and Field Service Management (FSM) platform designed by **Sectore Tecknologies**. It centralizes the complete lifecycle of customer assets, annual maintenance contracts (AMCs), service ticketing, field engineer operations, fleet monitoring, and business analytics into a unified, responsive web application.

---

## ✨ Key Features

### 🏢 Customer & Asset Management
- **Customer CRM**: Complete customer profiles, multi-contact management, service history, and SLA tracking.
- **Asset Lifecycle**: QR/Barcode asset tracking, maintenance history, warranty tracking, and dynamic health scores.
- **Customer Self-Service Portal**: Ticket raising, service history inspection, asset overview, and work order approval.

### 📋 Service Tasks & Work Orders
- **Task Scheduling & Dispatch**: Assign service tickets, preventative maintenance, and emergency calls to engineers.
- **Work Order Generation**: Professional, printable service sheets and digital work order summaries.
- **Task Status Pipeline**: Real-time tracking from pending assignment to resolution and customer sign-off.

### 🛡️ AMC (Annual Maintenance Contract) Management
- **Contract Lifecycle**: Contract creation, renewal alerts, coverage limits, and visit scheduling.
- **AMC Analytics**: Contract profitability, service frequency metrics, and automated reminders.

### 🛵 Field Engineer Operations
- **Geo-tagged Attendance**: GPS-verified Check-in and Check-out with photo verification.
- **Daily Work Reports**: Mandatory end-of-day summary submissions before check-out.
- **Odometer & Fleet Management**: Photo-based odometer tracking (no manual tampering) with Admin approval workflows.
- **Fuel Expense Management**: Fuel logging and consumption tracking tied to company bikes and assignments.

### 📊 Business Intelligence & Reporting
- **Interactive Dashboards**: Visual KPIs powered by Recharts (Engineer performance, Revenue, Task turnaround).
- **Multi-Format Export**: Instant export of audit logs, customer records, and task metrics to Excel (`.xlsx`) and CSV.
- **Audit Logs**: Immutable activity logging across administrative, engineer, and customer actions.

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Core Framework** | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite](https://vitejs.dev/) / Rolldown |
| **Routing** | [React Router 7](https://reactrouter.com/) |
| **Styling & UI** | [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/) |
| **Forms & Validation** | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| **Database & Auth** | [Supabase](https://supabase.com/) |
| **Charts & Data** | [Recharts](https://recharts.org/), [PapaParse](https://www.papaparse.com/), [XLSX](https://sheetjs.com/) |
| **Notifications** | [Sonner](https://sonner.emilkowal.ski/) |

---

## 👥 User Roles & Access Control

Sectore 360 implements strict Role-Based Access Control (RBAC):

| Role | Responsibilities & Access |
|---|---|
| **SuperAdmin** | Full system administration, user management, audit logs, global settings, fleet management |
| **Admin** | Operations oversight, task assignment, odometer verification, fuel log approvals |
| **Manager** | Team supervision, task dispatch, AMC monitoring, service report analysis |
| **Back Office** | Customer onboarding, asset cataloging, contract data entry, scheduling |
| **Field Engineer** | Mobile field portal, task execution, attendance check-in/out, odometer uploads, daily reports |
| **Customer** | Self-service portal, raise service tickets, view owned assets, track contract status |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: `v20.x` or higher (recommended `v20.18.x`+)
- **npm**: `v10.x` or higher (or `pnpm`)

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/sectore-crm.git
cd sectore-crm
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_APP_ID=sectore-360-app
```

### 4. Start Development Server
```bash
npm run dev
```
> The application will start at **`http://localhost:5173`** (or access via `http://127.0.0.1:5173`).

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Vite local development server |
| `npm start` | Alias for `npm run dev` |
| `npm run build` | Compiles and builds the production bundle into `/dist` |
| `npm run preview` | Locally previews the production build |
| `npm run lint` | Runs Biome and TypeScript type checking |

---

## 📁 Project Structure

```text
sectore-crm/
├── public/                 # Static assets, icons, and branding media
├── src/
│   ├── components/         # Shared UI components (Radix + Tailwind)
│   │   ├── ui/             # Core atomic elements (buttons, inputs, modals)
│   │   └── ...             # Feature components (WorkOrderPrint, PhotoUpload)
│   ├── contexts/           # Global React contexts (Auth, Theme)
│   ├── db/                 # Supabase client and schema definitions
│   ├── hooks/              # Custom reusable React hooks
│   ├── lib/                # Utility functions, formatting, and helpers
│   ├── pages/              # Application pages grouped by domain
│   │   ├── admin/          # Admin verification & management pages
│   │   ├── amc/            # AMC contract management pages
│   │   ├── assets/         # Asset tracking & health pages
│   │   ├── customer/       # Customer portal pages
│   │   ├── customers/      # Customer directory pages
│   │   ├── engineer/       # Engineer mobile portal & attendance
│   │   ├── reports/        # BI & Analytics report pages
│   │   ├── settings/       # System & company profile settings
│   │   └── tasks/          # Task management & dispatch pages
│   ├── services/           # API and data abstraction layer
│   ├── types/              # TypeScript models and interfaces
│   ├── App.tsx             # Root application component
│   ├── main.tsx            # React DOM root mounting
│   ├── routes.tsx          # Route declarations & permission guards
│   └── index.css           # Global design system tokens & Tailwind CSS
├── docs/                   # Product Requirements (PRD) & Design System specs
├── index.html              # HTML entry point
├── package.json            # Project manifest & scripts
├── tailwind.config.js      # Tailwind theme configuration
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite build configuration
```

---

## 🔒 Security & Best Practices

- **Frontend Guarding**: Navigation and route actions are gated behind role-based permission checks.
- **Data Integrity**: TypeScript strict mode and Zod runtime schema validation on all forms.
- **Environment Isolation**: Sensitive configuration values are managed through Vite `.env` parameters.

---

## 📄 License

Copyright © 2026 **Sectore Tecknologies**. All rights reserved.  
Unauthorized copying, modification, distribution, or reproduction of this software is strictly prohibited.
