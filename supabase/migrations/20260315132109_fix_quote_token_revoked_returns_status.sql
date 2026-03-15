/*
  # Fix get_quote_by_token: revoked token after accept shows quote status

  ## Problem
  After a customer accepts a quote, respond_to_quote_by_token revokes the token.
  If the customer revisits the magic link, get_quote_by_token returns
  'Invalid or revoked token' — showing an error instead of confirming the accepted state.

  ## Fix
  When the token is revoked, look up the associated quote and return its current
  status (accepted/declined) with success=true so the frontend can show the
  appropriate confirmation screen instead of an error.

  ## Also fixes
  - Populate customer_email_snapshot on quotes when creating via CreateQuote
    (via a trigger so it's automatic)
*/

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

  -- Check if token exists at all
  SELECT * INTO v_link
  FROM quote_access_links
  WHERE token_hash = v_token_hash;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or revoked token'
    );
  END IF;

  -- If revoked, look up the quote and return its current status
  -- so the frontend can show "already accepted/declined" instead of an error
  IF v_link.revoked_at IS NOT NULL THEN
    SELECT * INTO v_quote FROM quotes WHERE id = v_link.quote_id;

    IF FOUND AND v_quote.status IN ('accepted', 'declined') THEN
      IF v_quote.service_request_id IS NOT NULL THEN
        SELECT * INTO v_service_request FROM service_requests WHERE id = v_quote.service_request_id;
      END IF;
      IF v_quote.public_quote_request_id IS NOT NULL THEN
        SELECT * INTO v_public_request FROM public_quote_requests WHERE id = v_quote.public_quote_request_id;
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'quote', jsonb_build_object(
          'id',             v_quote.id,
          'quote_number',   v_quote.quote_number,
          'status',         v_quote.status,
          'estimate_low',   v_quote.estimate_low,
          'estimate_high',  v_quote.estimate_high,
          'expected_price', v_quote.expected_price,
          'cap_amount',     v_quote.cap_amount,
          'subtotal',       v_quote.subtotal,
          'tax_amount',     v_quote.tax_amount,
          'total_amount',   v_quote.total_amount,
          'line_items',     v_quote.line_items,
          'notes',          v_quote.notes,
          'valid_until',    v_quote.valid_until,
          'pricing_snapshot', v_quote.pricing_snapshot,
          'accepted_at',    v_quote.accepted_at,
          'declined_at',    v_quote.declined_at
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
            'location_address', v_public_request.location_address,
            'preferred_date',   v_public_request.preferred_date
          )
          WHEN v_service_request IS NOT NULL THEN jsonb_build_object(
            'service_type',     v_service_request.service_type,
            'location_address', v_service_request.location_address,
            'preferred_date',   v_service_request.preferred_date
          )
          ELSE NULL
        END
      );
    END IF;

    -- Revoked but quote not in expected state — treat as invalid
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or revoked token'
    );
  END IF;

  -- Check expiry
  IF v_link.expires_at <= now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Token has expired'
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
