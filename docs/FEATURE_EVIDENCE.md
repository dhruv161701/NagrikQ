# NagrikQ — Feature-to-File Evidence Map

> **Auditor Notice**: This document establishes definitive architectural proof for every claimed feature in NagrikQ. Every entry maps directly to verified source files, routes, backend controllers, and database entities.

---

### Feature: Dual UI Accessibility Modes (Modern Mode & Simple Mode)
- **Status**: IMPLEMENTED
- **Relevant files**:
  - `src/context/UIContext.tsx`
  - `src/styles/tokens.css`
  - `src/pages/user/UserSettingsPage.tsx`
  - `src/pages/user/UserDashboardPage.tsx`
  - `src/pages/user/UserQueuePage.tsx`
- **Relevant API**: `POST /api/profile/onboarding`, `PUT /api/profile`
- **Relevant database**: `profiles.ui_mode` (ENUM: `'modern'`, `'simple'`)
- **Evidence**: `UIContext.tsx` manages `uiMode` state, which toggles root CSS attributes and controls dynamic conditional styling across pages. In Simple Mode, headings expand to 2.4rem–3rem, body text to 1.1rem–1.25rem, and touch targets to 52px+ height with bold 2px borders.

---

### Feature: Adaptive 3-Step Citizen Onboarding & Guided Tour
- **Status**: IMPLEMENTED
- **Relevant files**:
  - `src/pages/onboarding/LanguageSelectionPage.tsx`
  - `src/pages/onboarding/DateOfBirthPage.tsx`
  - `src/pages/onboarding/ModeRecommendationPage.tsx`
  - `src/components/onboarding/GuidedTourModal.tsx`
  - `src/routes/ProtectedRoute.tsx`
- **Relevant API**: `POST /api/profile/onboarding`
- **Relevant database**: `profiles.onboarding_completed`, `profiles.tour_completed`, `profiles.preferred_language`, `profiles.date_of_birth`
- **Evidence**: `ProtectedRoute.tsx` (lines 52–61) intercepts un-onboarded citizens and redirects to `/onboarding/language`. `DateOfBirthPage.tsx` parses DOB, calculates chronological age, and `ModeRecommendationPage.tsx` automatically assigns Modern Mode if age < 35 or Simple Mode if age ≥ 35.

---

### Feature: Service Catalog & Dynamic Requirements Inspection
- **Status**: IMPLEMENTED
- **Relevant files**:
  - `src/pages/public/ServiceDiscoveryPage.tsx`
  - `src/pages/public/ServiceDetailPage.tsx`
  - `src/pages/user/UserServicesPage.tsx`
  - `backend/src/controllers/serviceController.ts`
- **Relevant API**: `GET /api/services`, `GET /api/services/:id`, `GET /api/services/location-aware`
- **Relevant database**: `services`, `document_requirements`, `departments`
- **Evidence**: `serviceController.ts` fetches services joined with `document_requirements`. `ServiceDetailPage.tsx` displays fees, processing days, validity periods, and required vs optional document lists.

---

### Feature: Virtual Queue Token Generation & Duplicate Booking Prevention
- **Status**: IMPLEMENTED
- **Relevant files**:
  - `src/pages/user/UserQueuePage.tsx`
  - `src/context/DataContext.tsx`
  - `backend/src/controllers/queueController.ts`
- **Relevant API**: `POST /api/queue/token`
- **Relevant database**: `queue_tokens`, `applications`, `documents`
- **Evidence**: `queueController.ts` lines 61–81 inspects `queue_tokens` for existing active bookings by `user_id` and `service_id` for that date, returning HTTP 400 `DUPLICATE_BOOKING` if already booked. If valid, generates a sequential token (e.g. `A104`) and auto-creates an `applications` record with attached documents.

---

### Feature: Realtime Live Queue Tracking & Web Audio Counter Chime
- **Status**: IMPLEMENTED
- **Relevant files**:
  - `src/pages/user/UserQueuePage.tsx`
  - `src/components/queue/QueueTrackerCard.tsx`
  - `src/context/DataContext.tsx`
