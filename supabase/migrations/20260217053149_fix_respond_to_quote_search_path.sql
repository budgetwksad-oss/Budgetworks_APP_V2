/*
  # Fix respond_to_quote_by_token search_path

  1. Changes
    - Update respond_to_quote_by_token function to include extensions schema in search_path
    - This ensures digest() function from pgcrypto is accessible

  2. Rationale
    - Consistency with other magic link functions
    - Ensures all pgcrypto functions are accessible
*/

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
  v_token_hash text;
  v_link record;
  v_quote record;
  v_service_request record;
  v_public_request record;
  v_job_id uuid;
  v_customer_id uuid;
  v_service_request_id uuid;
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

  IF v_quote.status IN ('accepted', 'declined') THEN
    IF v_quote.status = 'accepted' AND p_action = 'accept' THEN
      SELECT id INTO v_job_id
      FROM jobs
      WHERE source_quote_id = v_quote.id;

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

  IF v_quote.service_request_id IS NOT NULL THEN
    SELECT * INTO v_service_request
    FROM service_requests
    WHERE id = v_quote.service_request_id;
    v_customer_id := v_service_request.customer_id;
    v_service_request_id := v_service_request.id;
  END IF;

  IF v_quote.public_quote_request_id IS NOT NULL THEN
    SELECT * INTO v_public_request
    FROM public_quote_requests
    WHERE id = v_quote.public_quote_request_id;
  END IF;

  IF p_action = 'accept' THEN
    UPDATE quotes
    SET 
      status = 'accepted',
      accepted_at = now(),
      accepted_method = 'magic_link',
      updated_at = now()
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
      COALESCE(v_service_request_id, v_quote.id),
      COALESCE(v_customer_id, v_quote.id),
      'scheduled_draft',
      COALESCE(v_public_request.contact_name, v_service_request.customer_name),
      COALESCE(v_public_request.contact_email, (SELECT email FROM auth.users WHERE id = v_customer_id)),
      COALESCE(v_public_request.contact_phone, v_service_request.customer_phone),
      COALESCE(v_public_request.service_type, v_service_request.service_type),
      v_quote.id,
      COALESCE(v_quote.expected_price, v_quote.total_amount)
    )
    ON CONFLICT (source_quote_id) DO NOTHING
    RETURNING id INTO v_job_id;

    IF v_job_id IS NULL THEN
      SELECT id INTO v_job_id
      FROM jobs
      WHERE source_quote_id = v_quote.id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'quote_status', 'accepted',
      'job_id', v_job_id,
      'message', 'Quote accepted successfully'
    );

  ELSIF p_action = 'decline' THEN
    UPDATE quotes
    SET 
      status = 'declined',
      declined_at = now(),
      updated_at = now()
    WHERE id = v_quote.id;

    RETURN jsonb_build_object(
      'success', true,
      'quote_status', 'declined',
      'message', 'Quote declined'
    );
  END IF;
END;
$$;
