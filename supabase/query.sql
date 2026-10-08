-- ====================================================================
-- NAGRIKQ — COMPLETE DATABASE SCHEMA & RLS POLICIES (Supabase PostgreSQL)
-- Safe & Idempotent Script: Can be run safely multiple times
-- ====================================================================

-- 1. ENUM TYPES (Created safely if not already present)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('citizen', 'employee', 'admin', 'superadmin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ui_mode') THEN
    CREATE TYPE ui_mode AS ENUM ('modern', 'simple');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'language_code') THEN
    CREATE TYPE language_code AS ENUM ('en', 'gu', 'hi');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
    CREATE TYPE application_status AS ENUM (
      'DRAFT',
      'SUBMITTED',
      'DOCUMENT_VERIFICATION',
      'PROCESSING',
      'APPROVED',
      'REJECTED',
      'COMPLETED',
      'CANCELLED'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doc_verification_status') THEN
    CREATE TYPE doc_verification_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_CORRECTION');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'queue_status') THEN
    CREATE TYPE queue_status AS ENUM (
      'WAITING',
      'CALLED',
      'CHECKED_IN',
      'IN_SERVICE',
      'COMPLETED',
      'NO_SHOW',
      'CANCELLED'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'change_request_status') THEN
    CREATE TYPE change_request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM ('queue', 'application', 'system');
  END IF;
END $$;

-- 1B. PGVECTOR EXTENSION FOR VECTOR SIMILARITY SEARCH
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. KNOWLEDGE BASE CHUNKS TABLE FOR RAG
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
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

-- Vector index for fast similarity search
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
ON public.knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (threads = 1, m = 60);

-- 2. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
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

-- 3. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  state VARCHAR(100) DEFAULT 'Gujarat',
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3B. DISTRICTS TABLE
CREATE TABLE IF NOT EXISTS public.districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state VARCHAR(100) DEFAULT 'Gujarat',
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3C. TALUKAS TABLE
CREATE TABLE IF NOT EXISTS public.talukas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID REFERENCES public.districts(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. OFFICES TABLE
CREATE TABLE IF NOT EXISTS public.offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  state VARCHAR(100) DEFAULT 'Gujarat',
  district VARCHAR(100) NOT NULL,
  subdivision VARCHAR(100),
  taluka VARCHAR(100),
  city VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  contact_number VARCHAR(50) DEFAULT '0281-2451000',
  email VARCHAR(255),
  total_counters INT DEFAULT 10,
  opening_time VARCHAR(20) DEFAULT '09:00 AM',
  closing_time VARCHAR(20) DEFAULT '05:00 PM',
  working_days VARCHAR(100) DEFAULT 'Monday - Saturday',
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4B. STAFF_PROFILES TABLE (Extends profiles for government staff)
CREATE TABLE IF NOT EXISTS public.staff_profiles (
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

-- 4C. COUNTERS TABLE
CREATE TABLE IF NOT EXISTS public.counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID REFERENCES public.offices(id) ON DELETE CASCADE,
  counter_number VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) DEFAULT 'GENERAL',
  assigned_employee_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  assigned_service_ids UUID[] DEFAULT ARRAY[]::UUID[],
  status VARCHAR(20) DEFAULT 'ACTIVE',
  queue_enabled BOOLEAN DEFAULT TRUE,
  working_hours VARCHAR(100) DEFAULT '09:00 AM - 05:00 PM',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(office_id, counter_number)
);

-- 5. SERVICES TABLE
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE RESTRICT,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  processing_time_days INT NOT NULL DEFAULT 7,
  fee_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  icon_name VARCHAR(50) DEFAULT 'FileText',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. OFFICE_SERVICES TABLE (Many-to-Many Mapping)
CREATE TABLE IF NOT EXISTS public.office_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID REFERENCES public.offices(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(office_id, service_id)
);

-- 7. DOCUMENT_REQUIREMENTS TABLE
CREATE TABLE IF NOT EXISTS public.document_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT TRUE,
  file_types TEXT[] DEFAULT ARRAY['PDF', 'JPG', 'PNG'],
  max_size_mb INT DEFAULT 5,
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE RESTRICT,
  office_id UUID REFERENCES public.offices(id) ON DELETE RESTRICT,
  status application_status DEFAULT 'SUBMITTED',
  remarks TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_requirement_id UUID REFERENCES public.document_requirements(id) ON DELETE RESTRICT,
  requirement_name VARCHAR(255) NOT NULL,
  storage_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) DEFAULT 'application/pdf',
  file_size INT DEFAULT 1048576,
  verification_status doc_verification_status DEFAULT 'PENDING',
  notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. DOCUMENT_VERIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.document_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status doc_verification_status NOT NULL,
  remarks TEXT,
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. OFFICERS TABLE
CREATE TABLE IF NOT EXISTS public.officers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_code VARCHAR(50) UNIQUE NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE RESTRICT,
  office_id UUID REFERENCES public.offices(id) ON DELETE RESTRICT,
  designation VARCHAR(100) DEFAULT 'Junior Officer',
  counter_number VARCHAR(20) DEFAULT 'C-01',
  is_active BOOLEAN DEFAULT TRUE,
  assigned_service_ids UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. QUEUE_TOKENS TABLE