- **Relevant API**: `GET /api/queue/live`, `GET /api/queue/my-tokens`
- **Relevant database**: `queue_tokens`, Supabase publication `supabase_realtime`
- **Evidence**: `DataContext.tsx` lines 448–490 establishes a Supabase Realtime channel subscription listening to `postgres_changes` on `queue_tokens`. When the token status updates to `CALLED`, `playCounterBell()` in `UserQueuePage.tsx` uses the browser `AudioContext` to generate a two-tone 587Hz–880Hz chime.

---

### Feature: 15-Minute Grace Period & Same-Day Rebooking
- **Status**: IMPLEMENTED
- **Relevant files**:
  - `src/pages/user/UserQueuePage.tsx`
  - `src/context/DataContext.tsx`
  - `backend/src/controllers/queueController.ts`
- **Relevant API**: `POST /api/queue/tokens/:id/rebook`
- **Relevant database**: `queue_tokens.time_slot`, `queue_tokens.slot_date`, `queue_tokens.is_late`
- **Evidence**: `UserQueuePage.tsx` (`checkIsTokenExpired()`) evaluates if the current time exceeds slot end time + 15 minutes. If expired, presents a rebooking modal invoking `POST /api/queue/tokens/:id/rebook` which resets the token to `WAITING` with a new time slot.

---

### Feature: Cloud-Backed Document Vault with 15-Day Expiry Alert
- **Status**: IMPLEMENTED
- **Relevant files**:
  - `src/pages/user/UserDocumentsPage.tsx`
  - `src/services/cloudinaryService.ts`
  - `backend/src/controllers/uploadController.ts`
- **Relevant API**: `POST /api/upload/cloudinary`, `POST /api/upload/cloudinary/delete`
- **Relevant database**: LocalStorage persistence per citizen, Cloudinary REST API
- **Evidence**: `cloudinaryService.ts` executes server proxy uploads and direct signed browser uploads. `UserDocumentsPage.tsx` (`getDaysRemaining()`) calculates expiration dates and triggers an amber warning banner on the dashboard for documents expiring in ≤ 15 days.

---

### Feature: Grounded RAG AI Citizen Assistant
- **Status**: IMPLEMENTED
- **Relevant files**:
  - `src/components/assistant/AIAssistantWidget.tsx`
  - `backend/src/controllers/aiController.ts`
  - `backend/src/services/geminiService.ts`
  - `backend/src/services/ragService.ts`
  - `backend/src/services/embeddingService.ts`
- **Relevant API**: `POST /api/rag/ask`
- **Relevant database**: `knowledge_chunks` (pgvector 768 dimensions with IVFFlat index)
- **Evidence**: `aiController.ts` converts user question to 768d embedding via `generateEmbedding()`, searches `knowledge_chunks` via cosine similarity, retrieves top 5 chunks, and prompts Gemini `gemini-3.5-flash` to generate answers with cited official sources.

---

### Feature: Counter Officer Desk Controls (Call Next, Complete, Pause, Skip)
- **Status**: IMPLEMENTED
- **Relevant files**:
  - `src/pages/employee/EmployeeDashboardPage.tsx`
  - `src/pages/employee/EmployeeQueuePage.tsx`
  - `backend/src/controllers/queueController.ts`
- **Relevant API**: `POST /api/queue/next`, `PATCH /api/queue/tokens/:id/status`
- **Relevant database**: `queue_tokens`
- **Evidence**: `queueController.ts` lines 366–510 handles `callNextToken`, fetching the earliest `WAITING` token matching the officer's counter and services, updating its status to `IN_SERVICE`, and recalculating `people_ahead` for remaining tokens.

---

### Feature: Dynamic Multi-Table Counter Forwarding
- **Status**: IMPLEMENTED
- **Relevant files**:
  - `src/pages/employee/EmployeeDashboardPage.tsx`
  - `src/pages/employee/EmployeeQueuePage.tsx`
  - `src/utils/cityTables.ts`
  - `backend/src/controllers/queueController.ts`
- **Relevant API**: `POST /api/queue/tokens/:id/next-table`, `POST /api/queue/tokens/:id/advance-counter`
- **Relevant database**: `queue_tokens.counter_number`, `queue_tokens.next_counter`, `queue_tokens.counter_path`
- **Evidence**: `cityTables.ts` dynamically provides available counters (`C-1`, `C-2`, etc.) per city. `queueController.ts` lines 568–647 handles `routeNextTable`, updating the token's destination counter for sequential counter movement.

---

