/*
  # Add Marketplace Foundation

  1. Jobs Status Enhancement
    - Add 'scheduled_draft' status to jobs table
    - Update CHECK constraint to support new status
    - scheduled_draft: job created but not yet finalized/posted

  2. Crew Pay Range Fields
    - `crew_pay_min` (numeric) - Minimum pay for crew members
    - `crew_pay_max` (numeric) - Maximum pay for crew members
    - `marketplace_posted_at` (timestamptz) - When job was posted to marketplace

  3. Atomic Claim RPC Function
    - `claim_job_position(p_job_id, p_role)` - Safely claim a job position
    - Prevents race conditions with row-level locking
    - Validates capacity and prevents double-claims
    - Updates crew_assignments and assigned_crew_ids
    - Recomputes staffing_status

  4. Security
    - RPC is security definer to bypass RLS for atomic operations
    - Validates caller is crew member
    - Enforces all business rules before updating
*/

-- 1. Update jobs status CHECK constraint to include 'scheduled_draft'
DO $$
BEGIN
  -- Drop existing CHECK constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'jobs' AND constraint_name = 'jobs_status_check'
  ) THEN
    ALTER TABLE jobs DROP CONSTRAINT jobs_status_check;
  END IF;

  -- Add new CHECK constraint with scheduled_draft
  ALTER TABLE jobs ADD CONSTRAINT jobs_status_check 
    CHECK (status IN ('scheduled_draft', 'scheduled', 'in_progress', 'completed', 'cancelled'));
END $$;

-- 2. Add crew pay range and marketplace fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'crew_pay_min'
  ) THEN
    ALTER TABLE jobs ADD COLUMN crew_pay_min numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'crew_pay_max'
  ) THEN
    ALTER TABLE jobs ADD COLUMN crew_pay_max numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'marketplace_posted_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN marketplace_posted_at timestamptz;
  END IF;
END $$;

-- 3. Create atomic claim function
CREATE OR REPLACE FUNCTION claim_job_position(
  p_job_id uuid,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_job record;
  v_current_assignments jsonb;
  v_new_assignment jsonb;
  v_drivers_count int := 0;
  v_helpers_count int := 0;
  v_drivers_needed int;
  v_helpers_needed int;
  v_new_staffing_status text;
  v_already_claimed boolean;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate role parameter
  IF p_role NOT IN ('driver', 'helper') THEN
    RAISE EXCEPTION 'Invalid role. Must be "driver" or "helper"';
  END IF;

  -- Check user is crew member
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = v_user_id;

  IF v_user_role != 'crew' THEN
    RAISE EXCEPTION 'Only crew members can claim job positions';
  END IF;

  -- Lock and fetch job (prevents race conditions)
  SELECT *
  INTO v_job
  FROM jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found';
  END IF;

  -- Validate job is open for claims
  IF NOT v_job.is_open_for_claims THEN
    RAISE EXCEPTION 'This job is not open for claims';
  END IF;

  -- Validate job status
  IF v_job.status != 'scheduled' THEN
    RAISE EXCEPTION 'Only scheduled jobs can be claimed';
  END IF;

  -- Get current assignments
  v_current_assignments := COALESCE(v_job.crew_assignments, '[]'::jsonb);

  -- Check if user already claimed this job
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_current_assignments) AS assignment
    WHERE (assignment->>'user_id')::uuid = v_user_id
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    RAISE EXCEPTION 'You have already claimed a position on this job';
  END IF;

  -- Get staffing needs
  v_drivers_needed := COALESCE((v_job.staffing_needs->>'drivers')::int, 0);
  v_helpers_needed := COALESCE((v_job.staffing_needs->>'helpers')::int, 0);

  -- Count current assignments by role
  SELECT
    COUNT(*) FILTER (WHERE assignment->>'role' = 'driver'),
    COUNT(*) FILTER (WHERE assignment->>'role' = 'helper')
  INTO v_drivers_count, v_helpers_count
  FROM jsonb_array_elements(v_current_assignments) AS assignment;

  -- Check capacity for requested role
  IF p_role = 'driver' AND v_drivers_count >= v_drivers_needed THEN
    RAISE EXCEPTION 'All driver positions are filled';
  END IF;

  IF p_role = 'helper' AND v_helpers_count >= v_helpers_needed THEN
    RAISE EXCEPTION 'All helper positions are filled';
  END IF;

  -- Create new assignment
  v_new_assignment := jsonb_build_object(
    'user_id', v_user_id,
    'role', p_role,
    'claimed_at', now(),
    'assigned_by', NULL
  );

  -- Append to assignments
  v_current_assignments := v_current_assignments || jsonb_build_array(v_new_assignment);

  -- Update counts for staffing status calculation
  IF p_role = 'driver' THEN
    v_drivers_count := v_drivers_count + 1;
  ELSE
    v_helpers_count := v_helpers_count + 1;
  END IF;

  -- Calculate new staffing status
  IF v_drivers_count >= v_drivers_needed AND v_helpers_count >= v_helpers_needed THEN
    v_new_staffing_status := 'fully_staffed';
  ELSIF v_drivers_count > 0 OR v_helpers_count > 0 THEN
    v_new_staffing_status := 'partially_staffed';
  ELSE
    v_new_staffing_status := 'unstaffed';
  END IF;

  -- Update job with new assignment
  UPDATE jobs
  SET
    crew_assignments = v_current_assignments,
    assigned_crew_ids = array_append(COALESCE(assigned_crew_ids, ARRAY[]::uuid[]), v_user_id),
    staffing_status = v_new_staffing_status,
    updated_at = now()
  WHERE id = p_job_id;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Position claimed successfully',
    'job_id', p_job_id,
    'role', p_role,
    'staffing_status', v_new_staffing_status
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION claim_job_position(uuid, text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION claim_job_position IS 'Atomically claim a job position as a crew member. Validates capacity and prevents race conditions.';
