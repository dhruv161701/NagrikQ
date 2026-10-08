# NagrikQ — Complete Feature Inventory

> **Auditor Notice**: This feature inventory is constructed solely from deep forensic inspection of the active codebase on this machine. Every feature status reflects actual code verification across frontend routes, UI components, backend Express controllers, Supabase database tables, and external integrations.

---

## 1. Citizen / User Features (`/user/*`, Role: `citizen`)

### 1.1 Dual Interface Accessibility Modes (Modern Mode & Simple Mode)
- **Role**: Citizen
- **Status**: IMPLEMENTED
- **What it does**: Provides a user experience tailored to age and digital literacy. 
  - **Modern Mode**: Compact card layouts, metric chips, standard font sizing (14–16px), subtle borders, dynamic dashboards.
  - **Simple Mode**: Extra-large high-contrast typography (18–38px), oversized buttons and touch targets (52px+ height), bold border outlines (2px solid), explicit action labels, reduced cognitive overhead for senior citizens.
- **Related Files**:
  - [UIContext.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/context/UIContext.tsx)
  - [tokens.css](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/styles/tokens.css)
  - [UserSettingsPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/user/UserSettingsPage.tsx)
  - [UserDashboardPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/user/UserDashboardPage.tsx)
  - [UserQueuePage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/user/UserQueuePage.tsx)
- **Dependencies**: React context, CSS variables, `profiles.ui_mode`.

### 1.2 Adaptive 3-Step Citizen Onboarding & Guided Tour
- **Role**: Citizen
- **Status**: IMPLEMENTED
- **What it does**: Automatically triggers for new citizens:
  1. Language selection (English, Gujarati, Hindi).
  2. Date of birth input with real-time age computation.
  3. Automatic recommendation of interface mode (Age < 35 defaults to Modern, Age ≥ 35 defaults to Simple) with manual override.
  - Persists preference to local storage and Supabase `profiles` table.
  - Features an interactive 5-step guided modal tour explaining services, documents, virtual tokens, queue tracking, and counter arrival.
- **Related Files**:
  - [LanguageSelectionPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/onboarding/LanguageSelectionPage.tsx)
  - [DateOfBirthPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/onboarding/DateOfBirthPage.tsx)
  - [ModeRecommendationPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/onboarding/ModeRecommendationPage.tsx)
  - [GuidedTourModal.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/components/onboarding/GuidedTourModal.tsx)
  - [ProtectedRoute.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/routes/ProtectedRoute.tsx)
- **Dependencies**: `profiles.onboarding_completed`, `profiles.tour_completed`, `profiles.preferred_language`, `profiles.ui_mode`.

### 1.3 Service Discovery & Dynamic Requirement Inspection
- **Role**: Citizen / Public
- **Status**: IMPLEMENTED
- **What it does**: Allows citizens to search and filter government services across departments (Revenue, Transport, Civil Supplies, Welfare), view fee structures, statutory turnaround times, and dynamically inspect required documents with validity criteria before visiting the office.
- **Related Files**:
  - [ServiceDiscoveryPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/public/ServiceDiscoveryPage.tsx)
  - [ServiceDetailPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/public/ServiceDetailPage.tsx)
  - [UserServicesPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/user/UserServicesPage.tsx)
  - [serviceController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/serviceController.ts)
- **Dependencies**: `services`, `document_requirements`, `departments`, `offices`.

### 1.4 Virtual Queue Token Generation & Slot Booking
- **Role**: Citizen
- **Status**: IMPLEMENTED
- **What it does**: Issues virtual queue tokens (`A101`, `A102`, etc.) with:
  - Jurisdiction selection (Indian States & Cities, e.g., Gujarat -> Rajkot, Ahmedabad, Surat).
  - 30-minute time slot selection checking slot capacity, excluding employee break windows, and disallowing expired past slots.
  - Mandatory duplicate booking check (citizens cannot book the same service twice on the same day).
  - Auto-creation of application record with submitted document references.
- **Related Files**:
  - [UserQueuePage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/user/UserQueuePage.tsx)
  - [DataContext.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/context/DataContext.tsx)
  - [queueController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/queueController.ts)
- **Dependencies**: `queue_tokens`, `applications`, `services`, `offices`.

