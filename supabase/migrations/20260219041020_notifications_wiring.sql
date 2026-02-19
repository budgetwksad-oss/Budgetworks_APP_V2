/*
  # Notification Wiring: Functions, Trigger, and Wrapper

  ## Overview
  Adds all server-side plumbing to automatically enqueue notifications for key
  operational events: lead received, quote sent, quote accepted/declined,
  job scheduled, and job claimed.

  ## New Functions

  ### 1. render_template(p_text, p_payload)
  Pure helper that replaces {key} placeholders in a text string with values
  from a JSONB payload object.

  ### 2. enqueue_notification(...)
  Core enqueue function. Finds the best matching notification template for the
  given event_key + audience + channel + service_type (exact match preferred,
  NULL service_type as fallback). Renders the template, inserts a row into
  notification_queue (status='pending'), and logs to notification_log.
  Returns the new queue row UUID.

  ### 3. enqueue_admin_ops(...)
  Convenience wrapper that reads company_settings for the admin destination
  (phone/email) and calls enqueue_notification with audience='admin'.
  Crew callers may only use event_key='job_claimed'.

  ### 4. notify_admin_on_lead_insert() + trigger
  AFTER INSERT trigger on public_quote_requests. Builds a payload from the new
  lead row and enqueues admin notifications (sms if company phone exists, email
  if company email exists).

  ### 5. respond_to_quote_by_token_notify(p_token, p_action)
  Public-safe wrapper around respond_to_quote_by_token. Calls the original
  function then enqueues accepted/declined notifications for customer and admin.
  Granted to anon so it works on the public magic-link page.

  ## Security
  - All functions use SECURITY DEFINER to bypass RLS for internal inserts.
  - enqueue_notification granted to authenticated + anon (trigger/public needs).
  - enqueue_admin_ops granted to authenticated only.
  - respond_to_quote_by_token_notify granted to anon + authenticated.
  - Token validity delegated to the existing respond_to_quote_by_token function.
*/

-- =====================================================
-- A) render_template helper
-- =====================================================

CREATE OR REPLACE FUNCTION render_template(
  p_text text,
  p_payload jsonb
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_key text;
  v_val text;
  v_result text;
BEGIN
  v_result := p_text;
  IF p_payload IS NULL OR p_payload = '{}'::jsonb THEN
    RETURN v_result;
  END IF;
  FOR v_key IN SELECT jsonb_object_keys(p_payload)
  LOOP
    v_val := p_payload ->> v_key;
    v_result := replace(v_result, '{' || v_key || '}', COALESCE(v_val, ''));
  END LOOP;
  RETURN v_result;
END;
$$;

-- =====================================================
-- B) enqueue_notification
-- =====================================================

CREATE OR REPLACE FUNCTION enqueue_notification(
  p_event_key   text,
  p_audience    text,
  p_channel     text,
  p_service_type text,
  p_to_email    text,
  p_to_phone    text,
  p_payload     jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_template    record;
  v_rendered_subject text;
  v_rendered_body    text;
  v_queue_id    uuid;
BEGIN
  -- Role check: allow admin, crew, or NULL auth context (triggers / anon wrappers)
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF auth.uid() IS NOT NULL AND v_caller_role NOT IN ('admin', 'crew') THEN
    RAISE EXCEPTION 'Not authorised to enqueue notifications';
  END IF;

  -- Find best template: prefer exact service_type match, fall back to NULL
  SELECT * INTO v_template
  FROM notification_templates
  WHERE event_key   = p_event_key
    AND audience    = p_audience
    AND channel     = p_channel
    AND is_enabled  = true
    AND (service_type = p_service_type OR service_type IS NULL)
  ORDER BY (service_type IS NOT NULL) DESC
  LIMIT 1;

  IF v_template IS NOT NULL THEN
    v_rendered_subject := render_template(v_template.subject, p_payload);
    v_rendered_body    := render_template(v_template.body,    p_payload);
  ELSE
    v_rendered_subject := NULL;
    v_rendered_body    := '[Missing template: ' || p_event_key || '] ' || p_payload::text;
  END IF;

  -- Insert into queue
  INSERT INTO notification_queue (
    event_key, audience, channel,
    to_email, to_phone,
    payload, rendered_subject, rendered_body,
    status
  )
  VALUES (
    p_event_key, p_audience, p_channel,
    NULLIF(p_to_email, ''), NULLIF(p_to_phone, ''),
    COALESCE(p_payload, '{}'::jsonb),
    v_rendered_subject, v_rendered_body,
    'pending'
  )
  RETURNING id INTO v_queue_id;

  -- Log the enqueue
  INSERT INTO notification_log (
    queue_id, event_key, audience, channel,
    to_email, to_phone, status
  )
  VALUES (
    v_queue_id, p_event_key, p_audience, p_channel,
    NULLIF(p_to_email, ''), NULLIF(p_to_phone, ''), 'pending'
  );

  RETURN v_queue_id;
END;
$$;

GRANT EXECUTE ON FUNCTION enqueue_notification(text,text,text,text,text,text,jsonb)
  TO authenticated, anon;

-- =====================================================
-- C) enqueue_admin_ops
-- =====================================================

