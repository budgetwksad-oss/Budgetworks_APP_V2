/*
  # Magic Link Quoting System

  1. Overview
    Enables secure magic-link based quote acceptance/decline for guest leads without login.
    - Admin sends quote → generates /q/:token URL
    - Public can view and respond to quote via token (no authentication required)
    - Accept creates exactly one job (scheduled_draft) idempotently
    - All operations are secure, auditable, and RLS-compliant

  2. Schema Changes

    A) Extend quotes table:
      - public_quote_request_id: Link to guest quote request
      - estimate_low/high/expected/cap: Flexible pricing fields
      - pricing_snapshot: Store full pricing details
      - status: Add 'draft' to existing constraint
      - accepted_at/declined_at: Audit timestamps
      - accepted_method: Track how quote was accepted (magic_link or phone)

    B) New table: quote_access_links
      - Stores hashed tokens for secure magic link access
      - Expiration and revocation support
      - One-way hash prevents token exposure

    C) Extend jobs table:
      - customer_name/email/phone: Guest customer snapshot
      - service_type: Service category snapshot
      - source_quote_id: Enables idempotent job creation

  3. RPC Functions (callable by anon)
    - create_quote_magic_link: Generate secure token (admin only)
    - get_quote_by_token: View quote details via token
    - respond_to_quote_by_token: Accept/decline with idempotent job creation

  4. Security
    - RLS enabled on all tables
    - Tokens are hashed (SHA-256)
    - Functions use SECURITY DEFINER with explicit checks
    - Idempotent accept prevents duplicate jobs
*/

-- =====================================================
-- A) EXTEND QUOTES TABLE
-- =====================================================

-- Add new columns for guest leads and flexible pricing
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS public_quote_request_id uuid REFERENCES public_quote_requests(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS estimate_low numeric(10,2),
ADD COLUMN IF NOT EXISTS estimate_high numeric(10,2),
ADD COLUMN IF NOT EXISTS expected_price numeric(10,2),
ADD COLUMN IF NOT EXISTS cap_amount numeric(10,2),
ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb,
ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
ADD COLUMN IF NOT EXISTS declined_at timestamptz,
ADD COLUMN IF NOT EXISTS accepted_method text;

-- Add check constraint for accepted_method
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quotes_accepted_method_check'
  ) THEN
    ALTER TABLE quotes
    ADD CONSTRAINT quotes_accepted_method_check
    CHECK (accepted_method IN ('magic_link', 'phone'));
  END IF;
END $$;

-- Update status constraint to include 'draft'
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes
ADD CONSTRAINT quotes_status_check
CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired'));

-- Update default status to 'draft'
ALTER TABLE quotes ALTER COLUMN status SET DEFAULT 'draft';

-- =====================================================
-- B) CREATE QUOTE_ACCESS_LINKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS quote_access_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Unique constraint on token hash
CREATE UNIQUE INDEX IF NOT EXISTS quote_access_links_token_hash_idx 
ON quote_access_links(token_hash);

-- Index for quick quote lookup
CREATE INDEX IF NOT EXISTS quote_access_links_quote_id_idx 
ON quote_access_links(quote_id);

-- Enable RLS
ALTER TABLE quote_access_links ENABLE ROW LEVEL SECURITY;

-- No public SELECT policy - access only through RPC functions

-- =====================================================
-- C) EXTEND JOBS TABLE
-- =====================================================

-- Add guest customer snapshot fields
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS customer_email text,
ADD COLUMN IF NOT EXISTS customer_phone text,
ADD COLUMN IF NOT EXISTS service_type text,
ADD COLUMN IF NOT EXISTS source_quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL;

-- Add check constraint for service_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'jobs_service_type_check'
  ) THEN
    ALTER TABLE jobs
    ADD CONSTRAINT jobs_service_type_check
    CHECK (service_type IN ('moving', 'junk_removal', 'demolition'));
  END IF;
END $$;

-- Add unique constraint on source_quote_id for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS jobs_source_quote_id_idx 
ON jobs(source_quote_id) 
WHERE source_quote_id IS NOT NULL;

-- =====================================================
-- D) RPC FUNCTIONS
-- =====================================================

