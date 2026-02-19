/*
  # Invoice Magic Links and Payment Recording

  ## Summary
  Adds guest-friendly invoice access via magic links and RPC-based payment recording.

  ## New Tables

  ### invoice_access_links
  Stores hashed tokens for secure magic link invoice access (no direct public select).
  - id: primary key
  - invoice_id: references invoices(id), cascades on delete
  - token_hash: SHA-256 hash of the raw token (unique)
  - expires_at: when the link expires
  - revoked_at: nullable, set when admin revokes the link
  - created_at: timestamp

  ## New RPCs (SECURITY DEFINER)

  1. create_invoice_magic_link(p_invoice_id, p_expires_at) -> jsonb
     - Admin only (checks profiles.role = 'admin')
     - Generates a random token, stores its SHA-256 hash
     - Returns { token, url }

  2. get_invoice_by_token(p_token) -> jsonb
     - Callable by anon
     - Validates token hash, expiry, and revocation
     - Returns sanitized invoice payload (no PII leakage beyond what customer would see)

  3. record_invoice_payment(p_invoice_id, p_amount, p_method, p_reference, p_notes) -> jsonb
     - Admin only
     - Inserts into existing payments table
     - Recomputes amount_paid, balance_due on invoices
     - Updates invoice status to paid/partial/unpaid

  ## Security
  - invoice_access_links: RLS enabled, no public policies — access only via RPCs
  - payments: already has RLS; new admin-only policies added
  - All RPCs use SECURITY DEFINER with explicit search_path

  ## Notes
  - The existing payments table uses columns: payment_date, amount, payment_method, reference_number, notes, recorded_by
  - The existing invoices table uses: amount_paid, balance_due, status, due_date
  - No existing columns are modified
*/

-- ─── A) Create invoice_access_links ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoice_access_links (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  token_hash  text        NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE invoice_access_links ENABLE ROW LEVEL SECURITY;

-- No public SELECT policy — access only via RPCs

-- ─── B) Payments table — add admin policies if not already present ────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payments' AND policyname = 'Admin can select payments'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Admin can select payments"
        ON payments FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          )
        )
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payments' AND policyname = 'Admin can insert payments'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Admin can insert payments"
        ON payments FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          )
        )
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payments' AND policyname = 'Admin can update payments'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Admin can update payments"
        ON payments FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          )
        )
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payments' AND policyname = 'Admin can delete payments'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Admin can delete payments"
        ON payments FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          )
        )
    $pol$;
  END IF;
END $$;

-- ─── D1) create_invoice_magic_link ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_invoice_magic_link(
  p_invoice_id uuid,
  p_expires_at  timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role   text;
  v_token  text;
  v_hash   text;
BEGIN
  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  v_token := encode(gen_random_bytes(32), 'base64');
  v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');

  v_hash := encode(digest(v_token, 'sha256'), 'hex');

  INSERT INTO invoice_access_links (invoice_id, token_hash, expires_at)
  VALUES (p_invoice_id, v_hash, p_expires_at);

  RETURN jsonb_build_object(
    'token', v_token,
    'invoice_id', p_invoice_id,
    'expires_at', p_expires_at
  );
END;
$$;

-- ─── D2) get_invoice_by_token ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_invoice_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash      text;
  v_link      invoice_access_links%ROWTYPE;
  v_invoice   invoices%ROWTYPE;
  v_profile   profiles%ROWTYPE;
  v_job_row   jobs%ROWTYPE;
BEGIN
  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_link
  FROM invoice_access_links
  WHERE token_hash = v_hash;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;

  IF v_link.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Token has been revoked';
  END IF;

  IF v_link.expires_at < now() THEN
    RAISE EXCEPTION 'Token has expired';
  END IF;

  SELECT * INTO v_invoice
  FROM invoices
  WHERE id = v_link.invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  SELECT * INTO v_profile
  FROM profiles
  WHERE id = v_invoice.customer_id;

  SELECT * INTO v_job_row
  FROM jobs
  WHERE id = v_invoice.job_id;

  RETURN jsonb_build_object(
    'id',             v_invoice.id,
    'invoice_number', v_invoice.invoice_number,
    'status',         v_invoice.status,
    'issue_date',     v_invoice.issue_date,
    'due_date',       v_invoice.due_date,
    'subtotal',       v_invoice.subtotal,
    'tax_rate',       v_invoice.tax_rate,
    'tax_amount',     v_invoice.tax_amount,
    'total_amount',   v_invoice.total_amount,
    'amount_paid',    v_invoice.amount_paid,
    'balance_due',    v_invoice.balance_due,
    'notes',          v_invoice.notes,
    'line_items',     v_invoice.line_items,
    'created_at',     v_invoice.created_at,
    'customer', jsonb_build_object(
      'name',  v_profile.full_name,
      'email', v_profile.email,
      'phone', v_profile.phone
    ),
    'service_type', COALESCE(v_job_row.service_type, '')
  );
END;
$$;

-- ─── D3) record_invoice_payment ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION record_invoice_payment(
  p_invoice_id uuid,
  p_amount     numeric,
  p_method     text,
  p_reference  text DEFAULT NULL,
  p_notes      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role          text;
  v_invoice       invoices%ROWTYPE;
  v_paid_total    numeric;
  v_balance       numeric;
  v_new_status    text;
BEGIN
  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than 0';
  END IF;

  IF p_method NOT IN ('cash', 'etransfer', 'credit_card', 'debit', 'cheque', 'other') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  SELECT * INTO v_invoice
  FROM invoices
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  INSERT INTO payments (
    invoice_id,
    amount,
    payment_method,
    reference_number,
    notes,
    recorded_by,
    payment_date
  ) VALUES (
    p_invoice_id,
    p_amount,
    p_method,
    p_reference,
    p_notes,
    auth.uid(),
    CURRENT_DATE
  );

  SELECT COALESCE(SUM(amount), 0) INTO v_paid_total
  FROM payments
  WHERE invoice_id = p_invoice_id;

  v_balance := GREATEST(v_invoice.total_amount - v_paid_total, 0);

  IF v_balance = 0 THEN
    v_new_status := 'paid';
  ELSIF v_paid_total > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := CASE
      WHEN v_invoice.status IN ('draft', 'cancelled') THEN v_invoice.status
      ELSE 'unpaid'
    END;
  END IF;

  UPDATE invoices
  SET
    amount_paid  = v_paid_total,
    balance_due  = v_balance,
    status       = v_new_status,
    updated_at   = now()
  WHERE id = p_invoice_id;

  RETURN jsonb_build_object(
    'invoice_id',   p_invoice_id,
    'amount_paid',  v_paid_total,
    'balance_due',  v_balance,
    'status',       v_new_status
  );
END;
$$;

-- ─── E) Grants ────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION get_invoice_by_token(text)                                          TO anon;
GRANT EXECUTE ON FUNCTION create_invoice_magic_link(uuid, timestamptz)                        TO authenticated;
GRANT EXECUTE ON FUNCTION record_invoice_payment(uuid, numeric, text, text, text)             TO authenticated;
