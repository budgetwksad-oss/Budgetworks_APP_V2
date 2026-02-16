/*
  # Add Scheduling and Staffing to Jobs
  
  1. New Columns
    - `arrival_window_start` (time) - start of arrival time window
    - `arrival_window_end` (time) - end of arrival time window
    - `staffing_needs` (jsonb) - required staff like {drivers: 1, helpers: 2}
    - `crew_assignments` (jsonb) - array of assignments like [{user_id: uuid, role: 'driver', claimed_at: timestamp, assigned_by: uuid}]
    - `is_open_for_claims` (boolean) - whether crew can self-assign
    - `staffing_status` (text) - 'unstaffed', 'partially_staffed', 'fully_staffed'
  
  2. Notes
    - Admin can manually assign crew or open job for claims
    - Crew can claim available positions when job is open
    - Staffing status auto-calculated based on needs vs assignments
*/

-- Add new columns to jobs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'arrival_window_start'
  ) THEN
    ALTER TABLE jobs ADD COLUMN arrival_window_start time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'arrival_window_end'
  ) THEN
    ALTER TABLE jobs ADD COLUMN arrival_window_end time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'staffing_needs'
  ) THEN
    ALTER TABLE jobs ADD COLUMN staffing_needs jsonb DEFAULT '{"drivers": 0, "helpers": 0}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'crew_assignments'
  ) THEN
    ALTER TABLE jobs ADD COLUMN crew_assignments jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'is_open_for_claims'
  ) THEN
    ALTER TABLE jobs ADD COLUMN is_open_for_claims boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'staffing_status'
  ) THEN
    ALTER TABLE jobs ADD COLUMN staffing_status text DEFAULT 'unstaffed';
  END IF;
END $$;

-- Policy: Crew can view jobs that are open for claims
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'jobs' AND policyname = 'Crew can view open jobs'
  ) THEN
    CREATE POLICY "Crew can view open jobs"
      ON jobs
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'crew'
        ) AND (
          is_open_for_claims = true 
          OR auth.uid() = ANY(assigned_crew_ids)
        )
      );
  END IF;
END $$;

-- Policy: Crew can claim jobs (update to add themselves to assignments)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'jobs' AND policyname = 'Crew can claim open positions'
  ) THEN
    CREATE POLICY "Crew can claim open positions"
      ON jobs
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'crew'
        ) AND is_open_for_claims = true
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'crew'
        ) AND is_open_for_claims = true
      );
  END IF;
END $$;