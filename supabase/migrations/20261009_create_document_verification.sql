-- Migration Script: Document Verification & Duplicate Upload Prevention
-- Date: 2026-10-09

-- 1. Ensure documents table has verification and hash columns
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS issue_date VARCHAR(20),
ADD COLUMN IF NOT EXISTS expiry_date VARCHAR(20),
ADD COLUMN IF NOT EXISTS document_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'UNVERIFIED',
ADD COLUMN IF NOT EXISTS extracted_metadata JSONB;

-- 2. Create index on user_id and file_hash for fast duplicate detection
CREATE INDEX IF NOT EXISTS idx_documents_user_hash 
ON public.documents(user_id, file_hash);

-- 3. Create index on verification status
CREATE INDEX IF NOT EXISTS idx_documents_status 
ON public.documents(verification_status);

-- 4. Audit Log Table for failed verification attempts (optional logging)
CREATE TABLE IF NOT EXISTS public.document_verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_hash VARCHAR(64),
    expected_category VARCHAR(100),
    detected_type VARCHAR(100),
    verification_status VARCHAR(30) NOT NULL,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
