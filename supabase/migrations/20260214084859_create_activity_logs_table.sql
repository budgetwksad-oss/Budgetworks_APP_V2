/*
  # Create Activity Logs Table

  1. New Tables
    - activity_logs
      - id (uuid, primary key)
      - user_id (uuid, foreign key to profiles) - User who performed the action
      - action (text) - Action performed (created, updated, deleted, etc.)
      - resource_type (text) - Type of resource affected (job, quote, invoice, etc.)
      - resource_id (uuid) - ID of the affected resource
      - description (text) - Human-readable description of the action
      - metadata (jsonb) - Additional data about the action
      - ip_address (text) - IP address of the user
      - created_at (timestamptz) - Timestamp of the action

  2. Security
    - Enable RLS on activity_logs table
    - Add policy for admins to view all activity logs
    - Add policy for authenticated users to create activity logs
    - Add policy for users to view their own activity logs

  3. Notes
    - Activity logs provide an audit trail for important actions
    - Helps track changes and troubleshoot issues
    - Can be used for compliance and security monitoring
    - Automatically captures user actions throughout the system
*/

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view their own activity logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can create activity logs"
  ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_id ON activity_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
