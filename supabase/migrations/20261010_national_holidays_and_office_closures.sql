-- ====================================================================
-- NAGRIKQ NATIONAL HOLIDAY MANAGEMENT & OFFICE CLOSURES MIGRATION
-- Date: 2026-10-10
-- Purpose:
--   1. Create holidays table for national, state, regional, office-level holidays
--   2. Configure RLS policies for holidays
--   3. Seed official 2026-2027 Indian Government holidays
--   4. Ensure foreign keys and counter relationship consistency
-- ====================================================================

-- 1. Create HOLIDAYS table
CREATE TABLE IF NOT EXISTS public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  holiday_date DATE NOT NULL,
  holiday_type VARCHAR(50) NOT NULL DEFAULT 'NATIONAL', -- 'NATIONAL', 'STATE', 'REGIONAL', 'OFFICE'
  state VARCHAR(100), -- NULL for National, or e.g. 'Gujarat'
  office_id UUID REFERENCES public.offices(id) ON DELETE CASCADE, -- NULL for National/State
  description TEXT,
  is_closed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, holiday_date, holiday_type, state, office_id)
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_holidays_state_date ON public.holidays(state, holiday_date);
CREATE INDEX IF NOT EXISTS idx_holidays_office_date ON public.holidays(office_id, holiday_date);

-- 2. Enable RLS
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Holidays are viewable by everyone" ON public.holidays;
CREATE POLICY "Holidays are viewable by everyone"
ON public.holidays FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff and admins can manage holidays" ON public.holidays;
CREATE POLICY "Staff and admins can manage holidays"
ON public.holidays FOR ALL USING (
  auth.role() = 'service_role' OR
  EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  )
);

-- 3. Seed Standard Indian Public & National Holidays for 2026 & 2027
INSERT INTO public.holidays (name, holiday_date, holiday_type, state, description, is_closed)
VALUES
  ('Republic Day', '2026-01-26', 'NATIONAL', NULL, 'National Holiday - Republic Day of India', true),
  ('Maha Shivratri', '2026-02-15', 'NATIONAL', NULL, 'Gazetted Holiday - Maha Shivratri', true),
  ('Holi', '2026-03-04', 'NATIONAL', NULL, 'Festival Holiday - Holi Dhuleti', true),
  ('Mahavir Jayanti', '2026-03-31', 'NATIONAL', NULL, 'Gazetted Holiday - Mahavir Janma Kalyanak', true),
  ('Good Friday', '2026-04-03', 'NATIONAL', NULL, 'Gazetted Holiday - Good Friday', true),
  ('Dr. B.R. Ambedkar Jayanti', '2026-04-14', 'NATIONAL', NULL, 'Gazetted Holiday - Ambedkar Jayanti', true),
  ('Eid-ul-Fitr', '2026-03-21', 'NATIONAL', NULL, 'Gazetted Holiday - Eid-ul-Fitr', true),
  ('Gujarat Day', '2026-05-01', 'STATE', 'Gujarat', 'State Holiday - Gujarat Foundation Day', true),
  ('Buddha Purnima', '2026-05-31', 'NATIONAL', NULL, 'Gazetted Holiday - Buddha Purnima', true),
  ('Muharram', '2026-06-26', 'NATIONAL', NULL, 'Gazetted Holiday - Muharram', true),
  ('Independence Day', '2026-08-15', 'NATIONAL', NULL, 'National Holiday - 80th Independence Day', true),
  ('Janmashtami', '2026-09-04', 'NATIONAL', NULL, 'Gazetted Holiday - Shri Krishna Janmashtami', true),
  ('Mahatma Gandhi Jayanti', '2026-10-02', 'NATIONAL', NULL, 'National Holiday - Gandhi Jayanti', true),
  ('Dussehra (Vijayadashami)', '2026-10-20', 'NATIONAL', NULL, 'Gazetted Holiday - Vijaya Dashami', true),
  ('Diwali (Deepavali)', '2026-11-09', 'NATIONAL', NULL, 'Festival Holiday - Deepavali', true),
  ('Guru Nanak Jayanti', '2026-11-24', 'NATIONAL', NULL, 'Gazetted Holiday - Guru Nanak Jayanti', true),
  ('Christmas Day', '2026-12-25', 'NATIONAL', NULL, 'Gazetted Holiday - Christmas', true),
  ('Republic Day', '2027-01-26', 'NATIONAL', NULL, 'National Holiday - Republic Day', true),
  ('Independence Day', '2027-08-15', 'NATIONAL', NULL, 'National Holiday - Independence Day', true),
  ('Mahatma Gandhi Jayanti', '2027-10-02', 'NATIONAL', NULL, 'National Holiday - Gandhi Jayanti', true)
ON CONFLICT (name, holiday_date, holiday_type, state, office_id) DO NOTHING;