CREATE TABLE IF NOT EXISTS public.queue_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_number VARCHAR(20) NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  office_id UUID REFERENCES public.offices(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  counter_number VARCHAR(20),
  next_counter VARCHAR(50), -- Assigned next destination table (e.g. 'C-2', 'C-3')
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

-- Idempotent column addition for existing deployments:
ALTER TABLE public.queue_tokens ADD COLUMN IF NOT EXISTS next_counter VARCHAR(50);

-- 13. APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  office_id UUID REFERENCES public.offices(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  appointment_time VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'CONFIRMED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type notification_type DEFAULT 'system',
  is_read BOOLEAN DEFAULT FALSE,
  related_entity VARCHAR(100),
  link_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. COMPLAINTS TABLE
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. SERVICE_CHANGE_REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.service_change_requests (
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

-- 17. AUDIT_LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_user_name VARCHAR(255) NOT NULL,
  actor_user_role user_role NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100),
  old_data JSONB,
  new_data JSONB,
  details TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(50)
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talukas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- STAFF PROFILES POLICIES
DROP POLICY IF EXISTS "Staff profiles viewable by self or staff admins" ON public.staff_profiles;
CREATE POLICY "Staff profiles viewable by self or staff admins"
ON public.staff_profiles FOR SELECT USING (
  auth.uid() = id OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
);

DROP POLICY IF EXISTS "Super admin and admin insert staff profiles" ON public.staff_profiles;
CREATE POLICY "Super admin and admin insert staff profiles"
ON public.staff_profiles FOR INSERT WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
);

DROP POLICY IF EXISTS "Super admin and admin update staff profiles" ON public.staff_profiles;
CREATE POLICY "Super admin and admin update staff profiles"
ON public.staff_profiles FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
);

-- PUBLIC DATA POLICIES (Departments, Offices, Services, Document Requirements, Counters, Locations)
DROP POLICY IF EXISTS "Departments are viewable by everyone" ON public.departments;
CREATE POLICY "Departments are viewable by everyone" ON public.departments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Offices are viewable by everyone" ON public.offices;
CREATE POLICY "Offices are viewable by everyone" ON public.offices FOR SELECT USING (true);

DROP POLICY IF EXISTS "Districts are viewable by everyone" ON public.districts;
CREATE POLICY "Districts are viewable by everyone" ON public.districts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Talukas are viewable by everyone" ON public.talukas;
CREATE POLICY "Talukas are viewable by everyone" ON public.talukas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Counters are viewable by everyone" ON public.counters;
CREATE POLICY "Counters are viewable by everyone" ON public.counters FOR SELECT USING (true);

DROP POLICY IF EXISTS "Services are viewable by everyone" ON public.services;
CREATE POLICY "Services are viewable by everyone" ON public.services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Superadmin can manage services" ON public.services;
CREATE POLICY "Superadmin can manage services" ON public.services
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  );

DROP POLICY IF EXISTS "Office Services are viewable by everyone" ON public.office_services;
CREATE POLICY "Office Services are viewable by everyone" ON public.office_services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Superadmin can manage office services" ON public.office_services;
CREATE POLICY "Superadmin can manage office services" ON public.office_services
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  );

DROP POLICY IF EXISTS "Document requirements are viewable by everyone" ON public.document_requirements;
CREATE POLICY "Document requirements are viewable by everyone" ON public.document_requirements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Superadmin can manage document requirements" ON public.document_requirements;
CREATE POLICY "Superadmin can manage document requirements" ON public.document_requirements
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  );

-- APPLICATIONS POLICIES
DROP POLICY IF EXISTS "Citizens view their own applications" ON public.applications;
CREATE POLICY "Citizens view their own applications"
ON public.applications FOR SELECT USING (
  auth.uid() = user_id OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('employee', 'admin', 'superadmin')
);

DROP POLICY IF EXISTS "Citizens create their own applications" ON public.applications;
CREATE POLICY "Citizens create their own applications"
ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Employees and Admins update applications" ON public.applications;
CREATE POLICY "Employees and Admins update applications"
ON public.applications FOR UPDATE USING (
  auth.uid() = user_id OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('employee', 'admin', 'superadmin')
);

-- DOCUMENTS POLICIES
DROP POLICY IF EXISTS "Users view own documents or staff views documents" ON public.documents;
CREATE POLICY "Users view own documents or staff views documents"
ON public.documents FOR SELECT USING (
  auth.uid() = user_id OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('employee', 'admin', 'superadmin')
);

