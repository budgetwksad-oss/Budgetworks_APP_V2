/*
  # Create Testimonial Settings Table

  1. New Tables
    - `testimonial_settings`
      - `id` (uuid, primary key)
      - `is_enabled` (boolean) - Toggle testimonials section visibility
      - `rating_value` (numeric) - Display rating (e.g., 4.9)
      - `review_count` (integer) - Display review count
      - `source_label` (text) - Source label (e.g., "Google Reviews")
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `testimonial_settings` table
    - Add policy for public to read settings
    - Add policy for admins to manage settings

  3. Trigger
    - Add updated_at trigger using existing function
*/

-- Create testimonial_settings table
CREATE TABLE IF NOT EXISTS testimonial_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean DEFAULT false NOT NULL,
  rating_value numeric(2,1) CHECK (rating_value IS NULL OR (rating_value >= 0 AND rating_value <= 5)),
  review_count int CHECK (review_count IS NULL OR review_count >= 0),
  source_label text DEFAULT 'Google Reviews',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE testimonial_settings ENABLE ROW LEVEL SECURITY;

-- Public can read testimonial settings
CREATE POLICY "Public can read testimonial settings"
  ON testimonial_settings
  FOR SELECT
  TO public
  USING (true);

-- Admins can insert testimonial settings
CREATE POLICY "Admins can insert testimonial settings"
  ON testimonial_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update testimonial settings
CREATE POLICY "Admins can update testimonial settings"
  ON testimonial_settings
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

-- Admins can delete testimonial settings
CREATE POLICY "Admins can delete testimonial settings"
  ON testimonial_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_testimonial_settings_updated_at
  BEFORE UPDATE ON testimonial_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
