# NagrikQ — System Architecture Document

> **Auditor Notice**: This architecture document is mapped directly from the verified code in `src/`, `backend/`, `supabase/`, and `n8n/`. It documents actual data pathways, protocols, authentication mechanics, and integration topologies.

---

## 1. High-Level System Architecture Diagram

```text
+--------------------------------------------------------------------------------------------------+
|                                    USER INTERFACES (CLIENT)                                      |
|  +---------------------+  +----------------------+  +--------------------+  +------------------+ |
|  |   Citizen Portal    |  |     Officer Panel    |  |    Office Admin    |  |   Super Admin    | |
|  | (/user/*) Modern &  |  | (/employee/*) Desk & |  | (/admin/*) Staff & |  | (/super-admin/*)  | |
|  |     Simple Modes    |  |   Multi-Table Queue  |  |  Change Requests   |  |   State Catalog  | |
|  +----------+----------+  +----------+-----------+  +---------+----------+  +--------+---------+ |
+-------------|------------------------|------------------------|----------------------|-----------+
              |                        |                        |                      |
              +------------------------+-----------+------------+----------------------+
                                                   |
                                                   v
+--------------------------------------------------------------------------------------------------+
|                                  REACT FRONTEND APPLICATION                                      |
|  - Routing: React Router DOM (ProtectedRoute with Role Guards & 403 Interceptor)                 |
|  - State Contexts: AuthContext, UIContext (Translations/Tokens), DataContext                     |
|  - Communication: apiClient (Auto-attaches Bearer JWT) & Supabase Client Sockets                 |
|  - Audio: Web Audio API (Chime Oscillator for called tokens)                                     |
+--------------------------------------------------+-----------------------------------------------+
                                                   |
                    +------------------------------+------------------------------+
                    | HTTP REST / JSON via Vite Proxy                             | WebSocket Realtime
                    | (/api/* -> http://localhost:5000)                           | (wss://fcsrwywlhmcusqababtq.supabase.co)
                    v                                                             v
+---------------------------------------------------+        +------------------------------------+
|             EXPRESS REST API BACKEND              |        |     SUPABASE REALTIME ENGINE       |
|  (Node.js + Express + TypeScript on Port 5000)    |        |  Publication: supabase_realtime    |
|                                                   |        |  - queue_tokens (Live wait/counter)|
|  Middleware:                                      |        |  - applications (Status change)    |
|  - authenticateToken (Validates Supabase JWT)     |        |  - service_change_requests         |
|  - requireRole (RBAC authorization)               |        |  - notifications                   |
|  - errorHandler                                   |        |  - telegram_mappings               |
+-------------------------+-------------------------+        +-----------------+------------------+
                          |                                                    ^
       +------------------+-------------------+                                |
       |                  |                   |                                |
       v                  v                   v                                |
+--------------+  +---------------+  +----------------+                        |
|  CONTROLLERS |  |   SERVICES    |  |  EXTERNAL APIS |                        |
| - Queue      |  | - Gemini RAG  |  | - Telegram Bot |                        |
| - Service    |  | - Embeddings  |  |   (@NagrikQbot)|                        |
| - Admin      |  | - n8n Webhook |  | - n8n Workflow |                        |
| - SuperAdmin |  | - Bootstrap   |  | - Cloudinary   |                        |
| - AI (RAG)   |  | - Polling Bot |    Media API      |                        |
| - Upload     |  +-------+-------+  +----------------+                        |
+-------+------+          |                                                    |
        |                 v                                                    |
        +--------> +-------------------------------------------------------+   |
                   |               SUPABASE POSTGRESQL DATABASE            |---+
                   |  - 19 Relational Tables with Foreign Keys & RLS       |
                   |  - pgvector Extension (knowledge_chunks embeddings)   |
                   |  - Service Role Admin Client (Bypasses RLS on backend)|
                   +-------------------------------------------------------+
```

---

## 2. Layer-by-Layer Architectural Breakdown

### Layer 1: User Interfaces & Layouts
- **Citizen Portal (`/user/*`)**: Accessible by role `citizen`. Provides dual UI mode rendering (`modern` vs `simple`), onboarding flow, service catalog, virtual queue booking, Cloudinary document vault, and conversational AI assistant.
  - Layout file: [UserLayout.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/layouts/UserLayout.tsx)
- **Officer Panel (`/employee/*`)**: Accessible by role `employee`. Provides counter operations (`C-01` to `C-10`), Next Table forwarding, physical document verification checklist, and desk shift assignments.
  - Layout file: [EmployeeLayout.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/layouts/EmployeeLayout.tsx)
