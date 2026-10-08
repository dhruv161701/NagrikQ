-- ====================================================================
-- NAGRIKQ — TELEGRAM ACCOUNT MAPPINGS & IDP NOTIFICATION LOGS SCHEMA
-- Safe & Idempotent Script: Can be run multiple times without errors
-- ====================================================================

-- 1. TELEGRAM MAPPINGS TABLE
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

-- 2. IDP NOTIFICATION LOGS TABLE (For Idempotency and Delivery Auditing)
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

-- 3. INDEXES FOR PERFORMANCE AND DATA INTEGRITY
CREATE INDEX IF NOT EXISTS idx_telegram_mappings_user_id ON public.telegram_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_mappings_normalized_phone ON public.telegram_mappings(normalized_phone);
CREATE INDEX IF NOT EXISTS idx_telegram_mappings_chat_id ON public.telegram_mappings(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_idp_logs_event_id ON public.idp_notification_logs(event_id);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
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

DROP POLICY IF EXISTS "Admins view notification logs" ON public.idp_notification_logs;
CREATE POLICY "Admins view notification logs"
ON public.idp_notification_logs FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
);
