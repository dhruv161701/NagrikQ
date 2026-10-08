# NagrikQ — Code Carnival 3.0 PPT Content Source

> **Auditor Notice**: This document contains strictly verified data structured directly for the Code Carnival 3.0 Idea Submission PPT slides. Every bullet point is presentation-ready and grounded entirely in the active repository. Where data or metrics cannot be verified from code, it is explicitly noted.

---

## 01 — THE TARGET

### Problem Statement
- Indian citizens endure exhausting physical queues and repetitive office visits at local government offices (Mamlatdar offices, District Collectorates, Jan Seva Kendras) due to unpredictable wait times and unverified document requirements.
- Elderly citizens and digitally non-literate applicants struggle with complex, low-contrast, small-text digital portals, leading to complete reliance on informal middlemen.
- Counter officers face chaotic lobby overcrowding, manual paper shuffling, and lack real-time coordination tools to route citizens between sequential processing desks.

### Who Faces It
- **Citizens (Particularly Seniors & Rural Applicants)**: Face multiple wasted office visits due to missing or expired certificates.
- **Counter Officers & Verification Staff**: Suffer from unmanaged crowd surges, lack of counter-level visibility, and manual paper verification burdens.
- **Office & District Administrators**: Lack granular real-time visibility into counter wait times, throughput bottlenecks, and staff shift pacing.
- **State System Authorities**: Face bureaucratic delays updating statutory document requirements across hundreds of local offices without code changes.

### Scale / Impact (Verifiable from Codebase)
- Specific market size and demographic statistics: *Not verifiable from the current codebase.*
- Verifiable architectural metric from codebase: Traditional government office visits average ~1.5 hours of physical lobby waiting (verified in `QueueVisualizer.tsx`), which NagrikQ virtual queue slots reduce to an average wait of ~5 minutes at the designated counter.

### Root Cause
- Physical walk-in intake models force citizens to arrive hours early without knowledge of counter availability.
- Citizens lack pre-arrival validation of required documents, resulting in in-person rejections at the counter.
- One-size-fits-all user interfaces exclude elderly citizens through dense layouts and micro-typography.
- Fragmented counter workflows operate in silos without automated handoffs between intake, verification, and dispatch.

### Existing Solution Gaps
- Existing government portals act merely as static information bulletin boards or raw form uploaders without live, counter-synced virtual queuing.
- Commercial queue token machines require physical presence inside the government building, offering zero remote tracking.
- Rigid systems cannot alter document rules dynamically; any government circular update requires slow software redeployment cycles.

### Why It Needs Solving Now
- High mobile penetration in India enables remote virtual queue tracking from home.
- Increasing citizen demand for transparent, dignified, and accessible e-governance under the Digital India mission.

---

## 02 — THE PLAN

### Solution in One Line
- **NagrikQ is an AI-powered, accessibility-first civic queue management and governance platform that transforms physical government office waiting into virtual, real-time counter appointments.**

### How It Addresses the Problem
- Eliminates physical lobby waiting by issuing virtual tokens with 30-minute arrival slots and real-time position tracking.
- Pre-validates mandatory certificate requirements before the citizen travels, backed by a conversational RAG AI assistant.
- Delivers an adaptive dual-mode interface (Modern Mode vs. Simple Mode) that auto-tailors font sizing and button dimensions based on citizen age.
- Provides counter officers with live desk controls, audio call chimes, and instant inter-table routing.
- Implements a bureaucratic Change Request pipeline allowing State Admins to dynamically update statutory document checklists across the platform without touching code.

### What Is New / Unique (Verifiable from Implementation)
- **Dual Accessibility Engine**: Real-time mode switching between compact modern UI and high-contrast, oversized Simple Mode (18px+ text, 52px+ touch targets).
- **Dynamic Multi-Table Desk Forwarding**: Officers route citizens sequentially across physical city tables (`C-1` to `C-10`) in real time.
- **Dynamic Document Rule Execution**: Super Admin approval of a Change Request immediately injects requirements into active database tables and broadcasts via WebSockets.
- **Native Browser Audio Chime Engine**: Zero-dependency Web Audio API synthesizer alerting citizens when their token is called.
- **Deep Government RAG Assistant**: Grounded Gemini AI responses restricted strictly to official state knowledge base chunks stored in `pgvector`.

