-- Creating an organization is a pre-tenant operation: the tenant does not
-- exist until the statement succeeds. It still must not be a blanket
-- permission, or the runtime role could insert rows attributed to any id.
--
-- The rule is that the caller must already be scoped to the organization it is
-- creating. The application generates the id (UUIDv7, client-side), opens a
-- transaction scoped to that id, and inserts. The same transaction then writes
-- the owner membership, which the existing memberships_tenant_insert policy
-- accepts for the same reason. Either both rows land or neither does, so an
-- organization without an owner is not a reachable state.
CREATE POLICY organizations_tenant_insert ON "organizations"
  FOR INSERT WITH CHECK (id = app_current_organization_id());
