-- Migration: Make org_id nullable and add check constraint for super-admins
ALTER TABLE users ALTER COLUMN org_id DROP NOT NULL;
ALTER TABLE users ADD CONSTRAINT org_id_required_for_non_admin CHECK (
  app_role = 'admin' OR org_id IS NOT NULL
); 