-- Organization visibility follows membership.
--
-- "Which organizations do I belong to?" is asked before any tenant is chosen —
-- at login and by the organization switcher — and it necessarily spans
-- tenants. The tenant-scoped read policy cannot express it, and widening that
-- policy would weaken the isolation it exists to provide.
--
-- This adds a second, independent reason a row may be read: the caller holds a
-- membership in it. Permissive policies OR together, so an organization is
-- visible when it is the active tenant *or* when the acting user is a member.
--
-- The subquery reads `memberships`, which is itself filtered by
-- memberships_self_read (user_id = app_current_user_id()). There is no
-- recursion because the memberships policies never reference organizations.
CREATE POLICY organizations_member_read ON "organizations"
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM "memberships" m
      WHERE m.organization_id = "organizations".id
        AND m.user_id = app_current_user_id()
    )
  );
