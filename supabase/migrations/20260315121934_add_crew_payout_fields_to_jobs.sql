/*
  # Add Crew Payout Calculation Fields to Jobs

  ## Purpose
  Supports internal labor cost tracking for completed jobs.
  These values are admin-only and do not affect customer invoices.

  ## Changes to jobs table
  - `crew_hourly_rate` (numeric) — hourly rate paid per crew member
  - `number_of_crew` (integer) — number of crew members on the job
  - `job_duration_hours` (numeric) — total hours the job ran
  - `crew_cost` (numeric) — calculated as crew_hourly_rate × number_of_crew × job_duration_hours

  ## Notes
  - All fields are nullable and default to NULL/0 so existing records are unaffected
  - crew_cost is stored (not computed on the fly) so it survives rate changes
  - No RLS changes required; jobs table policies already restrict non-admins
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'crew_hourly_rate'
  ) THEN
    ALTER TABLE jobs ADD COLUMN crew_hourly_rate numeric(10, 2) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'number_of_crew'
  ) THEN
    ALTER TABLE jobs ADD COLUMN number_of_crew integer DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'job_duration_hours'
  ) THEN
    ALTER TABLE jobs ADD COLUMN job_duration_hours numeric(10, 2) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'crew_cost'
  ) THEN
    ALTER TABLE jobs ADD COLUMN crew_cost numeric(10, 2) DEFAULT NULL;
  END IF;
END $$;
