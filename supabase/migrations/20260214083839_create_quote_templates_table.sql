/*
  # Create Quote Templates Table

  1. New Tables
    - quote_templates
      - id (uuid, primary key)
      - name (text) - Template name/title
      - description (text) - Template description
      - service_type (text) - Service type this template is for
      - line_items (jsonb) - Array of line items with descriptions, quantities, and prices
      - tax_rate (numeric) - Default tax rate for this template
      - notes (text) - Default notes to include in quotes
      - is_active (boolean) - Whether template is currently active
      - created_by (uuid, foreign key to profiles) - Admin who created the template
      - created_at (timestamptz) - Creation timestamp
      - updated_at (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on quote_templates table
    - Add policy for admins to create templates
    - Add policy for admins to view all templates
    - Add policy for admins to update templates
    - Add policy for admins to delete templates

  3. Notes
    - Templates help admins quickly generate quotes for common services
    - Line items include description, quantity, unit_price, and can be edited when used
    - Supports all service types: moving, junk_removal, demolition
*/

CREATE TABLE IF NOT EXISTS quote_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  service_type text NOT NULL CHECK (service_type IN ('moving', 'junk_removal', 'demolition')),
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  tax_rate numeric(5, 2) DEFAULT 0.00,
  notes text DEFAULT '',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can create quote templates"
  ON quote_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all quote templates"
  ON quote_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update quote templates"
  ON quote_templates
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

CREATE POLICY "Admins can delete quote templates"
  ON quote_templates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_quote_templates_service_type ON quote_templates(service_type);
CREATE INDEX IF NOT EXISTS idx_quote_templates_is_active ON quote_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_quote_templates_created_by ON quote_templates(created_by);
