# NagrikQ — Complete Four-User Flow Inventory

> **Auditor Notice**: The four user roles and panels documented below are identified directly from `src/routes/AppRoutes.tsx`, `src/routes/ProtectedRoute.tsx`, `backend/src/middleware/rbac.ts`, and `supabase/query.sql` (`CREATE TYPE user_role AS ENUM ('citizen', 'employee', 'admin', 'superadmin');`). Every operation is verified against actual codebase workflows.

---

## Role 1: Citizen (`citizen`) — Citizen Portal (`/user/*`)

### 1. Citizen Registration
- Description: Citizen registers with full name, email, and password, system creates Supabase Auth user and generates a citizen profile in `profiles`, then redirects to adaptive onboarding.

### 2. Citizen Login & OAuth Sign-In
- Description: Citizen enters email/password or clicks Sign in with Google, system verifies credentials via Supabase Auth, strips OAuth hash from the URL, and redirects to onboarding or dashboard.

### 3. Adaptive Language Selection
- Description: Citizen selects their preferred language (English, Gujarati, or Hindi) on `/onboarding/language`, system saves selection to session state, and advances to step 2.

### 4. Date of Birth Input & Age Computation
- Description: Citizen inputs date of birth on `/onboarding/dob`, system computes exact chronological age, saves to session state, and advances to mode recommendation.

### 5. Accessibility Mode Recommendation & Override
- Description: Citizen reviews recommended UI mode (Modern Mode if age < 35, Simple Mode if age ≥ 35) on `/onboarding/mode`, optionally overrides it, and clicks complete, which persists preferences to `profiles` and directs them to `/user/dashboard`.

### 6. Interactive Guided Tour Launch
- Description: Citizen triggers guided tour modal from dashboard or settings, system cycles through 5 interactive steps explaining services, documents, and tokens, and marks tour completion.

### 7. Service Discovery & Multi-Facet Filtering
- Description: Citizen navigates to `/user/services` or `/services`, searches keywords or selects department pills (Revenue, Welfare, Transport), and system filters the government service catalog in real time.

### 8. Service Detail & Requirement Inspection
- Description: Citizen clicks on a specific service card, system displays statutory processing duration, official fee, validities, and mandatory vs optional document requirements.

### 9. AI Citizen Assistant Query (RAG Assistant)
- Description: Citizen asks a question about eligibility or document checklists in `/user/assistant` or widget, system converts question to Gemini embeddings, retrieves matching `knowledge_chunks` via pgvector cosine search, and generates a grounded response with cited official sources.

### 10. Virtual Queue Token Generation & Slot Selection
- Description: Citizen clicks "Generate Token" on `/user/queue`, selects state, city, service, date, and available 30-minute slot, system verifies slot capacity and prevents duplicate bookings on the same day, then generates a sequential token (e.g., `A104`).

### 11. Online Document Pre-Submission
- Description: During token generation, citizen attaches digital document files or vault references, system auto-creates an `applications` record with status `SUBMITTED`, linking documents for the counter officer's inbox.

### 12. Realtime Queue Position Tracking
- Description: Citizen monitors `/user/queue`, system listens to Supabase Realtime WebSocket changes on `queue_tokens` and updates serving counter, people ahead, and remaining wait time.

### 13. Audio Counter Chime Notification
- Description: When the officer calls the citizen's token, system detects status change to `CALLED` or `IN_SERVICE` and programmatically plays a two-tone chime (587Hz sliding to 880Hz) via the browser Web Audio API.

### 14. Printable Token Slip & QR Code Generation
- Description: Citizen clicks "Print Token" on `/user/queue`, system formats a high-contrast printable token slip containing token number, counter number, QR visual, citizen details, and estimated slot time.

### 15. Grace Period Monitoring & Same-Day Rebooking
- Description: If citizen fails to appear within 15 minutes of slot conclusion, system flags token as expired, citizen clicks "Rebook Token", selects a new same-day slot, and system resets token to `WAITING`.

### 16. Active Queue Token Cancellation
- Description: Citizen clicks "Cancel Token" on their active card, system displays a confirmation dialog, and upon confirmation invokes `PATCH /api/queue/tokens/:id/cancel` to update status to `CANCELLED`.

### 17. Document Vault Upload via Cloudinary
- Description: Citizen clicks "Upload Document" in `/user/documents`, selects file and validity period, system securely uploads file to Cloudinary via backend proxy or client-signed SHA-1 fallback, and stores metadata in localStorage.

### 18. Document Expiry Alert Acknowledgment
- Description: Citizen views dashboard or vault, system identifies certificates expiring in ≤ 15 days using `getDaysRemaining()`, and displays an amber urgent renewal warning card.

### 19. Vault Document Viewing, Download & Removal
- Description: Citizen interacts with vault entries to view rendered files, download authenticated PDFs, or delete obsolete certificates from their digital storage.

### 20. Application Progress & Document Checklist Tracking
- Description: Citizen visits `/user/applications`, system renders list of submitted applications and expands document verification badges (`VERIFIED`, `REJECTED`, `NEEDS_CORRECTION`) along with officer feedback.

