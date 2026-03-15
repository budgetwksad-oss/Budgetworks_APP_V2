/*
  # Fix get_my_role() infinite recursion

  ## Problem
  The get_my_role() function queries the profiles table.
  Many RLS policies on other tables call get_my_role().
  When the profiles table itself has RLS policies that call get_my_role()
  (or when loading a profile triggers policies that call get_my_role()),
  Postgres detects infinite recursion.

  ## Fix
  Recreate get_my_role() as SECURITY DEFINER with a fixed search_path.
  SECURITY DEFINER functions run as the function owner (postgres/superuser),
  which bypasses RLS entirely when reading profiles. This is the standard
  Supabase pattern for breaking RLS recursion.
*/

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;
