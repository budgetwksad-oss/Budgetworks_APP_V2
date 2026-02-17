/*
  # Fix Profiles Infinite Recursion with Helper Function

  1. Problem
    - Multiple policies on profiles table query profiles table recursively
    - This causes "infinite recursion detected in policy" error
    - Affects: initial migration policies + admin management policies

  2. Solution
    - Create security definer function to check user role (bypasses RLS)
    - Drop ALL existing policies that cause recursion
    - Recreate policies using the helper function
    - Function runs with elevated privileges to avoid RLS recursion

  3. Security
    - Function is security definer but only returns role for current user
    - Cannot be exploited to check other users' roles
    - Policies remain restrictive using this helper
*/

-- Create helper function to get current user's role (security definer bypasses RLS)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Drop ALL existing policies on profiles (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin users can update all profiles" ON profiles;

-- Recreate clean, non-recursive policies

-- Policy: Users can read own profile OR admins can read all
CREATE POLICY "Users read own profile or admin reads all"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR get_my_role() = 'admin'
  );

-- Policy: Users can update own profile OR admins can update all
CREATE POLICY "Users update own profile or admin updates all"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR get_my_role() = 'admin'
  )
  WITH CHECK (
    id = auth.uid()
    OR get_my_role() = 'admin'
  );

-- Policy: New users can insert their own profile during signup
CREATE POLICY "Users insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Grant execute on helper function
GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_my_role IS 'Returns the role of the currently authenticated user. Security definer to avoid RLS recursion.';
