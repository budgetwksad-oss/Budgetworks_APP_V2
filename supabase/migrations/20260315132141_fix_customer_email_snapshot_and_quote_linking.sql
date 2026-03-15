/*
  # Fix customer_email_snapshot on quotes + improve guest record linking

  ## Problem
  1. customer_email_snapshot is never populated when admins create quotes via CreateQuote.
     This means link_guest_records_to_user can't match quotes to newly registered customers.
  2. Quotes linked via service_request (authenticated customer) have customer_id on
     service_request but NOT customer_user_id on quotes. The customer portal queries
     customer_user_id directly so those quotes are invisible.

  ## Fix
  1. Add trigger: when a quote is inserted/updated with a linked public_quote_request
     or service_request, auto-populate customer_email_snapshot from the linked record.
  2. Update link_guest_records_to_user to also link quotes via service_request.customer_id
     (for authenticated customers whose service requests were quoted by admin).
  3. Backfill customer_email_snapshot for existing quotes.
  4. Backfill customer_user_id for existing quotes linked to service_requests.
*/

-- ── 1. Auto-populate customer_email_snapshot via trigger ────────────────────

CREATE OR REPLACE FUNCTION populate_quote_email_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email text;
  v_customer_id uuid;
BEGIN
  -- From public_quote_request
  IF NEW.public_quote_request_id IS NOT NULL THEN
    SELECT contact_email INTO v_email
    FROM public_quote_requests
    WHERE id = NEW.public_quote_request_id;
    NEW.customer_email_snapshot := lower(trim(v_email));
    RETURN NEW;
  END IF;

  -- From service_request (authenticated customer)
  IF NEW.service_request_id IS NOT NULL THEN
    SELECT customer_id INTO v_customer_id
    FROM service_requests
    WHERE id = NEW.service_request_id;

    IF v_customer_id IS NOT NULL THEN
      -- Set customer_user_id directly since we have the user id
      NEW.customer_user_id := v_customer_id;
      -- Also grab email for snapshot
      SELECT email INTO v_email
      FROM auth.users
      WHERE id = v_customer_id;
      NEW.customer_email_snapshot := lower(trim(v_email));
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_email_snapshot ON public.quotes;
CREATE TRIGGER trg_quote_email_snapshot
  BEFORE INSERT OR UPDATE OF public_quote_request_id, service_request_id
  ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION populate_quote_email_snapshot();

-- ── 2. Backfill existing quotes ─────────────────────────────────────────────

-- Backfill from public_quote_requests
UPDATE public.quotes q
SET customer_email_snapshot = lower(trim(pqr.contact_email))
FROM public.public_quote_requests pqr
WHERE q.public_quote_request_id = pqr.id
  AND q.customer_email_snapshot IS NULL
  AND pqr.contact_email IS NOT NULL AND pqr.contact_email != '';

-- Backfill customer_user_id + email_snapshot from service_requests
UPDATE public.quotes q
SET
  customer_user_id = sr.customer_id,
  customer_email_snapshot = lower(trim(au.email))
FROM public.service_requests sr
JOIN auth.users au ON au.id = sr.customer_id
WHERE q.service_request_id = sr.id
  AND (q.customer_user_id IS NULL OR q.customer_email_snapshot IS NULL)
  AND sr.customer_id IS NOT NULL;

-- ── 3. Improve link_guest_records_to_user ────────────────────────────────────
-- Also links quotes whose service_request.customer_id matches the logged-in user

CREATE OR REPLACE FUNCTION link_guest_records_to_user()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id   uuid;
  v_email     text;
  v_leads     integer := 0;
  v_quotes    integer := 0;
  v_invoices  integer := 0;
  v_jobs      integer := 0;
BEGIN
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

  -- 2. quotes via email snapshot
  UPDATE quotes
  SET customer_user_id = v_user_id
  WHERE customer_user_id IS NULL
    AND lower(trim(customer_email_snapshot)) = v_email;
  GET DIAGNOSTICS v_quotes = ROW_COUNT;

  -- 3. quotes via service_request.customer_id (authenticated customers)
  UPDATE quotes q
  SET customer_user_id = v_user_id
  FROM service_requests sr
  WHERE q.service_request_id = sr.id
    AND sr.customer_id = v_user_id
    AND q.customer_user_id IS NULL;

  -- 4. invoices via email snapshot
  UPDATE invoices
  SET customer_user_id = v_user_id
  WHERE customer_user_id IS NULL
    AND lower(trim(customer_email_snapshot)) = v_email;
  GET DIAGNOSTICS v_invoices = ROW_COUNT;

  -- 5. jobs via customer_email
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

GRANT EXECUTE ON FUNCTION link_guest_records_to_user() TO authenticated;