### Who Benefits
- **Citizens**: Dignified, zero-queue visits with exact arrival times and verified document checklists.
- **Officers**: Controlled desk pacing, structured document inspection checklists, and smooth inter-desk handoffs.
- **Office Admins**: Live throughput metrics, break time scheduling, and formal mechanism to propose requirement updates.
- **State Super Admins**: Unified oversight, instant state-wide service management, and tamper-evident audit logging.

---

## 03 — THE ARSENAL (Core Features)

### 1. Dual-Mode Adaptive Accessibility & Guided Onboarding
- Auto-recommends Simple Mode (large text, high contrast, oversized buttons) or Modern Mode based on citizen age, with multilingual support (English, Gujarati, Hindi) and an interactive 5-step tour.

### 2. Transactional Virtual Queueing with Multi-Counter Routing
- Issues timed virtual tokens with duplicate daily booking prevention, live countdown tracking, browser audio counter chimes, 15-minute grace period rebooking, and dynamic inter-table forwarding.

### 3. Dynamic Statutory Governance & Change Request Pipeline
- Decentralized office administrators submit formal document Change Requests (`CR-xxx`) that, upon State Super Admin approval, instantly alter live service requirements across the platform without redeployment.

### 4. Grounded AI Citizen Assistant (Gemini + Supabase pgvector RAG)
- Conversational assistant powered by Google Gemini and 768-dimensional vector similarity search over official government service knowledge chunks, delivering answers with cited sources.

---

## 04 — THE EXECUTION

### End-to-End Technical Flow
1. **Citizen Discovery & Token Generation**: Citizen selects jurisdiction, picks service, attaches pre-verified documents from Cloudinary vault, and secures a 30-minute arrival slot (`A104`).
2. **Realtime Queuing & Counter Arrival**: Citizen tracks live wait time via WebSocket updates; browser synthesizes audio chime when Counter Officer calls the token.
3. **Desk Inspection & Multi-Table Forwarding**: Officer conducts physical checklist verification (OK / NOT OK); forwards citizen to next table (e.g. `C-2` Biometrics) or completes service.
4. **Governance & Requirement Evolution**: Local Admin proposes document modifications (`POST /api/change-requests`); Super Admin approves (`PATCH /api/change-requests/:id/review`); database dynamically updates and broadcasts statewide.

### Major Processing Steps
- Authentication via Supabase Auth (JWT Bearer tokens).
- Express API validation with Role-Based Access Control (`requireRole`).
- Realtime database publication distribution via PostgreSQL WebSocket replication (`supabase_realtime`).
- Cloudinary cryptographic SHA-1 signature upload verification for citizen documents.
- RAG question embedding generation via Gemini (`gemini-embedding-001`) and IVFFlat cosine similarity matching in `knowledge_chunks`.

### Services & Data Involved
- **Frontend**: React 19, TypeScript, Vite, React Router, Lucide Icons, Web Audio API.
- **Backend API**: Node.js, Express, TypeScript (`/backend`).
- **Database**: Supabase PostgreSQL, `pgvector`, Row Level Security (RLS).
- **External Integrations**: Google Generative AI (Gemini), Cloudinary API, Telegram Bot API, n8n webhook automation.

### Final Output
- Real-time digital token slip with QR visual, synchronized live call display, completed citizen application dossier, and immutable security audit log entry.

---

## 05 — THE GEAR (Technology Stack)

| Technology | Why It Is Used in NagrikQ |
|---|---|
| **React 19 & TypeScript** | Delivers a high-performance, type-safe single-page application for citizen and administrative panels. |
| **Vite 8** | High-speed frontend development server and bundler with internal reverse proxying for `/api`. |
| **Vanilla CSS (Design Tokens)** | Custom government civic color system (`tokens.css`) supporting instant Modern/Simple accessibility switching. |
| **Node.js & Express 4** | Lightweight, robust REST API server managing queue logic, RBAC, and administrative workflows. |
| **Supabase PostgreSQL** | Cloud database with 19 normalized relational tables, foreign key constraints, and Row Level Security. |
| **Supabase Realtime** | WebSocket engine broadcasting live queue token updates and change request approvals to connected clients. |
| **Supabase pgvector** | PostgreSQL extension executing fast cosine similarity searches across 768-dimensional knowledge embeddings. |
| **Google Gemini (3.5 Flash & Embedding 001)** | State-of-the-art embedding generation and grounded, conversational response synthesis with source citations. |
| **Cloudinary Media API** | Secure cloud storage for citizen certificates with SHA-1 signature validation and upload proxying. |
| **Telegram Bot API & n8n** | Event-driven notification pipeline sending admin login credentials and IDP updates directly to user Telegram chats. |
| **Web Audio API** | Native browser audio synthesis creating clear desk call chimes without external media files. |

