/*
  # Allow Admins to Manage All Profiles

  1. Problem
    - Admins cannot see crew members in Crew Management page
    - Admins cannot assign crew to jobs
    - profiles table only has policies for users to read/update their own profile
    - No policy exists for admins to read all profiles

  2. Solution
    - Add SELECT policy for admins to read all profiles
    - Add UPDATE policy for admins to update all profiles
    - This allows admins to:
      a) View all crew members in Crew Management
      b) Load crew list when assigning to jobs
      c) Update crew qualifications (can_drive, etc.)

  3. Security Notes
    - Only users with role='admin' can access other profiles
    - Existing user policies remain unchanged (users can still manage own profile)
    - Admin policies are restrictive and check role explicitly
*/

-- Allow admins to read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_check
      WHERE admin_check.id = auth.uid()
      AND admin_check.role = 'admin'
    )
  );

-- Allow admins to update all profiles
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_check
      WHERE admin_check.id = auth.uid()
      AND admin_check.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles admin_check
      WHERE admin_check.id = auth.uid()
      AND admin_check.role = 'admin'
    )
  );

-- Add helpful comments
COMMENT ON POLICY "Admins can read all profiles" ON profiles 
IS 'Allows admins to view all user profiles including crew members for management purposes';

COMMENT ON POLICY "Admins can update all profiles" ON profiles 
IS 'Allows admins to update user profiles including crew qualifications and information';
