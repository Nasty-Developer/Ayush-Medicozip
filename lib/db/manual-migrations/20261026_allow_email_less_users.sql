-- Safe, non-destructive change for phone-authenticated customers.
-- Apply once to the production PostgreSQL database before deploying code that
-- creates users from a verified Firebase UID without an email claim.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
