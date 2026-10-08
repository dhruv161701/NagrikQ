# NagrikQ — API & Backend Service Inventory

> **Auditor Notice**: This API inventory documents only verified endpoints, methods, parameters, and services discovered in `backend/src/routes/apiRoutes.ts`, `backend/src/server.ts`, and controller files.

---

## 1. System & Health Endpoints

| Method | Endpoint | Purpose | Auth Required | Role | Database / Service |
|---|---|---|---|---|---|
| `GET` | `/health` | Server health status & uptime timestamp | No (Public) | Anyone | None |
| `ALL` | `/api/bootstrap-superadmin` | Bootstraps Super Admin user in Supabase Auth & Profiles | No (Bootstrap) | Anyone | Supabase Auth Admin, `profiles`, `staff_profiles`, `knowledge_chunks` |

---

## 2. Public Service & Office Discovery Endpoints

| Method | Endpoint | Purpose | Auth Required | Role | Database / Service |
|---|---|---|---|---|---|
| `GET` | `/api/services` | Retrieve public government service catalog | No (Public) | Anyone | `services`, `document_requirements` |
| `GET` | `/api/services/location-aware` | Retrieve services filtered by state, district, and city | No (Public) | Anyone | `services`, `document_requirements` |
| `GET` | `/api/services/:id` | Retrieve service details, document requirements, and slots | No (Public) | Anyone | `services`, `document_requirements` |
| `GET` | `/api/offices` | Retrieve directory of state government offices | No (Public) | Anyone | `offices` |

---

## 3. Citizen Profile Endpoints

| Method | Endpoint | Purpose | Auth Required | Role | Request / Response Details | Database / Service |
|---|---|---|---|---|---|---|
| `GET` | `/api/profile` | Retrieve authenticated user profile | Yes (Bearer) | Any Authenticated | Returns profile data, role, language, mode | `profiles`, `staff_profiles` |
| `POST` | `/api/profile/onboarding` | Complete onboarding profile | Yes (Bearer) | `citizen` | Body: `{ language, dob, uiMode }` | `profiles` |
| `PUT` | `/api/profile` | Update profile information | Yes (Bearer) | Any Authenticated | Body: `{ full_name, phone, preferred_language, ui_mode }` | `profiles` |

---

## 4. Virtual Queue & Token Management Endpoints

| Method | Endpoint | Purpose | Auth Required | Role | Request / Response Details | Database / Service |
|---|---|---|---|---|---|---|
| `POST` | `/api/queue/token` | Issue new virtual queue token | Yes (Bearer) | `citizen` | Body: `{ serviceId, officeId, timeSlot, slotDate, selectedState, selectedCity, documents }`. Checks duplicate daily booking. | `queue_tokens`, `applications`, `documents`, `services` |
| `GET` | `/api/queue/live` | Retrieve live queue metrics and ETA | Yes (Bearer) | Any Authenticated | Returns current serving token, people ahead, estimated wait minutes | `queue_tokens` |
| `GET` | `/api/queue/my-tokens` | Fetch active citizen's queue tokens | Yes (Bearer) | `citizen` | Returns list of tokens owned by calling user | `queue_tokens`, `services` |
| `GET` | `/api/queue/tokens` | Fetch officer desk queue tokens | Yes (Bearer) | `employee`, `admin`, `superadmin` | Query: optional office/counter filters | `queue_tokens`, `profiles`, `services` |
| `POST` | `/api/queue/next` | Call next citizen to desk counter | Yes (Bearer) | `employee`, `admin`, `superadmin` | Body: `{ counterNumber, serviceIds }`. Advances token to `IN_SERVICE`. | `queue_tokens` |
| `PATCH` | `/api/queue/tokens/:id/status` | Update token status (`COMPLETED`, `NO_SHOW`, etc.) | Yes (Bearer) | `employee`, `admin`, `superadmin` | Body: `{ status, nextCounter }` | `queue_tokens` |
| `POST` | `/api/queue/tokens/:id/next-table` | Route citizen token to next table/counter | Yes (Bearer) | `employee`, `admin`, `superadmin` | Body: `{ nextCounter }`. Updates `next_counter` column. | `queue_tokens` |
| `PATCH` | `/api/queue/tokens/:id/cancel` | Cancel active virtual token | Yes (Bearer) | `citizen`, `employee`, `admin`, `superadmin` | Marks status `CANCELLED` | `queue_tokens` |
| `DELETE` | `/api/queue/tokens/:id` | Cancel active virtual token | Yes (Bearer) | `citizen`, `employee`, `admin`, `superadmin` | Marks status `CANCELLED` | `queue_tokens` |
| `POST` | `/api/queue/tokens/:id/advance-counter` | Advance token through sequential counter path | Yes (Bearer) | `employee`, `admin`, `superadmin` | Advances `current_counter_index` along `counter_path` | `queue_tokens` |
| `POST` | `/api/queue/tokens/:id/rebook` | Rebook expired token to new same-day slot | Yes (Bearer) | `citizen` | Body: `{ timeSlot, slotDate }`. Resets token to `WAITING`. | `queue_tokens` |

---

## 5. Application & Document Verification Endpoints

| Method | Endpoint | Purpose | Auth Required | Role | Request / Response Details | Database / Service |
|---|---|---|---|---|---|---|
| `POST` | `/api/applications` | Submit government service application | Yes (Bearer) | `citizen` | Body: `{ serviceId, officeId, documents: [{ name, url }] }` | `applications`, `documents`, `audit_logs` |
| `GET` | `/api/applications` | List citizen applications (or all for staff) | Yes (Bearer) | Any Authenticated | Returns applications with attached documents and timelines | `applications`, `documents`, `services` |
| `PATCH` | `/api/applications/:id/status` | Update application status | Yes (Bearer) | `employee`, `admin`, `superadmin` | Body: `{ status, remarks }` (`APPROVED`, `REJECTED`, `PROCESSING`) | `applications`, `audit_logs` |
| `PATCH` | `/api/applications/documents/:docId/status` | Update document verification status | Yes (Bearer) | `employee`, `admin`, `superadmin` | Body: `{ status, remarks }` (`VERIFIED`, `REJECTED`, `NEEDS_CORRECTION`) | `documents`, `document_verifications` |

---

## 6. Document Upload & Cloudinary Proxy Endpoints

| Method | Endpoint | Purpose | Auth Required | Role | Request / Response Details | Database / Service |
|---|---|---|---|---|---|---|
| `POST` | `/api/upload/cloudinary` | Proxy upload citizen documents to Cloudinary | Public / Auth | Any | Body: `{ fileData (base64), fileName, userId, folder }`. Computes SHA-1 HMAC signature. | Cloudinary REST API |
| `GET` | `/api/upload/cloudinary/download` | Generate download URL for Cloudinary document | Public / Auth | Any | Query: `{ publicId, fileName, format }` | Cloudinary REST API |
| `POST` | `/api/upload/cloudinary/download` | Generate download URL for Cloudinary document | Public / Auth | Any | Body: `{ publicId, fileName, format }` | Cloudinary REST API |
| `POST` | `/api/upload/cloudinary/delete` | Delete stored document from Cloudinary | Public / Auth | Any | Body: `{ publicId }` | Cloudinary REST API |

---

## 7. AI & RAG Assistant Endpoints

| Method | Endpoint | Purpose | Auth Required | Role | Request / Response Details | Database / Service |
|---|---|---|---|---|---|---|
| `POST` | `/api/rag/ask` | Natural language question answering on government rules | No (Public) | Anyone | Body: `{ question, service_id? }`. Generates 768d embedding via Gemini, computes cosine similarity against `knowledge_chunks`, and generates grounded answer with source citations. | Supabase `knowledge_chunks`, Google Gemini (`gemini-embedding-001`, `gemini-3.5-flash`) |

---

## 8. Telegram Bot & Notification Endpoints

