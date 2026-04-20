-- Postgres schema for Phase 2
-- Uses UUID primary keys, JSONB metadata, and audit log
-- Requires the pgcrypto extension for gen_random_uuid() if DB-side generation is desired

-- Enable uuid generation (recommended to run once per DB)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Organizations
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  plan text NOT NULL DEFAULT 'free', -- minimal billing plan field; product to confirm
  quota_limits jsonb DEFAULT '{}'::jsonb, -- extensible quota/billing limits per org
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX organizations_slug_idx ON organizations (slug);

-- Users
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  password_hash text,
  role text NOT NULL DEFAULT 'member', -- enum in app layer: owner/admin/member
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
-- unique email per org
CREATE UNIQUE INDEX users_org_email_idx ON users (organization_id, lower(email));

-- Projects
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX projects_org_slug_idx ON projects (organization_id, slug);

-- Resources (generic domain object)
CREATE TABLE resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  type text NOT NULL,
  name text,
  billing_id text,
  cost_center text,
  status text NOT NULL DEFAULT 'active',
  data jsonb DEFAULT '{}'::jsonb, -- product-volatile structured data
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX resources_org_project_created_idx ON resources (organization_id, project_id, created_at DESC);
CREATE INDEX resources_org_type_idx ON resources (organization_id, type);

-- Audit / Event log (append-only)
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  resource_type text,
  resource_id uuid,
  action text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  payload jsonb DEFAULT '{}'::jsonb -- contains before/after and metadata about the event
);
CREATE INDEX audit_logs_org_res_idx ON audit_logs (organization_id, resource_type, resource_id, timestamp DESC);

-- Optional: function to update updated_at on change
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers to tables that should update updated_at
CREATE TRIGGER touch_organizations
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE PROCEDURE touch_updated_at();

CREATE TRIGGER touch_users
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE touch_updated_at();

CREATE TRIGGER touch_projects
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE PROCEDURE touch_updated_at();

CREATE TRIGGER touch_resources
BEFORE UPDATE ON resources
FOR EACH ROW EXECUTE PROCEDURE touch_updated_at();

-- Sample helper view: resource current snapshot (exclude soft-deleted)
CREATE VIEW active_resources AS
SELECT * FROM resources WHERE deleted_at IS NULL;

-- Partitioning note: if audit_logs grows large consider partitioning by time or organization

-- End of schema.sql
