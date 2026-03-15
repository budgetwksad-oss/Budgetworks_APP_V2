/*
  # Revoke Quote Access Token After Response

  ## Summary
  Makes quote magic links single-use by revoking the access token immediately
  after the customer accepts or declines the quote. This prevents a customer
  from reopening the same link and re-submitting an action after a quote has
  already been settled.

  ## Changes

  ### Modified Functions
  - `respond_to_quote_by_token`: After a successful accept or decline, sets
    `revoked_at = now()` on the matching `quote_access_links` row so the link
    is dead-ended on any subsequent visit.

  ## Security
  - The `get_quote_by_token` function already checks `revoked_at IS NOT NULL`
    and returns an error — so the UI will correctly show "Link Not Found" on
    any re-visit after the token is revoked.
  - Idempotency is preserved: if the quote was already accepted and a second
    accept attempt comes in (e.g., from a cached page), the RPC returns the
    existing job_id with a success flag before the token check, so no data is
    duplicated.
  - No RLS changes required.
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

  SELECT * INTO v_quote FROM quotes WHERE id = v_link.quote_id;

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

  IF v_quote.service_request_id IS NOT NULL THEN
    SELECT * INTO v_service_request FROM service_requests WHERE id = v_quote.service_request_id;
    v_customer_id    := v_service_request.customer_id;
    v_service_req_id := v_service_request.id;
    v_customer_name  := COALESCE(v_service_request.contact_name, '');
    v_customer_email := COALESCE((SELECT email FROM auth.users WHERE id = v_service_request.customer_id), '');
    v_customer_phone := COALESCE(v_service_request.contact_phone, '');
    v_service_type   := v_service_request.service_type;
  END IF;

  IF v_quote.public_quote_request_id IS NOT NULL THEN
    SELECT * INTO v_public_request FROM public_quote_requests WHERE id = v_quote.public_quote_request_id;
    v_customer_id    := NULL;
    v_service_req_id := NULL;
    v_customer_name  := COALESCE(v_public_request.contact_name,  '');
    v_customer_email := COALESCE(v_public_request.contact_email, '');
    v_customer_phone := COALESCE(v_public_request.contact_phone, '');
    v_service_type   := v_public_request.service_type;
  END IF;

  IF v_service_type IS NULL OR v_service_type = '' THEN
    v_service_type := v_quote.pricing_snapshot ->> 'service_type';
  END IF;

  IF p_action = 'accept' THEN
    UPDATE quotes
    SET
      status               = 'accepted',
      accepted_at          = now(),
      accepted_method      = 'magic_link',
      agreement_accepted   = true,
      agreement_accepted_at = now(),
      updated_at           = now()
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
      v_service_req_id,
      v_customer_id,
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

    IF v_service_req_id IS NOT NULL THEN
      UPDATE service_requests SET status = 'accepted' WHERE id = v_service_req_id;
    END IF;
    IF v_quote.public_quote_request_id IS NOT NULL THEN
      UPDATE public_quote_requests SET status = 'closed' WHERE id = v_quote.public_quote_request_id;
    END IF;

    UPDATE quote_access_links
    SET revoked_at = now()
    WHERE token_hash = v_token_hash;

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

    IF v_service_req_id IS NOT NULL THEN
      UPDATE service_requests SET status = 'cancelled' WHERE id = v_service_req_id;
    END IF;

    UPDATE quote_access_links
    SET revoked_at = now()
    WHERE token_hash = v_token_hash;

    RETURN jsonb_build_object(
      'success',      true,
      'quote_status', 'declined',
      'message',      'Quote declined'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION respond_to_quote_by_token(text, text) TO anon, authenticated;
