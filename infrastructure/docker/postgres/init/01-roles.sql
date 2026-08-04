-- Runs once, on first initialisation of the data directory.
--
-- Two roles, deliberately:
--   atlas_owner  owns the schema and runs migrations. DDL only.
--   atlas_app    is what the application connects as at runtime.
--
-- atlas_app holds neither SUPERUSER nor BYPASSRLS, which is the entire basis
-- of the tenant isolation in packages/db: row-level security is only a control
-- if the role serving requests is actually subject to it. Running the app as
-- the owner — or as postgres — would silently disable every policy.
--
-- Passwords here are for local development only. Real environments inject
-- credentials from a secret manager and never read this file.

CREATE ROLE atlas_owner LOGIN PASSWORD 'atlas_owner_pw' CREATEDB;
CREATE ROLE atlas_app LOGIN PASSWORD 'atlas_app_pw';

CREATE DATABASE atlas OWNER atlas_owner;

\connect atlas

GRANT CONNECT ON DATABASE atlas TO atlas_app;
GRANT USAGE ON SCHEMA public TO atlas_app;

-- Tables created later by migrations inherit these grants automatically.
ALTER DEFAULT PRIVILEGES FOR ROLE atlas_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO atlas_app;
ALTER DEFAULT PRIVILEGES FOR ROLE atlas_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO atlas_app;