- **Office Admin Panel (`/admin/*`)**: Accessible by role `admin`. Covers departmental counter management, staff provisioning, service slot/break controls, and statutory document Change Request creation.
  - Layout file: [AdminLayout.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/layouts/AdminLayout.tsx)
- **Super Admin Panel (`/super-admin/*`)**: Accessible by role `superadmin`. Provides state-level governance, global service catalog CRUD, Change Request approvals with automatic database rule modifications, and system-wide audit logging.
  - Layout file: [SuperAdminLayout.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/layouts/SuperAdminLayout.tsx)

### Layer 2: Frontend State Management & Networking
- **Authentication Context ([AuthContext.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/context/AuthContext.tsx))**:
  - Initializes via `supabase.auth.getSession()` and subscribes to `supabase.auth.onAuthStateChange()`.
  - Maps internal `UserProfile` to application user state (`User`), reconciling roles from `profiles` and `staff_profiles`.
- **Data Context ([DataContext.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/context/DataContext.tsx))**:
  - Manages active collections (`services`, `applications`, `queueTokens`, `changeRequests`, `auditLogs`).
  - Implements a multi-tier fallback pattern: queries backend Express API first, falls back to direct Supabase PostgreSQL queries, and if offline or empty, falls back to local memory repository ([repositories.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/services/repositories.ts)).
  - Maintains active Supabase Realtime channel subscription listening to PostgreSQL table changes.
- **API Client ([apiClient.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/services/apiClient.ts))**:
  - Wraps native browser `fetch`.
  - Automatically fetches the current Supabase session token (`session.access_token`) and injects it into the HTTP `Authorization: Bearer <token>` header.
  - Dispatches calls through Vite proxy (`/api/*` mapped to `http://localhost:5000` in `vite.config.ts`).

### Layer 3: Backend API, Authentication & RBAC Middleware
- **Entrypoint ([server.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/server.ts))**:
  - Runs Express server on port 5000.
  - Executes `ensureSuperAdminExists()` on startup to guarantee administrative availability.
  - Spawns background Telegram bot polling loop via `startTelegramPolling()`.
- **Authentication Middleware ([auth.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/middleware/auth.ts))**:
  - Extracts Bearer token from HTTP request header.
  - Validates token against Supabase Auth service via `supabaseAdmin.auth.getUser(token)`.
  - Queries `profiles` and `staff_profiles` to verify the authentic, database-backed role.
  - Attaches `req.user` payload (`id`, `email`, `fullName`, `role`) to the Express request object.
- **Role-Based Access Control ([rbac.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/middleware/rbac.ts))**:
  - Enforces `requireRole(...allowedRoles)` on sensitive endpoints.
  - Responds with HTTP 403 Forbidden if the authenticated user's role does not match requirements.

### Layer 4: Business Logic & Controllers
- **Queue Controller ([queueController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/queueController.ts))**:
  - Handles token generation, duplicate booking prevention per service/day, sequential number allocation, multi-table routing, counter advancing, and queue calling.
- **Service Controller ([serviceController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/serviceController.ts))**:
  - Serves public and location-aware service catalogs, office directories, and handles admin slot/break updates.
- **Admin & Super Admin Controllers ([adminController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/adminController.ts), [superAdminController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/superAdminController.ts))**:
  - Governs administrative user creation using Supabase Admin Auth API, employee scheduling, change request lifecycle, global service CRUD, and state analytics.
- **Upload Controller ([uploadController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/uploadController.ts))**:
  - Manages Cloudinary signed uploads, downloads, and deletion proxies.

### Layer 5: AI & Knowledge Retrieval Engine (RAG Pipeline)
- **Knowledge Representation**:
  - Master government service specifications and circulars are parsed and segmented into topic chunks (`required_documents`, `eligibility`, `process_and_timeline`) by [embeddingService.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/services/embeddingService.ts).
  - Each chunk is embedded into 768 floating-point dimensions using Google Gemini (`gemini-embedding-001`) via [geminiService.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/services/geminiService.ts).
  - Embeddings are persisted in the `knowledge_chunks` table in Supabase PostgreSQL with `vector(768)` type.
- **Retrieval & Inference**:
  1. Citizen submits natural language query to `/api/rag/ask`.
  2. Gemini converts the query into a 768-dimensional vector.
  3. [ragService.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/services/ragService.ts) executes dot-product cosine similarity against `knowledge_chunks`, filtering for chunks exceeding similarity threshold 0.3.
  4. Top 5 context chunks are extracted and injected into a strict system prompt instruction:
     `Answer ONLY using the provided NagrikQ context... If the context does not contain the answer, clearly state that the information is unavailable.`
  5. Gemini `gemini-3.5-flash` generates the response with citations.

