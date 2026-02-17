/*
  # Notification System Core Tables

  ## Overview
  Comprehensive notification system with user preferences, templates, queue, and audit log.

  ## New Tables

  ### 1. `notification_preferences`
  User notification preferences by audience type and channel.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users) - The user these preferences belong to
  - `audience` (text) - User's role context: 'customer', 'crew', or 'admin'
  - `sms_enabled` (boolean) - Whether SMS notifications are enabled
  - `email_enabled` (boolean) - Whether email notifications are enabled
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - UNIQUE constraint on (user_id, audience)

  ### 2. `notification_templates`
  Templates for different notification events, audiences, channels, and service types.
  - `id` (uuid, primary key)
  - `event_key` (text) - Event identifier (e.g., 'quote_sent', 'job_assigned')
  - `audience` (text) - Target audience: 'customer', 'crew', or 'admin'
  - `channel` (text) - Communication channel: 'sms' or 'email'
  - `service_type` (text, nullable) - Specific service or NULL for generic
  - `subject` (text, nullable) - Email subject line (NULL for SMS)
  - `body` (text) - Template body with variable placeholders
  - `is_enabled` (boolean) - Whether template is active
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - UNIQUE constraint on (event_key, audience, channel, service_type)

  ### 3. `notification_queue`
  Queue of pending, sent, and failed notifications.
  - `id` (uuid, primary key)
  - `event_key` (text) - Event that triggered notification
  - `audience` (text) - Target audience type
  - `channel` (text) - Delivery channel
  - `to_email` (text, nullable) - Recipient email address
  - `to_phone` (text, nullable) - Recipient phone number
  - `payload` (jsonb) - Template variables for rendering
  - `rendered_subject` (text, nullable) - Rendered email subject
  - `rendered_body` (text) - Rendered message body
  - `status` (text) - Current status: 'pending', 'sent', 'failed', 'cancelled'
  - `error` (text, nullable) - Error message if failed
  - `attempts` (int) - Number of send attempts
  - `scheduled_for` (timestamptz) - When to send the notification
  - `created_at` (timestamptz)
  - `sent_at` (timestamptz, nullable) - When successfully sent

  ### 4. `notification_log`
  Audit log of all notification activity.
  - `id` (uuid, primary key)
  - `queue_id` (uuid, references notification_queue) - Link to queue entry
  - `event_key` (text) - Event identifier
  - `audience` (text) - Target audience
  - `channel` (text) - Delivery channel
  - `to_email` (text, nullable) - Recipient email
  - `to_phone` (text, nullable) - Recipient phone
  - `status` (text) - Final status
  - `created_at` (timestamptz) - When logged

  ## Security
  - RLS enabled on all tables
  - Users can manage their own notification preferences
  - Admins can manage templates and view all queues/logs
  - Non-admins cannot directly insert into queue (server-side only)
*/

-- =====================================================
-- Table: notification_preferences
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audience text NOT NULL CHECK (audience IN ('customer', 'crew', 'admin')),
  sms_enabled boolean NOT NULL DEFAULT false,
  email_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, audience)
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_preferences' 
    AND policyname = 'Users can view own preferences'
  ) THEN
    CREATE POLICY "Users can view own preferences"
      ON notification_preferences
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_preferences' 
    AND policyname = 'Users can update own preferences'
  ) THEN
    CREATE POLICY "Users can update own preferences"
      ON notification_preferences
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_preferences' 
    AND policyname = 'Users can insert own preferences'
  ) THEN
    CREATE POLICY "Users can insert own preferences"
      ON notification_preferences
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_preferences' 
    AND policyname = 'Admins can view all preferences'
  ) THEN
    CREATE POLICY "Admins can view all preferences"
      ON notification_preferences
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- =====================================================
-- Table: notification_templates
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('customer', 'crew', 'admin')),
  channel text NOT NULL CHECK (channel IN ('sms', 'email')),
  service_type text CHECK (service_type IN ('moving', 'junk_removal', 'demolition')),
  subject text,
  body text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique index to handle NULL service_type properly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_notification_templates_unique'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_templates'
    AND column_name = 'service_type'
  ) THEN
    CREATE UNIQUE INDEX idx_notification_templates_unique
      ON notification_templates(event_key, audience, channel, COALESCE(service_type, ''));
  END IF;
END $$;

-- Enable RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_templates' 
    AND policyname = 'Admins can view templates'
  ) THEN
    CREATE POLICY "Admins can view templates"
      ON notification_templates
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_templates' 
    AND policyname = 'Admins can insert templates'
  ) THEN
    CREATE POLICY "Admins can insert templates"
      ON notification_templates
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_templates' 
    AND policyname = 'Admins can update templates'
  ) THEN
    CREATE POLICY "Admins can update templates"
      ON notification_templates
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
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_templates' 
    AND policyname = 'Admins can delete templates'
  ) THEN
    CREATE POLICY "Admins can delete templates"
      ON notification_templates
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- =====================================================
-- Table: notification_queue
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('customer', 'crew', 'admin')),
  channel text NOT NULL CHECK (channel IN ('sms', 'email')),
  to_email text,
  to_phone text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  rendered_subject text,
  rendered_body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  error text,
  attempts int NOT NULL DEFAULT 0,
  scheduled_for timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

-- Create index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_notification_queue_status_scheduled
  ON notification_queue(status, scheduled_for)
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_queue' 
    AND policyname = 'Admins can view queue'
  ) THEN
    CREATE POLICY "Admins can view queue"
      ON notification_queue
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_queue' 
    AND policyname = 'Admins can insert queue'
  ) THEN
    CREATE POLICY "Admins can insert queue"
      ON notification_queue
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_queue' 
    AND policyname = 'Admins can update queue'
  ) THEN
    CREATE POLICY "Admins can update queue"
      ON notification_queue
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
  END IF;
END $$;

-- =====================================================
-- Table: notification_log
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid REFERENCES notification_queue(id) ON DELETE SET NULL,
  event_key text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('customer', 'crew', 'admin')),
  channel text NOT NULL CHECK (channel IN ('sms', 'email')),
  to_email text,
  to_phone text,
  status text NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

-- Create index for efficient log queries
CREATE INDEX IF NOT EXISTS idx_notification_log_queue_id
  ON notification_log(queue_id);

CREATE INDEX IF NOT EXISTS idx_notification_log_created_at
  ON notification_log(created_at DESC);

-- Enable RLS
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_log' 
    AND policyname = 'Admins can view logs'
  ) THEN
    CREATE POLICY "Admins can view logs"
      ON notification_log
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_log' 
    AND policyname = 'Admins can insert logs'
  ) THEN
    CREATE POLICY "Admins can insert logs"
      ON notification_log
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- =====================================================
-- Triggers for updated_at columns
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_notification_preferences_updated_at'
  ) THEN
    CREATE TRIGGER update_notification_preferences_updated_at
      BEFORE UPDATE ON notification_preferences
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_notification_templates_updated_at'
  ) THEN
    CREATE TRIGGER update_notification_templates_updated_at
      BEFORE UPDATE ON notification_templates
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
