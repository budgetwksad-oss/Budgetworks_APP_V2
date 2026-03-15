/*
  # Add IP Address and Rate Limiting to Public Quote Requests

  ## Summary
  Adds lightweight spam protection to the public quote submission system.

  ## Changes

  ### Modified Tables
  - `public_quote_requests`
    - New column: `ip_address` (text, nullable) — stores the submitter's IP for rate limiting

  ### New Functions
  - `check_quote_rate_limit(p_ip text)` — returns TRUE if the given IP has submitted
    fewer than 3 quote requests in the past 60 minutes, FALSE otherwise.
    This is a SECURITY DEFINER function callable by anon/authenticated roles.

  ## Notes
  - Only public (unauthenticated / anon) submissions use the IP check.
  - Admin-created quotes bypass this entirely (they use authenticated sessions and a different code path).
  - The column is nullable so existing rows are unaffected.
*/

-- 1. Add ip_address column (nullable, so no existing rows are broken)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'public_quote_requests' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE public_quote_requests ADD COLUMN ip_address text;
  END IF;
END $$;

-- 2. Index to speed up rate-limit queries
CREATE INDEX IF NOT EXISTS idx_public_quote_requests_ip_created
  ON public_quote_requests (ip_address, created_at);

-- 3. Rate-limit checker function
CREATE OR REPLACE FUNCTION check_quote_rate_limit(p_ip text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Null / empty IP: allow (graceful fallback)
  IF p_ip IS NULL OR p_ip = '' THEN
    RETURN true;
  END IF;

  SELECT COUNT(*)
    INTO v_count
    FROM public_quote_requests
   WHERE ip_address = p_ip
     AND created_at >= now() - interval '1 hour';

  RETURN v_count < 3;
END;
$$;

-- Grant execute to anon and authenticated so the client can call it
GRANT EXECUTE ON FUNCTION check_quote_rate_limit(text) TO anon, authenticated;
