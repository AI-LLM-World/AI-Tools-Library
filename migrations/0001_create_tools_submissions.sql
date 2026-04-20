-- Migration: create tools, submissions, and submissions_audit tables
-- Idempotent: uses CREATE TABLE IF NOT EXISTS and conditional index creation

BEGIN;

-- tools: published catalog
CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  short_description TEXT,
  website TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  example_use TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  search_vector tsvector
);

-- Generate search_vector in application layer if Postgres version lacks GENERATED columns.

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  short_description TEXT,
  website TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  example_use TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by TEXT,
  review_notes TEXT
);

CREATE TABLE IF NOT EXISTS submissions_audit (
  id BIGSERIAL PRIMARY KEY,
  submission_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_tools_search_vector') THEN
    EXECUTE 'CREATE INDEX idx_tools_search_vector ON tools USING GIN (search_vector)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_tools_tags_gin') THEN
    EXECUTE 'CREATE INDEX idx_tools_tags_gin ON tools USING GIN (tags)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_tools_category_lower') THEN
    EXECUTE 'CREATE INDEX idx_tools_category_lower ON tools (lower(category))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_tools_name_lower') THEN
    EXECUTE 'CREATE INDEX idx_tools_name_lower ON tools (lower(name))';
  END IF;
END$$;

COMMIT;
