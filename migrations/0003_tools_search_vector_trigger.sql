-- Migration: create trigger to maintain tools.search_vector

BEGIN;

-- Create function if not exists to update search_vector
CREATE OR REPLACE FUNCTION tools_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', coalesce(NEW.name,'') || ' ' || coalesce(NEW.short_description,'') || ' ' || coalesce(NEW.example_use,''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to update search_vector on INSERT or UPDATE
DROP TRIGGER IF EXISTS trg_tools_search_vector_update ON tools;
CREATE TRIGGER trg_tools_search_vector_update
BEFORE INSERT OR UPDATE ON tools
FOR EACH ROW EXECUTE PROCEDURE tools_search_vector_update();

COMMIT;
