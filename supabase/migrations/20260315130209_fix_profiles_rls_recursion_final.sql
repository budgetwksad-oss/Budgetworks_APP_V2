/*
  # Fix profiles RLS infinite recursion — definitive fix

  ## Problem
  The profiles SELECT and UPDATE policies contain:
    EXISTS (SELECT 1 FROM profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'admin')
  This causes infinite recursion: reading profiles → triggers profiles RLS → reads
  profiles p2 again → triggers profiles RLS → ...

  ## Solution
  Replace the self-referential subquery with get_my_role() which is SECURITY DEFINER
  and therefore bypasses RLS when reading profiles. This breaks the recursion cycle.

  ## Security
  - Users can still only read their own profile (id = auth.uid())
  - Admins can read all profiles (get_my_role() = 'admin')
  - get_my_role() is SECURITY DEFINER but only returns the role for auth.uid()
*/

DROP POLICY IF EXISTS "Users read own profile or admin reads all" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile or admin updates all" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;

CREATE POLICY "Users read own profile or admin reads all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = (select auth.uid())
    OR get_my_role() = 'admin'
  );

CREATE POLICY "Users update own profile or admin updates all"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    id = (select auth.uid())
    OR get_my_role() = 'admin'
  )
  WITH CHECK (
    id = (select auth.uid())
    OR get_my_role() = 'admin'
  );

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));
