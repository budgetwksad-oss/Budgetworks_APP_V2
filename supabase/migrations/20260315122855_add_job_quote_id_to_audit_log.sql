/*
  # Add job_id and quote_id to audit_log

  ## Purpose
  Enables efficient filtering of audit log entries by specific job or quote,
  supporting the operational audit log viewer requirements.

  ## Changes to audit_log table
  - `job_id` (uuid, nullable) — foreign key reference to jobs
  - `quote_id` (uuid, nullable) — foreign key reference to quotes

  ## New indexes
  - audit_log_job_id_idx — fast lookup by job
  - audit_log_quote_id_idx — fast lookup by quote

  ## Notes
  - All existing rows will have NULL for both new columns
  - No RLS changes needed; existing admin-read policy already covers these columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_log' AND column_name = 'job_id'
  ) THEN
    ALTER TABLE audit_log ADD COLUMN job_id uuid NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_log' AND column_name = 'quote_id'
  ) THEN
    ALTER TABLE audit_log ADD COLUMN quote_id uuid NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS audit_log_job_id_idx   ON audit_log (job_id)   WHERE job_id   IS NOT NULL;
CREATE INDEX IF NOT EXISTS audit_log_quote_id_idx ON audit_log (quote_id) WHERE quote_id IS NOT NULL;