### 1.5 Realtime Live Queue Tracking, Counter Chime & Navigation
- **Role**: Citizen
- **Status**: IMPLEMENTED
- **What it does**: Tracks live queue progress in real time (via Supabase Realtime channel and background polling).
  - Shows current serving token, people ahead, and estimated wait minutes.
  - Synthesizes a two-tone audio chime bell (587Hz sliding to 880Hz via browser Web Audio API) when the user's token is called.
  - Visualizes multi-counter routing sequence (e.g., Counter 1 Intake -> Counter 3 Verification -> Counter 5 Dispatch).
  - Generates printable/downloadable digital token slip with QR code styling.
- **Related Files**:
  - [UserQueuePage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/user/UserQueuePage.tsx)
  - [QueueTrackerCard.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/components/queue/QueueTrackerCard.tsx)
  - [QueueVisualizer.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/components/queue/QueueVisualizer.tsx)
  - [DataContext.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/context/DataContext.tsx)
- **Dependencies**: `supabase_realtime` publication on `queue_tokens`.

### 1.6 Grace Period Tracking & Same-Day Rebooking
- **Role**: Citizen
- **Status**: IMPLEMENTED
- **What it does**: Automatically computes token expiry if the citizen fails to appear within a 15-minute grace period past their slot end time. Allows same-day rebooking to a later available time slot for the same token number. Also allows cancellation of active tokens with confirmation.
- **Related Files**:
  - [UserQueuePage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/user/UserQueuePage.tsx)
  - [queueController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/queueController.ts)
  - [DataContext.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/context/DataContext.tsx)
- **Dependencies**: `queue_tokens` table columns `status`, `time_slot`, `slot_date`, `is_late`, `grace_period_minutes`.

### 1.7 Cloud-Backed Document Vault & Expiry Alert System
- **Role**: Citizen
- **Status**: IMPLEMENTED
- **What it does**: Provides a citizen document vault for certificates (Income, Caste, Non-Creamy Layer, Satbara, Aadhaar):
  - Uploads files via Cloudinary backend proxy endpoint (`/api/upload/cloudinary`) with fallback to direct browser client-signed Cloudinary upload using SHA-1 signature.
  - Calculates document expiration dates (1 Year, 3 Years, 5 Years, Lifetime).
  - Automatically raises a prominent 15-day expiry warning banner on the dashboard when certificates near expiration.
  - Supports document viewing, downloading, renaming, and removal.
- **Related Files**:
  - [UserDocumentsPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/user/UserDocumentsPage.tsx)
  - [cloudinaryService.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/services/cloudinaryService.ts)
  - [uploadController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/uploadController.ts)
- **Dependencies**: Cloudinary REST API, LocalStorage persistence per citizen (`nagrikq_vault_<userId>`), Express upload proxy.

### 1.8 RAG-Powered AI Citizen Assistant (Gemini + Supabase pgvector)
- **Role**: Citizen / Public
- **Status**: IMPLEMENTED
- **What it does**: Citizens ask natural language questions regarding government service eligibility, required documents, process fees, and timelines.
  - Generates 768-dimensional embeddings using Google Gemini (`gemini-embedding-001`).
  - Executes vector cosine similarity search against `knowledge_chunks` in Supabase PostgreSQL (pgvector IVFFlat index).
  - Passes retrieved top-5 chunks as context to Gemini (`gemini-3.5-flash` with fallback to `gemini-3.5-flash-lite`).
  - Returns grounded answer with cited official government sources.
- **Related Files**:
  - [AIAssistantWidget.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/components/assistant/AIAssistantWidget.tsx)
  - [UserAssistantPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/user/UserAssistantPage.tsx)
  - [aiController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/aiController.ts)
  - [geminiService.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/services/geminiService.ts)
  - [ragService.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/services/ragService.ts)
  - [bootstrapService.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/services/bootstrapService.ts)
- **Dependencies**: Supabase pgvector, `@google/generative-ai`, `knowledge_chunks` table.