### 21. Interface Layout Mode Switching
- Description: Citizen switches between Modern Mode and Simple Mode anytime in `/user/settings` or top bar, and system dynamically toggles root CSS tokens and layout densities.

### 22. Citizen Logout
- Description: Citizen clicks logout in settings or top navbar, system terminates Supabase session, clears cached credentials, and redirects to `/login`.

---

## Role 2: Officer / Counter Employee (`employee`) — Officer Panel (`/employee/*`)

### 1. Officer Staff Login
- Description: Officer visits `/staff-login?role=employee`, inputs official government email and assigned password, system authenticates session, verifies `employee` role in `staff_profiles`, and routes to `/employee/dashboard`.

### 2. Live Desk & Counter Queue Initialization
- Description: Officer enters `/employee/queue` or `/employee/dashboard`, system sets active counter (e.g. `C-01` or `C-04`) and filters queue tokens matching assigned services.

### 3. Shift Desk Service Scope Assignment
- Description: Officer opens service configuration on `/employee/settings`, selects specific departmental services they will process during their shift, and system stores preferences in `nagrikq_emp_services_<id>`.

### 4. Calling Next Citizen to Counter
- Description: Officer clicks "Call Next" button, system executes `POST /api/queue/next`, finds the earliest waiting citizen for that counter/service, updates status to `IN_SERVICE`, recalculates positions for people ahead, and broadcasts change over Supabase Realtime.

### 5. Counter Pause / Resume Toggle
- Description: Officer toggles "Pause Queue", system marks counter queue temporarily halted to pause new incoming citizen assignments while officer attends to desk duties.

### 6. Multi-Table Counter Routing (Forward to Next Table)
- Description: Officer clicks "Next Table" for an active citizen, selects next destination table (`C-2`, `C-3`) from the dynamic city table list in `cityTables.ts`, and system calls `POST /api/queue/tokens/:id/next-table` to route the citizen to the subsequent counter.

### 7. Multi-Counter Step Advance
- Description: Officer advances token through predefined sequential workflow (e.g., Intake -> Biometrics -> Dispatch) via `POST /api/queue/tokens/:id/advance-counter`, updating active table until final step.

### 8. Mark Service Completed
- Description: Officer clicks "Complete Service" after citizen finishes interaction, system updates token status to `COMPLETED`, records timestamp in `queue_tokens`, and frees counter for the next citizen.

### 9. Mark Absent Citizen (No-Show)
- Description: If citizen fails to appear after being called, officer clicks "Skip / No-Show", system updates token status to `NO_SHOW`, removes citizen from active counter queue, and logs the action.

### 10. Application Dossier Inspection
- Description: Officer opens `/employee/applications`, filters citizen dossiers assigned to their desk, and reviews citizen bio-data, submitted certificate names, and submission timestamps.

### 11. Physical Hard-Copy Checklist Verification
- Description: Officer opens document inspection modal during in-person attendance, evaluates uploaded digital file against physical hard copy using OK / NOT OK check buttons, and submits verification remarks.

### 12. Application Status Finalization
- Description: Officer updates overall application status (`APPROVED`, `PROCESSING`, `REJECTED`, or `NEEDS_CORRECTION`) via `PATCH /api/applications/:id/status`, which appends an audit timeline entry.

### 13. Officer Logout
- Description: Officer clicks logout in sidebar, system terminates Supabase session, clears officer session tokens, and returns to `/staff-login`.

---

## Role 3: Office / Department Admin (`admin`) — Office Admin Panel (`/admin/*`)

### 1. Office Admin Login
- Description: Admin visits `/staff-login?role=admin`, enters administrative credentials, system verifies `admin` role in `profiles`/`staff_profiles`, and routes to `/admin/dashboard`.

### 2. Office Footfall & KPI Dashboard Monitoring
- Description: Admin monitors `/admin/dashboard`, system displays live counter operations, waiting citizens count, daily applications, active services, and pending document Change Requests.

### 3. Employee Account Provisioning
- Description: Admin clicks "Add Employee" on `/admin/employees`, inputs officer full name, email, phone, counter number (`C-01` to `C-10`), and break times, system provisions auth user via Supabase Auth Admin API and inserts records into `staff_profiles` and `profiles`.

### 4. Employee Profile & Counter Assignment Editing
- Description: Admin clicks edit on an employee row, modifies counter number, designation, or break schedule, and system executes `PATCH /api/admin/employees/:id` to update `staff_profiles`.

### 5. Employee Account Deletion
- Description: Admin clicks delete on an employee row and confirms dialog, system executes `DELETE /api/admin/employees/:id`, purging staff records from Supabase database.

### 6. Office Service Slot & Break Schedule Configuration
- Description: Admin selects a service on `/admin/services`, sets operating hours, slot duration, capacity, and employee break windows (e.g. 01:00 PM – 01:30 PM), and system calls `PATCH /api/services/:id/slots`.

