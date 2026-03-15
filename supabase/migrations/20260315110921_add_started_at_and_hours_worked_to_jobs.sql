/*
  # Add started_at to jobs and hours_worked to time_entries

  ## Summary
  Two small schema additions that support correct operational tracking:

  1. `jobs.started_at` — timestamp set when an admin marks a job as "In Progress".
     Gives real-time visibility into which jobs are actively being worked.

  2. `time_entries.hours_worked` — numeric column populated at clock-out time
     by calculating the difference between clock_out_time and clock_in_time.
     This value is summed by ManageJobs when creating invoices to populate
     the labour line item.

  ## New Columns
  - `jobs.started_at` (timestamptz, nullable) — set when job transitions to in_progress
  - `time_entries.hours_worked` (numeric, nullable) — calculated hours; populated on clock-out
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN started_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_entries' AND column_name = 'hours_worked'
  ) THEN
    ALTER TABLE time_entries ADD COLUMN hours_worked numeric;
  END IF;
END $$;
