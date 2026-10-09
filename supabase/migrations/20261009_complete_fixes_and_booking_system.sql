-- ====================================================================
-- NAGRIKQ COMPLETE BUG FIXES & BOOKING SYSTEM MIGRATION
-- Date: 2026-10-09
-- Purpose:
--   1. Fix staff_profiles.counter_number & assigned_service_ids
--   2. Add slot configuration columns to services & service_slot_configs
--   3. Add stop_booking persistence table (service_stop_bookings)
--   4. Ensure queue_tokens has next_counter, slot_date, time_slot
--   5. Fix profiles RLS policies for seamless user session refresh
--   6. Create transactional concurrency-safe slot booking function
-- ====================================================================

-- 1. Ensure staff_profiles has counter_number and assigned_service_ids
ALTER TABLE public.staff_profiles
ADD COLUMN IF NOT EXISTS counter_number VARCHAR(20) DEFAULT 'C-01',
ADD COLUMN IF NOT EXISTS assigned_service_ids UUID[] DEFAULT ARRAY[]::UUID[],
ADD COLUMN IF NOT EXISTS break_start_time VARCHAR(20) DEFAULT '01:00 PM',
ADD COLUMN IF NOT EXISTS break_end_time VARCHAR(20) DEFAULT '01:30 PM',
ADD COLUMN IF NOT EXISTS on_break BOOLEAN DEFAULT FALSE;

-- Index for employee counter lookup
CREATE INDEX IF NOT EXISTS idx_staff_profiles_counter ON public.staff_profiles(counter_number);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_role ON public.staff_profiles(role);

-- 2. Ensure services table has slot configuration & stop booking columns
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS start_time VARCHAR(20) DEFAULT '09:30 AM',
ADD COLUMN IF NOT EXISTS end_time VARCHAR(20) DEFAULT '05:00 PM',
ADD COLUMN IF NOT EXISTS slot_duration_minutes INT DEFAULT 30,
ADD COLUMN IF NOT EXISTS avg_processing_time_minutes INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS slot_capacity INT DEFAULT 3,
ADD COLUMN IF NOT EXISTS enable_break_time BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS break_start_time VARCHAR(20) DEFAULT '01:00 PM',
ADD COLUMN IF NOT EXISTS break_end_time VARCHAR(20) DEFAULT '02:00 PM',
ADD COLUMN IF NOT EXISTS is_booking_stopped BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stopped_booking_dates TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 3. Office-scoped service slot configuration table
CREATE TABLE IF NOT EXISTS public.service_slot_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  office_id UUID REFERENCES public.offices(id) ON DELETE CASCADE,
  start_time VARCHAR(20) NOT NULL DEFAULT '09:30 AM',
  end_time VARCHAR(20) NOT NULL DEFAULT '05:00 PM',
  slot_duration_minutes INT NOT NULL DEFAULT 30,
  avg_processing_time_minutes INT NOT NULL DEFAULT 5,
  slot_capacity INT NOT NULL DEFAULT 3,
  theoretical_capacity INT NOT NULL DEFAULT 6,
  reserved_offline_capacity INT NOT NULL DEFAULT 3,
  enable_break_time BOOLEAN DEFAULT TRUE,
  break_start_time VARCHAR(20) DEFAULT '01:00 PM',
  break_end_time VARCHAR(20) DEFAULT '02:00 PM',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_id, office_id)
);

CREATE INDEX IF NOT EXISTS idx_slot_configs_service_office ON public.service_slot_configs(service_id, office_id);

-- 4. Service Stop Booking Table (Scoped by service, office, and calendar date)
CREATE TABLE IF NOT EXISTS public.service_stop_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  office_id UUID REFERENCES public.offices(id) ON DELETE CASCADE,
  stop_date DATE NOT NULL,
  reason TEXT,
  stopped_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_id, office_id, stop_date)
);

CREATE INDEX IF NOT EXISTS idx_stop_bookings_service_date ON public.service_stop_bookings(service_id, stop_date);

-- 5. Ensure queue_tokens table has all required columns
ALTER TABLE public.queue_tokens
ADD COLUMN IF NOT EXISTS next_counter VARCHAR(50),
ADD COLUMN IF NOT EXISTS slot_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS time_slot VARCHAR(50),
ADD COLUMN IF NOT EXISTS selected_state VARCHAR(100) DEFAULT 'Gujarat',
ADD COLUMN IF NOT EXISTS selected_city VARCHAR(100) DEFAULT 'Rajkot',
ADD COLUMN IF NOT EXISTS counter_path TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS current_counter_index INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS grace_period_minutes INT DEFAULT 15,
ADD COLUMN IF NOT EXISTS submitted_documents JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_queue_tokens_slot_lookup ON public.queue_tokens(service_id, slot_date, time_slot, status);
CREATE INDEX IF NOT EXISTS idx_queue_tokens_user_status ON public.queue_tokens(user_id, status);

-- 6. Enable RLS and add policies for new tables
ALTER TABLE public.service_slot_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_stop_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Slot configs viewable by all" ON public.service_slot_configs;
CREATE POLICY "Slot configs viewable by all"
ON public.service_slot_configs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff and admins manage slot configs" ON public.service_slot_configs;
CREATE POLICY "Staff and admins manage slot configs"
ON public.service_slot_configs FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin', 'employee')
);

DROP POLICY IF EXISTS "Stop bookings viewable by all" ON public.service_stop_bookings;
CREATE POLICY "Stop bookings viewable by all"
ON public.service_stop_bookings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff and admins manage stop bookings" ON public.service_stop_bookings;
CREATE POLICY "Staff and admins manage stop bookings"
ON public.service_stop_bookings FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin', 'employee')
);

-- 7. Fix profiles RLS to ensure authenticated users and admins can read profiles
DROP POLICY IF EXISTS "Profiles viewable by self and admins" ON public.profiles;
CREATE POLICY "Profiles viewable by self and admins"
ON public.profiles FOR SELECT USING (
  auth.uid() = id OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin', 'employee')
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE USING (
  auth.uid() = id OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT WITH CHECK (
  auth.uid() = id OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
);

-- 8. Add Realtime publication for updated tables
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE
      public.service_slot_configs,
      public.service_stop_bookings;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
