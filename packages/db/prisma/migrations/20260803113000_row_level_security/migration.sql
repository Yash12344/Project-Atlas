-- Row-level security: the tenant isolation boundary.
--
-- Application code filters by organization_id as a matter of course, but a
-- forgotten WHERE clause in a shared-schema system is a cross-tenant data
-- breach. These policies make the database refuse to serve rows outside the
-- caller's tenant, so the worst case of that bug is an empty result set.
--
-- The runtime connects as atlas_app, which holds neither SUPERUSER nor
-- BYPASSRLS. FORCE ROW LEVEL SECURITY is applied as well so the policies bind
-- even when a connection is made as the table owner.
--
-- Context is carried in two transaction-local GUCs, set by the tenant-scoped
-- client in src/tenant.ts:
--   app.current_organization_id  -- the tenant being acted upon
--   app.current_user_id          -- the acting user
-- current_setting(..., true) returns NULL when unset, and NULL comparisons are
-- never true, so an unscoped connection sees nothing. The design fails closed.

-- ---------------------------------------------------------------------------
-- Helper accessors. Marked STABLE so the planner may cache them per statement.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_current_organization_id() RETURNS text
  LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('app.current_organization_id', TRUE), '') $$;

CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS text
  LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('app.current_user_id', TRUE), '') $$;

-- ---------------------------------------------------------------------------
-- organizations: a tenant may only see and modify itself.
-- ---------------------------------------------------------------------------
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" FORCE ROW LEVEL SECURITY;

CREATE POLICY organizations_tenant_read ON "organizations"
  FOR SELECT USING (id = app_current_organization_id());

CREATE POLICY organizations_tenant_write ON "organizations"
  FOR UPDATE USING (id = app_current_organization_id())
  WITH CHECK (id = app_current_organization_id());

CREATE POLICY organizations_tenant_delete ON "organizations"
  FOR DELETE USING (id = app_current_organization_id());

-- ---------------------------------------------------------------------------
-- memberships: visible within the tenant, plus a user's own rows.
--
-- The self-scope policy exists because "which organizations do I belong to?"
-- is a legitimate cross-tenant read that happens before any tenant is chosen —
-- at login, and on the organization switcher. Permissive policies OR together,
-- so a user sees their own memberships everywhere and all memberships inside
-- the tenant they are currently acting in.
-- ---------------------------------------------------------------------------
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" FORCE ROW LEVEL SECURITY;

CREATE POLICY memberships_tenant_read ON "memberships"
  FOR SELECT USING (organization_id = app_current_organization_id());

CREATE POLICY memberships_self_read ON "memberships"
  FOR SELECT USING (user_id = app_current_user_id());

-- Writes are tenant-scoped only. A user may not grant themselves membership
-- of an organization they are not already acting within.
CREATE POLICY memberships_tenant_insert ON "memberships"
  FOR INSERT WITH CHECK (organization_id = app_current_organization_id());

CREATE POLICY memberships_tenant_update ON "memberships"
  FOR UPDATE USING (organization_id = app_current_organization_id())
  WITH CHECK (organization_id = app_current_organization_id());

CREATE POLICY memberships_tenant_delete ON "memberships"
  FOR DELETE USING (organization_id = app_current_organization_id());

-- ---------------------------------------------------------------------------
-- invitations: strictly tenant-scoped.
--
-- Accepting an invitation is deliberately not covered by a self-scope policy:
-- the acceptance path looks the invitation up by token hash using the
-- privileged system client, because the invitee is by definition not yet a
-- member and therefore has no tenant context.
-- ---------------------------------------------------------------------------
ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitations" FORCE ROW LEVEL SECURITY;

CREATE POLICY invitations_tenant_read ON "invitations"
  FOR SELECT USING (organization_id = app_current_organization_id());

CREATE POLICY invitations_tenant_insert ON "invitations"
  FOR INSERT WITH CHECK (organization_id = app_current_organization_id());

CREATE POLICY invitations_tenant_update ON "invitations"
  FOR UPDATE USING (organization_id = app_current_organization_id())
  WITH CHECK (organization_id = app_current_organization_id());

CREATE POLICY invitations_tenant_delete ON "invitations"
  FOR DELETE USING (organization_id = app_current_organization_id());

-- ---------------------------------------------------------------------------
-- audit_logs: readable within the tenant, append-only.
--
-- No UPDATE or DELETE policy is defined, so those operations are denied for
-- every caller subject to RLS. An audit trail that the application can rewrite
-- is not an audit trail.
-- ---------------------------------------------------------------------------
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_tenant_read ON "audit_logs"
  FOR SELECT USING (organization_id = app_current_organization_id());

CREATE POLICY audit_logs_tenant_insert ON "audit_logs"
  FOR INSERT WITH CHECK (organization_id = app_current_organization_id());

-- ---------------------------------------------------------------------------
-- Data integrity that the ORM cannot express.
-- ---------------------------------------------------------------------------

-- At most one pending invitation per email per organization. A partial unique
-- index is used rather than a plain composite unique so that a revoked or
-- accepted invitation does not block re-inviting the same person.
CREATE UNIQUE INDEX invitations_one_pending_per_email
  ON "invitations" (organization_id, lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- Case-insensitive uniqueness for user emails. The application lowercases on
-- the way in; this stops a direct database write from creating `A@b.com`
-- alongside `a@b.com`.
CREATE UNIQUE INDEX users_email_lower_unique ON "users" (lower(email));

-- Every organization must keep at least one owner. Enforced in the application
-- (see packages/core/src/organizations), because the check spans rows and a
-- constraint cannot express it without a trigger that would fire on every
-- membership write.

-- ---------------------------------------------------------------------------
-- Grants for the runtime role.
--
-- atlas_app gets DML only. It cannot create, alter, or drop anything, so a
-- compromised application credential cannot disable the policies above.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'atlas_app') THEN
    GRANT USAGE ON SCHEMA public TO atlas_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO atlas_app;
    GRANT EXECUTE ON FUNCTION app_current_organization_id() TO atlas_app;
    GRANT EXECUTE ON FUNCTION app_current_user_id() TO atlas_app;
  END IF;
END
$$;