-- -----------------------------------------------------
-- 1) CREATE_QUOTE_MAGIC_LINK
-- Generate secure magic link token (admin only)
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION create_quote_magic_link(
  p_quote_id uuid,
  p_expires_at timestamptz DEFAULT (now() + interval '7 days')
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_token_hash text;
  v_caller_role text;
  v_link_id uuid;
BEGIN
  -- Check if caller is admin
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create quote magic links';
  END IF;

  -- Verify quote exists
  IF NOT EXISTS (SELECT 1 FROM quotes WHERE id = p_quote_id) THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  -- Generate random token (32 bytes = 256 bits, base64url encoded)
  v_token := encode(gen_random_bytes(32), 'base64');
  v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');

  -- Hash the token for storage (SHA-256)
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  -- Store the hashed token
  INSERT INTO quote_access_links (quote_id, token_hash, expires_at)
  VALUES (p_quote_id, v_token_hash, p_expires_at)
  RETURNING id INTO v_link_id;

  -- Return the raw token (only time it's visible)
  RETURN jsonb_build_object(
    'success', true,
    'token', v_token,
    'link_id', v_link_id,
    'expires_at', p_expires_at,
    'magic_url', '/q/' || v_token
  );
END;
$$;

-- -----------------------------------------------------
-- 2) GET_QUOTE_BY_TOKEN
-- Retrieve quote details via magic link token (anon allowed)
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION get_quote_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_hash text;
  v_link record;
  v_quote record;
  v_service_request record;
  v_public_request record;
BEGIN
  -- Hash the provided token
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  -- Find valid link
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

  -- Get quote details
  SELECT * INTO v_quote
  FROM quotes
  WHERE id = v_link.quote_id;

  -- Get service request if exists
  IF v_quote.service_request_id IS NOT NULL THEN
    SELECT * INTO v_service_request
    FROM service_requests
    WHERE id = v_quote.service_request_id;
  END IF;

  -- Get public quote request if exists
  IF v_quote.public_quote_request_id IS NOT NULL THEN
    SELECT * INTO v_public_request
    FROM public_quote_requests
    WHERE id = v_quote.public_quote_request_id;
  END IF;

  -- Return sanitized quote data
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
        'name', v_public_request.customer_name,
        'email', v_public_request.customer_email,
        'phone', v_public_request.customer_phone
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
        'description', v_public_request.service_description,
        'pickup_address', v_public_request.pickup_address,
        'dropoff_address', v_public_request.dropoff_address,
        'preferred_date', v_public_request.preferred_date
      )
      WHEN v_service_request IS NOT NULL THEN jsonb_build_object(
        'service_type', v_service_request.service_type,
        'description', v_service_request.service_description,
        'pickup_address', v_service_request.pickup_address,
        'dropoff_address', v_service_request.dropoff_address,
        'preferred_date', v_service_request.preferred_date
      )
      ELSE NULL
    END
  );
END;
$$;

-- -----------------------------------------------------
-- 3) RESPOND_TO_QUOTE_BY_TOKEN
-- Accept or decline quote via token (anon allowed)
-- Creates job idempotently on accept
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION respond_to_quote_by_token(
  p_token text,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  -- Validate action
  IF p_action NOT IN ('accept', 'decline') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid action. Must be accept or decline'
    );
  END IF;

  -- Hash the provided token
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  -- Find valid link
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

  -- Get quote details
  SELECT * INTO v_quote
  FROM quotes
  WHERE id = v_link.quote_id;

  -- Check if quote is already responded to
  IF v_quote.status IN ('accepted', 'declined') THEN
    -- Already processed - return idempotent response
    IF v_quote.status = 'accepted' AND p_action = 'accept' THEN
      -- Find existing job
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

  -- Get related data
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

  -- Process action
  IF p_action = 'accept' THEN
    -- Update quote status
    UPDATE quotes
    SET 
      status = 'accepted',
      accepted_at = now(),
      accepted_method = 'magic_link',
      updated_at = now()
    WHERE id = v_quote.id;

    -- Create job idempotently (unique constraint on source_quote_id prevents duplicates)
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
      COALESCE(v_service_request_id, v_quote.id), -- Use quote_id as fallback for guest quotes
      COALESCE(v_customer_id, v_quote.id), -- Use quote_id as placeholder for guest customers
      'scheduled_draft',
      COALESCE(v_public_request.customer_name, v_service_request.customer_name),
      COALESCE(v_public_request.customer_email, (SELECT email FROM auth.users WHERE id = v_customer_id)),
      COALESCE(v_public_request.customer_phone, v_service_request.customer_phone),
      COALESCE(v_public_request.service_type, v_service_request.service_type),
      v_quote.id,
      COALESCE(v_quote.expected_price, v_quote.total_amount)
    )
    ON CONFLICT (source_quote_id) DO NOTHING
    RETURNING id INTO v_job_id;

    -- If ON CONFLICT triggered, get existing job_id
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
    -- Update quote status
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

-- =====================================================
-- E) GRANTS AND PERMISSIONS
-- =====================================================

-- Grant execute on functions to anon and authenticated
GRANT EXECUTE ON FUNCTION get_quote_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION respond_to_quote_by_token(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_quote_magic_link(uuid, timestamptz) TO authenticated;

-- Add helpful comments
COMMENT ON TABLE quote_access_links IS 'Stores hashed tokens for secure magic link quote access';
COMMENT ON FUNCTION create_quote_magic_link IS 'Admin-only: Generate secure magic link token for quote';
COMMENT ON FUNCTION get_quote_by_token IS 'Public: Retrieve quote details via magic link token';
COMMENT ON FUNCTION respond_to_quote_by_token IS 'Public: Accept or decline quote via token, creates job idempotently';
