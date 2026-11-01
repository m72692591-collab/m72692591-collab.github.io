-- Apply ONCE to an existing v1 database before enabling the v2 receiver.
-- Inspect SHOW COLUMNS / SHOW INDEX and take a verified backup first.
-- Fresh installs already contain these columns in lead_schema.sql; do not apply twice.
-- This file is not executed automatically and does not modify a live database by itself.
ALTER TABLE maestro_leads
  ADD COLUMN request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD COLUMN request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD UNIQUE KEY uq_request_id (request_id);
-- Existing records retain NULL identifiers and are preserved.
-- Never reuse CI credentials or expose this schema endpoint on a public site.