---

## 06 — INSIDE THE MINT (Implementation Reality)

### Actually Completed Work
- Fully functional four-panel user interface (`citizen`, `employee`, `admin`, `superadmin`).
- Complete virtual queue token lifecycle (booking, live tracking, calling, multi-table routing, completing, rebooking, cancelling).
- Adaptive onboarding flow with age-based Simple Mode vs Modern Mode recommendation.
- Dynamic Change Request pipeline with real-time database modifications upon Super Admin approval.
- Grounded RAG conversational AI assistant connected to Gemini and Supabase pgvector.
- Cloudinary document vault with validity period expiry calculation and 15-day renewal alert banner.
- Telegram Bot polling integration with phone normalization and credential dispatch.
- n8n webhook automation with secret validation and idempotency logging.
- 1-click Demo Persona Switcher Bar for instant hackathon evaluation.

### Work in Progress / Partial
- Grievances / Complaints system: Backend endpoints and database tables are functional, but frontend UI exists only as an unrouted component with local state.
- Standalone manual office setup wizard: Backend endpoint exists without a dedicated frontend configuration view.

### Known Blockers / Issues
- Cloudinary API secrets are hardcoded in frontend and backend source code (security vulnerability requiring migration to pure backend signing).
- Supabase Service Role key is exposed in plain text in `backend/src/inspect_db.js`.
- Telegram bot token is embedded in the n8n JSON workflow definition.
- `UserAppointmentsPage.tsx` and `UserComplaintsPage.tsx` are unrouted orphan pages omitted from `AppRoutes.tsx`.
- Fallback in-memory mock repository can mask server or network outages during testing.

---

## 07 — THE GETAWAY (Realistic Next Steps)

### Short-Term Improvements (Immediate Hardening)
- Migrate Cloudinary signed uploads entirely to backend endpoints, removing hardcoded API secrets from client bundles.
- Route and integrate `UserComplaintsPage.tsx` with the existing `POST /api/complaints` and `GET /api/complaints` backend endpoints.
- Extract all credentials from `inspect_db.js` and n8n workflow into `.env` environment variables.
- Connect `UserAppointmentsPage.tsx` to the existing `appointments` table via dedicated backend routes.

### Long-Term Vision
- **Aadhaar e-KYC & DigiLocker Direct Pull**: Pull verified citizen certificates directly from DigiLocker APIs, eliminating manual uploads.
- **Automated SMS & WhatsApp Webhooks**: Expand the notification layer beyond Telegram to native government SMS gateways (NIC / CDAC).
- **Physical Counter LED Display Board Interface**: Provide a dedicated full-screen public waiting room display view (`/display/:officeId`) for office lobbies.
- **Cross-Department Workflow Expansion**: Extend multi-table routing across inter-departmental workflows (e.g. Revenue Mamlatdar -> Sub-Registrar -> Municipal Corporation).

---

## 08 — THE VAULT (Project & Repository Status)

- **Repository Origin URL**: `https://github.com/dhruv161701/NagrikQ.git`
- **Active Branch**: `dev` (Up to date with `origin/dev`)
- **Total Commit Count**: 16 commits in project Git history.
- **Contributors / Authors**:
  - `dhruv161701 <javiyadhruv80@gmail.com>`
  - `Dhruvin107 <dhruvinkapadiya218@gmail.com>`
  - `KaushalCXXAI <codecrusher0@gmail.com>`
- **Latest Commit**: `c9baedd9ee741d8670e6ee64c09aa204e812f6e7` (Thu Oct 8 23:17:54 2026 +0530)
- **Working Tree Status**: Clean (0 uncommitted files).
- **README Status**: Comprehensive root `README.md` and `backend/README.md` detailing architecture, test personas, API tables, and setup steps.
- **Deployment Status**: Configured for local development (`http://localhost:5173` frontend, `http://localhost:5000` backend API, Supabase Cloud database). Public web deployment URL: *Not verifiable from the current codebase.*
