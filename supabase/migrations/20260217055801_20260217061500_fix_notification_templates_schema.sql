/*
  # Fix Notification Templates Schema

  ## Overview
  Renames the old notification_templates table and creates the new schema
  for the operational notifications system.

  ## Changes
  
  1. Rename old notification_templates to notification_templates_legacy
     - Preserves existing template_type based templates
     - Keeps all data and policies intact
  
  2. Create new notification_templates with correct schema
     - event_key instead of template_type
     - audience + channel + service_type for granular targeting
     - subject + body for flexible templating
     - is_enabled flag

  ## Security
  - RLS enabled on new table
  - Admin-only access for all operations
*/

-- =====================================================
-- Rename old notification_templates table
-- =====================================================

ALTER TABLE notification_templates RENAME TO notification_templates_legacy;

-- =====================================================
-- Create new notification_templates table
-- =====================================================

CREATE TABLE notification_templates (
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
CREATE UNIQUE INDEX idx_notification_templates_unique_new
  ON notification_templates(event_key, audience, channel, COALESCE(service_type, ''));

-- Enable RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can view templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_templates' 
    AND policyname = 'Admins can view notification templates'
  ) THEN
    CREATE POLICY "Admins can view notification templates"
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

-- Only admins can insert templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_templates' 
    AND policyname = 'Admins can insert notification templates'
  ) THEN
    CREATE POLICY "Admins can insert notification templates"
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

-- Only admins can update templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_templates' 
    AND policyname = 'Admins can update notification templates'
  ) THEN
    CREATE POLICY "Admins can update notification templates"
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

-- Only admins can delete templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_templates' 
    AND policyname = 'Admins can delete notification templates'
  ) THEN
    CREATE POLICY "Admins can delete notification templates"
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
-- Create updated_at trigger
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_notification_templates_updated_at'
    AND tgrelid = 'notification_templates'::regclass
  ) THEN
    CREATE TRIGGER update_notification_templates_updated_at
      BEFORE UPDATE ON notification_templates
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
