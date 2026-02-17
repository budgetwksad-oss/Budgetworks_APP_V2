/*
  # Fix Public Quote Requests RLS Policies

  1. Problem
    - RLS policies on public_quote_requests use recursive subqueries
    - These query profiles table which can cause issues
    - Admins cannot see quote requests in admin portal

  2. Solution
    - Update all admin policies to use get_my_role() helper function
    - This avoids recursion and uses the security definer function

  3. Changes
    - Drop existing admin policies
    - Recreate using get_my_role() function
*/

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can read all quote requests" ON public_quote_requests;
DROP POLICY IF EXISTS "Admins can update quote requests" ON public_quote_requests;
DROP POLICY IF EXISTS "Admins can delete quote requests" ON public_quote_requests;

-- Recreate policies using get_my_role() helper

-- Policy: Only admins can SELECT
CREATE POLICY "Admins read all quote requests"
  ON public_quote_requests FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');

-- Policy: Only admins can UPDATE
CREATE POLICY "Admins update quote requests"
  ON public_quote_requests FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Policy: Only admins can DELETE
CREATE POLICY "Admins delete quote requests"
  ON public_quote_requests FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');
