/*
  # Fix notify_admin_on_lead_insert trigger function

  ## Problem
  The trigger function references NEW.customer_name, but the public_quote_requests
  table column is actually named contact_name. This causes every insert to fail
  with a "record has no field customer_name" error.

  ## Fix
  Replace NEW.customer_name with NEW.contact_name in the payload build.
*/

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
  v_service_label := CASE NEW.service_type
    WHEN 'moving'       THEN 'Moving'
    WHEN 'junk_removal' THEN 'Junk Removal'
    WHEN 'demolition'   THEN 'Light Demo'
    ELSE COALESCE(NEW.service_type, 'General')
  END;

  SELECT * INTO v_settings
  FROM company_settings
  ORDER BY created_at ASC
  LIMIT 1;

  v_payload := jsonb_build_object(
    'customer_name',    COALESCE(NEW.contact_name, ''),
    'service_label',    v_service_label,
    'contact_method',   COALESCE(NEW.preferred_contact_method, ''),
    'location_address', COALESCE(NEW.location_address, ''),
    'preferred_date',   COALESCE(NEW.preferred_date::text, ''),
    'company_phone',    COALESCE(v_settings.phone, '')
  );

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
