/*
  # Recurring Jobs System

  1. New Tables
    - `recurring_jobs`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references profiles)
      - `service_type` (text)
      - `location_address` (text)
      - `frequency` (text) - weekly, biweekly, monthly, quarterly
      - `day_of_week` (integer) - 0-6 for weekly/biweekly
      - `day_of_month` (integer) - 1-31 for monthly
      - `start_date` (date) - When to start generating jobs
      - `end_date` (date) - When to stop (null for ongoing)
      - `time_of_day` (time) - Preferred time
      - `assigned_crew_ids` (uuid[]) - Default crew assignment
      - `line_items` (jsonb) - Pricing structure
      - `notes` (text)
      - `is_active` (boolean)
      - `last_generated_date` (date) - Last time a job was generated
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `recurring_jobs` table
    - Admins can manage all recurring jobs
    - Customers can view their own recurring jobs

  3. Indexes
    - Index on customer_id
    - Index on is_active and start_date for job generation queries
*/

CREATE TABLE IF NOT EXISTS recurring_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_type text NOT NULL CHECK (service_type IN ('moving', 'junk_removal', 'demolition')),
  location_address text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly')),
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month integer CHECK (day_of_month >= 1 AND day_of_month <= 31),
  start_date date NOT NULL,
  end_date date,
  time_of_day time,
  assigned_crew_ids uuid[] DEFAULT '{}',
  line_items jsonb DEFAULT '[]',
  notes text DEFAULT '',
  is_active boolean DEFAULT true,
  last_generated_date date,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE recurring_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all recurring jobs"
  ON recurring_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Customers can view their own recurring jobs"
  ON recurring_jobs FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid()
  );

CREATE POLICY "Admins can create recurring jobs"
  ON recurring_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update recurring jobs"
  ON recurring_jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete recurring jobs"
  ON recurring_jobs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_recurring_jobs_customer ON recurring_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_recurring_jobs_active ON recurring_jobs(is_active, start_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_recurring_jobs_generation ON recurring_jobs(is_active, last_generated_date) WHERE is_active = true;
