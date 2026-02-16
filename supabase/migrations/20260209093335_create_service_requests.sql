/*
  # Create Service Requests Table
  
  1. New Tables
    - `service_requests`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references profiles)
      - `service_type` (text) - moving, junk_removal, demolition
      - `location_address` (text, not null)
      - `preferred_date` (date)
      - `contact_phone` (text)
      - `description` (text)
      - `photos_urls` (text array) - array of photo URLs
      - `status` (text) - pending, quoted, accepted, scheduled, completed, cancelled
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `service_requests` table
    - Customers can create and read their own requests
    - Admins can read all requests and update them
    
  3. Storage Bucket
    - Create public bucket for service request photos
    - Allow authenticated users to upload
*/

-- Create service_requests table
CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_type text NOT NULL CHECK (service_type IN ('moving', 'junk_removal', 'demolition')),
  location_address text NOT NULL,
  preferred_date date,
  contact_phone text,
  description text,
  photos_urls text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'accepted', 'scheduled', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can create their own requests
CREATE POLICY "Customers can create own requests"
  ON service_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

-- Policy: Customers can read their own requests
CREATE POLICY "Customers can read own requests"
  ON service_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

-- Policy: Admins can read all requests
CREATE POLICY "Admins can read all requests"
  ON service_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can update all requests
CREATE POLICY "Admins can update all requests"
  ON service_requests
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

-- Create trigger for service_requests table
CREATE TRIGGER update_service_requests_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for service request photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-photos', 'service-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Authenticated users can upload photos
CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'service-photos');

-- Storage policy: Anyone can view photos (public bucket)
CREATE POLICY "Anyone can view photos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'service-photos');