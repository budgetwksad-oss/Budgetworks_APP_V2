/*
  # Add Time Tracking and Photo Support for Crew

  1. New Tables
    - `time_entries`
      - `id` (uuid, primary key)
      - `job_id` (uuid, foreign key to jobs)
      - `crew_member_id` (uuid, foreign key to profiles)
      - `clock_in` (timestamptz)
      - `clock_out` (timestamptz, nullable)
      - `hours_worked` (decimal, calculated)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Modified Tables
    - `jobs` - add `crew_photos` jsonb field for before/after photos

  3. Security
    - Enable RLS on time_entries
    - Crew can create their own time entries
    - Crew can view their own time entries
    - Crew can update only their own uncompleted time entries
    - Admin can view all time entries

  4. Notes
    - Time tracking allows crew to clock in/out per job
    - Photos stored as URLs in jsonb array with metadata
    - Hours auto-calculated when clocking out
*/

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  crew_member_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  hours_worked decimal(5,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add crew_photos to jobs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'crew_photos'
  ) THEN
    ALTER TABLE jobs ADD COLUMN crew_photos jsonb DEFAULT '{"before": [], "after": []}'::jsonb;
  END IF;
END $$;

-- Enable RLS on time_entries
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Crew can create their own time entries
CREATE POLICY "Crew can create own time entries"
  ON time_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'crew'
    ) AND crew_member_id = auth.uid()
  );

-- Policy: Crew can view their own time entries
CREATE POLICY "Crew can view own time entries"
  ON time_entries
  FOR SELECT
  TO authenticated
  USING (
    crew_member_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Crew can update their own uncompleted time entries
CREATE POLICY "Crew can update own time entries"
  ON time_entries
  FOR UPDATE
  TO authenticated
  USING (
    crew_member_id = auth.uid()
    AND clock_out IS NULL
  )
  WITH CHECK (
    crew_member_id = auth.uid()
  );

-- Policy: Admin can view all time entries
CREATE POLICY "Admin can view all time entries"
  ON time_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_time_entries_crew_member ON time_entries(crew_member_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_job ON time_entries(job_id);