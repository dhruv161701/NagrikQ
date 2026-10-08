# NagrikQ — Database & Data Model Specification

> **Auditor Notice**: This document specifies the exact PostgreSQL schema, ENUM types, relational integrity constraints, indexes, and Row Level Security (RLS) policies implemented in `supabase/query.sql`, `supabase/enable_realtime.sql`, and `supabase/migrations/20261008_create_telegram_mappings.sql`.

---

## 1. PostgreSQL ENUM Types

| ENUM Name | Allowed Values | Usage in Schema |
|---|---|---|
| `user_role` | `'citizen'`, `'employee'`, `'admin'`, `'superadmin'` | Enforces role-based permissions in `profiles`, `staff_profiles`, and `audit_logs`. |
| `ui_mode` | `'modern'`, `'simple'` | Controls interface layout and accessibility typography mode in `profiles`. |
| `language_code` | `'en'`, `'gu'`, `'hi'` | Stores citizen preferred language (English, Gujarati, Hindi) in `profiles`. |
| `application_status`| `'DRAFT'`, `'SUBMITTED'`, `'DOCUMENT_VERIFICATION'`, `'PROCESSING'`, `'APPROVED'`, `'REJECTED'`, `'COMPLETED'`, `'CANCELLED'` | Tracks overall citizen application lifecycle in `applications`. |
| `doc_verification_status`| `'PENDING'`, `'VERIFIED'`, `'REJECTED'`, `'NEEDS_CORRECTION'` | Tracks document inspection state in `documents` and `document_verifications`. |
| `queue_status` | `'WAITING'`, `'CALLED'`, `'CHECKED_IN'`, `'IN_SERVICE'`, `'COMPLETED'`, `'NO_SHOW'`, `'CANCELLED'` | Tracks live virtual token progress in `queue_tokens`. |
| `change_request_status`| `'PENDING'`, `'APPROVED'`, `'REJECTED'`, `'CANCELLED'` | Tracks document requirement modification workflow in `service_change_requests`. |
| `notification_type`| `'queue'`, `'application'`, `'system'` | Categorizes in-app alerts in `notifications`. |

---

## 2. Table Directory & Purpose

