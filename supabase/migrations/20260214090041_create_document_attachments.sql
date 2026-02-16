/*
  # Document Attachments System

  1. New Tables
    - `attachments`
      - `id` (uuid, primary key)
      - `uploaded_by` (uuid, references profiles) - Who uploaded the file
      - `entity_type` (text) - Type of entity (job, quote, invoice, service_request, etc.)
      - `entity_id` (uuid) - ID of the entity
      - `file_name` (text) - Original file name
      - `file_size` (integer) - File size in bytes
      - `file_type` (text) - MIME type
      - `storage_path` (text) - Path in storage bucket
      - `description` (text) - Optional description
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `attachments` table
    - Add policies for authenticated users to manage attachments
    - Admins can view/manage all attachments
    - Customers can view attachments for their own entities
    - Crew can view attachments for jobs they're assigned to

  3. Indexes
    - Index on entity_type and entity_id for fast lookups
    - Index on uploaded_by for user's uploads
*/

CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  file_type text NOT NULL,
  storage_path text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all attachments"
  ON attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view their own uploads"
  ON attachments FOR SELECT
  TO authenticated
  USING (uploaded_by = auth.uid());

CREATE POLICY "Customers can view attachments for their entities"
  ON attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'customer'
      AND (
        (entity_type = 'job' AND entity_id IN (
          SELECT id FROM jobs WHERE customer_id = auth.uid()
        ))
        OR (entity_type = 'invoice' AND entity_id IN (
          SELECT id FROM invoices WHERE customer_id = auth.uid()
        ))
        OR (entity_type = 'quote' AND entity_id IN (
          SELECT q.id FROM quotes q
          INNER JOIN service_requests sr ON q.service_request_id = sr.id
          WHERE sr.customer_id = auth.uid()
        ))
        OR (entity_type = 'service_request' AND entity_id IN (
          SELECT id FROM service_requests WHERE customer_id = auth.uid()
        ))
      )
    )
  );

CREATE POLICY "Crew can view attachments for their jobs"
  ON attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'crew'
      AND entity_type = 'job'
      AND entity_id IN (
        SELECT id FROM jobs WHERE auth.uid() = ANY(assigned_crew_ids)
      )
    )
  );

CREATE POLICY "Authenticated users can upload attachments"
  ON attachments FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can update their own attachments"
  ON attachments FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Admins can delete any attachment"
  ON attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can delete their own attachments"
  ON attachments FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by ON attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON attachments(created_at DESC);
