/*
  # Team Messaging System

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, references profiles)
      - `recipient_id` (uuid, references profiles) - For direct messages
      - `job_id` (uuid, references jobs) - For job-related messages
      - `message_type` (text) - direct, job, broadcast
      - `subject` (text) - Optional subject line
      - `content` (text) - Message content
      - `read` (boolean) - Whether message has been read
      - `read_at` (timestamptz) - When it was read
      - `parent_id` (uuid) - For threaded conversations
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `message_attachments`
      - `id` (uuid, primary key)
      - `message_id` (uuid, references messages)
      - `file_name` (text)
      - `file_url` (text)
      - `file_type` (text)
      - `file_size` (integer)
      - `created_at` (timestamptz)

    - `communication_log`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references profiles)
      - `initiated_by` (uuid, references profiles)
      - `communication_type` (text) - email, sms, phone, in_person, message
      - `direction` (text) - inbound, outbound
      - `subject` (text)
      - `content` (text)
      - `status` (text) - sent, delivered, failed, read
      - `related_entity_type` (text) - job, quote, invoice, service_request
      - `related_entity_id` (uuid)
      - `metadata` (jsonb) - Additional data (phone number, email address, etc.)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can view messages they sent or received
    - Users can view job messages for jobs they're assigned to
    - Admins can view all communications

  3. Indexes
    - Index on sender_id and recipient_id for fast lookups
    - Index on job_id for job-related messages
    - Index on read status for unread counts
    - Index on customer_id for communication history
*/

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  message_type text NOT NULL DEFAULT 'direct' CHECK (message_type IN ('direct', 'job', 'broadcast')),
  subject text DEFAULT '',
  content text NOT NULL,
  read boolean DEFAULT false,
  read_at timestamptz,
  parent_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS communication_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  initiated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  communication_type text NOT NULL CHECK (communication_type IN ('email', 'sms', 'phone', 'in_person', 'message')),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject text DEFAULT '',
  content text DEFAULT '',
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'read', 'responded')),
  related_entity_type text,
  related_entity_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages they sent"
  ON messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Users can view messages sent to them"
  ON messages FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can view job messages for their jobs"
  ON messages FOR SELECT
  TO authenticated
  USING (
    job_id IN (
      SELECT id FROM jobs
      WHERE customer_id = auth.uid()
      OR auth.uid() = ANY(assigned_crew_ids)
    )
  );

CREATE POLICY "Admins can view all messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid())
  WITH CHECK (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can view message attachments"
  ON message_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages
      WHERE messages.id = message_attachments.message_id
      AND (messages.sender_id = auth.uid() OR messages.recipient_id = auth.uid())
    )
  );

CREATE POLICY "Users can upload attachments to their messages"
  ON message_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages
      WHERE messages.id = message_attachments.message_id
      AND messages.sender_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all communication logs"
  ON communication_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Customers can view their communication log"
  ON communication_log FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Admins can create communication logs"
  ON communication_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update communication logs"
  ON communication_log FOR UPDATE
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

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_job ON messages(job_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_communication_log_customer ON communication_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_communication_log_date ON communication_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_log_entity ON communication_log(related_entity_type, related_entity_id);
