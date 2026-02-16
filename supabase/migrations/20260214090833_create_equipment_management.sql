/*
  # Equipment & Vehicle Management System

  1. New Tables
    - `equipment`
      - `id` (uuid, primary key)
      - `name` (text) - Equipment name/identifier
      - `type` (text) - vehicle, tool, equipment
      - `category` (text) - truck, van, dolly, tools, etc.
      - `make_model` (text) - For vehicles
      - `year` (integer) - For vehicles
      - `license_plate` (text) - For vehicles
      - `vin` (text) - For vehicles
      - `serial_number` (text) - For equipment
      - `purchase_date` (date)
      - `purchase_price` (numeric)
      - `status` (text) - available, in_use, maintenance, retired
      - `condition` (text) - excellent, good, fair, poor
      - `notes` (text)
      - `photo_url` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `equipment_maintenance`
      - `id` (uuid, primary key)
      - `equipment_id` (uuid, references equipment)
      - `maintenance_type` (text) - routine, repair, inspection
      - `description` (text)
      - `date` (date)
      - `cost` (numeric)
      - `performed_by` (text) - Vendor or person
      - `next_due_date` (date)
      - `notes` (text)
      - `recorded_by` (uuid, references profiles)
      - `created_at` (timestamptz)

    - `job_equipment`
      - `id` (uuid, primary key)
      - `job_id` (uuid, references jobs)
      - `equipment_id` (uuid, references equipment)
      - `assigned_at` (timestamptz)
      - `returned_at` (timestamptz)
      - `condition_out` (text)
      - `condition_in` (text)
      - `notes` (text)

    - `inventory_items`
      - `id` (uuid, primary key)
      - `name` (text)
      - `category` (text) - supplies, materials, safety_equipment
      - `description` (text)
      - `quantity` (integer)
      - `unit` (text) - box, roll, each, etc.
      - `reorder_level` (integer)
      - `reorder_quantity` (integer)
      - `cost_per_unit` (numeric)
      - `location` (text)
      - `last_restocked` (date)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Admins can manage all equipment and inventory
    - Crew can view equipment assigned to their jobs

  3. Indexes
    - Index on status for availability queries
    - Index on job_id for equipment assignments
    - Index on equipment type and category
*/

CREATE TABLE IF NOT EXISTS equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('vehicle', 'tool', 'equipment')),
  category text NOT NULL,
  make_model text DEFAULT '',
  year integer,
  license_plate text DEFAULT '',
  vin text DEFAULT '',
  serial_number text DEFAULT '',
  purchase_date date,
  purchase_price numeric(10, 2) DEFAULT 0,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
  condition text DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
  notes text DEFAULT '',
  photo_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  maintenance_type text NOT NULL CHECK (maintenance_type IN ('routine', 'repair', 'inspection', 'other')),
  description text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  cost numeric(10, 2) DEFAULT 0,
  performed_by text DEFAULT '',
  next_due_date date,
  notes text DEFAULT '',
  recorded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  returned_at timestamptz,
  condition_out text DEFAULT 'good',
  condition_in text,
  notes text DEFAULT ''
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('supplies', 'materials', 'safety_equipment', 'cleaning', 'packing', 'other')),
  description text DEFAULT '',
  quantity integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'each',
  reorder_level integer DEFAULT 10,
  reorder_quantity integer DEFAULT 50,
  cost_per_unit numeric(10, 2) DEFAULT 0,
  location text DEFAULT '',
  last_restocked date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all equipment"
  ON equipment FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Crew can view available equipment"
  ON equipment FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'crew'
    )
  );

CREATE POLICY "Admins can manage equipment"
  ON equipment FOR ALL
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

CREATE POLICY "Admins can view maintenance records"
  ON equipment_maintenance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage maintenance records"
  ON equipment_maintenance FOR ALL
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

CREATE POLICY "Admins can view job equipment"
  ON job_equipment FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Crew can view equipment for their jobs"
  ON job_equipment FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_equipment.job_id
      AND auth.uid() = ANY(jobs.assigned_crew_ids)
    )
  );

CREATE POLICY "Admins can manage job equipment"
  ON job_equipment FOR ALL
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

CREATE POLICY "Admins can view inventory"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage inventory"
  ON inventory_items FOR ALL
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

CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(type, category);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_equipment ON equipment_maintenance(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_date ON equipment_maintenance(date DESC);
CREATE INDEX IF NOT EXISTS idx_job_equipment_job ON job_equipment(job_id);
CREATE INDEX IF NOT EXISTS idx_job_equipment_equipment ON job_equipment(equipment_id);
CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON inventory_items(quantity) WHERE quantity <= reorder_level;
