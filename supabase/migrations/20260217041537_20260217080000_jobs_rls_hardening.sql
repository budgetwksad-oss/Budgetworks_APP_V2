/*
  # Jobs RLS Hardening - Remove Crew UPDATE Abilities

  1. Security Changes
    - Drop overly-broad crew policies that allow direct job updates
    - Replace with strict SELECT-only policy for crew
    - Crew can only view:
      a) Jobs open for marketplace claims (is_open_for_claims = true)
      b) Jobs they are assigned to (their ID in assigned_crew_ids)
    - Crew cannot UPDATE jobs directly (must use claim_job_position RPC)

  2. Policies Removed
    - "Crew can read assigned jobs" (too broad)
    - "Crew can claim open positions" (allows UPDATE)
    - "Crew can update assigned jobs" (allows UPDATE)

  3. Policies Added
    - "Crew can read marketplace or assigned jobs" (SELECT only, restricted)

  4. Notes
    - Admin policies remain unchanged
    - Claiming jobs still works via claim_job_position security definer RPC
    - This prevents crew from modifying job status, photos, or other fields directly
*/

-- Drop existing crew policies on jobs table
DROP POLICY IF EXISTS "Crew can read assigned jobs" ON jobs;
DROP POLICY IF EXISTS "Crew can claim open positions" ON jobs;
DROP POLICY IF EXISTS "Crew can update assigned jobs" ON jobs;

-- Create restrictive SELECT-only policy for crew
CREATE POLICY "Crew can read marketplace or assigned jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'crew'
    )
    AND (
      jobs.is_open_for_claims = true
      OR auth.uid() = ANY(jobs.assigned_crew_ids)
    )
  );