| Table Name | One-Line Purpose | Primary Key | Foreign Key Dependencies |
|---|---|---|---|
| `knowledge_chunks` | Stores vector embeddings and service knowledge text for RAG AI similarity retrieval. | `id` (UUID) | `service_id -> services(id)` |
| `profiles` | Represents registered citizen and administrative user profiles linked to Supabase Auth. | `id` (UUID) | `id -> auth.users(id)` |
| `staff_profiles` | Extends profiles with official government designations, departments, employee IDs, and shift breaks. | `id` (UUID) | `id -> profiles(id)`, `department_id -> departments(id)`, `office_id -> offices(id)` |
| `departments` | Represents state government departments (Revenue, Civil Supplies, Social Justice). | `id` (UUID) | None |
| `districts` | Represents administrative state districts for geographic jurisdiction mapping. | `id` (UUID) | None |
| `talukas` | Represents sub-district administrative talukas mapped within districts. | `id` (UUID) | `district_id -> districts(id)` |
| `offices` | Represents physical Jan Seva Kendras, Collectorates, and Mamlatdar offices. | `id` (UUID) | `department_id -> departments(id)` |
| `counters` | Represents physical service desks/counters located inside government offices. | `id` (UUID) | `office_id -> offices(id)`, `assigned_employee_id -> staff_profiles(id)` |
| `services` | Represents statutory government services offered across departments with fee and processing rules. | `id` (UUID) | `department_id -> departments(id)` |
| `office_services` | Defines many-to-many operational mappings between physical offices and available services. | `id` (UUID) | `office_id -> offices(id)`, `service_id -> services(id)` |
| `document_requirements` | Stores the official statutory document checklist required for applying to a service. | `id` (UUID) | `service_id -> services(id)` |
| `applications` | Stores formal citizen service applications submitted online or at desk intake. | `id` (UUID) | `user_id -> profiles(id)`, `service_id -> services(id)`, `office_id -> offices(id)` |
| `documents` | Stores digital copies of citizen certificates submitted in support of an application. | `id` (UUID) | `application_id -> applications(id)`, `user_id -> profiles(id)`, `document_requirement_id -> document_requirements(id)` |
| `document_verifications`| Records officer evaluation decisions and inspection remarks for specific documents. | `id` (UUID) | `document_id -> documents(id)`, `verified_by -> profiles(id)` |
| `officers` | Legacy mapping connecting profiles, departments, offices, and assigned services. | `id` (UUID) | `user_id -> profiles(id)`, `department_id -> departments(id)`, `office_id -> offices(id)` |
| `queue_tokens` | Tracks virtual queue tokens, assigned desks, queue positions, ETAs, and status. | `id` (UUID) | `user_id -> profiles(id)`, `application_id -> applications(id)`, `office_id -> offices(id)`, `service_id -> services(id)` |
| `appointments` | Stores scheduled citizen priority appointments for office counter visits. | `id` (UUID) | `user_id -> profiles(id)`, `service_id -> services(id)`, `office_id -> offices(id)` |
| `notifications` | Stores in-app citizen alerts regarding application updates and queue calls. | `id` (UUID) | `user_id -> profiles(id)` |
| `complaints` | Records citizen grievances, delay reports, and official resolution logs. | `id` (UUID) | `user_id -> profiles(id)`, `application_id -> applications(id)` |
| `service_change_requests`| Manages bureaucratic change proposals submitted by office admins and approved by Super Admin. | `id` (UUID) | `service_id -> services(id)`, `requested_by_admin_id -> profiles(id)`, `reviewed_by_superadmin_id -> profiles(id)` |
| `audit_logs` | Stores immutable security logs of administrative actions, approvals, and token events. | `id` (UUID) | `actor_user_id -> profiles(id)` |
| `telegram_mappings` | Maps user phone numbers and profile IDs to verified Telegram chat IDs for automated alerts. | `id` (UUID) | `user_id -> profiles(id)` |
| `idp_notification_logs` | Stores delivery audit records and payloads for Telegram/n8n event notifications. | `id` (UUID) | `application_id -> applications(id)` |

---

## 3. Detailed Table Schema Definitions

### 3.1 `knowledge_chunks` (Vector Database for RAG)
```sql
CREATE TABLE public.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  service_name VARCHAR(255) NOT NULL,
  state VARCHAR(100) DEFAULT 'Gujarat',
  department VARCHAR(255),
  document_type VARCHAR(100),
  topic VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 `profiles` (User Identities)
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50) DEFAULT '+91 9876543210',
  role user_role NOT NULL DEFAULT 'citizen',
  date_of_birth VARCHAR(20),
  age INT,
  preferred_language language_code DEFAULT 'en',
  ui_mode ui_mode DEFAULT 'modern',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  tour_completed BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  state VARCHAR(100) DEFAULT 'Gujarat',
  district VARCHAR(100) DEFAULT 'Rajkot',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 `staff_profiles` (Official Government Staff Identities)
```sql
CREATE TABLE public.staff_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  designation VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  state VARCHAR(100) DEFAULT 'Gujarat',
  district VARCHAR(100),
  subdivision VARCHAR(100),
  taluka VARCHAR(100),
  office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
  counter_id UUID,
  reporting_authority VARCHAR(255),
  phone VARCHAR(50),
  aadhaar_last4 VARCHAR(4),
  aadhaar_verified BOOLEAN DEFAULT FALSE,
  verification_ref VARCHAR(100),
  permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
  role user_role NOT NULL DEFAULT 'employee',
  status VARCHAR(20) DEFAULT 'ACTIVE',
  joining_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.4 `queue_tokens` (Virtual Queue Tokens & Live Desks)