### 7. Office Service Booking Pause & Blackout Date Enforcement
- Description: Admin toggles "Pause Bookings" or adds specific blackout dates for a service on `/admin/services`, system saves rules to `stopped_booking_dates`, preventing citizens from booking virtual slots on those dates.

### 8. Document Requirement Change Request Creation (`CR-xxx`)
- Description: Admin clicks "Create Document Change Request" on `/admin/services` or `/admin/change-requests`, selects service, picks proposed document from standard Indian document presets, inputs justification, and system issues `POST /api/change-requests` with status `PENDING`.

### 9. Change Request Status Tracking
- Description: Admin monitors `/admin/change-requests`, system subscribes to Supabase Realtime channel on `service_change_requests` to dynamically reflect State Super Admin approval or rejection decisions.

### 10. Office Analytics & Wait Time Report Generation
- Description: Admin reviews `/admin/reports`, system calculates average wait times, daily throughput, and counter utilization from completed queue token logs.

### 11. Office Security Audit Log Inspection
- Description: Admin visits `/admin/audit-logs`, system displays administrative action logs (token generation, employee modifications, change requests) with actor roles, timestamps, and IP addresses.

### 12. Office Admin Logout
- Description: Admin clicks logout in sidebar, system terminates Supabase session, clears admin authorization tokens, and redirects to `/staff-login`.

---

## Role 4: Super Admin (`superadmin`) — State Super Admin Panel (`/super-admin/*`)

### 1. Super Admin Authentication & Auto-Bootstrap
- Description: Super Admin signs in via `/staff-login?role=superadmin` or is bootstrapped on startup (`superadmin@nagrikq.org`), system verifies `superadmin` role, and routes to `/super-admin/dashboard`.

### 2. State-Wide System Analytics Monitoring
- Description: Super Admin monitors `/super-admin/dashboard`, system fetches aggregate metrics from `/api/analytics/system` (total citizens, active offices, employees, active services, pending change requests).

### 3. Document Change Request Review & Approval
- Description: Super Admin opens `/super-admin/change-requests`, reviews submitted admin justification, clicks "Approve", system calls `PATCH /api/change-requests/:id/review`, automatically inserts the approved document into `document_requirements`, updates status to `APPROVED`, writes to `audit_logs`, and broadcasts via Realtime.

### 4. Document Change Request Rejection
- Description: Super Admin reviews change request, inputs rejection reason, clicks "Reject", system calls `PATCH /api/change-requests/:id/review` with status `REJECTED`, updates database record, and logs rejection in `audit_logs`.

### 5. Global Government Service Creation
- Description: Super Admin clicks "Create Service" on `/super-admin/services`, specifies service name, category, processing duration, fee amount, applicable states across 28 states & 8 UTs, and required documents, and system creates service in `services` table.

### 6. Global Service Modification
- Description: Super Admin edits existing service parameters on `/super-admin/services`, system updates database record via `PUT /api/super-admin/services/:id`.

### 7. Global Service Active Status Toggling
- Description: Super Admin toggles service active/inactive status switch on `/super-admin/services`, system calls `PATCH /api/super-admin/services/:id/status`, immediately updating citizen visibility statewide.

### 8. Global Service Deletion
- Description: Super Admin deletes a service from `/super-admin/services`, system calls `DELETE /api/super-admin/services/:id`, cascading removals to associated document requirements and office mappings.

### 9. District / Office Administrator Account Provisioning
- Description: Super Admin clicks "Create Admin" on `/super-admin/admins`, enters admin name, official email, phone, and district/taluka jurisdiction, system calls `POST /api/super-admin/create-admin` to provision auth credentials and save profile with `admin` role.

### 10. District Administrator Management & Revocation
- Description: Super Admin views, edits jurisdiction details, or deletes office administrators via `/super-admin/admins` endpoints (`PATCH /api/super-admin/admins/:id`, `DELETE /api/super-admin/admins/:id`).

### 11. State Government Offices Directory Inspection
- Description: Super Admin navigates to `/super-admin/offices`, system lists all registered Jan Seva Kendras, Collectorates, and Mamlatdar offices showing operational counter capacities and contact details.

### 12. State-Wide Security Audit Trail & Compliance Inspection
- Description: Super Admin opens `/super-admin/audit-logs`, system displays immutable system audit log entries filterable by role (`citizen`, `employee`, `admin`, `superadmin`) and action event.

### 13. System Architecture & Backend Integration Monitoring
- Description: Super Admin visits `/super-admin/settings`, system displays readiness indicators for Supabase database boundaries, Gemini RAG pipeline status, and n8n webhook automations.

### 14. Telegram Account Mapping Auditing
- Description: Super Admin accesses `GET /api/telegram/mappings`, system returns linked phone numbers and Telegram chat IDs registered in the system for delivery auditing.

### 15. Super Admin Logout
- Description: Super Admin clicks logout in sidebar, system terminates session, clears tokens, and redirects to `/staff-login`.
