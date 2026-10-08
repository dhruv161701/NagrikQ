# NagrikQ — AI-Powered Government Service & Virtual Queue Management Platform

[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue?style=flat-square)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/Frontend-React%2019-61dafb?style=flat-square)](https://react.dev/)
[![Express](https://img.shields.io/badge/Backend-Express%204-black?style=flat-square)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=flat-square)](https://supabase.com/)
[![Gemini AI](https://img.shields.io/badge/AI-Google%20Gemini%20RAG-8E75C4?style=flat-square)](https://ai.google.dev/)

> **NagrikQ** is a production-quality, civic-tech digital governance platform engineered to eliminate physical waiting lines and paperwork confusion at Indian public administration offices (e.g., Mamlatdar offices, District Collectorates, and Jan Seva Kendras).

Citizens can discover required documents, pre-verify certificates, generate live virtual queue tokens with timed 30-minute arrival slots, track real-time counter progress from anywhere, and walk up to designated office counters exactly when called.

---

## 👥 The Team

NagrikQ was designed and built by:

| Team Member | Role & Key Contributions | GitHub Profile |
|---|---|---|
| **Dhruv** | Full-Stack Architecture, Cloudinary Vault, Application Lifecycle, and Core Integration | [@dhruv161701](https://github.com/dhruv161701) |
| **Dhruvin** | Virtual Queue Systems, Multi-Table Counter Routing, Telegram Bot Service, and Office Operations | [@Dhruvin107](https://github.com/Dhruvin107) |
| **Kaushal** | AI / RAG Pipeline (Gemini + Supabase pgvector), Knowledge Chunking, and Data Architecture | [@KaushalCXXAI](https://github.com/KaushalCXXAI) |

---

## 🌟 Key Platform Features

### 1. 🧓 Dual-Mode Accessibility Engine (Modern & Simple)
- **⚡ Modern Mode**: Compact card layouts, data-dense metrics, standard typography, and rapid navigation designed for digital natives.
- **🧓 Simple Mode**: Extra-large readable typography (18px–38px), high-contrast touch targets (52px+ height), bold 2px borders, explicit labels, and low cognitive load tailored for senior citizens and rural applicants.

### 2. 🌐 Adaptive 3-Step Onboarding & Guided Tour
- **Multilingual Support**: Switch seamlessly between English, Gujarati (`ગુજરાતી`), and Hindi (`हिन्दी`).
- **Age-Driven Recommendation**: Calculates exact age from Date of Birth:
  - Age < 35 ➔ Recommended **Modern Mode**
  - Age ≥ 35 ➔ Recommended **Simple Mode** (with 1-click manual override)
- **Interactive 5-Step Guided Tour**: Visual walkthrough explaining service discovery, required documents, digital tokens, queue tracking, and counter arrival.

### 3. 🎫 Transactional Virtual Queueing & Counter Operations
- **Timed 30-Minute Slots**: Book slots based on real-time desk capacity, with automated lunch break exclusions and past-slot filtering.
- **Duplicate Booking Prevention**: Strict daily validation preventing citizens from booking the same service multiple times on the same date.
- **Realtime WebSocket Tracking**: Subscribes to Supabase Realtime (`queue_tokens` publication) for live updates on people ahead and estimated wait times.
- **Synthesized Web Audio Chime**: Native browser Web Audio API oscillator bell (587Hz sliding to 880Hz) chimes when the citizen's token is called.
- **15-Minute Grace Period & Rebooking**: Auto-detects late arrivals and allows instant same-day rebooking for expired tokens.
- **Multi-Table Desk Forwarding**: Counter officers route citizens across sequential desks (e.g. Counter 1 Intake ➔ Counter 2 Biometrics ➔ Counter 3 Verification).

### 4. 🧠 Grounded AI Citizen Assistant (Gemini + pgvector RAG)
- Natural language query answering for government circulars, eligibility, fees, and statutory timelines.
- **768-Dimensional Embeddings**: Generated via Google Gemini (`gemini-embedding-001`).
- **Vector Cosine Search**: Sub-millisecond similarity matching against `knowledge_chunks` in Supabase PostgreSQL (`pgvector` IVFFlat index).
- **Grounded Synthesis**: Context-bounded responses via Google Gemini (`gemini-3.5-flash` with fallback to `gemini-3.5-flash-lite`) with cited official sources.

### 5. 📁 Cloud Document Vault & 15-Day Expiry Alerts
- Secure cloud storage for citizen certificates via Cloudinary with cryptographic SHA-1 signature upload authentication.
- **Certificate Validity Tracking**: Computes expiration dates across 1-year, 3-year, 5-year, and lifetime certificates.
- **Automated Renewal Alerts**: Highlights certificates expiring in ≤ 15 days with prominent amber alert banners.

### 6. 🏛️ Statutory Governance & Document Change Request Pipeline
- **Decentralized Bureaucracy**: Office Admins cannot unilaterally alter rules; they submit formal Change Requests (`CR-xxx`) proposing document additions.
- **Dynamic Database Rule Execution**: When the State Super Admin reviews and approves a request, the backend automatically inserts the rule into the active `document_requirements` table and broadcasts via WebSockets without application redeployment.

### 7. 📲 Automated Telegram Bot & n8n Workflows
- **Telegram Bot (`@NagrikQbot`)**: Background long-polling bot that normalizes Indian phone numbers, links user chat IDs, and delivers admin credentials via `/credentials`.
- **n8n Automation Engine**: Webhook orchestration pipeline (`nagrikq_idp_notification.json`) validating secret headers and dispatching instant application updates.

---

## 🏛️ The Four User Roles

| Role | Code ID | Portal Route | Core Responsibilities |
|---|---|---|---|
| **Citizen** | `citizen` | `/user/*` | Browse services, apply online, manage document vault, generate virtual tokens, track live queue, and consult AI assistant. |
| **Counter Officer** | `employee` | `/employee/*` | Desk queue controls (**Call Next**, **Pause**, **Complete**, **Skip**), physical document checklist verification (OK / NOT OK), and inter-table routing. |
| **Office Admin** | `admin` | `/admin/*` | Departmental counter management, officer provisioning, service slot/break configuration, and Change Request creation (`CR-xxx`). |
| **Super Admin** | `superadmin` | `/super-admin/*` | State-wide analytics, master service catalog CRUD, Change Request approvals with dynamic database execution, and compliance audit logs. |

> **Tester Note**: The persistent top **Demo Persona Switcher Bar** allows 1-click evaluation of all 4 roles and UI modes without manual logouts.

---

## 🛠️ Technology Stack

- **Frontend**: React 19.2.8, TypeScript, Vite 8.3.0, React Router DOM 7.18.4, Lucide React, Custom Vanilla CSS Design System (`tokens.css`), Web Audio API.
- **Backend API**: Node.js, Express 4.21.2, TypeScript, ts-node-dev, Supabase Auth Admin SDK, CORS, Dotenv.
- **Database & Realtime**: Supabase PostgreSQL with 19 relational tables, Row Level Security (RLS), Supabase Realtime publication, and `pgvector` extension.
- **AI / LLM**: Google Gemini API (`@google/generative-ai`), `gemini-3.5-flash`, `gemini-embedding-001`.
- **External Services**: Cloudinary REST API, Telegram Bot API, n8n Workflow Automation.

---

## 🚀 Setup & Installation Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) (v9.0.0 or higher)
- [Supabase](https://supabase.com/) project account (with PostgreSQL & pgvector)
- [Google Gemini API Key](https://aistudio.google.com/)

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/dhruv161701/NagrikQ.git
cd NagrikQ
```

---

### Step 2: Database Setup (Supabase)
1. Open your [Supabase Dashboard](https://app.supabase.com) and navigate to the **SQL Editor**.
2. Run the main schema script:
   - Copy and execute the contents of [`supabase/query.sql`](supabase/query.sql).
3. Enable Realtime subscriptions:
   - Copy and execute the contents of [`supabase/enable_realtime.sql`](supabase/enable_realtime.sql).
4. Run the Telegram mappings migration:
   - Copy and execute the contents of [`supabase/migrations/20261008_create_telegram_mappings.sql`](supabase/migrations/20261008_create_telegram_mappings.sql).

---

### Step 3: Configure Environment Variables

#### Root Frontend `.env`
Create a `.env` file in the root project folder:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SECRET_KEY=your_supabase_service_role_key

GEMINI_API_KEY=your_gemini_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key

TELEGRAM_BOT_TOKEN=your_telegram_bot_token
N8N_WEBHOOK_URL=http://localhost:5678/webhook/idp-created
WEBHOOK_SECRET=nagrikq_idp_secret_key_2026
```

#### Backend `.env`
Create a `.env` file inside the `backend/` directory:
```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CLIENT_ORIGIN=http://localhost:5173

GEMINI_API_KEY=your_gemini_api_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
N8N_WEBHOOK_URL=http://localhost:5678/webhook/idp-created
WEBHOOK_SECRET=nagrikq_idp_secret_key_2026
```

---

### Step 4: Install Dependencies & Start Services

#### 1. Start the Backend API Server
```bash
cd backend
npm install
npm run dev
```
Backend API will start at: `http://localhost:5000`  
*(On boot, the backend automatically bootstraps the Super Admin account: `superadmin@nagrikq.org` / `SuperAdmin@123` and seeds RAG embeddings).*

#### 2. Start the Frontend Application
Open a new terminal in the project root:
```bash
npm install
npm run dev
```
Frontend Web Application will start at: `http://localhost:5173`

---

## 📚 Complete Project Documentation

For exhaustive technical and architectural documentation produced during the codebase audit, refer to the [`docs/`](docs/) directory:

- 📋 [**docs/FEATURES.md**](docs/FEATURES.md) — 29-feature comprehensive system inventory.
- ⚙️ [**docs/TECH_STACK.md**](docs/TECH_STACK.md) — Exhaustive technology stack breakdown.
- 🔄 [**docs/USER_FLOWS.md**](docs/USER_FLOWS.md) — Complete operational workflows for all 4 roles.
- 🏗️ [**docs/ARCHITECTURE.md**](docs/ARCHITECTURE.md) — Layered architecture, data flows, and RAG pipeline.
- 📡 [**docs/API_INVENTORY.md**](docs/API_INVENTORY.md) — Complete 55-endpoint REST API inventory.
- 🗄️ [**docs/DATA_MODEL.md**](docs/DATA_MODEL.md) — Database schema, foreign keys, indexes, and RLS policies.
- 📊 [**docs/CURRENT_PROGRESS.md**](docs/CURRENT_PROGRESS.md) — Implementation verification and technical risk audit.
- 🎤 [**docs/PPT_CONTENT_SOURCE.md**](docs/PPT_CONTENT_SOURCE.md) — Presentation-ready bullet points for Code Carnival 3.0 PPT.
- 🔍 [**docs/FEATURE_EVIDENCE.md**](docs/FEATURE_EVIDENCE.md) — Feature-to-file traceability evidence map.
- 📑 [**docs/CODEBASE_AUDIT_SUMMARY.md**](docs/CODEBASE_AUDIT_SUMMARY.md) — Executive audit summary.

---
