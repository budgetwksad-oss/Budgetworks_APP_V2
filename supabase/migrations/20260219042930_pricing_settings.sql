/*
  # Pricing Settings, Quote Inputs, and Staffing Defaults

  ## Overview
  Adds admin-managed pricing configuration per service type, extends the quotes
  table with structured input and staffing recommendation fields, and updates the
  quote-accept job creation to copy staffing defaults from the quote.

  ## Changes

  ### 1. New table: pricing_settings
  One row per service type (moving, junk_removal, demolition).
  - `id` (uuid, primary key)
  - `service_type` (text, unique) — one of 'moving', 'junk_removal', 'demolition'
  - `settings` (jsonb) — flexible pricing config (tiers, rates, add-ons, etc.)
  - `is_configured` (boolean, default false) — admin has reviewed/saved settings
  - `created_at`, `updated_at`

  Seeded with 3 starter rows (is_configured=false).

  ### 2. quotes table extensions
  Two new nullable columns added safely with IF NOT EXISTS:
  - `quote_inputs` (jsonb) — structured inputs the admin entered when calculating
  - `staffing_defaults` (jsonb) — recommended staffing e.g. {"drivers":1,"helpers":2}

  ### 3. Updated respond_to_quote_by_token function
  Same logic, but when creating the scheduled_draft job on accept, sets
  jobs.staffing_needs = COALESCE(quotes.staffing_defaults, '{"drivers":0,"helpers":0}')
  instead of leaving staffing_needs empty.

  ## Security
  - RLS enabled on pricing_settings
  - Admin-only SELECT/INSERT/UPDATE/DELETE policies
  - No RLS policy changes on existing tables
*/

-- =====================================================
-- A) pricing_settings table
-- =====================================================

CREATE TABLE IF NOT EXISTS pricing_settings (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type text        NOT NULL CHECK (service_type IN ('moving', 'junk_removal', 'demolition')),
  settings     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  is_configured boolean    NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (service_type)
);

ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pricing_settings' AND policyname = 'Admins can select pricing settings'
  ) THEN
    CREATE POLICY "Admins can select pricing settings"
      ON pricing_settings FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pricing_settings' AND policyname = 'Admins can insert pricing settings'
  ) THEN
    CREATE POLICY "Admins can insert pricing settings"
      ON pricing_settings FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pricing_settings' AND policyname = 'Admins can update pricing settings'
  ) THEN
    CREATE POLICY "Admins can update pricing settings"
      ON pricing_settings FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pricing_settings' AND policyname = 'Admins can delete pricing settings'
  ) THEN
    CREATE POLICY "Admins can delete pricing settings"
      ON pricing_settings FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- updated_at trigger (reuse existing function if available, else create minimal one)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_pricing_settings_updated_at'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM pg_proc
      WHERE proname = 'update_updated_at_column'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
      CREATE TRIGGER update_pricing_settings_updated_at
        BEFORE UPDATE ON pricing_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ELSE
      CREATE OR REPLACE FUNCTION set_updated_at_pricing()
      RETURNS trigger LANGUAGE plpgsql AS $fn$
      BEGIN
        NEW.updated_at := now();
        RETURN NEW;
      END;
      $fn$;

      CREATE TRIGGER update_pricing_settings_updated_at
        BEFORE UPDATE ON pricing_settings
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at_pricing();
    END IF;
  END IF;
END $$;

-- Seed starter rows (skipped if already present)
INSERT INTO pricing_settings (service_type, settings, is_configured)
VALUES
  ('moving', '{
    "base_fee": 150,
    "hourly_rate": 95,
    "minimum_hours": 2,
    "truck_fee": 75,
    "additional_stop_fee": 30,
    "long_carry_fee": 25,
    "stair_fee_per_flight": 15,
    "packing_rate_per_box": 5,
    "disassembly_fee": 50,
    "fuel_surcharge_pct": 5,
    "currency": "USD",
    "notes": ""
  }'::jsonb, false),
  ('junk_removal', '{
    "base_fee": 100,
    "quarter_load": 125,
    "half_load": 225,
    "three_quarter_load": 325,
    "full_load": 425,
    "appliance_fee": 35,
    "mattress_fee": 25,
    "tv_fee": 20,
    "hazmat_surcharge": 50,
    "fuel_surcharge_pct": 5,
    "currency": "USD",
    "notes": ""
  }'::jsonb, false),
  ('demolition', '{
    "base_fee": 200,
    "hourly_rate": 110,
    "minimum_hours": 2,
    "debris_disposal_per_load": 120,
    "permit_allowance": 0,
    "dumpster_rental_per_day": 85,
    "hazmat_surcharge": 100,
    "fuel_surcharge_pct": 5,
    "currency": "USD",
    "notes": ""
  }'::jsonb, false)
ON CONFLICT (service_type) DO NOTHING;

-- =====================================================
-- B) Extend quotes table
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'quote_inputs'
  ) THEN
    ALTER TABLE quotes ADD COLUMN quote_inputs jsonb NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'staffing_defaults'
  ) THEN
    ALTER TABLE quotes ADD COLUMN staffing_defaults jsonb NULL;
  END IF;
END $$;

-- =====================================================
-- C) Update respond_to_quote_by_token to copy staffing_defaults
-- =====================================================

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
  v_token_hash       text;
  v_link             record;
  v_quote            record;
  v_service_request  record;
  v_public_request   record;
  v_job_id           uuid;
  v_customer_id      uuid;
  v_service_request_id uuid;
  v_staffing_needs   jsonb;
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

  -- Get related data
  IF v_quote.service_request_id IS NOT NULL THEN
    SELECT * INTO v_service_request
    FROM service_requests
    WHERE id = v_quote.service_request_id;
    v_customer_id        := v_service_request.customer_id;
    v_service_request_id := v_service_request.id;
  END IF;

  IF v_quote.public_quote_request_id IS NOT NULL THEN
    SELECT * INTO v_public_request
    FROM public_quote_requests
    WHERE id = v_quote.public_quote_request_id;
  END IF;

  -- Determine staffing_needs: prefer quote's staffing_defaults, fallback to empty
  v_staffing_needs := COALESCE(
    v_quote.staffing_defaults,
    '{"drivers": 0, "helpers": 0}'::jsonb
  );

  -- Process action
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
      quoted_amount,
      staffing_needs
    )
    VALUES (
      v_quote.id,
      COALESCE(v_service_request_id, v_quote.id),
      COALESCE(v_customer_id, v_quote.id),
      'scheduled_draft',
      COALESCE(v_public_request.customer_name,  v_service_request.customer_name),
      COALESCE(v_public_request.customer_email, (SELECT email FROM auth.users WHERE id = v_customer_id)),
      COALESCE(v_public_request.customer_phone, v_service_request.customer_phone),
      COALESCE(v_public_request.service_type,   v_service_request.service_type),
      v_quote.id,
      COALESCE(v_quote.expected_price, v_quote.total_amount),
      v_staffing_needs
    )
    ON CONFLICT (source_quote_id) DO NOTHING
    RETURNING id INTO v_job_id;

    IF v_job_id IS NULL THEN
      SELECT id INTO v_job_id
      FROM jobs
      WHERE source_quote_id = v_quote.id;
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

    RETURN jsonb_build_object(
      'success',      true,
      'quote_status', 'declined',
      'message',      'Quote declined'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION respond_to_quote_by_token(text, text) TO anon, authenticated;
