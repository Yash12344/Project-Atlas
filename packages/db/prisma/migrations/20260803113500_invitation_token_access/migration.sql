-- Invitation acceptance without a tenant context.
--
-- The invitee is, by definition, not yet a member of the organization, so they
-- have no tenant context and the tenant-scoped policies deny them everything —
-- including the invitation addressed to them.
--
-- The obvious escapes are both worse than this one:
--   * A SECURITY DEFINER function would need an owner carrying BYPASSRLS,
--     since FORCE ROW LEVEL SECURITY binds even the table owner. That
--     reintroduces a role that can read every tenant's rows.
--   * Reading through the migration/owner connection puts an unauthenticated
--     code path on a privileged credential.
--
-- Instead the token itself is the authorization, expressed as a policy.
-- The caller sets `app.invitation_token_hash` transaction-locally to the
-- SHA-256 of the token they hold; the policy exposes exactly the row whose
-- stored hash matches. Knowing the token is the only way to select the row,
-- which is precisely the property an invitation link is supposed to have.
--
-- The GUC holds a hash, never the token, so the value is useless if it leaks
-- into a query log.

CREATE OR REPLACE FUNCTION app_invitation_token_hash() RETURNS text
  LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('app.invitation_token_hash', TRUE), '') $$;

-- The invitation addressed by the presented token.
CREATE POLICY invitations_token_read ON "invitations"
  FOR SELECT USING (token_hash = app_invitation_token_hash());

-- The organization that invitation belongs to, so the acceptance screen can
-- name it. The subquery is itself filtered by invitations_token_read, so this
-- exposes one organization row and only while a matching token is presented.
CREATE POLICY organizations_invitation_read ON "organizations"
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM "invitations" i
      WHERE i.organization_id = "organizations".id
        AND i.token_hash = app_invitation_token_hash()
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'atlas_app') THEN
    GRANT EXECUTE ON FUNCTION app_invitation_token_hash() TO atlas_app;
  END IF;
END
$$;
