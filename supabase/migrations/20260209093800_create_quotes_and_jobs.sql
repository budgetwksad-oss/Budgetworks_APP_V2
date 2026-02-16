/*
  # Create Quotes and Jobs Tables
  
  1. New Tables
    - `quotes`
      - `id` (uuid, primary key)
      - `service_request_id` (uuid, references service_requests)
      - `quote_number` (text, unique, auto-generated)
      - `line_items` (jsonb) - array of {description, quantity, unit_price, total}
      - `subtotal` (numeric)
      - `tax_rate` (numeric) - e.g., 0.13 for 13%
      - `tax_amount` (numeric)
      - `total_amount` (numeric)
      - `valid_until` (date)
      - `notes` (text)
      - `status` (text) - sent, accepted, declined, expired
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `jobs`
      - `id` (uuid, primary key)
      - `quote_id` (uuid, references quotes)
      - `service_request_id` (uuid, references service_requests)
      - `customer_id` (uuid, references profiles)
      - `status` (text) - scheduled, in_progress, completed, cancelled
      - `scheduled_date` (date)
      - `scheduled_time` (time)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Customers can read their own quotes and jobs
    - Admins can create, read, and update all quotes and jobs
    
  3. Functions
    - Auto-generate quote numbers in format QT-YYYYMMDD-XXXX
*/

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  quote_number text UNIQUE NOT NULL,
  line_items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric(10, 2) NOT NULL DEFAULT 0,
  tax_rate numeric(5, 4) NOT NULL DEFAULT 0,
  tax_amount numeric(10, 2) NOT NULL DEFAULT 0,
  total_amount numeric(10, 2) NOT NULL DEFAULT 0,
  valid_until date NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'accepted', 'declined', 'expired')),
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  service_request_id uuid NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_date date,
  scheduled_time time,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Quotes policies

-- Policy: Customers can read their own quotes
CREATE POLICY "Customers can read own quotes"
  ON quotes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_requests
      WHERE service_requests.id = quotes.service_request_id
      AND service_requests.customer_id = auth.uid()
    )
  );

-- Policy: Admins can read all quotes
CREATE POLICY "Admins can read all quotes"
  ON quotes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can create quotes
CREATE POLICY "Admins can create quotes"
  ON quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can update quotes
CREATE POLICY "Admins can update quotes"
  ON quotes
  FOR UPDATE
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

-- Policy: Customers can update their own quotes (accept/decline)
CREATE POLICY "Customers can update own quotes"
  ON quotes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_requests
      WHERE service_requests.id = quotes.service_request_id
      AND service_requests.customer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_requests
      WHERE service_requests.id = quotes.service_request_id
      AND service_requests.customer_id = auth.uid()
    )
  );

-- Jobs policies

-- Policy: Customers can read their own jobs
CREATE POLICY "Customers can read own jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

-- Policy: Crew can read assigned jobs
CREATE POLICY "Crew can read assigned jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'crew'
    )
  );

-- Policy: Admins can read all jobs
CREATE POLICY "Admins can read all jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can create jobs
CREATE POLICY "Admins can create jobs"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can update jobs
CREATE POLICY "Admins can update jobs"
  ON jobs
  FOR UPDATE
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

-- Create triggers for updated_at
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS text AS $$
DECLARE
  today_date text;
  sequence_num integer;
  new_quote_number text;
BEGIN
  today_date := to_char(now(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 13) AS integer)), 0) + 1
  INTO sequence_num
  FROM quotes
  WHERE quote_number LIKE 'QT-' || today_date || '-%';
  
  new_quote_number := 'QT-' || today_date || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN new_quote_number;
END;
$$ LANGUAGE plpgsql;