CREATE OR REPLACE FUNCTION enqueue_admin_ops(
  p_event_key    text,
  p_channel      text,
  p_service_type text,
  p_payload      jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_settings    record;
  v_to_email    text := '';
  v_to_phone    text := '';
BEGIN
  -- Role check
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF auth.uid() IS NOT NULL THEN
    IF v_caller_role = 'crew' AND p_event_key != 'job_claimed' THEN
      RAISE EXCEPTION 'Crew members may only enqueue job_claimed notifications';
    END IF;
    IF v_caller_role NOT IN ('admin', 'crew') THEN
      RAISE EXCEPTION 'Not authorised to use enqueue_admin_ops';
    END IF;
  END IF;

  -- Read admin destination from company_settings
  SELECT phone, email INTO v_to_phone, v_to_email
  FROM company_settings
  ORDER BY created_at ASC
  LIMIT 1;

  -- Route to the correct destination based on channel
  IF p_channel = 'sms' THEN
    IF v_to_phone IS NULL OR v_to_phone = '' THEN
      RETURN NULL;
    END IF;
    v_to_email := '';
  ELSIF p_channel = 'email' THEN
    IF v_to_email IS NULL OR v_to_email = '' THEN
      RETURN NULL;
    END IF;
    v_to_phone := '';
  END IF;

  RETURN enqueue_notification(
    p_event_key, 'admin', p_channel, p_service_type,
    v_to_email, v_to_phone, p_payload
  );
END;
$$;

GRANT EXECUTE ON FUNCTION enqueue_admin_ops(text,text,text,jsonb)
  TO authenticated;

-- =====================================================
-- D) Lead received trigger
-- =====================================================

CREATE OR REPLACE FUNCTION notify_admin_on_lead_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings     record;
  v_payload      jsonb;
  v_service_label text;
  v_template     record;
  v_subject      text;
  v_body         text;
  v_queue_id     uuid;
