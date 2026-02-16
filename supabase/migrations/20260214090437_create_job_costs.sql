/*
  # Job Cost Tracking System

  1. New Tables
    - `job_costs`
      - `id` (uuid, primary key)
      - `job_id` (uuid, references jobs)
      - `cost_type` (text) - labor, materials, equipment, other
      - `description` (text)
      - `amount` (numeric)
      - `quantity` (numeric) - For materials/equipment
      - `unit_price` (numeric) - Price per unit
      - `vendor` (text) - For materials/equipment
      - `receipt_url` (text) - Link to receipt/invoice
      - `notes` (text)
      - `recorded_by` (uuid, references profiles)
      - `recorded_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Add columns to jobs table
    - `quoted_amount` (numeric) - Original quote amount
    - `actual_cost` (numeric) - Sum of all costs
    - `profit_margin` (numeric) - Calculated profit

  3. Security
    - Enable RLS on `job_costs` table
    - Only admins can view and manage job costs

  4. Indexes
    - Index on job_id for fast lookups
    - Index on cost_type for reporting
*/

CREATE TABLE IF NOT EXISTS job_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  cost_type text NOT NULL CHECK (cost_type IN ('labor', 'materials', 'equipment', 'fuel', 'disposal', 'other')),
  description text NOT NULL,
  amount numeric(10, 2) NOT NULL DEFAULT 0,
  quantity numeric(10, 2) DEFAULT 1,
  unit_price numeric(10, 2) DEFAULT 0,
  vendor text DEFAULT '',
  receipt_url text DEFAULT '',
  notes text DEFAULT '',
  recorded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  recorded_at date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE job_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all job costs"
  ON job_costs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create job costs"
  ON job_costs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update job costs"
  ON job_costs FOR UPDATE
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

CREATE POLICY "Admins can delete job costs"
  ON job_costs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'quoted_amount'
  ) THEN
    ALTER TABLE jobs ADD COLUMN quoted_amount numeric(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'actual_cost'
  ) THEN
    ALTER TABLE jobs ADD COLUMN actual_cost numeric(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'profit_margin'
  ) THEN
    ALTER TABLE jobs ADD COLUMN profit_margin numeric(10, 2) DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_job_costs_job ON job_costs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_costs_type ON job_costs(cost_type);
CREATE INDEX IF NOT EXISTS idx_job_costs_date ON job_costs(recorded_at DESC);

CREATE OR REPLACE FUNCTION update_job_cost_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE jobs
  SET actual_cost = (
    SELECT COALESCE(SUM(amount), 0)
    FROM job_costs
    WHERE job_id = COALESCE(NEW.job_id, OLD.job_id)
  ),
  profit_margin = quoted_amount - (
    SELECT COALESCE(SUM(amount), 0)
    FROM job_costs
    WHERE job_id = COALESCE(NEW.job_id, OLD.job_id)
  )
  WHERE id = COALESCE(NEW.job_id, OLD.job_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_job_costs ON job_costs;

CREATE TRIGGER trigger_update_job_costs
AFTER INSERT OR UPDATE OR DELETE ON job_costs
FOR EACH ROW
EXECUTE FUNCTION update_job_cost_totals();
