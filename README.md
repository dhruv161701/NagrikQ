# NagrikQ — AI-Powered Government Service & Queue Management Platform

**NagrikQ** is a production-quality, scalable digital governance platform designed to eliminate physical queues at Indian government offices (e.g., Mamlatdar, District Collectorate, Municipality).

Citizens can discover required documents, apply online, generate live virtual queue tokens, track queue progress in real time, and arrive at designated office counters exactly when called.

---

## Key Platform Features & Architecture

- **Two UI Modes (Modern & Simple)**:
  - **⚡ Modern Mode**: Compact dashboard cards, rich visual hierarchy, dynamic metrics, and fast navigation.
  - **🧓 Simple Mode**: Extra-large readable text (18px+), high-contrast touch targets (52px+), explicit labels, and low cognitive load.
- **Adaptive Onboarding**: Language selection (English, Gujarati `ગુજરાતી`, Hindi `हिन्दी`), age calculation from DOB (`Age < 35` → Modern Mode, `Age ≥ 35` → Simple Mode), and interactive 5-step Guided Tour.
- **Role-Based Access & Security**:
  1. **Citizen/User**: Browse catalog, submit applications, upload verified documents, generate virtual queue tokens, track live queue & ETA, book appointments, file grievances.
  2. **Employee/Officer**: Counter C-04 live queue queue controls (**Call Next**, **Start Service**, **Complete**, **Skip / No-Show**), document verification with confirmation dialogs.
  3. **Admin**: Department office metrics, counter assignments, and formal document requirement **Change Request Creation** (`CR-104`).
  4. **Super Admin**: State-wide governance dashboard, system-wide Audit Logs, and **Change Request Approval Workflow** (approving a request dynamically updates live service document requirements).
- **Backend & Database Architecture**:
  - **Frontend**: React + TypeScript + Vite + React Router + Lucide Icons.
  - **Backend API**: Node.js + Express + TypeScript (`/backend`).
  - **Database**: Supabase PostgreSQL with 16 normalized tables, Foreign Keys, Indexes, and Row Level Security (RLS) policies (`supabase/query.sql`).
  - **Realtime**: Supabase Realtime publication on `queue_tokens`, `applications`, `notifications`, and `service_change_requests`.

---

## Directory Structure

```text
NagrikQ/
├── frontend/ (Current React app)
│   ├── src/
│   │   ├── components/      # UI components, Onboarding, Queue, Assistant, Navigation
│   │   ├── context/         # AuthContext, UIContext, DataContext
│   │   ├── layouts/         # Role layout wrappers (Public, User, Employee, Admin, SuperAdmin)
│   │   ├── pages/           # Public, Onboarding, Citizen, Officer, Admin, SuperAdmin pages
│   │   ├── routes/          # ProtectedRoute, AppRoutes
│   │   ├── services/        # apiClient, authService, repositories, mockData
│   │   ├── styles/          # Tokens, CSS variables
│   │   └── types/           # TypeScript interfaces & types
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                 # Node.js + Express + TypeScript Server API
│   ├── src/
│   │   ├── config/          # Supabase Admin client
│   │   ├── controllers/     # Service, Application, Queue, Admin, SuperAdmin, Complaint
│   │   ├── middleware/      # Authentication (JWT token), RBAC, Error Handler
│   │   ├── routes/          # API router definitions
│   │   ├── types/           # Request/Response interfaces
│   │   └── server.ts        # Express App entrypoint
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
│
├── supabase/                # Database Schema & Security
│   ├── query.sql            # Normalized PostgreSQL tables, FKs, RLS Policies, Realtime Config
│   └── README.md
│
└── README.md
```

---

## Getting Started

### 1. Database Setup (Supabase)
1. Open your [Supabase Dashboard](https://app.supabase.com).
2. Go to **SQL Editor** -> **New Query**.
3. Copy and run the contents of [`supabase/query.sql`](file:///c:/Users/Dhruv/OneDrive/Documents/A Projects/NagrikQ/NagrikQ/supabase/query.sql).

### 2. Running the Backend API
```bash
cd backend
npm install
npm run dev
```
Backend API will start at: `http://localhost:5000`

### 3. Running the React Frontend
```bash
# In the root project directory
npm install
npm run dev
```
Frontend Web Application will start at: `http://localhost:5173`

---

## Test Persona Demo Toggles

For instant hackathon evaluation, the top persistent **Role Switcher Bar** allows 1-click testing:
- 👤 **Citizen (Dhruv Patel)**: Modern Mode dashboard (`/user/dashboard`).
- 🧓 **Citizen (Rameshbhai)**: Simple Mode dashboard (`/user/dashboard`).
- 👔 **Officer (Rajesh Varma)**: Counter C-04 queue operation panel (`/employee/dashboard`).
- 🏛️ **Mamlatdar Admin**: Office management & Change Request creation (`/admin/dashboard`).
- 🛡️ **Super Admin (State Director)**: System approvals & audit logs (`/super-admin/dashboard`).
