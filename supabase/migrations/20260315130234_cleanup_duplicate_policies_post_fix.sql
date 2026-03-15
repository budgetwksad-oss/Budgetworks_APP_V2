/*
  # Cleanup remaining duplicate permissive policies

  ## Summary
  After the security fix migrations, a few tables still have duplicate SELECT
  policies that survived. This migration removes the old ones, leaving only
  the unified consolidated policy per action.
*/

-- notification_preferences: drop the two old separate SELECT policies
-- keeping only "View notification preferences" which covers both cases
DROP POLICY IF EXISTS "Admins view all preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users view own preferences" ON public.notification_preferences;

-- communication_log: drop old admin SELECT (kept from a prior migration run)
-- "View communication log" already covers admin + customer
DROP POLICY IF EXISTS "Admins view all communication logs" ON public.communication_log;

-- invoice_access_links: drop old SELECT, keep the get_my_role version
DROP POLICY IF EXISTS "Admins view invoice access links" ON public.invoice_access_links;

-- quote_access_links: drop old SELECT if duplicate exists
DROP POLICY IF EXISTS "Admins can view quote access links" ON public.quote_access_links;
