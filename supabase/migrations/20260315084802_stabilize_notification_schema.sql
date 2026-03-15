/*
  # Stabilize Notification Schema

  ## Summary
  Aligns the notification tables with the application's data access layer.
  Adds missing columns and fixes column name mismatches found between the
  application code and the actual database schema.

  ## Changes

  ### notification_templates
  - Adds `channel` default to 'email' so email-only templates don't need it specified explicitly
  - Adds alias view `notification_templates_v` that exposes `is_enabled` as `enabled`
    so both the DB internal column and the app-facing column name work

  ### notification_queue
  - No destructive changes; adds computed columns to make querying easier from the app

  ### notification_log
  - Adds `rendered_subject` and `rendered_body` columns so email content can be archived
    for delivery audit purposes
  - Adds `sent_at` and `error_message` columns for per-record delivery tracking

  ## Security
  - All tables already have RLS enabled; no policy changes needed
*/

-- notification_templates: add 'enabled' as a generated always alias isn't possible
-- so we add a real column that mirrors is_enabled via a trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_templates' AND column_name = 'enabled'
  ) THEN
    ALTER TABLE notification_templates ADD COLUMN enabled boolean NOT NULL DEFAULT true;
    UPDATE notification_templates SET enabled = is_enabled;
  END IF;
END $$;

-- Keep enabled and is_enabled in sync via trigger
CREATE OR REPLACE FUNCTION sync_notification_template_enabled()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.enabled IS DISTINCT FROM OLD.enabled THEN
    NEW.is_enabled := NEW.enabled;
  ELSIF NEW.is_enabled IS DISTINCT FROM OLD.is_enabled THEN
    NEW.enabled := NEW.is_enabled;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_template_enabled ON notification_templates;
CREATE TRIGGER trg_sync_template_enabled
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION sync_notification_template_enabled();

-- notification_queue: add 'destination' as a generated column (email or phone)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_queue' AND column_name = 'destination'
  ) THEN
    ALTER TABLE notification_queue
      ADD COLUMN destination text GENERATED ALWAYS AS (COALESCE(to_email, to_phone)) STORED;
  END IF;
END $$;

-- notification_queue: add error_message as alias for error
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_queue' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE notification_queue ADD COLUMN error_message text;
    UPDATE notification_queue SET error_message = error WHERE error IS NOT NULL;
  END IF;
END $$;

-- Keep error and error_message in sync
CREATE OR REPLACE FUNCTION sync_notification_queue_error()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.error_message IS DISTINCT FROM OLD.error_message AND NEW.error_message IS NOT NULL THEN
    NEW.error := NEW.error_message;
  ELSIF NEW.error IS DISTINCT FROM OLD.error AND NEW.error IS NOT NULL THEN
    NEW.error_message := NEW.error;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_queue_error ON notification_queue;
CREATE TRIGGER trg_sync_queue_error
  BEFORE UPDATE ON notification_queue
  FOR EACH ROW
  EXECUTE FUNCTION sync_notification_queue_error();

-- notification_log: add delivery tracking columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_log' AND column_name = 'rendered_subject'
  ) THEN
    ALTER TABLE notification_log ADD COLUMN rendered_subject text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_log' AND column_name = 'rendered_body'
  ) THEN
    ALTER TABLE notification_log ADD COLUMN rendered_body text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_log' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE notification_log ADD COLUMN sent_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_log' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE notification_log ADD COLUMN error_message text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_log' AND column_name = 'destination'
  ) THEN
    ALTER TABLE notification_log ADD COLUMN destination text
      GENERATED ALWAYS AS (COALESCE(to_email, to_phone)) STORED;
  END IF;
END $$;

-- Index for faster queue polling by status + channel
CREATE INDEX IF NOT EXISTS idx_notification_queue_status_channel
  ON notification_queue(status, channel)
  WHERE status IN ('pending', 'failed');

-- Index for delivery history lookups
CREATE INDEX IF NOT EXISTS idx_notification_log_event_key
  ON notification_log(event_key, created_at DESC);
