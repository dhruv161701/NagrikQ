# NagrikQ — Comprehensive Codebase Audit Summary

> **Auditor Notice**: This executive summary synthesizes the deep forensic audit conducted on the active NagrikQ repository on this machine. Every finding, metric, role definition, and architecture layer has been verified directly against active source files, configuration, tests, database scripts, and Git history.

---

## 1. Project Overview

**NagrikQ** is a production-quality, civic-tech government service and virtual queue management platform designed to eliminate physical waiting lines across Indian local administrative offices (Jan Seva Kendras, Mamlatdar offices, and District Collectorates). 

The platform addresses physical congestion and bureaucratic friction by:
- Replacing chaotic physical queues with timed virtual arrival tokens (30-minute slots) tracked in real time via WebSockets.
- Pre-validating mandatory certificate requirements before citizens leave their homes, assisted by a grounded RAG AI assistant.
- Auto-tailoring accessibility via a dual-mode interface (Modern Mode vs. oversized, high-contrast Simple Mode) recommended dynamically by citizen age.
- Providing counter officers with live desk controls, browser-synthesized audio call chimes, physical checklist inspection, and inter-table routing.
- Empowering State Super Admins to dynamically update statutory document checklists across the platform through a bureaucratic Change Request approval pipeline without code redeployment.

---

## 2. Four Detected User Roles & Panels

The codebase establishes four distinct user personas, enforced by route guards (`ProtectedRoute.tsx`), database ENUMs (`user_role`), and backend RBAC middleware (`requireRole`):

| Persona / Role | Code Identifier | Dedicated Web Panel | Primary Responsibility |
|---|---|---|---|
| **Citizen / Jan Seva Applicant** | `citizen` | `/user/*` | Service discovery, virtual token booking, live queue tracking, Cloudinary certificate vault, and RAG AI assistant interactions. |
| **Counter Officer / Verification Staff** | `employee` | `/employee/*` | Desk queue management (Counter `C-01` to `C-10`), Next Table forwarding, physical document verification, and service finalization. |
| **Office / Department Admin** | `admin` | `/admin/*` | Departmental counter management, staff provisioning, service slot/break controls, and formal document Change Request creation (`CR-xxx`). |
| **State Super Admin** | `superadmin` | `/super-admin/*` | State-wide governance, global services catalog CRUD, Change Request approval with dynamic database execution, and compliance audit logging. |

*(Note: An instant **Role Switcher Bar** persists across the top of the interface for rapid evaluation of all personas.)*

---

## 3. Discovered Feature Inventory Metrics

- **Total Features Discovered**: **29 distinct functional modules**
  - **Completed / Fully Implemented**: **25 features**
  - **Partially Implemented**: **1 feature** (Citizen Complaints: backend and database ready, frontend unrouted)
  - **UI Only**: **2 features** (Priority Appointments: local React state, database table unlinked; Standalone Admin Requirements: redirected to Admin Services)
  - **Backend Only**: **1 feature** (Manual office setup endpoint without dedicated admin UI form)

---

## 4. Technology Stack Summary

- **Frontend**: React 19.2.8, TypeScript ~6.0.2, Vite 8.3.0, React Router DOM 7.18.4, Lucide React 1.49.0, Custom Civic Design System in Vanilla CSS (`tokens.css`), Web Audio API chime synthesis.
- **Backend API**: Node.js, Express 4.21.2, TypeScript 5.7.3, ts-node-dev, CORS, Dotenv.
- **Database & Realtime**: Supabase Cloud PostgreSQL with 19 relational tables, Row Level Security (RLS) on all tables, and Supabase Realtime publication (`supabase_realtime`) with `REPLICA IDENTITY FULL`.
- **AI & RAG Engine**: Google Gemini API (`gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-embedding-001` with 768 dimensions), Supabase `pgvector` IVFFlat cosine similarity search on `knowledge_chunks`.
- **Media & Document Vault**: Cloudinary cloud media storage with SHA-1 signed uploads and server proxying.
- **Notifications & Automations**: Telegram Bot API (`@NagrikQbot`) via background long-polling service, n8n webhook workflow with secret authorization and idempotency logging.

---

## 5. Main Architecture Topology

