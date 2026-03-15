/*
  # Add remaining_margin to jobs

  ## Purpose
  Stores the operational margin remaining after crew labor cost for completed jobs.
  This is purely internal and does not affect customer invoices.

  ## Formula
  remaining_margin = invoice_total - crew_cost

  ## Changes to jobs table
  - `remaining_margin` (numeric) — calculated and stored at job completion time

  ## Notes
  - Nullable; only populated for completed jobs that have both an invoice and crew_cost
  - No RLS changes needed; existing jobs policies already cover this column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'remaining_margin'
  ) THEN
    ALTER TABLE jobs ADD COLUMN remaining_margin numeric(10, 2) DEFAULT NULL;
  END IF;
END $$;