| Method | Endpoint | Purpose | Auth Required | Role | Request / Response Details | Database / Service |
|---|---|---|---|---|---|---|
| `POST` | `/api/telegram/webhook` | Telegram update webhook handler | No (Telegram API) | Telegram Server | Body: Telegram `Update` object. Handled by `telegramBotService`. | Telegram Bot API |
| `GET` | `/api/telegram/status` | Check Telegram bot operational status | No (Public) | Anyone | Returns `{ botUsername: '@NagrikQbot', isPolling: true }` | Telegram Bot API |
| `POST` | `/api/telegram/link` | Link citizen/staff phone number to Telegram chat ID | Yes (Bearer) | Any Authenticated | Body: `{ phone, telegramChatId, telegramUsername }`. Normalizes to 10 digits. | `telegram_mappings` |
| `POST` | `/api/telegram/notify-idp` | Dispatch IDP notification to Telegram via n8n | Public / Internal | Internal / n8n | Body: `{ eventId, application, recipientTelegramChatId }` | `idp_notification_logs`, n8n, Telegram |
| `GET` | `/api/telegram/mappings` | Retrieve list of phone-to-Telegram chat mappings | Yes (Bearer) | `admin`, `superadmin` | Returns all registered chat mappings | `telegram_mappings` |

---

## 9. Office Admin Endpoints

| Method | Endpoint | Purpose | Auth Required | Role | Request / Response Details | Database / Service |
|---|---|---|---|---|---|---|
| `POST` | `/api/admin/employees` | Provision new counter officer account | Yes (Bearer) | `admin`, `superadmin` | Body: `{ fullName, email, phone, counterNumber, designation, department, breakStartTime, breakEndTime }`. Uses Supabase Auth Admin API. | Supabase Auth, `profiles`, `staff_profiles`, `audit_logs` |
| `GET` | `/api/admin/employees` | List office employees and counter assignments | Yes (Bearer) | `admin`, `superadmin` | Returns staff profiles with counter assignments | `staff_profiles`, `profiles` |
| `PATCH` | `/api/admin/employees/:id` | Update employee counter, break, or designation | Yes (Bearer) | `admin`, `superadmin` | Body: `{ counterNumber, designation, phone, breakStartTime, breakEndTime }` | `staff_profiles` |
| `DELETE` | `/api/admin/employees/:id` | Delete employee account | Yes (Bearer) | `admin`, `superadmin` | Deletes staff profile and auth user | Supabase Auth, `staff_profiles`, `profiles` |
| `POST` | `/api/admin/office/setup` | Configure office department settings | Yes (Bearer) | `admin`, `superadmin` | Body: `{ name, totalCounters, openingTime, closingTime }` | `offices` |
| `PATCH` | `/api/services/:id/slots` | Configure service slots, break windows & blackouts | Yes (Bearer) | `admin`, `superadmin` | Body: `{ slotCapacity, startTime, endTime, slotDurationMinutes, enableBreakTime, breakStartTime, breakEndTime, stoppedBookingDates, isBookingStopped }` | `services` |
| `POST` | `/api/change-requests` | Submit document requirement Change Request (`CR-xxx`) | Yes (Bearer) | `admin`, `superadmin` | Body: `{ serviceId, officeName, addedDocumentName, reason, currentDocumentNames, proposedDocumentNames }` | `service_change_requests`, `audit_logs` |
| `GET` | `/api/change-requests` | Retrieve Change Requests for review or tracking | Yes (Bearer) | `admin`, `superadmin` | Returns change requests with attached service metadata | `service_change_requests`, `services` |
| `GET` | `/api/audit-logs` | Retrieve office/system security audit logs | Yes (Bearer) | `admin`, `superadmin` | Query: optional role and limit filters | `audit_logs` |

---

## 10. Super Admin Endpoints