### Feature: Physical Hard-Copy Document Inspection Checklist
- **Status**: IMPLEMENTED
- **Relevant files**:
  - `src/pages/employee/EmployeeApplicationsPage.tsx`
  - `backend/src/controllers/applicationController.ts`
- **Relevant API**: `PATCH /api/applications/documents/:docId/status`, `PATCH /api/applications/:id/status`
- **Relevant database**: `applications`, `documents`, `document_verifications`
- **Evidence**: `EmployeeApplicationsPage.tsx` lines 82–120 implements an inspection modal with interactive OK / NOT OK checklist buttons for each required document. Submitting updates document verification status in Supabase via backend API.

---

### Feature: Office Admin Metrics & KPI Dashboard
- **Status**: IMPLEMENTED
- **Relevant files**:
  - `src/pages/admin/AdminDashboardPage.tsx`
  - `src/pages/admin/AdminReportsPage.tsx`
- **Relevant API**: `GET /api/change-requests`, `GET /api/admin/employees`
- **Relevant database**: `staff_profiles`, `applications`, `queue_tokens`, `service_change_requests`
- **Evidence**: `AdminDashboardPage.tsx` aggregates counts of active staff, daily applications, waiting queue tokens, active services, and pending change requests with realtime Supabase subscriptions.

---

### Feature: Counter Officer Provisioning by Office Admin
- **Status**: IMPLEMENTED
- **Relevant files**:
  - `src/pages/admin/AdminEmployeesPage.tsx`
  - `backend/src/controllers/adminController.ts`
- **Relevant API**: `POST /api/admin/employees`, `GET /api/admin/employees`, `PATCH /api/admin/employees/:id`, `DELETE /api/admin/employees/:id`
- **Relevant database**: Supabase Auth Admin API, `profiles`, `staff_profiles`, `audit_logs`
- **Evidence**: `adminController.ts` lines 110–280 creates Supabase auth user via `supabaseAdmin.auth.admin.createUser`, sets role to `employee`, inserts staff profile with assigned counter (`C-01` to `C-10`) and break schedule, and logs event in `audit_logs`.

---

### Feature: Service Slot Capacity, Break Windows & Blackout Dates
- **Status**: IMPLEMENTED
- **Relevant files**:
  - `src/pages/admin/AdminServicesPage.tsx`
  - `backend/src/controllers/serviceController.ts`
- **Relevant API**: `PATCH /api/services/:id/slots`
- **Relevant database**: `services` (columns: `slot_capacity`, `start_time`, `end_time`, `enable_break_time`, `break_start_time`, `break_end_time`, `stopped_booking_dates`, `is_booking_stopped`)
- **Evidence**: `serviceController.ts` lines 148–210 updates slot parameters in `services`. `indianLocations.ts` (`generateServiceSlots`) references these columns to exclude lunch break windows from citizen slot booking.

---

### Feature: Document Requirement Change Request Pipeline (Admin Proposal & Super Admin Execution)
- **Status**: IMPLEMENTED
- **Relevant files**:
  - `src/pages/admin/AdminServicesPage.tsx`
  - `src/pages/admin/AdminChangeRequestsPage.tsx`
  - `src/pages/superadmin/SuperAdminChangeRequestsPage.tsx`
  - `backend/src/controllers/adminController.ts`
  - `backend/src/controllers/superAdminController.ts`
- **Relevant API**: `POST /api/change-requests`, `GET /api/change-requests`, `PATCH /api/change-requests/:id/review`
- **Relevant database**: `service_change_requests`, `document_requirements`, `audit_logs`
- **Evidence**: `adminController.ts` creates `service_change_requests` with status `PENDING`. `superAdminController.ts` lines 8–65 reviews requests. Upon `APPROVED`, backend dynamically inserts the newly approved document into `document_requirements` and records the action in `audit_logs`.

---

### Feature: Global Government Services Catalog Management
- **Status**: IMPLEMENTED
- **Relevant files**:
  - `src/pages/superadmin/SuperAdminServicesPage.tsx`
  - `backend/src/controllers/superAdminController.ts`
- **Relevant API**: `POST /api/super-admin/services`, `PUT /api/super-admin/services/:id`, `DELETE /api/super-admin/services/:id`, `PATCH /api/super-admin/services/:id/status`
- **Relevant database**: `services`, `document_requirements`, `audit_logs`
- **Evidence**: `superAdminController.ts` lines 446–770 handles creation, update, deletion, and status toggling of services with multi-state jurisdiction arrays across all 28 states & 8 UTs.

