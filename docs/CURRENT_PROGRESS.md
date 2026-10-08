# NagrikQ — Current Implementation Progress & Audit

> **Auditor Notice**: This evaluation is based strictly on forensic code verification. It classifies every discovered feature by its true implementation status and highlights verified technical risks, unrouted files, and credential exposures.

---

## 1. Completed / Fully Implemented

| Feature Module | Verification Evidence |
|---|---|
| **Dual Accessibility UI Modes (Modern & Simple)** | Implemented in `UIContext.tsx`, `tokens.css`, `UserSettingsPage.tsx`, and responsive layouts. Toggles typography (18px+), touch targets (52px+), and contrast. |
| **Adaptive 3-Step Citizen Onboarding** | Implemented across `LanguageSelectionPage.tsx`, `DateOfBirthPage.tsx`, `ModeRecommendationPage.tsx`, and enforced by `ProtectedRoute.tsx`. Persists to `profiles`. |
| **Interactive 5-Step Guided Tour** | Implemented in `GuidedTourModal.tsx` and callable from `UserDashboardPage.tsx` and `UserSettingsPage.tsx`. |
| **Service Catalog & Dynamic Requirements Inspection** | Implemented across `ServiceDiscoveryPage.tsx`, `ServiceDetailPage.tsx`, `UserServicesPage.tsx`, and backend `serviceController.ts`. |
| **Virtual Queue Token Generation** | Implemented in `UserQueuePage.tsx`, `DataContext.tsx`, and `queueController.ts`. Enforces state/city mapping, 30-min slot limits, lunch break exclusion, past slot filtering, and prevents duplicate bookings on the same day. |
| **Live Queue Tracking & Realtime State Sync** | Implemented in `UserQueuePage.tsx`, `QueueTrackerCard.tsx`, and `DataContext.tsx` using active Supabase Realtime WebSocket subscription (`supabase_realtime` publication) and background polling. |
| **Synthesized Audio Counter Chime** | Implemented in `UserQueuePage.tsx` (`playCounterBell()`) using browser Web Audio API (`AudioContext`, `OscillatorNode` 587Hz to 880Hz) triggered on token state change. |
| **Printable Token Slip with QR Styling** | Implemented in `UserQueuePage.tsx` generating formatted printable modal cards. |
| **15-Minute Grace Period & Same-Day Rebooking** | Implemented in `UserQueuePage.tsx` (`checkIsTokenExpired()`) and backend `rebookToken` in `queueController.ts`. |
| **Active Queue Token Cancellation** | Implemented in `UserQueuePage.tsx`, `ConfirmDialog.tsx`, and backend `cancelToken` in `queueController.ts`. |
| **Cloud-Backed Document Vault** | Implemented in `UserDocumentsPage.tsx`, `cloudinaryService.ts`, and `uploadController.ts` with Cloudinary signed uploads and SHA-1 fallback digests. |
| **15-Day Certificate Expiry Alert System** | Implemented in `UserDocumentsPage.tsx` and `UserDashboardPage.tsx` (`getDaysRemaining()`) displaying prominent renewal alerts. |
| **RAG AI Citizen Assistant** | Implemented end-to-end in `AIAssistantWidget.tsx`, `aiController.ts`, `geminiService.ts`, and `ragService.ts` using Google Gemini (`gemini-embedding-001`, `gemini-3.5-flash`) and Supabase pgvector cosine search. |
| **Officer Counter Desk Controls** | Implemented in `EmployeeDashboardPage.tsx`, `EmployeeQueuePage.tsx`, and `queueController.ts` supporting Call Next, Complete Service, Pause Queue, and Skip/No-Show. |
| **Dynamic Multi-Table Counter Forwarding** | Implemented in `EmployeeQueuePage.tsx`, `EmployeeDashboardPage.tsx`, `cityTables.ts`, and `routeNextTable` in `queueController.ts`. |
| **Physical Hard-Copy Document Inspection** | Implemented in `EmployeeApplicationsPage.tsx` with interactive OK / NOT OK check buttons and `updateDocumentStatus` in `applicationController.ts`. |
| **Officer Shift Service Assignment** | Implemented in `EmployeeSettingsPage.tsx` and synced with desk filtering. |
| **Admin Office Metrics & KPI Dashboard** | Implemented in `AdminDashboardPage.tsx` and `AdminReportsPage.tsx`. |
| **Employee Account Provisioning by Admin** | Implemented in `AdminEmployeesPage.tsx` and `adminController.ts` via Supabase Auth Admin API (`supabaseAdmin.auth.admin.createUser`). |
| **Office Service Slot Capacity & Break Windows** | Implemented in `AdminServicesPage.tsx` and `updateServiceSlots` in `serviceController.ts`. |
| **Document Requirement Change Request Creation** | Implemented in `AdminServicesPage.tsx`, `AdminChangeRequestsPage.tsx`, and `createChangeRequest` in `adminController.ts`. |
| **Super Admin Change Request Review & Approval** | Implemented in `SuperAdminChangeRequestsPage.tsx` and `reviewChangeRequest` in `superAdminController.ts`. Approvals automatically insert new requirements into `document_requirements` dynamically. |
| **Master Services Catalog Management** | Implemented in `SuperAdminServicesPage.tsx` and `superAdminController.ts` (Full CRUD, 28 states & 8 UTs support). |
| **District Admin Account Provisioning** | Implemented in `SuperAdminAdminsPage.tsx` and `superAdminController.ts`. |
| **System Security Audit Compliance Logging** | Implemented in `AdminAuditLogsPage.tsx`, `SuperAdminAuditLogsPage.tsx`, and `audit_logs` table. |
| **Telegram Bot Integration (@NagrikQbot)** | Implemented in `telegramBotService.ts`, `telegramController.ts`, and `telegram_mappings` table with long polling and credential delivery. |
| **n8n Workflow Automation Integration** | Implemented in `n8nService.ts`, `nagrikq_idp_notification.json`, and `idp_notification_logs` table. |
| **Super Admin Auto-Bootstrapping** | Implemented in `server.ts` and `bootstrapService.ts`. |
| **Demo Persona Switcher Bar** | Implemented in `RoleSwitcherBar.tsx` for 1-click evaluation of all 5 roles/modes. |