| Method | Endpoint | Purpose | Auth Required | Role | Request / Response Details | Database / Service |
|---|---|---|---|---|---|---|
| `GET` | `/api/analytics/system` | Retrieve state-wide system KPIs | Yes (Bearer) | `superadmin` | Returns counts of citizens, offices, employees, services, pending CRs, daily applications | `profiles`, `offices`, `staff_profiles`, `services`, `service_change_requests`, `applications` |
| `PATCH` | `/api/change-requests/:id/review` | Approve or reject document Change Request | Yes (Bearer) | `superadmin` | Body: `{ status: 'APPROVED' \| 'REJECTED', reviewNote }`. On `APPROVED`, automatically inserts new requirement into `document_requirements`. | `service_change_requests`, `document_requirements`, `audit_logs` |
| `POST` | `/api/super-admin/create-admin` | Provision District/Office Admin account | Yes (Bearer) | `superadmin` | Body: `{ fullName, email, phone, designation, department, district, taluka, officeName }` | Supabase Auth, `profiles`, `staff_profiles`, `audit_logs` |
| `GET` | `/api/super-admin/admins` | List all provisioned administrative accounts | Yes (Bearer) | `superadmin` | Returns administrators list | `staff_profiles`, `profiles` |
| `PATCH` | `/api/super-admin/admins/:id` | Update administrative user details | Yes (Bearer) | `superadmin` | Body: `{ fullName, designation, department, district, taluka, phone, status }` | `staff_profiles`, `profiles` |
| `DELETE` | `/api/super-admin/admins/:id` | Delete administrative user account | Yes (Bearer) | `superadmin` | Deletes staff profile and auth record | Supabase Auth, `staff_profiles`, `profiles` |
| `POST` | `/api/super-admin/services` | Create new global service in state catalog | Yes (Bearer) | `superadmin` | Body: `{ name, code, category, description, processingTimeDays, feeAmount, applicableStates, applicableCities, documentRequirements }` | `services`, `document_requirements`, `audit_logs` |
| `PUT` | `/api/super-admin/services/:id` | Update master service parameters | Yes (Bearer) | `superadmin` | Body: updated service fields and document lists | `services`, `document_requirements`, `audit_logs` |
| `DELETE` | `/api/super-admin/services/:id` | Delete global service from state catalog | Yes (Bearer) | `superadmin` | Removes service and cascades document requirements | `services`, `document_requirements`, `audit_logs` |
| `PATCH` | `/api/super-admin/services/:id/status` | Toggle global service active/inactive status | Yes (Bearer) | `superadmin` | Body: `{ isActive }` | `services`, `audit_logs` |

---

## 11. Complaints Endpoints (Backend Implemented / Frontend Unrouted)

| Method | Endpoint | Purpose | Auth Required | Role | Request / Response Details | Database / Service |
|---|---|---|---|---|---|---|
| `POST` | `/api/complaints` | Submit grievance/complaint | Yes (Bearer) | Any Authenticated | Body: `{ subject, description, applicationId }` | `complaints` |
| `GET` | `/api/complaints` | Fetch complaints list | Yes (Bearer) | Any Authenticated | Returns user complaints (or all if staff) | `complaints` |

---

## 12. External Outbound API & Webhook Integrations

| Integration Target | Invoked From | Protocol | Purpose | Payload Details |
|---|---|---|---|---|
| **Telegram Bot API** (`api.telegram.org`) | `telegramBotService.ts` | HTTPS POST | Dispatches messages to Telegram chats | `{ chat_id, text, parse_mode: 'Markdown' }` |
| **n8n Workflow Webhook** (`localhost:5678/webhook/idp-created`) | `n8nService.ts` | HTTPS/HTTP POST | Dispatches IDP creation event to n8n | Header: `x-webhook-secret: nagrikq_idp_secret_key_2026`. Body: `{ eventId, application, recipientTelegramChatId }` |
| **Google Generative AI API** (`generativelanguage.googleapis.com`) | `geminiService.ts` | HTTPS REST | Generates 768d text embeddings and generates RAG chat responses | Gemini Embedding 001 (`outputDimensionality: 768`) & Gemini 3.5 Flash |
| **Cloudinary Media API** (`api.cloudinary.com`) | `uploadController.ts` & `cloudinaryService.ts` | HTTPS POST Multipart | Uploads citizen certificates and generates authenticated download URLs | Form: `file`, `api_key`, `timestamp`, `folder`, `signature` (SHA-1) |