```sql
CREATE TABLE public.queue_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_number VARCHAR(20) NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  office_id UUID REFERENCES public.offices(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  counter_number VARCHAR(20),
  next_counter VARCHAR(50),
  queue_date DATE DEFAULT CURRENT_DATE,
  status queue_status DEFAULT 'WAITING',
  position INT DEFAULT 1,
  estimated_wait_minutes INT DEFAULT 15,
  people_ahead INT DEFAULT 0,
  called_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  service_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.5 `service_change_requests` (Bureaucratic Document Changes)
```sql
CREATE TABLE public.service_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number VARCHAR(50) UNIQUE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  requested_by_admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  office_name VARCHAR(255) NOT NULL,
  current_document_ids UUID[] DEFAULT ARRAY[]::UUID[],
  current_document_names TEXT[] DEFAULT ARRAY[]::TEXT[],
  proposed_document_ids UUID[] DEFAULT ARRAY[]::UUID[],
  proposed_document_names TEXT[] DEFAULT ARRAY[]::TEXT[],
  added_document_name VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  status change_request_status DEFAULT 'PENDING',
  reviewed_by_superadmin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_note TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);
```

### 3.6 `telegram_mappings` & `idp_notification_logs`
```sql
CREATE TABLE public.telegram_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone VARCHAR(50) NOT NULL,
  normalized_phone VARCHAR(50) NOT NULL UNIQUE,
  telegram_chat_id BIGINT NOT NULL UNIQUE,
  telegram_username VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.idp_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  telegram_chat_id BIGINT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'DELIVERED',
  error_message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Database Indexes

| Index Name | Table | Indexed Column(s) | Type / Purpose |
|---|---|---|---|
| `knowledge_chunks_embedding_idx` | `knowledge_chunks` | `embedding vector_cosine_ops` | IVFFlat cosine similarity index for sub-millisecond vector retrieval. |
| `idx_telegram_mappings_user_id` | `telegram_mappings` | `user_id` | B-tree index for citizen Telegram account lookups. |
| `idx_telegram_mappings_normalized_phone` | `telegram_mappings` | `normalized_phone` | B-tree index ensuring unique phone normalization lookups. |
| `idx_telegram_mappings_chat_id` | `telegram_mappings` | `telegram_chat_id` | B-tree index for rapid incoming bot webhook resolution. |
| `idx_idp_logs_event_id` | `idp_notification_logs`| `event_id` | B-tree unique index guaranteeing webhook delivery idempotency. |

---

## 5. Row Level Security (RLS) Policy Architecture

All 23 tables have RLS explicitly enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).

Key policy rules:
1. **Public Catalog Tables** (`departments`, `districts`, `talukas`, `offices`, `counters`, `services`, `document_requirements`, `office_services`):
   - `SELECT USING (true)` — Openly readable by any citizen, visitor, or staff member.
   - `INSERT / UPDATE / DELETE` — Restricted strictly to role `'superadmin'` (`(SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'`).
2. **Citizen Private Data** (`applications`, `documents`, `queue_tokens`, `notifications`, `complaints`):
   - Citizens can only view and insert their own rows (`auth.uid() = user_id`).
   - Staff members (`employee`, `admin`, `superadmin`) have scoped `SELECT` and `UPDATE` access to process queues, applications, and documents.
3. **Administrative Workflows** (`service_change_requests`, `audit_logs`):
   - Restricted exclusively to authenticated users with roles `'admin'` or `'superadmin'`.
4. **Staff Management** (`staff_profiles`):
   - Viewable by the staff member themselves or by users with roles `'admin'` or `'superadmin'`.
   - Modifiable only by `'admin'` and `'superadmin'`.

---

## 6. Realtime Publication Configuration

The PostgreSQL publication `supabase_realtime` is configured with `REPLICA IDENTITY FULL` on:
- `services`
- `document_requirements`
- `applications`
- `documents`
- `queue_tokens`
- `service_change_requests`
- `notifications`
- `staff_profiles`
- `counters`
- `profiles`
- `offices`
- `telegram_mappings`

This ensures that any database update or deletion transmits complete prior and updated row payloads to all active WebSocket listeners across citizen tracking cards, officer call boards, and admin approval dashboards.