---

## 2. Partially Implemented

### Citizen Grievances & Complaints Workflow
- **Backend**: Implemented in `backend/src/controllers/complaintController.ts` with `POST /api/complaints` and `GET /api/complaints`, interacting with Supabase table `complaints`.
- **Frontend**: Component `src/pages/user/UserComplaintsPage.tsx` exists with submission form and list, but manages data via local component `useState` rather than calling `/api/complaints`. Furthermore, the page is not registered in `src/routes/AppRoutes.tsx` or in `Sidebar.tsx`.
- **Verdict**: Backend and database ready; frontend UI exists as an unrouted, unintegrated component.

---

## 3. UI Only

### Priority Counter Appointments
- **Frontend**: `src/pages/user/UserAppointmentsPage.tsx` exists with an appointment booking form and list. All operations update an in-memory React array (`const [appointments, setAppointments] = useState(...)`).
- **Backend**: There are no `/api/appointments` routes in `backend/src/routes/apiRoutes.ts`.
- **Routing**: Omitted from `src/routes/AppRoutes.tsx` and `Sidebar.tsx`.
- **Database**: Table `appointments` exists in `supabase/query.sql`, but is unused by the application logic.

### Standalone Admin Document Requirements Page
- **Frontend**: `src/pages/admin/AdminDocRequirementsPage.tsx` exists as a standalone file.
- **Routing**: In `src/routes/AppRoutes.tsx`, the path `/admin/document-requirements` explicitly redirects to `/admin/services` (`<Route path="document-requirements" element={<Navigate to="/admin/services" replace />} />`), because requirement management was consolidated into `AdminServicesPage.tsx`.

---

## 4. Backend Only

### Office Setup Endpoint (`POST /api/admin/office/setup`)
- **Backend**: Implemented in `backend/src/controllers/adminController.ts` lines 431–533.
- **Frontend**: No dedicated form or button in `AdminDashboardPage.tsx` or `AdminServicesPage.tsx` calls this specific endpoint.

### Telegram Webhook Endpoint (`POST /api/telegram/webhook`)
- **Backend**: Implemented in `backend/src/controllers/telegramController.ts`.
- **Runtime**: Not actively used because the server runs a background long-polling loop (`startTelegramPolling()`) by default in `server.ts`.

---

## 5. Verified Known Issues, Code Discrepancies & Technical Risks

### 1. Hardcoded Secrets in Source Code (High Security Risk)
- **Frontend Cloudinary Credentials**: In `src/services/cloudinaryService.ts` (lines 3–5), `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` are hardcoded directly into client source code.
- **Backend Cloudinary Credentials**: In `backend/src/controllers/uploadController.ts` (lines 6–7), identical credentials are hardcoded as fallback defaults.
- **Inspect Script Credentials**: In `backend/src/inspect_db.js` (line 4), the Supabase Service Role Key (`sb_secret_H-UvBK...`) is hardcoded in plain text.
- **n8n Workflow Credentials**: In `n8n/workflows/nagrikq_idp_notification.json` (line 78), the Telegram bot token (`bot8874803375:AAHHnLDMGA2tXkfIeMICfVoH9kSTf1EO1bI`) is embedded directly in the URL string.

### 2. Hardcoded Default Super Admin Credentials
- In `backend/src/services/bootstrapService.ts` (lines 4–5): Default credentials `superadmin@nagrikq.org` and `SuperAdmin@123` are hardcoded and automatically bootstrapped on every server boot.

### 3. Orphan / Unrouted Pages
- `src/pages/user/UserAppointmentsPage.tsx` is completely omitted from `src/routes/AppRoutes.tsx`.
- `src/pages/user/UserComplaintsPage.tsx` is completely omitted from `src/routes/AppRoutes.tsx`.

### 4. Client Mock Repository Fallback Masking Network Faults
- In `src/context/DataContext.tsx`, whenever an API call fails or returns empty data, the context seamlessly falls back to `src/services/repositories.ts` in-memory mock data. While excellent for offline hackathon demos, this can silently mask actual backend or network failures.

### 5. Single Integration Test Script
- The only test script is `backend/src/tests/telegramWorkflow.test.ts`, which runs via manual execution rather than integrated test runners (Jest / Vitest). No unit test runner is configured in `package.json` scripts.

### 6. Pending Testing Note in Recent Git Commit
- Git commit `c9baedd9ee741d8670e6ee64c09aa204e812f6e7` (authored Thu Oct 8 23:17:54 2026) explicitly notes in its commit message: `"Issue fixed that are given in whatsapp by kaushal and testing remaining"`, confirming that active development and manual testing were underway just prior to this audit.
