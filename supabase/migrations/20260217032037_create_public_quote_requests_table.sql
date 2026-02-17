/*
  # Create Public Quote Requests (Leads) Table

  1. New Table
    - `public_quote_requests` - Guest quote submissions before customer account creation
      - Stores contact info, service type, location, date preferences
      - Status tracking: new, in_review, quoted, closed
      - Public can INSERT, only admins can read/manage

  2. Security
    - Enable RLS on public_quote_requests
    - Allow anyone to INSERT (guest submissions)
    - Only admins can SELECT/UPDATE/DELETE
*/

-- Create public_quote_requests table
CREATE TABLE IF NOT EXISTS public_quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type text NOT NULL CHECK (service_type IN ('moving', 'junk_removal', 'demolition')),
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  preferred_contact_method text DEFAULT 'email' CHECK (preferred_contact_method IN ('sms', 'email', 'call')),
  location_address text NOT NULL,
  preferred_date date,
  description text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'quoted', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_quote_requests_status ON public_quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_public_quote_requests_created ON public_quote_requests(created_at);

-- Enable RLS
ALTER TABLE public_quote_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can INSERT (guest quote submissions)
CREATE POLICY "Anyone can submit quote requests"
  ON public_quote_requests FOR INSERT
  WITH CHECK (true);

-- Policy: Only admins can SELECT
CREATE POLICY "Admins can read all quote requests"
  ON public_quote_requests FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- Policy: Only admins can UPDATE
CREATE POLICY "Admins can update quote requests"
  ON public_quote_requests FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- Policy: Only admins can DELETE
CREATE POLICY "Admins can delete quote requests"
  ON public_quote_requests FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- Add updated_at trigger
CREATE TRIGGER update_public_quote_requests_updated_at
  BEFORE UPDATE ON public_quote_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();