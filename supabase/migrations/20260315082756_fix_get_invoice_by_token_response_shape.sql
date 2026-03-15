/*
  # Fix get_invoice_by_token RPC Response Shape

  ## Problem
  The existing `get_invoice_by_token` function returns invoice fields at the root of the JSONB
  object (e.g. `{ id, invoice_number, ... }`). The frontend (`InvoiceMagicLink.tsx`) expects a
  wrapped response: `{ success: true, invoice: {...}, company: {...} }`.

  ## Changes
  - Drop and recreate `get_invoice_by_token` to return the correct shape:
    `{ success: true, invoice: { all invoice fields }, company: { business_name, phone, email } }`
  - Also include `customer_name` on the invoice object for convenience
  - Company info is pulled from `company_settings` (first row)
  - All existing security checks (token hash, expiry, revocation) are preserved
*/

CREATE OR REPLACE FUNCTION get_invoice_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash        text;
  v_link        invoice_access_links%ROWTYPE;
  v_invoice     invoices%ROWTYPE;
  v_profile     profiles%ROWTYPE;
  v_job_row     jobs%ROWTYPE;
  v_company     company_settings%ROWTYPE;
  v_total_paid  numeric;
BEGIN
  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_link
  FROM invoice_access_links
  WHERE token_hash = v_hash;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token');
  END IF;

  IF v_link.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token has been revoked');
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

  -- Compute total paid from payments table for accuracy
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE invoice_id = v_invoice.id;

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
      'customer_name',  v_profile.full_name,
      'service_type',   COALESCE(v_job_row.service_type, '')
    ),
    'customer', jsonb_build_object(
      'name',  v_profile.full_name,
      'email', v_profile.email,
      'phone', v_profile.phone
    ),
    'company', jsonb_build_object(
      'business_name', COALESCE(v_company.business_name, 'BudgetWorks'),
      'phone',         COALESCE(v_company.phone, ''),
      'email',         COALESCE(v_company.email, '')
    )
  );
END;
$$;
