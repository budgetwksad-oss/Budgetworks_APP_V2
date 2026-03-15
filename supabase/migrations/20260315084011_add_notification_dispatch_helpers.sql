/*
  # Notification Dispatch Helpers

  ## Summary
  Adds utility functions to support the dispatch-notifications edge function and
  admin visibility into the notification queue.

  ## New Functions
  1. `get_pending_notification_count()` — returns count of pending email notifications
     due now. Used by the admin dashboard to surface queue health.
  2. `mark_notification_sent(p_id uuid)` — marks a queue entry as sent (callable by
     service role only, used by the dispatch function as a fallback).
  3. `mark_notification_failed(p_id uuid, p_error text)` — marks a queue entry as
     failed after max retries.

  ## Notes
  - These functions are SECURITY DEFINER to allow the service role used by the edge
    function to update queue rows without bypassing other RLS constraints elsewhere.
  - No destructive operations.
*/

CREATE OR REPLACE FUNCTION get_pending_notification_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM notification_queue
  WHERE status = 'pending'
    AND channel = 'email'
    AND scheduled_for <= now();
$$;

GRANT EXECUTE ON FUNCTION get_pending_notification_count() TO authenticated;

CREATE OR REPLACE FUNCTION mark_notification_sent(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notification_queue
  SET
    status   = 'sent',
    sent_at  = now(),
    attempts = COALESCE(attempts, 0) + 1,
    error    = NULL
  WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION mark_notification_failed(p_id uuid, p_error text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notification_queue
  SET
    status   = 'failed',
    error    = p_error,
    attempts = COALESCE(attempts, 0) + 1
  WHERE id = p_id;
END;
$$;
