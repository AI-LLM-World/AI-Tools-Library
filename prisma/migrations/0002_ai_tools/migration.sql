-- Migration: Add tools, submissions, and submissions_audit tables for AI Tools
-- Idempotent where possible; suitable for Postgres

-- tools: published catalog
CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  short_description TEXT,
  website TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}', -- normalized lower-case expected from application
  example_use TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  search_vector tsvector
);

-- submissions: incoming submissions pending review
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  short_description TEXT,
  website TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  example_use TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by TEXT,
  review_notes TEXT
);

-- submissions_audit: simple audit log for submission actions
CREATE TABLE IF NOT EXISTS submissions_audit (
  id BIGSERIAL PRIMARY KEY,
  submission_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tools_search_vector ON tools USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_tools_tags_gin ON tools USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_tools_category_lower ON tools (lower(category));
CREATE INDEX IF NOT EXISTS idx_tools_name_lower ON tools (lower(name));

-- Trigger function to keep search_vector up-to-date for tools
CREATE OR REPLACE FUNCTION update_tools_search_vector() RETURNS trigger AS $$
begin
  new.search_vector := to_tsvector('english', coalesce(new.name,'') || ' ' || coalesce(new.short_description,'') || ' ' || coalesce(new.example_use,''));
  return new;
end
$$ LANGUAGE plpgsql;

-- Attach trigger (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tools_search_vector') THEN
    CREATE TRIGGER trg_tools_search_vector
      BEFORE INSERT OR UPDATE ON tools
      FOR EACH ROW EXECUTE FUNCTION update_tools_search_vector();
  END IF;
END$$;

-- Note: this migration uses plain tsvector + trigger so it is compatible
-- with older Postgres versions. If your Postgres supports GENERATED
-- columns, consider using a GENERATED column for search_vector instead.