### 1.9 Application Tracking & Document Verification Audit
- **Role**: Citizen
- **Status**: IMPLEMENTED
- **What it does**: Lists citizen applications (`APP-xxxxxx`) with status filters (`SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `ACTION_REQUIRED`), verification badges for each submitted document (`VERIFIED`, `PENDING`, `REJECTED`, `NEEDS_CORRECTION`), and officer remarks timeline.
- **Related Files**:
  - [UserApplicationsPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/user/UserApplicationsPage.tsx)
  - [applicationController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/applicationController.ts)
  - [DataContext.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/context/DataContext.tsx)
- **Dependencies**: `applications`, `documents`, `document_requirements`.

### 1.10 Priority Office Appointments
- **Role**: Citizen
- **Status**: UI ONLY / UNROUTED
- **What it does**: Displays appointment booking form and list. However, data is managed solely via React component local state (`useState`). It is not connected to backend Express APIs and is omitted from `AppRoutes.tsx`.
- **Related Files**:
  - [UserAppointmentsPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/user/UserAppointmentsPage.tsx)
  - Database schema table `appointments` exists in `supabase/query.sql`.
- **Dependencies**: Disconnected.

### 1.11 Citizen Complaints & Grievance Lodging
- **Role**: Citizen
- **Status**: PARTIALLY IMPLEMENTED (BACKEND ONLY + UNROUTED UI)
- **What it does**: Backend API endpoints `POST /api/complaints` and `GET /api/complaints` exist in `complaintController.ts` and interact with `complaints` table in Supabase. Frontend page `UserComplaintsPage.tsx` exists with local `useState` mock form, but is not connected to API and is not registered in `AppRoutes.tsx`.
- **Related Files**:
  - [UserComplaintsPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/user/UserComplaintsPage.tsx)
  - [complaintController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/complaintController.ts)
- **Dependencies**: `complaints` table in Supabase.

---

## 2. Employee / Officer Features (`/employee/*`, Role: `employee`)

### 2.1 Live Counter Queue Control Panel
- **Role**: Employee / Officer
- **Status**: IMPLEMENTED
- **What it does**: Allows counter officer (e.g., Counter C-01 / C-04) to manage incoming citizens in real time:
  - **Call Next Citizen**: Fetches next waiting token for the officer's counter and services, updates token to `CALLED`/`IN_SERVICE`, recalculates wait times and people ahead.
  - **Pause / Resume Queue**: Flags counter queue as paused to prevent new tokens from being assigned during breaks.
  - **Mark Completed**: Finalizes service for active token.
  - **Mark No-Show / Skip**: Skips absent citizens, marking token `NO_SHOW`.
- **Related Files**:
  - [EmployeeDashboardPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/employee/EmployeeDashboardPage.tsx)
  - [EmployeeQueuePage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/employee/EmployeeQueuePage.tsx)
  - [queueController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/queueController.ts)
- **Dependencies**: `queue_tokens` table, Supabase Realtime publication.

### 2.2 Dynamic Multi-Table Counter Routing
- **Role**: Employee / Officer
- **Status**: IMPLEMENTED
- **What it does**: Enables counter officers to route a citizen to an adjacent counter for sequential processing (e.g. Counter 1 Intake -> Counter 2 Biometrics -> Counter 3 Verification):
  - Reads physical city table numbers dynamically from `getCityTables()` in `cityTables.ts`.
  - Prompts officer with a Next Table modal dialog.
  - Updates `queue_tokens.next_counter` and advances position via backend API `POST /api/queue/tokens/:id/next-table` and `POST /api/queue/tokens/:id/advance-counter`.
- **Related Files**:
  - [EmployeeDashboardPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/employee/EmployeeDashboardPage.tsx)
  - [EmployeeQueuePage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/employee/EmployeeQueuePage.tsx)
  - [cityTables.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/utils/cityTables.ts)
  - [queueController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/queueController.ts)
- **Dependencies**: `queue_tokens` table columns `counter_number`, `next_counter`, `counter_path`.

### 2.3 Physical Hard-Copy Document Inspection & Checklist Verification
- **Role**: Employee / Officer
- **Status**: IMPLEMENTED
- **What it does**: During in-person citizen counter attendance, officer opens the citizen's application dossier:
  - Inspects digital upload previews alongside physical hard copies.
  - Evaluates each mandatory document with interactive **OK / NOT OK** checklist buttons.
  - Marks individual document status as `VERIFIED`, `REJECTED`, or `NEEDS_CORRECTION` with officer notes.
  - Updates overall application status to `APPROVED`, `PROCESSING`, or `REJECTED`.
- **Related Files**:
  - [EmployeeApplicationsPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/employee/EmployeeApplicationsPage.tsx)
  - [applicationController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/applicationController.ts)
  - [DataContext.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/context/DataContext.tsx)
- **Dependencies**: `applications`, `documents`, `document_verifications` tables.

### 2.4 Officer Shift Desk & Service Assignment Configuration
- **Role**: Employee / Officer
- **Status**: IMPLEMENTED
- **What it does**: Allows the logged-in officer to select and persist which departmental services they are authorized to process during their shift. Saved per officer in localStorage and synchronized with queue filter queries.
- **Related Files**:
  - [EmployeeSettingsPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/employee/EmployeeSettingsPage.tsx)
  - [EmployeeQueuePage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/employee/EmployeeQueuePage.tsx)
- **Dependencies**: `staff_profiles.assigned_service_ids`.

---

## 3. Office / Department Admin Features (`/admin/*`, Role: `admin`)

### 3.1 Department Office Metrics & Realtime Footfall Dashboard
- **Role**: Admin
- **Status**: IMPLEMENTED
- **What it does**: Displays live office operational KPIs:
  - Active counters and staff currently online.
  - Citizens waiting in virtual queue.
  - Applications submitted today.
  - Active departmental services.
  - Pending document requirement change requests awaiting state approval.
- **Related Files**:
  - [AdminDashboardPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/admin/AdminDashboardPage.tsx)
  - [AdminReportsPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/admin/AdminReportsPage.tsx)
- **Dependencies**: `staff_profiles`, `applications`, `queue_tokens`, `service_change_requests`.

### 3.2 Counter Officer Account Provisioning & Life-Cycle Management
- **Role**: Admin
- **Status**: IMPLEMENTED
- **What it does**: Allows office admin to create, view, edit, and delete employee/officer accounts:
  - Calls `POST /api/admin/employees` using Supabase Auth Admin API to provision user credentials (`officer@...` and auto-generated temporary password).
  - Upserts `profiles` and `staff_profiles` tables with employee ID (`EMP-xxxx`), counter assignment (`C-01` to `C-10`), Aadhaar verification reference, and break schedule.
  - Supports editing assigned counter, contact phone, and deleting obsolete employee records.
- **Related Files**:
  - [AdminEmployeesPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/admin/AdminEmployeesPage.tsx)
  - [adminController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/adminController.ts)
- **Dependencies**: Supabase Auth Admin API (`supabaseAdmin.auth.admin.createUser`), `staff_profiles`, `profiles`.

### 3.3 Service Slot Capacity, Break Windows & Booking Controls
- **Role**: Admin
- **Status**: IMPLEMENTED
- **What it does**: Configures operational booking parameters per service at the local office level:
  - Configures daily operating hours (e.g. 09:00 AM – 05:00 PM), slot duration (15/30/45 mins), and average processing time.
  - Configures staff break windows (e.g. 01:00 PM – 02:00 PM) which automatically disables citizen slot selection during lunch hours.
  - Pauses or resumes citizen online bookings, or blocks specific holiday dates (`stopped_booking_dates`).
  - Calls `PATCH /api/services/:id/slots`.
- **Related Files**:
  - [AdminServicesPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/admin/AdminServicesPage.tsx)
  - [serviceController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/serviceController.ts)
- **Dependencies**: `services` table columns `start_time`, `end_time`, `slot_duration_minutes`, `enable_break_time`, `break_start_time`, `break_end_time`, `stopped_booking_dates`, `is_booking_stopped`.

### 3.4 Formal Document Requirement Change Request Submission (`CR-xxx`)
- **Role**: Admin
- **Status**: IMPLEMENTED
- **What it does**: Enforces bureaucratic compliance. Local office admins cannot unilaterally modify statutory document requirements. Instead, they submit formal Change Requests (`CR-101`, `CR-102`):
  - Selects target service and proposes adding or altering mandatory documents from standard Indian certificate presets.
  - Mandates a formal administrative justification/reason.
  - Dispatches `POST /api/change-requests` to create a `service_change_requests` record with status `PENDING`.
  - Tracks status in a live table that updates via Supabase Realtime.
- **Related Files**:
  - [AdminChangeRequestsPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/admin/AdminChangeRequestsPage.tsx)
  - [AdminServicesPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/admin/AdminServicesPage.tsx)
  - [adminController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/adminController.ts)
- **Dependencies**: `service_change_requests`, `services`, `audit_logs`.

### 3.5 Office Security Audit Logs
- **Role**: Admin
- **Status**: IMPLEMENTED
- **What it does**: Displays immutable audit trail entries of administrative actions occurring within the office jurisdiction (token generation, employee account creation, change request submissions) with timestamp, actor name, role, and client IP address.
- **Related Files**:
  - [AdminAuditLogsPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/admin/AdminAuditLogsPage.tsx)
  - [adminController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/adminController.ts)
- **Dependencies**: `audit_logs` table.

---

## 4. Super Admin Features (`/super-admin/*`, Role: `superadmin`)

### 4.1 State-Wide Governance & System Analytics
- **Role**: Super Admin
- **Status**: IMPLEMENTED
- **What it does**: Displays state-wide aggregation analytics across all 33 districts and Jan Seva Kendras:
  - Total registered citizens.
  - Total active government offices.
  - Total active officers.
  - Global service catalog count and active count.
  - Pending state-wide Change Requests.
  - Live security audit logs stream.
- **Related Files**:
  - [SuperAdminDashboardPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/superadmin/SuperAdminDashboardPage.tsx)
  - [superAdminController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/superAdminController.ts)
- **Dependencies**: `GET /api/analytics/system`, Supabase Realtime channel.

### 4.2 Change Request Approval & Dynamic Document Rule Execution
- **Role**: Super Admin
- **Status**: IMPLEMENTED
- **What it does**: The cornerstone governance workflow of NagrikQ:
  - Super Admin reviews pending change requests submitted by District/Office Admins.
  - Approves or Rejects with official review notes via `PATCH /api/change-requests/:id/review`.
  - **Dynamic Execution**: Upon approval, the backend automatically inserts the newly approved document directly into the live `document_requirements` table and updates `service_change_requests.status = 'APPROVED'`.
  - Immediately broadcasts the change via Supabase Realtime so citizen application pages dynamically demand the new document without code redeployment.
  - Logs the approval event to `audit_logs`.
- **Related Files**:
  - [SuperAdminChangeRequestsPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/superadmin/SuperAdminChangeRequestsPage.tsx)
  - [superAdminController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/superAdminController.ts)
- **Dependencies**: `service_change_requests`, `document_requirements`, `audit_logs`, Supabase Realtime.

### 4.3 Global Services Catalog Management
- **Role**: Super Admin
- **Status**: IMPLEMENTED
- **What it does**: Full CRUD control over the master catalog of government services:
  - Create global services (`POST /api/super-admin/services`) with service code, name, category, processing timeline (days), fee amount, and icon.
  - Configure applicable states across all 28 states & 8 Union Territories and specific cities/districts.
  - Configure default document requirements and extra state-specific requirements.
  - Edit service details (`PUT /api/super-admin/services/:id`).
  - Toggle active/inactive status (`PATCH /api/super-admin/services/:id/status`).
  - Delete service (`DELETE /api/super-admin/services/:id`).
- **Related Files**:
  - [SuperAdminServicesPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/superadmin/SuperAdminServicesPage.tsx)
  - [superAdminController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/superAdminController.ts)
- **Dependencies**: `services`, `document_requirements` tables.

### 4.4 District & Office Admin Account Provisioning
- **Role**: Super Admin
- **Status**: IMPLEMENTED
- **What it does**: Provisions official administrator accounts:
  - Creates auth user and profile with role `admin` (`POST /api/super-admin/create-admin`).
  - Assigns jurisdiction (e.g. District: Rajkot, Taluka: Rajkot City, Office: Rajkot Jan Seva Kendra).
  - Lists all admins (`GET /api/super-admin/admins`).
  - Updates admin status or details (`PATCH /api/super-admin/admins/:id`).
  - Deletes admin accounts (`DELETE /api/super-admin/admins/:id`).
- **Related Files**:
  - [SuperAdminAdminsPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/superadmin/SuperAdminAdminsPage.tsx)
  - [superAdminController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/superAdminController.ts)
- **Dependencies**: `profiles`, `staff_profiles`, Supabase Auth Admin.

### 4.5 Government Offices Directory
- **Role**: Super Admin
- **Status**: IMPLEMENTED
- **What it does**: Displays state-wide directory of Jan Seva Kendras, Collectorates, and Mamlatdar offices registered on NagrikQ, showing operational counters, addresses, and contact numbers.
- **Related Files**:
  - [SuperAdminOfficesPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/superadmin/SuperAdminOfficesPage.tsx)
  - [serviceController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/serviceController.ts)
- **Dependencies**: `offices` table.

### 4.6 System-Wide Audit Compliance Log
- **Role**: Super Admin
- **Status**: IMPLEMENTED
- **What it does**: Inspects full state-wide audit trail with multi-filter capabilities (by user role: citizen, employee, admin, superadmin; by action event: APPROVE, CREATE, UPDATE, DELETE).
- **Related Files**:
  - [SuperAdminAuditLogsPage.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/pages/superadmin/SuperAdminAuditLogsPage.tsx)
  - [adminController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/adminController.ts)
- **Dependencies**: `audit_logs` table.

---

## 5. System, Cross-Cutting & Automation Features

### 5.1 Telegram Bot Integration (`@NagrikQbot`)
- **Role**: Admin / Citizen / Officer
- **Status**: IMPLEMENTED
- **What it does**: 
  - Runs a background long-polling service (`startTelegramPolling()`) connecting to Telegram Bot API (`bot8874803375:...`).
  - Handles `/start`, `/help`, `/credentials`, `/myidps`.
  - Links user phone number to Telegram `chat_id` via `normalizePhoneNumber()`, enforcing 10-digit validation and storing mappings in `telegram_mappings`.
  - Dispatches Admin login credentials directly to Telegram chat upon request.
  - Dispatches instant notifications on application/IDP events.
- **Related Files**:
  - [telegramBotService.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/services/telegramBotService.ts)
  - [telegramController.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/controllers/telegramController.ts)
  - [phoneUtils.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/utils/phoneUtils.ts)
  - [20261008_create_telegram_mappings.sql](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/supabase/migrations/20261008_create_telegram_mappings.sql)
- **Dependencies**: Telegram Bot API, `telegram_mappings` table.

### 5.2 n8n Webhook Workflow for Event Automations
- **Role**: System
- **Status**: IMPLEMENTED
- **What it does**:
  - Dispatches HTTP POST webhooks to n8n (`http://localhost:5678/webhook/idp-created`) with SHA-256 secret header (`x-webhook-secret: nagrikq_idp_secret_key_2026`).
  - Implements idempotency protection via `idp_notification_logs` table.
  - JSON workflow definition (`n8n/workflows/nagrikq_idp_notification.json`) validates secret, extracts application parameters, checks linked Telegram `chat_id`, and formats/sends Markdown messages to Telegram.
- **Related Files**:
  - [n8nService.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/services/n8nService.ts)
  - [nagrikq_idp_notification.json](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/n8n/workflows/nagrikq_idp_notification.json)
  - [idp_notification_logs](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/supabase/migrations/20261008_create_telegram_mappings.sql)
- **Dependencies**: n8n instance, `idp_notification_logs`, Telegram Bot API.

### 5.3 Automated Super Admin Bootstrapping
- **Role**: System
- **Status**: IMPLEMENTED
- **What it does**: On server startup (`server.ts`) or on hitting `/api/bootstrap-superadmin`, verifies existence of `superadmin@nagrikq.org`. If missing, automatically creates auth user in Supabase with admin role and seeds `profiles` and `staff_profiles` tables. Also automatically checks and seeds initial pgvector knowledge base chunks if empty.
- **Related Files**:
  - [bootstrapService.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/services/bootstrapService.ts)
  - [server.ts](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/backend/src/server.ts)
- **Dependencies**: Supabase Admin Auth API.

### 5.4 Instant Persona Switcher Bar
- **Role**: Tester / Evaluator
- **Status**: IMPLEMENTED
- **What it does**: Persistent top bar allowing 1-click role switching between:
  - 👤 Citizen Modern (Dhruv Patel)
  - 🧓 Citizen Simple (Rameshbhai)
  - 👔 Counter Officer (Rajesh Varma, C-04)
  - 🏛️ Office Admin (Mamlatdar)
  - 🛡️ Super Admin (State Director)
  Also offers instant UI Mode toggle (Modern / Simple) and Language toggle (EN / GU / HI).
- **Related Files**:
  - [RoleSwitcherBar.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/components/ui/RoleSwitcherBar.tsx)
  - [AuthContext.tsx](file:///c:/Users/Dhruv/OneDrive/Documents/A%20Projects/NagrikQ/NagrikQ/src/context/AuthContext.tsx)
- **Dependencies**: React context state.
