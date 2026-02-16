/*
  # Create Notifications Table

  1. New Tables
    - notifications
      - id (uuid, primary key)
      - user_id (uuid, foreign key to profiles) - User receiving the notification
      - type (text) - Type of notification (job_update, invoice_due, payment_received, etc.)
      - title (text) - Notification title
      - message (text) - Notification message
      - link (text) - Optional link to related resource
      - read (boolean) - Whether notification has been read
      - created_at (timestamptz) - Creation timestamp

  2. Security
    - Enable RLS on notifications table
    - Add policy for users to view their own notifications
    - Add policy for users to update their own notifications (mark as read)
    - Add policy for admins to create notifications for any user

  3. Notes
    - Notifications help users stay informed about important events
    - Can be used for job updates, payment reminders, quote responses, etc.
    - Read status allows tracking which notifications have been seen
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text DEFAULT '',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can create notifications for any user"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
