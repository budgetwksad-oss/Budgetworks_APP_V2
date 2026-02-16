/*
  # Update Jobs Table for Photos and Crew
  
  1. Changes
    - Add `photos_urls` (text array) - photos uploaded by crew
    - Add `assigned_crew_ids` (uuid array) - crew members assigned to job
    - Add `completion_notes` (text) - notes from crew upon completion
    - Add `completed_at` (timestamptz) - when the job was completed
  
  2. Notes
    - Photos can be uploaded during or after job completion
    - Crew members can be assigned to jobs
*/

-- Add new columns to jobs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'photos_urls'
  ) THEN
    ALTER TABLE jobs ADD COLUMN photos_urls text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'assigned_crew_ids'
  ) THEN
    ALTER TABLE jobs ADD COLUMN assigned_crew_ids uuid[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'completion_notes'
  ) THEN
    ALTER TABLE jobs ADD COLUMN completion_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN completed_at timestamptz;
  END IF;
END $$;

-- Policy: Crew can update jobs they're assigned to
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'jobs' AND policyname = 'Crew can update assigned jobs'
  ) THEN
    CREATE POLICY "Crew can update assigned jobs"
      ON jobs
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'crew'
          AND auth.uid() = ANY(jobs.assigned_crew_ids)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'crew'
          AND auth.uid() = ANY(jobs.assigned_crew_ids)
        )
      );
  END IF;
END $$;