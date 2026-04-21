-- Migration: add indexes to improve admin listing and audit queries
-- This migration is idempotent and safe to run on existing DBs

BEGIN;

-- Improve admin listing (filter by status, order by created_at)
CREATE INDEX IF NOT EXISTS idx_submissions_status_created_at ON submissions (status, created_at DESC);
-- Fast order-by scans for recent submissions
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions (created_at DESC);

-- Audit lookup by submission id
CREATE INDEX IF NOT EXISTS idx_submissions_audit_submission_id ON submissions_audit (submission_id);

COMMIT;
