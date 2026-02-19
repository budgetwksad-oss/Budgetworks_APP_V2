/*
  # Link Guest Records to Authenticated User (RPC)

  ## Summary
  Creates an RPC function that, when called by an authenticated user, finds all
  guest-created records matching their email and stamps them with their user ID.
  Also adds customer-facing SELECT policies so linked records become readable
  through the portal.

  ## Changes

  ### 1. RPC: link_guest_records_to_user()
  - Security definer function callable by any authenticated user
  - Resolves caller email from auth.jwt() ->> 'email'
  - Updates public_quote_requests, quotes, invoices, jobs where:
    - customer_user_id IS NULL (not yet linked)
    - email field matches caller email (case-insensitive)
  - Returns jsonb with counts: { leads_linked, quotes_linked, invoices_linked, jobs_linked }

  ### 2. Additive RLS Policies
  - quotes: customers can SELECT rows where customer_user_id = auth.uid()
  - invoices: customers can SELECT rows where customer_user_id = auth.uid()
  - jobs: customers can SELECT rows where customer_user_id = auth.uid()

  ## Notes
  - No existing policies are removed or modified
  - Function uses SECURITY DEFINER so it can write across tables regardless of caller RLS
  - search_path is locked to public for security
*/

-- ============================================================
-- RPC: link_guest_records_to_user
-- ============================================================
CREATE OR REPLACE FUNCTION public.link_guest_records_to_user()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid;
  v_email     text;
  v_leads     integer := 0;
  v_quotes    integer := 0;
  v_invoices  integer := 0;
  v_jobs      integer := 0;
BEGIN
  -- Require authenticated caller
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_email := lower(trim(auth.jwt() ->> 'email'));
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'No email found in JWT';
  END IF;

  -- 1. public_quote_requests
  UPDATE public_quote_requests
  SET customer_user_id = v_user_id
  WHERE customer_user_id IS NULL
    AND lower(trim(contact_email)) = v_email;
  GET DIAGNOSTICS v_leads = ROW_COUNT;

  -- 2. quotes (match on customer_email_snapshot)
  UPDATE quotes
  SET customer_user_id = v_user_id
  WHERE customer_user_id IS NULL
    AND lower(trim(customer_email_snapshot)) = v_email;
  GET DIAGNOSTICS v_quotes = ROW_COUNT;

  -- 3. invoices (match on customer_email_snapshot)
  UPDATE invoices
  SET customer_user_id = v_user_id
  WHERE customer_user_id IS NULL
    AND lower(trim(customer_email_snapshot)) = v_email;
  GET DIAGNOSTICS v_invoices = ROW_COUNT;

  -- 4. jobs (match on customer_email if column exists, else skip gracefully)
  BEGIN
    UPDATE jobs
    SET customer_user_id = v_user_id
    WHERE customer_user_id IS NULL
      AND lower(trim(customer_email)) = v_email;
    GET DIAGNOSTICS v_jobs = ROW_COUNT;
  EXCEPTION
    WHEN undefined_column THEN
      v_jobs := 0;
  END;

  RETURN jsonb_build_object(
    'leads_linked',    v_leads,
    'quotes_linked',   v_quotes,
    'invoices_linked', v_invoices,
    'jobs_linked',     v_jobs
  );
END;
$$;

-- Allow any authenticated user to call the function
REVOKE ALL ON FUNCTION public.link_guest_records_to_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_guest_records_to_user() TO authenticated;

-- ============================================================
-- Additive RLS SELECT policies for customer portal access
-- ============================================================

-- quotes: customer can see their own linked quotes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quotes'
      AND policyname = 'Customers can view their linked quotes'
  ) THEN
    CREATE POLICY "Customers can view their linked quotes"
      ON quotes
      FOR SELECT
      TO authenticated
      USING (customer_user_id = auth.uid());
  END IF;
END $$;

-- invoices: customer can see their own linked invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'invoices'
      AND policyname = 'Customers can view their linked invoices'
  ) THEN
    CREATE POLICY "Customers can view their linked invoices"
      ON invoices
      FOR SELECT
      TO authenticated
      USING (customer_user_id = auth.uid());
  END IF;
END $$;

-- jobs: customer can see their own linked jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'jobs'
      AND policyname = 'Customers can view their linked jobs'
  ) THEN
    CREATE POLICY "Customers can view their linked jobs"
      ON jobs
      FOR SELECT
      TO authenticated
      USING (customer_user_id = auth.uid());
  END IF;
END $$;