BEGIN
  -- Build human-readable service label
  v_service_label := CASE NEW.service_type
    WHEN 'moving'       THEN 'Moving'
    WHEN 'junk_removal' THEN 'Junk Removal'
    WHEN 'demolition'   THEN 'Light Demo'
    ELSE COALESCE(NEW.service_type, 'General')
  END;

  -- Read company settings
  SELECT * INTO v_settings
  FROM company_settings
  ORDER BY created_at ASC
  LIMIT 1;

  -- Build payload
  v_payload := jsonb_build_object(
    'customer_name',    COALESCE(NEW.customer_name, ''),
    'service_label',    v_service_label,
    'contact_method',   COALESCE(NEW.preferred_contact_method, ''),
    'location_address', COALESCE(NEW.location_address, ''),
    'preferred_date',   COALESCE(NEW.preferred_date::text, ''),
    'company_phone',    COALESCE(v_settings.phone, '')
  );

  -- Enqueue SMS if company phone exists
  IF v_settings.phone IS NOT NULL AND v_settings.phone != '' THEN
    SELECT * INTO v_template
    FROM notification_templates
    WHERE event_key   = 'lead_received'
      AND audience    = 'admin'
      AND channel     = 'sms'
      AND is_enabled  = true
      AND (service_type = NEW.service_type OR service_type IS NULL)
    ORDER BY (service_type IS NOT NULL) DESC
    LIMIT 1;

    IF v_template IS NOT NULL THEN
      v_subject := render_template(v_template.subject, v_payload);
      v_body    := render_template(v_template.body,    v_payload);
    ELSE
      v_subject := NULL;
      v_body    := '[Missing template: lead_received] ' || v_payload::text;
    END IF;

    INSERT INTO notification_queue (
      event_key, audience, channel, to_phone,
      payload, rendered_subject, rendered_body, status
    )
    VALUES (
      'lead_received', 'admin', 'sms', v_settings.phone,
      v_payload, v_subject, v_body, 'pending'
    )
    RETURNING id INTO v_queue_id;

    INSERT INTO notification_log (
      queue_id, event_key, audience, channel, to_phone, status
    ) VALUES (
      v_queue_id, 'lead_received', 'admin', 'sms', v_settings.phone, 'pending'
    );
  END IF;

  -- Enqueue Email if company email exists
  IF v_settings.email IS NOT NULL AND v_settings.email != '' THEN
    SELECT * INTO v_template
    FROM notification_templates
    WHERE event_key   = 'lead_received'
      AND audience    = 'admin'
      AND channel     = 'email'
      AND is_enabled  = true
      AND (service_type = NEW.service_type OR service_type IS NULL)
    ORDER BY (service_type IS NOT NULL) DESC
    LIMIT 1;

    IF v_template IS NOT NULL THEN
      v_subject := render_template(v_template.subject, v_payload);
      v_body    := render_template(v_template.body,    v_payload);
    ELSE
      v_subject := NULL;
      v_body    := '[Missing template: lead_received] ' || v_payload::text;
    END IF;

    INSERT INTO notification_queue (
      event_key, audience, channel, to_email,
      payload, rendered_subject, rendered_body, status
    )
    VALUES (
      'lead_received', 'admin', 'email', v_settings.email,
      v_payload, v_subject, v_body, 'pending'
    )
    RETURNING id INTO v_queue_id;

    INSERT INTO notification_log (
      queue_id, event_key, audience, channel, to_email, status
    ) VALUES (
      v_queue_id, 'lead_received', 'admin', 'email', v_settings.email, 'pending'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger (drop first for idempotency)
DROP TRIGGER IF EXISTS trg_notify_admin_on_lead_insert ON public_quote_requests;

CREATE TRIGGER trg_notify_admin_on_lead_insert
  AFTER INSERT ON public_quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_lead_insert();

-- =====================================================
-- E) respond_to_quote_by_token_notify wrapper
-- =====================================================