```text
Citizen / Officer / Admin / Super Admin
                   │
                   ▼ (React 19 + TypeScript + Vite)
       Client Application & Contexts (Auth, UI, Data)
                   │
         ┌─────────┴────────────────────────┐
         │ HTTP REST / JSON via Vite Proxy  │ WebSocket Realtime
         ▼                                  ▼
Express Backend API (Port 5000)     Supabase Realtime Publication
 - Auth Middleware (Supabase JWT)    - queue_tokens
 - RBAC (requireRole)                - applications
 - Controllers & Services            - service_change_requests
         │                                  ▲
         ▼                                  │
Supabase PostgreSQL (19 Tables + RLS) ──────┘
  ├── pgvector (knowledge_chunks 768d) ──► Google Gemini API
  ├── Cloudinary Media API (Citizen Documents)
  ├── Telegram Bot API (@NagrikQbot long-polling)
  └── n8n Automation Engine (Webhook Orchestration)
```

---

## 6. Main Operational User Flows

1. **Citizen Flow**: Register/Login → 3-Step Adaptive Onboarding (Language, DOB, Mode) → Service Discovery → Grounded AI Guidance → Slot & Virtual Token Generation → Live Realtime Queue Tracking → Audio Counter Chime → Counter Attendance → Grace Period Rebooking or Completion.
2. **Officer Flow**: Staff Login → Shift Desk Setup → Call Next Citizen → In-Person Physical Checklist Verification (OK / NOT OK) → Multi-Table Forwarding (`C-1` to `C-2`) → Mark Completed.
3. **Office Admin Flow**: Staff Login → Office KPI Dashboard → Counter Officer Provisioning → Service Slot & Lunch Break Configuration → Propose Document Change Request (`CR-xxx`) → Audit Trail Review.
4. **Super Admin Flow**: Staff Login / Auto-Bootstrap → State Analytics → Change Request Review & Approval (Dynamically executes rule into database) → Global Services Catalog CRUD → District Admin Provisioning → Compliance Audit Logs.

---

## 7. Status of Completed Functionality

All critical hackathon and production workflows are operational in code:
- Authentication & RBAC for 4 roles.
- Real-time virtual queue token issuance with slot capacity and duplicate booking guards.
- Live queue tracking with Web Audio API chime.
- Dual-mode accessibility engine (Modern Mode & Simple Mode).
- Complete document requirement Change Request approval pipeline.
- Conversational RAG assistant grounded in official circulars.
- Cloudinary document vault with 15-day expiry warning alerts.
- Telegram Bot polling and n8n webhook notification dispatch.

---

## 8. Status of Partial & UI-Only Functionality

- **Grievances & Complaints**: Fully functional backend API (`POST /api/complaints`, `GET /api/complaints`) and database table `complaints`. Frontend UI exists in `UserComplaintsPage.tsx`, but operates on local `useState` and is not routed in `AppRoutes.tsx`.
- **Priority Appointments**: UI form and list exist in `UserAppointmentsPage.tsx` using local state. Database table `appointments` exists in Supabase schema, but no backend routes exist in `apiRoutes.ts`, and the page is unrouted in `AppRoutes.tsx`.

---

## 9. Important Issues, Risks & Blockers

1. **Hardcoded Secrets in Source Code (Security Vulnerability)**:
   - `src/services/cloudinaryService.ts`: Cloudinary API Key and Secret are embedded in client source.
   - `backend/src/controllers/uploadController.ts`: Identical credentials hardcoded as fallbacks.
   - `backend/src/inspect_db.js`: Supabase Service Role Key is hardcoded in plain text.
   - `n8n/workflows/nagrikq_idp_notification.json`: Telegram Bot token is embedded in HTTP node URL.
2. **Hardcoded Default Admin Credentials**:
   - `backend/src/services/bootstrapService.ts` hardcodes default credentials `superadmin@nagrikq.org` / `SuperAdmin@123` on startup.
3. **Unrouted Orphan Pages**:
   - `src/pages/user/UserAppointmentsPage.tsx` and `src/pages/user/UserComplaintsPage.tsx` exist in the project tree but are never imported or routed in `AppRoutes.tsx`.
4. **Client Mock Repository Fallback Masking Server Failures**:
   - `src/context/DataContext.tsx` silently falls back to in-memory `mockRepository` on server errors, which can hide backend network issues during testing.