DROP POLICY IF EXISTS "Users insert own documents" ON public.documents;
CREATE POLICY "Users insert own documents"
ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff updates document verification status" ON public.documents;
CREATE POLICY "Staff updates document verification status"
ON public.documents FOR UPDATE USING (
  auth.uid() = user_id OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('employee', 'admin', 'superadmin')
);

-- QUEUE TOKENS POLICIES
DROP POLICY IF EXISTS "Users view own tokens or staff views office queue" ON public.queue_tokens;
CREATE POLICY "Users view own tokens or staff views office queue"
ON public.queue_tokens FOR SELECT USING (
  auth.uid() = user_id OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('employee', 'admin', 'superadmin')
);

DROP POLICY IF EXISTS "Users create own tokens" ON public.queue_tokens;
CREATE POLICY "Users create own tokens"
ON public.queue_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff updates queue tokens" ON public.queue_tokens;
CREATE POLICY "Staff updates queue tokens"
ON public.queue_tokens FOR UPDATE USING (
  auth.uid() = user_id OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('employee', 'admin', 'superadmin')
);

-- NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications"
ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- COMPLAINTS POLICIES
DROP POLICY IF EXISTS "Users view own complaints or staff views complaints" ON public.complaints;
CREATE POLICY "Users view own complaints or staff views complaints"
ON public.complaints FOR SELECT USING (
  auth.uid() = user_id OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('employee', 'admin', 'superadmin')
);

DROP POLICY IF EXISTS "Users create own complaints" ON public.complaints;
CREATE POLICY "Users create own complaints"
ON public.complaints FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CHANGE REQUESTS POLICIES
DROP POLICY IF EXISTS "Admins and Super Admins manage change requests" ON public.service_change_requests;
CREATE POLICY "Admins and Super Admins manage change requests"
ON public.service_change_requests FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
);

-- AUDIT LOGS POLICIES
DROP POLICY IF EXISTS "Admins and Super Admins view audit logs" ON public.audit_logs;
CREATE POLICY "Admins and Super Admins view audit logs"
ON public.audit_logs FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
);

-- ====================================================================
-- TELEGRAM MAPPINGS & IDP NOTIFICATION LOGS TABLES
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.telegram_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone VARCHAR(50) NOT NULL,
  normalized_phone VARCHAR(50) NOT NULL UNIQUE,
  telegram_chat_id BIGINT NOT NULL UNIQUE,
  telegram_username VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.idp_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  telegram_chat_id BIGINT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'DELIVERED',
  error_message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_mappings_user_id ON public.telegram_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_mappings_normalized_phone ON public.telegram_mappings(normalized_phone);
CREATE INDEX IF NOT EXISTS idx_telegram_mappings_chat_id ON public.telegram_mappings(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_idp_logs_event_id ON public.idp_notification_logs(event_id);

ALTER TABLE public.telegram_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idp_notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own mapping or staff views mappings" ON public.telegram_mappings;
CREATE POLICY "Users view own mapping or staff views mappings"
ON public.telegram_mappings FOR SELECT USING (
  auth.uid() = user_id OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
);

DROP POLICY IF EXISTS "Users manage own mapping" ON public.telegram_mappings;
CREATE POLICY "Users manage own mapping"
ON public.telegram_mappings FOR ALL USING (
  auth.uid() = user_id OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
);

-- ====================================================================
-- SUPABASE REALTIME CONFIGURATION
-- ====================================================================
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE
    public.queue_tokens,
    public.applications,
    public.notifications,
    public.service_change_requests,
    public.telegram_mappings;
COMMIT;

-- ====================================================================
-- SUPER ADMIN ROLE PROMOTION SCRIPT
-- Create user via Supabase Auth (Dashboard UI or Register Page),
-- then run this query to grant Super Admin privileges:
-- ====================================================================
UPDATE public.profiles SET role = 'superadmin' WHERE email = 'superadmin@nagrikq.gov.in';

INSERT INTO public.staff_profiles (id, user_id, employee_id, designation, department, role, status)
SELECT id, id, 'EMP-SUPERADMIN-001', 'Chief Digital Officer / Super Admin', 'General Administration Department', 'superadmin', 'ACTIVE'
FROM public.profiles WHERE email = 'superadmin@nagrikq.gov.in'
ON CONFLICT (id) DO UPDATE SET role = 'superadmin';

-- ====================================================================
-- TRUNCATE ALL NAGRIKQ DATA TABLES (RESETS DATABASE STATE COMPLETELY)
-- ====================================================================
-- TRUNCATE TABLE
--   public.audit_logs,
--   public.service_change_requests,
--   public.complaints,
--   public.notifications,
--   public.appointments,
--   public.queue_tokens,
--   public.document_verifications,
--   public.documents,
--   public.applications,
--   public.officers,
--   public.counters,
--   public.staff_profiles,
--   public.document_requirements,
--   public.office_services,
--   public.services,
--   public.offices,
--   public.talukas,
--   public.districts,
--   public.departments,
--   public.profiles
-- CASCADE;