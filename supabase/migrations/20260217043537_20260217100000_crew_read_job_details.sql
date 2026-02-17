/*
  # Allow Crew to Read Job-Related Data

  1. Problem
    - Crew can view jobs table via RLS
    - But crew CANNOT read related service_requests or quotes
    - AvailableJobs component fails to load because related data returns null
    - Result: No available jobs displayed to crew

  2. Solution
    - Add SELECT policy on service_requests for crew
    - Add SELECT policy on quotes for crew
    - Crew can only read these if associated job is:
      a) Open for marketplace claims (is_open_for_claims=true), OR
      b) Job they're assigned to (in assigned_crew_ids)

  3. Security Notes
    - Read-only access for crew (SELECT only)
    - Limited to jobs crew can legitimately access
    - No UPDATE or INSERT permissions
    - Consistent with existing jobs RLS policy logic
*/

-- Allow crew to read service_requests for jobs they can access
CREATE POLICY "Crew can read service requests for accessible jobs"
  ON service_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'crew'
    )
    AND EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.service_request_id = service_requests.id
      AND (
        jobs.is_open_for_claims = true
        OR auth.uid() = ANY(jobs.assigned_crew_ids)
      )
    )
  );

-- Allow crew to read quotes for jobs they can access
CREATE POLICY "Crew can read quotes for accessible jobs"
  ON quotes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'crew'
    )
    AND EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.quote_id = quotes.id
      AND (
        jobs.is_open_for_claims = true
        OR auth.uid() = ANY(jobs.assigned_crew_ids)
      )
    )
  );

-- Add helpful comments
COMMENT ON POLICY "Crew can read service requests for accessible jobs" ON service_requests 
IS 'Allows crew to view service request details for jobs they can claim or are assigned to';

COMMENT ON POLICY "Crew can read quotes for accessible jobs" ON quotes 
IS 'Allows crew to view quote details for jobs they can claim or are assigned to';