5. **Testing Script Isolation**:
   - Standalone test script `backend/src/tests/telegramWorkflow.test.ts` exists, but no automated test runner (Jest/Vitest) is configured in `package.json`.
6. **Recent Commit Status**:
   - Commit `c9baedd9ee741d8670e6ee64c09aa204e812f6e7` notes pending manual verification: `"Issue fixed that are given in whatsapp by kaushal and testing remaining"`.

---

## 10. Important Directories & Files

- **Core Routing**: `src/routes/AppRoutes.tsx`, `src/routes/ProtectedRoute.tsx`
- **Global Contexts**: `src/context/AuthContext.tsx`, `src/context/DataContext.tsx`, `src/context/UIContext.tsx`
- **Key UI Pages**: `UserQueuePage.tsx`, `UserDocumentsPage.tsx`, `EmployeeQueuePage.tsx`, `EmployeeApplicationsPage.tsx`, `AdminServicesPage.tsx`, `SuperAdminChangeRequestsPage.tsx`
- **Backend Entrypoint & Routes**: `backend/src/server.ts`, `backend/src/routes/apiRoutes.ts`
- **AI & RAG Services**: `backend/src/services/geminiService.ts`, `backend/src/services/ragService.ts`
- **External Integrations**: `backend/src/services/telegramBotService.ts`, `backend/src/services/n8nService.ts`
- **Database Migrations & RLS**: `supabase/query.sql`, `supabase/enable_realtime.sql`, `supabase/migrations/20261008_create_telegram_mappings.sql`

---

## 11. Git & Repository Status

- **Active Branch**: `dev` (synchronized with `origin/dev`)
- **Remote Origin**: `https://github.com/dhruv161701/NagrikQ.git`
- **Commit History**: 16 commits in total.
- **Commit Authors**:
  - `dhruv161701 <javiyadhruv80@gmail.com>`
  - `Dhruvin107 <dhruvinkapadiya218@gmail.com>`
  - `KaushalCXXAI <codecrusher0@gmail.com>`
- **Latest Commit**: `c9baedd9ee741d8670e6ee64c09aa204e812f6e7` on `Thu Oct 8 23:17:54 2026 +0530`.
- **Working Tree**: Clean (no uncommitted or modified application files).

---

## 12. Documentation Files Created in `docs/`

1. [FEATURES.md](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/docs/FEATURES.md) — Comprehensive inventory of all 29 discovered features organized by persona.
2. [TECH_STACK.md](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/docs/TECH_STACK.md) — Exact technologies, libraries, and integration details.
3. [USER_FLOWS.md](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/docs/USER_FLOWS.md) — Complete operational flows for Citizen, Officer, Admin, and Super Admin.
4. [ARCHITECTURE.md](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/docs/ARCHITECTURE.md) — Multi-tier architecture, data pathways, and directory map.
5. [API_INVENTORY.md](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/docs/API_INVENTORY.md) — Inventory of all 55 backend REST endpoints, methods, and auth requirements.
6. [DATA_MODEL.md](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/docs/DATA_MODEL.md) — Schema definitions for 19 PostgreSQL tables, ENUMs, indexes, and RLS rules.
7. [CURRENT_PROGRESS.md](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/docs/CURRENT_PROGRESS.md) — Accurate classification of completed vs partial features and technical risks.
8. [PPT_CONTENT_SOURCE.md](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/docs/PPT_CONTENT_SOURCE.md) — Concise, presentation-ready bullet points structured for Code Carnival 3.0 PPT slides.
9. [FEATURE_EVIDENCE.md](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/docs/FEATURE_EVIDENCE.md) — Verification proofs linking every feature to exact file lines, APIs, and tables.
10. [CODEBASE_AUDIT_SUMMARY.md](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/docs/CODEBASE_AUDIT_SUMMARY.md) — Executive summary of the entire audit.

---

## 13. Information That Could NOT Be Verified

1. **Market Size & Demographic Statistics**: Claims regarding millions of active citizens or office networks are not present in source code.
2. **Public Production URL / Cloud Deployment Status**: The repository is configured for local execution (`localhost:5173` and `localhost:5000`); no live cloud hosting URL (Vercel, AWS, etc.) is configured in the files.
3. **Third-Party Payment Gateway Integration**: While services include official fee amounts (`fee_amount`), no payment gateway SDK (Razorpay, Stripe, PayU) is installed or wired.