---

### Feature: District & Office Admin Provisioning by Super Admin
- **Status**: IMPLEMENTED
- **Relevant files**:
  - `src/pages/superadmin/SuperAdminAdminsPage.tsx`
  - `backend/src/controllers/superAdminController.ts`
- **Relevant API**: `POST /api/super-admin/create-admin`, `GET /api/super-admin/admins`, `PATCH /api/super-admin/admins/:id`, `DELETE /api/super-admin/admins/:id`
- **Relevant database**: Supabase Auth Admin API, `profiles`, `staff_profiles`, `audit_logs`
- **Evidence**: `superAdminController.ts` lines 129–290 creates an admin auth user with role `admin`, assigns jurisdiction, inserts profile and staff profile records, and logs the action in `audit_logs`.

---

### Feature: System-Wide Security Audit Compliance Logging
- **Status**: IMPLEMENTED
- **Relevant files**:
  - `src/pages/admin/AdminAuditLogsPage.tsx`
  - `src/pages/superadmin/SuperAdminAuditLogsPage.tsx`
  - `backend/src/controllers/adminController.ts`
- **Relevant API**: `GET /api/audit-logs`
- **Relevant database**: `audit_logs`
- **Evidence**: `adminController.ts` lines 88–108 fetches immutable audit records from `audit_logs`. Pages provide real-time filtering by role (`citizen`, `employee`, `admin`, `superadmin`) and action event.

---

### Feature: Telegram Bot Integration (@NagrikQbot) & Account Linking
- **Status**: IMPLEMENTED
- **Relevant files**:
  - `backend/src/services/telegramBotService.ts`
  - `backend/src/controllers/telegramController.ts`
  - `backend/src/utils/phoneUtils.ts`
  - `supabase/migrations/20261008_create_telegram_mappings.sql`
- **Relevant API**: `POST /api/telegram/link`, `GET /api/telegram/mappings`, `GET /api/telegram/status`, `POST /api/telegram/webhook`
- **Relevant database**: `telegram_mappings`
- **Evidence**: `server.ts` starts `startTelegramPolling()`. `telegramBotService.ts` handles `/start`, normalizes phone numbers via `phoneUtils.ts`, links Telegram `chat_id` in `telegram_mappings`, and delivers admin credentials via `/credentials`.

---

### Feature: n8n Workflow Automation Integration
- **Status**: IMPLEMENTED
- **Relevant files**:
  - `backend/src/services/n8nService.ts`
  - `n8n/workflows/nagrikq_idp_notification.json`
- **Relevant API**: `POST /api/telegram/notify-idp`
- **Relevant database**: `idp_notification_logs`
- **Evidence**: `n8nService.ts` dispatches signed webhooks to `http://localhost:5678/webhook/idp-created` with `x-webhook-secret: nagrikq_idp_secret_key_2026`, preventing duplicate events via `idp_notification_logs`.

---

### Feature: Citizen Complaints & Grievance Lodging
- **Status**: PARTIAL (BACKEND ONLY + UNROUTED UI)
- **Relevant files**:
  - `src/pages/user/UserComplaintsPage.tsx`
  - `backend/src/controllers/complaintController.ts`
- **Relevant API**: `POST /api/complaints`, `GET /api/complaints`
- **Relevant database**: `complaints`
- **Evidence**: Backend endpoints exist in `complaintController.ts`. Database table `complaints` exists with RLS. However, `UserComplaintsPage.tsx` uses local `useState` mock state and is omitted from `src/routes/AppRoutes.tsx`.

---

### Feature: Priority Office Appointments
- **Status**: UI ONLY / UNROUTED
- **Relevant files**:
  - `src/pages/user/UserAppointmentsPage.tsx`
  - `supabase/query.sql` (line 316)
- **Relevant API**: None
- **Relevant database**: `appointments` (Table exists in SQL schema, but no backend routes exist)
- **Evidence**: `UserAppointmentsPage.tsx` stores bookings in component state (`const [appointments, setAppointments] = useState(...)`) and is not imported in `src/routes/AppRoutes.tsx`.