### Layer 6: Notifications & External Integration Architecture
- **Telegram Bot (@NagrikQbot)**:
  - Polling loop runs in `telegramBotService.ts`, retrieving updates every 3.5 seconds.
  - `/start` initiates welcome dialogue and requests citizen phone number.
  - Normalizes phone numbers (+91, leading 0) via `phoneUtils.ts` and saves chat ID mapping in `telegram_mappings`.
  - Delivers administrative credentials upon verified `/credentials` request.
- **n8n Workflow Integration**:
  - Triggered on new applications or IDP events via `triggerIdpCreatedWebhook()` in `n8nService.ts`.
  - Dispatches signed HTTP POST requests to `http://localhost:5678/webhook/idp-created` with `x-webhook-secret: nagrikq_idp_secret_key_2026`.
  - Idempotency is enforced by recording `event_id` in `idp_notification_logs`.
  - n8n workflow executes payload validation, resolves linked Telegram chat ID, and posts formatted messages to Telegram API.
- **Cloudinary Storage**:
  - Citizen documents are uploaded under user-isolated folders `nagrikq/users/{userId}`.
  - Supports both server-side proxy upload with secret signing and browser-side fallback using SubtleCrypto SHA-1 digests.

---

## 3. Core Data Flow: The Change Request Governance Pipeline

```text
[Office Admin] 
       │
       ▼ Submits CR-104: Propose "Water Bill" for Income Certificate
[POST /api/change-requests]
       │
       ▼ Inserts into 'service_change_requests' (status: 'PENDING')
       ▼ Inserts into 'audit_logs' (action: 'CREATE_CHANGE_REQUEST')
       │
       ▼ Broadcasts over Supabase Realtime channel
[Super Admin Dashboard] 
       │ (Receives live update toast: "New Change Request Received")
       │
       ▼ Reviews justification and clicks "Approve"
[PATCH /api/change-requests/:id/review] (status: 'APPROVED')
       │
       ├──► Updates 'service_change_requests' status to 'APPROVED'
       ├──► Dynamically inserts new row into 'document_requirements'
       ├──► Inserts into 'audit_logs' (action: 'APPROVE_CHANGE_REQUEST')
       └──► Broadcasts over Supabase Realtime publication
              │
              ▼
       [Citizen Application & Queue Pages]
       (Dynamically demands new document without codebase redeployment)
```

---

## 4. Layer to Directory & File Mapping Table

| Architectural Layer | Core Responsible Directory | Key Implementation Files |
|---|---|---|
| **Public & Citizen UI** | `src/pages/public`, `src/pages/user` | `LandingPage.tsx`, `UserQueuePage.tsx`, `UserDocumentsPage.tsx`, `UserApplicationsPage.tsx`, `UserAssistantPage.tsx` |
| **Staff & Admin UI** | `src/pages/employee`, `src/pages/admin`, `src/pages/superadmin` | `EmployeeQueuePage.tsx`, `EmployeeApplicationsPage.tsx`, `AdminServicesPage.tsx`, `AdminEmployeesPage.tsx`, `SuperAdminServicesPage.tsx`, `SuperAdminChangeRequestsPage.tsx` |
| **Design System & Layouts** | `src/styles`, `src/layouts`, `src/components` | `tokens.css`, `UserLayout.tsx`, `EmployeeLayout.tsx`, `AdminLayout.tsx`, `SuperAdminLayout.tsx`, `QueueTrackerCard.tsx` |
| **Client Routing & Auth** | `src/routes`, `src/context` | `AppRoutes.tsx`, `ProtectedRoute.tsx`, `AuthContext.tsx`, `DataContext.tsx`, `UIContext.tsx` |
| **API Client & Repositories**| `src/services` | `apiClient.ts`, `cloudinaryService.ts`, `repositories.ts`, `mockData.ts` |
| **Backend API Server** | `backend/src` | `server.ts`, `routes/apiRoutes.ts` |
| **Backend Security** | `backend/src/middleware` | `auth.ts`, `rbac.ts`, `errorHandler.ts` |
| **Backend Business Logic** | `backend/src/controllers` | `queueController.ts`, `serviceController.ts`, `adminController.ts`, `superAdminController.ts`, `aiController.ts`, `uploadController.ts` |
| **AI, RAG & Vector Engine** | `backend/src/services` | `geminiService.ts`, `ragService.ts`, `embeddingService.ts`, `bootstrapService.ts` |
| **External Integrations** | `backend/src/services`, `n8n` | `telegramBotService.ts`, `n8nService.ts`, `nagrikq_idp_notification.json` |
| **Database & Security Rules**| `supabase` | `query.sql`, `enable_realtime.sql`, `migrations/20261008_create_telegram_mappings.sql` |
