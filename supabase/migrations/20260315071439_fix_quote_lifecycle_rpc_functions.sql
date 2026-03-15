/*
  # Fix Quote Lifecycle RPC Functions

  ## Summary
  Fixes three critical bugs in the quote magic link lifecycle that prevent
  quotes from being accepted and jobs from being created correctly.

  ## Bugs Fixed

  ### 1. respond_to_quote_by_token — NOT NULL constraint violation for guest quotes
  The jobs table has NOT NULL constraints on service_request_id and customer_id.
  For guest (public_quote_request) quotes, neither exists. The old function
  used v_quote.id as a fallback UUID which violates FK constraints and crashes.

  Fix: Make the INSERT use NULL for service_request_id when there is no
  service_request, and use a sentinel/fallback only when customer_id is truly
  available. For guest quotes we use a special NULL-safe path.

  Also: The jobs table has NOT NULL on service_request_id — we need to make
  it nullable for guest quote flows.

  ### 2. get_quote_by_token — Wrong column names on public_quote_requests
  The function referenced customer_name, customer_email, customer_phone, and
  service_description/pickup_address/dropoff_address which do not exist.
  The actual columns are contact_name, contact_email, contact_phone,
  description, location_address.

  ### 3. respond_to_quote_by_token_notify — Same column name bug
  Referenced v_pqr.customer_name etc. instead of v_pqr.contact_name.

  ## Schema Changes
  - jobs.service_request_id: Allow NULL (was NOT NULL) to support guest quote jobs
  - jobs.customer_id: Allow NULL to support guest quote jobs

  ## Notes
  - No destructive changes, only column nullability relaxation
  - All existing jobs with values are unaffected
  - Idempotent: safe to re-run
*/

-- =====================================================
-- 1. Make jobs.service_request_id and customer_id nullable
--    (required for guest quote job creation)
-- =====================================================

ALTER TABLE jobs ALTER COLUMN service_request_id DROP NOT NULL;
ALTER TABLE jobs ALTER COLUMN customer_id DROP NOT NULL;

-- =====================================================
-- 2. Fix get_quote_by_token — correct PQR column names
-- =====================================================

CREATE OR REPLACE FUNCTION get_quote_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token_hash text;
  v_link record;
  v_quote record;
  v_service_request record;
  v_public_request record;
BEGIN
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_link
  FROM quote_access_links
  WHERE token_hash = v_token_hash
    AND revoked_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid, expired, or revoked token'
    );
  END IF;

  SELECT * INTO v_quote
  FROM quotes
  WHERE id = v_link.quote_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Quote not found'
    );
  END IF;

  IF v_quote.service_request_id IS NOT NULL THEN
    SELECT * INTO v_service_request
    FROM service_requests
    WHERE id = v_quote.service_request_id;
  END IF;

  IF v_quote.public_quote_request_id IS NOT NULL THEN
    SELECT * INTO v_public_request
    FROM public_quote_requests
    WHERE id = v_quote.public_quote_request_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'quote', jsonb_build_object(
      'id',               v_quote.id,
      'quote_number',     v_quote.quote_number,
      'status',           v_quote.status,
      'estimate_low',     v_quote.estimate_low,
      'estimate_high',    v_quote.estimate_high,
      'expected_price',   v_quote.expected_price,
      'cap_amount',       v_quote.cap_amount,
      'subtotal',         v_quote.subtotal,
      'tax_amount',       v_quote.tax_amount,
      'total_amount',     v_quote.total_amount,
      'line_items',       v_quote.line_items,
      'notes',            v_quote.notes,
      'valid_until',      v_quote.valid_until,
      'pricing_snapshot', v_quote.pricing_snapshot,
      'accepted_at',      v_quote.accepted_at,
      'declined_at',      v_quote.declined_at
    ),
    'customer', CASE
      WHEN v_public_request IS NOT NULL THEN jsonb_build_object(
        'name',  v_public_request.contact_name,
        'email', v_public_request.contact_email,
        'phone', v_public_request.contact_phone
      )
      WHEN v_service_request IS NOT NULL THEN jsonb_build_object(
        'name',  COALESCE(v_service_request.contact_name,
                   (SELECT full_name FROM profiles WHERE id = v_service_request.customer_id)),
        'email', (SELECT email FROM auth.users WHERE id = v_service_request.customer_id),
        'phone', v_service_request.contact_phone
      )
      ELSE NULL
    END,
    'service', CASE
      WHEN v_public_request IS NOT NULL THEN jsonb_build_object(
        'service_type',     v_public_request.service_type,
        'description',      v_public_request.description,
        'location_address', v_public_request.location_address,
        'preferred_date',   v_public_request.preferred_date
      )
      WHEN v_service_request IS NOT NULL THEN jsonb_build_object(
        'service_type',     v_service_request.service_type,
        'description',      v_service_request.description,
        'location_address', v_service_request.location_address,
        'preferred_date',   v_service_request.preferred_date
      )
      ELSE NULL
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_quote_by_token(text) TO anon, authenticated;

