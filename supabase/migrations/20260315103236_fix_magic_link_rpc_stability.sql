/*
  # Fix Magic Link RPC Stability

  ## Summary
  Two targeted fixes to make the magic-link access system safe and consistent
  for both authenticated customers and unauthenticated (guest) customers.

  ## Changes

  ### 1. get_invoice_by_token — search_path and guest customer name
  - Add `extensions` to search_path so pgcrypto's digest() is always found
  - Fall back to jobs.customer_name when the invoice has no matching profile
    (invoices created from guest-quote jobs have no profiles row)

  ### 2. get_quote_by_token — split expired vs invalid error messages
  - Return 'Token has expired' when the token exists but is past its expiry
  - Return 'Invalid or revoked token' for all other failure modes
  - This allows the frontend to show a distinct, actionable expired message

  ## Security
  - All existing token-hash validation and SECURITY DEFINER settings preserved
  - No RLS changes
*/

-- ============================================================
-- 1. Fix get_invoice_by_token
-- ============================================================

CREATE OR REPLACE FUNCTION get_invoice_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash        text;
  v_link        invoice_access_links%ROWTYPE;
  v_invoice     invoices%ROWTYPE;
  v_profile     profiles%ROWTYPE;
  v_job_row     jobs%ROWTYPE;
  v_company     company_settings%ROWTYPE;
  v_total_paid  numeric;
  v_customer_name text;
BEGIN
  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_link
  FROM invoice_access_links
  WHERE token_hash = v_hash;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or revoked token');
  END IF;

  IF v_link.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or revoked token');
  END IF;

  IF v_link.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token has expired');
  END IF;

  SELECT * INTO v_invoice
  FROM invoices
  WHERE id = v_link.invoice_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;

  SELECT * INTO v_profile
  FROM profiles
  WHERE id = v_invoice.customer_id;

  SELECT * INTO v_job_row
  FROM jobs
  WHERE id = v_invoice.job_id;

  SELECT * INTO v_company
  FROM company_settings
  ORDER BY created_at ASC
  LIMIT 1;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE invoice_id = v_invoice.id;

  -- Resolve customer name: prefer profile, fall back to job snapshot (guest quotes)
  v_customer_name := COALESCE(
    v_profile.full_name,
    v_job_row.customer_name,
    ''
  );

  RETURN jsonb_build_object(
    'success', true,
    'invoice', jsonb_build_object(
      'id',             v_invoice.id,
      'invoice_number', v_invoice.invoice_number,
      'status',         v_invoice.status,
      'issue_date',     COALESCE(v_invoice.issue_date::text, v_invoice.created_at::text),
      'due_date',       v_invoice.due_date,
      'subtotal',       v_invoice.subtotal,
      'tax_rate',       v_invoice.tax_rate,
      'tax_amount',     v_invoice.tax_amount,
      'total_amount',   v_invoice.total_amount,
      'amount_paid',    v_total_paid,
      'balance_due',    GREATEST(v_invoice.total_amount - v_total_paid, 0),
      'notes',          v_invoice.notes,
      'line_items',     v_invoice.line_items,
      'customer_name',  v_customer_name,
      'service_type',   COALESCE(v_job_row.service_type, '')
    ),
    'customer', jsonb_build_object(
      'name',  v_customer_name,
      'email', COALESCE(v_profile.email, v_job_row.customer_email, ''),
      'phone', COALESCE(v_profile.phone, v_job_row.customer_phone, '')
    ),
    'company', jsonb_build_object(
      'business_name', COALESCE(v_company.business_name, 'BudgetWorks'),
      'phone',         COALESCE(v_company.phone, ''),
      'email',         COALESCE(v_company.email, '')
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_invoice_by_token(text) TO anon, authenticated;

-- ============================================================
-- 2. Fix get_quote_by_token — split expired vs invalid errors
-- ============================================================

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

  -- Check if token exists at all (ignoring expiry/revocation for now)
  SELECT * INTO v_link
  FROM quote_access_links
  WHERE token_hash = v_token_hash;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or revoked token'
    );
  END IF;

  -- Token exists — check revocation
  IF v_link.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or revoked token'
    );
  END IF;

  -- Token exists and not revoked — check expiry separately for clear messaging
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