CREATE OR REPLACE FUNCTION respond_to_quote_by_token_notify(
  p_token  text,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result        jsonb;
  v_token_hash    text;
  v_link          record;
  v_quote         record;
  v_pqr           record;
  v_sr            record;
  v_customer_name  text := '';
  v_customer_email text := '';
  v_customer_phone text := '';
  v_service_type   text := '';
  v_service_label  text := '';
  v_range_str      text := '';
  v_settings       record;
  v_payload        jsonb;
BEGIN
  -- Delegate the actual accept/decline + job creation to the original function
  v_result := respond_to_quote_by_token(p_token, p_action);

  -- Only enqueue notifications if the response was successful
  IF NOT (v_result ->> 'success')::boolean THEN
    RETURN v_result;
  END IF;

  -- Skip enqueue on idempotent re-calls (already processed)
  IF v_result ->> 'message' ILIKE '%already%' THEN
    RETURN v_result;
  END IF;

  -- Hash token to find the link record
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_link
  FROM quote_access_links
  WHERE token_hash = v_token_hash
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN v_result;
  END IF;

  -- Load quote
  SELECT * INTO v_quote
  FROM quotes
  WHERE id = v_link.quote_id;

  IF NOT FOUND THEN
    RETURN v_result;
  END IF;

  -- Load customer details from source lead
  IF v_quote.public_quote_request_id IS NOT NULL THEN
    SELECT * INTO v_pqr
    FROM public_quote_requests
    WHERE id = v_quote.public_quote_request_id;

    v_customer_name  := COALESCE(v_pqr.customer_name, '');
    v_customer_email := COALESCE(v_pqr.customer_email, '');
    v_customer_phone := COALESCE(v_pqr.customer_phone, '');
    v_service_type   := COALESCE(v_pqr.service_type, '');
  ELSIF v_quote.service_request_id IS NOT NULL THEN
    SELECT * INTO v_sr
    FROM service_requests
    WHERE id = v_quote.service_request_id;

    v_customer_name  := COALESCE(v_sr.contact_name, '');
    v_customer_email := COALESCE((SELECT email FROM auth.users WHERE id = v_sr.customer_id LIMIT 1), '');
    v_customer_phone := COALESCE(v_sr.contact_phone, '');
    v_service_type   := COALESCE(v_sr.service_type, '');
  END IF;

  -- Build service label
  v_service_label := CASE v_service_type
    WHEN 'moving'       THEN 'Moving'
    WHEN 'junk_removal' THEN 'Junk Removal'
    WHEN 'demolition'   THEN 'Light Demo'
    ELSE COALESCE(v_service_type, '')
  END;

  -- Build price range string
  IF v_quote.estimate_low IS NOT NULL AND v_quote.estimate_high IS NOT NULL THEN
    v_range_str := '$' || v_quote.estimate_low::text || '–$' || v_quote.estimate_high::text;
  ELSIF v_quote.expected_price IS NOT NULL THEN
    v_range_str := '$' || v_quote.expected_price::text;
  END IF;

  -- Read company settings
  SELECT * INTO v_settings
  FROM company_settings
  ORDER BY created_at ASC
  LIMIT 1;

  -- Build payload
  v_payload := jsonb_build_object(
    'customer_name',  v_customer_name,
    'service_label',  v_service_label,
    'range',          v_range_str,
    'company_phone',  COALESCE(v_settings.phone, '')
  );

  IF p_action = 'accept' THEN
    -- Notify customer (sms if phone, else email)
    IF v_customer_phone != '' THEN
      PERFORM enqueue_notification(
        'quote_accepted', 'customer', 'sms', v_service_type,
        '', v_customer_phone, v_payload
      );
    ELSIF v_customer_email != '' THEN
      PERFORM enqueue_notification(
        'quote_accepted', 'customer', 'email', v_service_type,
        v_customer_email, '', v_payload
      );
    END IF;

    -- Notify admin
    IF v_settings.phone IS NOT NULL AND v_settings.phone != '' THEN
      PERFORM enqueue_notification(
        'quote_accepted', 'admin', 'sms', v_service_type,
        '', v_settings.phone, v_payload
      );
    END IF;
    IF v_settings.email IS NOT NULL AND v_settings.email != '' THEN
      PERFORM enqueue_notification(
        'quote_accepted', 'admin', 'email', v_service_type,
        v_settings.email, '', v_payload
      );
    END IF;

  ELSIF p_action = 'decline' THEN
    -- Notify admin only
    IF v_settings.phone IS NOT NULL AND v_settings.phone != '' THEN
      PERFORM enqueue_notification(
        'quote_declined', 'admin', 'sms', v_service_type,
        '', v_settings.phone, v_payload
      );
    END IF;
    IF v_settings.email IS NOT NULL AND v_settings.email != '' THEN
      PERFORM enqueue_notification(
        'quote_declined', 'admin', 'email', v_service_type,
        v_settings.email, '', v_payload
      );
    END IF;
  END IF;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  -- Never fail the quote response just because notification enqueue errored
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION respond_to_quote_by_token_notify(text, text)
  TO anon, authenticated;