-- =====================================================
-- 3. Fix respond_to_quote_by_token — guest quote job creation
-- =====================================================

CREATE OR REPLACE FUNCTION respond_to_quote_by_token(
  p_token text,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token_hash      text;
  v_link            record;
  v_quote           record;
  v_service_request record;
  v_public_request  record;
  v_job_id          uuid;
  v_customer_id     uuid;
  v_service_req_id  uuid;
  v_customer_name   text;
  v_customer_email  text;
  v_customer_phone  text;
  v_service_type    text;
BEGIN
  IF p_action NOT IN ('accept', 'decline') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid action. Must be accept or decline'
    );
  END IF;

  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_link
  FROM quote_access_links
  WHERE token_hash = v_token_hash
    AND revoked_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid, expired, or revoked token'
    );
  END IF;

  SELECT * INTO v_quote
  FROM quotes
  WHERE id = v_link.quote_id;

  -- Idempotency: already processed
  IF v_quote.status IN ('accepted', 'declined') THEN
    IF v_quote.status = 'accepted' AND p_action = 'accept' THEN
      SELECT id INTO v_job_id FROM jobs WHERE source_quote_id = v_quote.id;
      RETURN jsonb_build_object(
        'success', true,
        'quote_status', 'accepted',
        'job_id', v_job_id,
        'message', 'Quote was already accepted'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', true,
        'quote_status', v_quote.status,
        'message', 'Quote was already ' || v_quote.status
      );
    END IF;
  END IF;

  -- Resolve source: service_request (authenticated customer) or public_quote_request (guest)
  IF v_quote.service_request_id IS NOT NULL THEN
    SELECT * INTO v_service_request
    FROM service_requests
    WHERE id = v_quote.service_request_id;
    v_customer_id    := v_service_request.customer_id;
    v_service_req_id := v_service_request.id;
    v_customer_name  := COALESCE(v_service_request.contact_name, '');
    v_customer_email := COALESCE((SELECT email FROM auth.users WHERE id = v_service_request.customer_id), '');
    v_customer_phone := COALESCE(v_service_request.contact_phone, '');
    v_service_type   := v_service_request.service_type;
  END IF;

  IF v_quote.public_quote_request_id IS NOT NULL THEN
    SELECT * INTO v_public_request
    FROM public_quote_requests
    WHERE id = v_quote.public_quote_request_id;
    -- Guest quotes: no customer_id, no service_request_id
    v_customer_id    := NULL;
    v_service_req_id := NULL;
    v_customer_name  := COALESCE(v_public_request.contact_name, '');
    v_customer_email := COALESCE(v_public_request.contact_email, '');
    v_customer_phone := COALESCE(v_public_request.contact_phone, '');
    v_service_type   := v_public_request.service_type;
  END IF;

  -- Fall back to pricing_snapshot for service_type if needed
  IF v_service_type IS NULL OR v_service_type = '' THEN
    v_service_type := v_quote.pricing_snapshot ->> 'service_type';
  END IF;

  IF p_action = 'accept' THEN
    UPDATE quotes
    SET
      status          = 'accepted',
      accepted_at     = now(),
      accepted_method = 'magic_link',
      updated_at      = now()
    WHERE id = v_quote.id;

    INSERT INTO jobs (
      quote_id,
      service_request_id,
      customer_id,
      status,
      customer_name,
      customer_email,
      customer_phone,
      service_type,
      source_quote_id,
      quoted_amount
    )
    VALUES (
      v_quote.id,
      v_service_req_id,                                         -- NULL for guest quotes
      v_customer_id,                                            -- NULL for guest quotes
      'scheduled_draft',
      v_customer_name,
      v_customer_email,
      v_customer_phone,
      v_service_type,
      v_quote.id,
      COALESCE(v_quote.expected_price, v_quote.estimate_high, v_quote.estimate_low, v_quote.total_amount, 0)
    )
    ON CONFLICT (source_quote_id) DO NOTHING
    RETURNING id INTO v_job_id;

    IF v_job_id IS NULL THEN
      SELECT id INTO v_job_id FROM jobs WHERE source_quote_id = v_quote.id;
    END IF;

    -- Update lead status to 'accepted'
    IF v_service_req_id IS NOT NULL THEN
      UPDATE service_requests SET status = 'accepted' WHERE id = v_service_req_id;
    END IF;
    IF v_quote.public_quote_request_id IS NOT NULL THEN
      UPDATE public_quote_requests SET status = 'closed' WHERE id = v_quote.public_quote_request_id;
    END IF;

    RETURN jsonb_build_object(
      'success',      true,
      'quote_status', 'accepted',
      'job_id',       v_job_id,
      'message',      'Quote accepted successfully'
    );

  ELSIF p_action = 'decline' THEN
    UPDATE quotes
    SET
      status      = 'declined',
      declined_at = now(),
      updated_at  = now()
    WHERE id = v_quote.id;

    -- Update lead status to reflect declined
    IF v_service_req_id IS NOT NULL THEN
      UPDATE service_requests SET status = 'cancelled' WHERE id = v_service_req_id;
    END IF;

    RETURN jsonb_build_object(
      'success',      true,
      'quote_status', 'declined',
      'message',      'Quote declined'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION respond_to_quote_by_token(text, text) TO anon, authenticated;

-- =====================================================
-- 4. Fix respond_to_quote_by_token_notify — correct PQR column names
-- =====================================================

CREATE OR REPLACE FUNCTION respond_to_quote_by_token_notify(
  p_token  text,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_result         jsonb;
  v_token_hash     text;
  v_link           record;
  v_quote          record;
  v_pqr            record;
  v_sr             record;
  v_customer_name  text := '';
  v_customer_email text := '';
  v_customer_phone text := '';
  v_service_type   text := '';
  v_service_label  text := '';
  v_range_str      text := '';
  v_settings       record;
  v_payload        jsonb;
BEGIN
  v_result := respond_to_quote_by_token(p_token, p_action);

  IF NOT (v_result ->> 'success')::boolean THEN
    RETURN v_result;
  END IF;

  IF v_result ->> 'message' ILIKE '%already%' THEN
    RETURN v_result;
  END IF;

  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_link
  FROM quote_access_links
  WHERE token_hash = v_token_hash
  LIMIT 1;

  IF NOT FOUND THEN RETURN v_result; END IF;

  SELECT * INTO v_quote FROM quotes WHERE id = v_link.quote_id;
  IF NOT FOUND THEN RETURN v_result; END IF;

  IF v_quote.public_quote_request_id IS NOT NULL THEN
    SELECT * INTO v_pqr
    FROM public_quote_requests
    WHERE id = v_quote.public_quote_request_id;

    v_customer_name  := COALESCE(v_pqr.contact_name,  '');
    v_customer_email := COALESCE(v_pqr.contact_email, '');
    v_customer_phone := COALESCE(v_pqr.contact_phone, '');
    v_service_type   := COALESCE(v_pqr.service_type,  '');
  ELSIF v_quote.service_request_id IS NOT NULL THEN
    SELECT * INTO v_sr
    FROM service_requests
    WHERE id = v_quote.service_request_id;

    v_customer_name  := COALESCE(v_sr.contact_name,  '');
    v_customer_email := COALESCE((SELECT email FROM auth.users WHERE id = v_sr.customer_id LIMIT 1), '');
    v_customer_phone := COALESCE(v_sr.contact_phone, '');
    v_service_type   := COALESCE(v_sr.service_type,  '');
  END IF;

  -- Fall back to pricing_snapshot service_type
  IF v_service_type = '' THEN
    v_service_type := COALESCE(v_quote.pricing_snapshot ->> 'service_type', '');
  END IF;

  v_service_label := CASE v_service_type
    WHEN 'moving'       THEN 'Moving'
    WHEN 'junk_removal' THEN 'Junk Removal'
    WHEN 'demolition'   THEN 'Light Demo'
    ELSE COALESCE(v_service_type, '')
  END;

  IF v_quote.estimate_low IS NOT NULL AND v_quote.estimate_high IS NOT NULL THEN
    v_range_str := '$' || v_quote.estimate_low::text || '–$' || v_quote.estimate_high::text;
  ELSIF v_quote.expected_price IS NOT NULL THEN
    v_range_str := '$' || v_quote.expected_price::text;
  END IF;

  SELECT * INTO v_settings FROM company_settings ORDER BY created_at ASC LIMIT 1;

  v_payload := jsonb_build_object(
    'customer_name',  v_customer_name,
    'service_label',  v_service_label,
    'range',          v_range_str,
    'company_phone',  COALESCE(v_settings.phone, '')
  );

  IF p_action = 'accept' THEN
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
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION respond_to_quote_by_token_notify(text, text) TO anon, authenticated;
