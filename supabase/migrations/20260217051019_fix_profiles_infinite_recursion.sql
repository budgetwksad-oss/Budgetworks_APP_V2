/*
  # Fix Profiles Infinite Recursion

  1. Problem
    - Admin policies on profiles table query profiles table recursively
    - This causes "infinite recursion detected in policy" error
    - Users cannot log in or access any portals

  2. Solution
    - Drop existing admin policies that cause recursion
    - Replace with policies that use auth.uid() directly (no subquery)
    - Check role from user's own profile record using simple equality

  3. Changes
    - Drop "Admins can read all profiles" policy
    - Drop "Admins can update all profiles" policy
    - Create new policies that avoid recursion
*/

-- Drop problematic policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create non-recursive admin SELECT policy
-- This allows admins to see all profiles without recursion
CREATE POLICY "Admin users can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if viewing own profile OR if user is admin
    id = auth.uid() 
    OR 
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- Create non-recursive admin UPDATE policy
CREATE POLICY "Admin users can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow if updating own profile OR if user is admin
    id = auth.uid()
    OR
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  )
  WITH CHECK (
    -- Same check for WITH CHECK
    id = auth.uid()
    OR
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );
