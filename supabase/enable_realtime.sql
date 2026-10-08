-- ====================================================================
-- NAGRIKQ — ENABLE SUPABASE REALTIME FOR ALL TABLES
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ====================================================================

-- 1. Ensure the supabase_realtime publication exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 2. Add all key tables to the supabase_realtime publication
-- (Using a safe DO block so it doesn't error if already added)
DO $$
DECLARE
  tbl text;
  tbls text[] := ARRAY[
    'services',
    'document_requirements',
    'applications',
    'documents',
    'queue_tokens',
    'service_change_requests',
    'notifications',
    'staff_profiles',
    'counters',
    'profiles',
    'offices'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
    EXCEPTION WHEN duplicate_object THEN
      -- Table is already in the publication, ignore
      NULL;
    END;
  END LOOP;
END $$;

-- 3. Set REPLICA IDENTITY FULL on each table
-- This ensures that UPDATE and DELETE events send complete previous and current row data
ALTER TABLE public.services REPLICA IDENTITY FULL;
ALTER TABLE public.document_requirements REPLICA IDENTITY FULL;
ALTER TABLE public.applications REPLICA IDENTITY FULL;
ALTER TABLE public.documents REPLICA IDENTITY FULL;
ALTER TABLE public.queue_tokens REPLICA IDENTITY FULL;
ALTER TABLE public.service_change_requests REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.staff_profiles REPLICA IDENTITY FULL;
ALTER TABLE public.counters REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.offices REPLICA IDENTITY FULL;

-- 4. Verification Query: Confirm tables are added to supabase_realtime
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
