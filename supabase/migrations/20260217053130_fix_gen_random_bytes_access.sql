/*
  # Fix gen_random_bytes function access

  1. Changes
    - Update create_quote_magic_link function to include extensions schema in search_path
    - This allows access to pgcrypto functions like gen_random_bytes() and digest()

  2. Rationale
    - The function was failing because SET search_path = public didn't include the extensions schema
    - pgcrypto extension functions are in the extensions schema and need to be accessible
*/

-- Recreate the function with correct search_path
CREATE OR REPLACE FUNCTION create_quote_magic_link(
  p_quote_id uuid,
  p_expires_at timestamptz DEFAULT (now() + interval '7 days')
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token text;
  v_token_hash text;
  v_caller_role text;
  v_link_id uuid;
BEGIN
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create quote magic links';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM quotes WHERE id = p_quote_id) THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  v_token := encode(gen_random_bytes(32), 'base64');
  v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');

  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  INSERT INTO quote_access_links (quote_id, token_hash, expires_at)
  VALUES (p_quote_id, v_token_hash, p_expires_at)
  RETURNING id INTO v_link_id;

  RETURN jsonb_build_object(
    'success', true,
    'token', v_token,
    'link_id', v_link_id,
    'expires_at', p_expires_at,
    'magic_url', '/q/' || v_token
  );
END;
$$;

-- Also update get_quote_by_token for consistency
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
      'id', v_quote.id,
      'quote_number', v_quote.quote_number,
      'status', v_quote.status,
      'estimate_low', v_quote.estimate_low,
      'estimate_high', v_quote.estimate_high,
      'expected_price', v_quote.expected_price,
      'cap_amount', v_quote.cap_amount,
      'subtotal', v_quote.subtotal,
      'tax_amount', v_quote.tax_amount,
      'total_amount', v_quote.total_amount,
      'line_items', v_quote.line_items,
      'notes', v_quote.notes,
      'valid_until', v_quote.valid_until,
      'pricing_snapshot', v_quote.pricing_snapshot,
      'accepted_at', v_quote.accepted_at,
      'declined_at', v_quote.declined_at
    ),
    'customer', CASE
      WHEN v_public_request IS NOT NULL THEN jsonb_build_object(
        'name', v_public_request.contact_name,
        'email', v_public_request.contact_email,
        'phone', v_public_request.contact_phone
      )
      WHEN v_service_request IS NOT NULL THEN jsonb_build_object(
        'name', (SELECT full_name FROM profiles WHERE id = v_service_request.customer_id),
        'email', (SELECT email FROM auth.users WHERE id = v_service_request.customer_id)
      )
      ELSE NULL
    END,
    'service', CASE
      WHEN v_public_request IS NOT NULL THEN jsonb_build_object(
        'service_type', v_public_request.service_type,
        'description', v_public_request.description,
        'location_address', v_public_request.location_address,
        'preferred_date', v_public_request.preferred_date
      )
      WHEN v_service_request IS NOT NULL THEN jsonb_build_object(
        'service_type', v_service_request.service_type,
        'description', v_service_request.description,
        'location', v_service_request.location,
        'preferred_date', v_service_request.preferred_date
      )
      ELSE NULL
    END
  );
END;
$$;
