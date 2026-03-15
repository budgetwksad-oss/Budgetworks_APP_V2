/*
  # Fix Crew Claim and Assignment System

  ## Summary
  Stabilizes the crew job marketplace claim/assignment workflow with four fixes:

  ### 1. claim_job_position — auto-close marketplace when fully staffed
  When the final position is claimed and staffing_status becomes 'fully_staffed',
  automatically set is_open_for_claims=false so the job no longer appears in the
  crew marketplace. Prevents any race-window over-claims between the last position
  being filled and the next page load.

  ### 2. admin_remove_job_assignment — correct staffing_status recompute
  The existing function used COALESCE(staffing_needs, 1) which treats the JSONB
  column as an integer — always reads as NULL and falls back to 1. The fix parses
  drivers and helpers from the JSONB separately and applies the same per-role
  comparison logic used everywhere else in the system.

  ### 3. admin_assign_job_position — new RPC for admin manual assignment
  The frontend's handleAssignCrew does a direct table UPDATE with no capacity
  checks, so an admin can assign unlimited crew beyond staffing_needs. This new
  RPC enforces the same role-capacity rules as claim_job_position (but skips
  can_drive check since admin overrides are intentional) and auto-closes the
  marketplace when fully staffed.

  ### 4. Staffing status helper update
  Both claim and admin-assign functions now share consistent staffing_status
  logic: fully_staffed only when BOTH driver AND helper quotas are met (or when
  the needs are zero in that role). Partially_staffed when at least one slot
  is filled. Unstaffed when no assignments exist.
*/

-- =====================================================
-- 1. Replace claim_job_position — auto-close on full
-- =====================================================

CREATE OR REPLACE FUNCTION claim_job_position(
  p_job_id uuid,
  p_role   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id            uuid;
  v_user_role          text;
  v_can_drive          boolean;
  v_job                record;
  v_current_assignments jsonb;
  v_new_assignment     jsonb;
  v_drivers_count      int := 0;
  v_helpers_count      int := 0;
  v_drivers_needed     int;
  v_helpers_needed     int;
  v_new_staffing_status text;
  v_already_claimed    boolean;
  v_is_fully_staffed   boolean;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_role NOT IN ('driver', 'helper') THEN
    RAISE EXCEPTION 'Invalid role. Must be "driver" or "helper"';
  END IF;

  SELECT role, COALESCE(can_drive, false)
  INTO v_user_role, v_can_drive
  FROM profiles
  WHERE id = v_user_id;

  IF v_user_role != 'crew' THEN
    RAISE EXCEPTION 'Only crew members can claim job positions';
  END IF;

  IF p_role = 'driver' AND NOT v_can_drive THEN
    RAISE EXCEPTION 'Driver role requires driving eligibility';
  END IF;

  SELECT * INTO v_job FROM jobs WHERE id = p_job_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found';
  END IF;

  IF NOT v_job.is_open_for_claims THEN
    RAISE EXCEPTION 'This job is not open for claims';
  END IF;

  IF v_job.status NOT IN ('scheduled', 'scheduled_draft') THEN
    RAISE EXCEPTION 'This job is not available for claiming';
  END IF;

  v_current_assignments := COALESCE(v_job.crew_assignments, '[]'::jsonb);

  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_current_assignments) AS a
    WHERE (a->>'user_id')::uuid = v_user_id
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    RAISE EXCEPTION 'You have already claimed a position on this job';
  END IF;

  v_drivers_needed := COALESCE((v_job.staffing_needs->>'drivers')::int, 0);
  v_helpers_needed := COALESCE((v_job.staffing_needs->>'helpers')::int, 0);

  SELECT
    COUNT(*) FILTER (WHERE a->>'role' = 'driver'),
    COUNT(*) FILTER (WHERE a->>'role' = 'helper')
  INTO v_drivers_count, v_helpers_count
  FROM jsonb_array_elements(v_current_assignments) AS a;

  IF p_role = 'driver' AND v_drivers_count >= v_drivers_needed THEN
    RAISE EXCEPTION 'All driver positions are filled';
  END IF;

  IF p_role = 'helper' AND v_helpers_count >= v_helpers_needed THEN
    RAISE EXCEPTION 'All helper positions are filled';
  END IF;

  v_new_assignment := jsonb_build_object(
    'user_id',     v_user_id,
    'role',        p_role,
    'claimed_at',  now(),
    'assigned_by', NULL
  );

  v_current_assignments := v_current_assignments || jsonb_build_array(v_new_assignment);

  IF p_role = 'driver' THEN
    v_drivers_count := v_drivers_count + 1;
  ELSE
    v_helpers_count := v_helpers_count + 1;
  END IF;

  v_is_fully_staffed := (v_drivers_count >= v_drivers_needed AND v_helpers_count >= v_helpers_needed
                         AND (v_drivers_needed > 0 OR v_helpers_needed > 0));

  IF v_is_fully_staffed THEN
    v_new_staffing_status := 'fully_staffed';
  ELSIF v_drivers_count > 0 OR v_helpers_count > 0 THEN
    v_new_staffing_status := 'partially_staffed';
  ELSE
    v_new_staffing_status := 'unstaffed';
  END IF;

  UPDATE jobs
  SET
    crew_assignments   = v_current_assignments,
    assigned_crew_ids  = array_append(COALESCE(assigned_crew_ids, ARRAY[]::uuid[]), v_user_id),
    staffing_status    = v_new_staffing_status,
    is_open_for_claims = CASE WHEN v_is_fully_staffed THEN false ELSE is_open_for_claims END,
    updated_at         = now()
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'success',         true,
    'message',         'Position claimed successfully',
    'job_id',          p_job_id,
    'role',            p_role,
    'staffing_status', v_new_staffing_status,
    'fully_staffed',   v_is_fully_staffed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION claim_job_position(uuid, text) TO authenticated;

-- =====================================================
-- 2. Replace admin_remove_job_assignment — fix staffing recompute
-- =====================================================

CREATE OR REPLACE FUNCTION admin_remove_job_assignment(
  p_job_id  uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role     text;
  v_job             record;
  v_new_crew_ids    uuid[];
  v_new_assignments jsonb;
  v_drivers_count   int;
  v_helpers_count   int;
  v_drivers_needed  int;
  v_helpers_needed  int;
  v_staffing_status text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Caller is not an admin');
  END IF;

  SELECT * INTO v_job FROM jobs WHERE id = p_job_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found');
  END IF;

  SELECT ARRAY(
    SELECT unnest(COALESCE(v_job.assigned_crew_ids, '{}'))
    EXCEPT
    SELECT p_user_id
  ) INTO v_new_crew_ids;

  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  INTO v_new_assignments
  FROM jsonb_array_elements(COALESCE(v_job.crew_assignments, '[]'::jsonb)) AS elem
  WHERE (elem->>'user_id')::uuid IS DISTINCT FROM p_user_id;

  v_drivers_needed := COALESCE((v_job.staffing_needs->>'drivers')::int, 0);
  v_helpers_needed := COALESCE((v_job.staffing_needs->>'helpers')::int, 0);

  SELECT
    COUNT(*) FILTER (WHERE a->>'role' = 'driver'),
    COUNT(*) FILTER (WHERE a->>'role' = 'helper')
  INTO v_drivers_count, v_helpers_count
  FROM jsonb_array_elements(v_new_assignments) AS a;

  IF v_drivers_count = 0 AND v_helpers_count = 0 THEN
    v_staffing_status := 'unstaffed';
  ELSIF v_drivers_count >= v_drivers_needed AND v_helpers_count >= v_helpers_needed
        AND (v_drivers_needed > 0 OR v_helpers_needed > 0) THEN
    v_staffing_status := 'fully_staffed';
  ELSE
    v_staffing_status := 'partially_staffed';
  END IF;

  UPDATE jobs
  SET
    assigned_crew_ids = v_new_crew_ids,
    crew_assignments  = v_new_assignments,
    staffing_status   = v_staffing_status
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'success',         true,
    'job_id',          p_job_id,
    'staffing_status', v_staffing_status,
    'assigned_count',  COALESCE(array_length(v_new_crew_ids, 1), 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_remove_job_assignment(uuid, uuid) TO authenticated;

-- =====================================================
-- 3. New RPC: admin_assign_job_position
--    Replaces unsafe direct UPDATE in handleAssignCrew
-- =====================================================

CREATE OR REPLACE FUNCTION admin_assign_job_position(
  p_job_id  uuid,
  p_user_id uuid,
  p_role    text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role        text;
  v_job                record;
  v_current_assignments jsonb;
  v_new_assignment     jsonb;
  v_drivers_count      int := 0;
  v_helpers_count      int := 0;
  v_drivers_needed     int;
  v_helpers_needed     int;
  v_new_staffing_status text;
  v_is_fully_staffed   boolean;
  v_already_assigned   boolean;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can assign crew positions');
  END IF;

  IF p_role NOT IN ('driver', 'helper') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Role must be "driver" or "helper"');
  END IF;

  -- Verify target user is crew
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND role = 'crew') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user is not a crew member');
  END IF;

  SELECT * INTO v_job FROM jobs WHERE id = p_job_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found');
  END IF;

  v_current_assignments := COALESCE(v_job.crew_assignments, '[]'::jsonb);

  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_current_assignments) AS a
    WHERE (a->>'user_id')::uuid = p_user_id
  ) INTO v_already_assigned;

  IF v_already_assigned THEN
    RETURN jsonb_build_object('success', false, 'error', 'This crew member is already assigned to this job');
  END IF;

  v_drivers_needed := COALESCE((v_job.staffing_needs->>'drivers')::int, 0);
  v_helpers_needed := COALESCE((v_job.staffing_needs->>'helpers')::int, 0);

  SELECT
    COUNT(*) FILTER (WHERE a->>'role' = 'driver'),
    COUNT(*) FILTER (WHERE a->>'role' = 'helper')
  INTO v_drivers_count, v_helpers_count
  FROM jsonb_array_elements(v_current_assignments) AS a;

  IF p_role = 'driver' AND v_drivers_count >= v_drivers_needed AND v_drivers_needed > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'All driver positions are already filled');
  END IF;

  IF p_role = 'helper' AND v_helpers_count >= v_helpers_needed AND v_helpers_needed > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'All helper positions are already filled');
  END IF;

  v_new_assignment := jsonb_build_object(
    'user_id',     p_user_id,
    'role',        p_role,
    'claimed_at',  now(),
    'assigned_by', auth.uid()
  );

  v_current_assignments := v_current_assignments || jsonb_build_array(v_new_assignment);

  IF p_role = 'driver' THEN
    v_drivers_count := v_drivers_count + 1;
  ELSE
    v_helpers_count := v_helpers_count + 1;
  END IF;

  v_is_fully_staffed := (v_drivers_count >= v_drivers_needed AND v_helpers_count >= v_helpers_needed
                         AND (v_drivers_needed > 0 OR v_helpers_needed > 0));

  IF v_is_fully_staffed THEN
    v_new_staffing_status := 'fully_staffed';
  ELSIF v_drivers_count > 0 OR v_helpers_count > 0 THEN
    v_new_staffing_status := 'partially_staffed';
  ELSE
    v_new_staffing_status := 'unstaffed';
  END IF;

  UPDATE jobs
  SET
    crew_assignments   = v_current_assignments,
    assigned_crew_ids  = array_append(COALESCE(assigned_crew_ids, ARRAY[]::uuid[]), p_user_id),
    staffing_status    = v_new_staffing_status,
    is_open_for_claims = CASE WHEN v_is_fully_staffed THEN false ELSE is_open_for_claims END,
    updated_at         = now()
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'success',         true,
    'job_id',          p_job_id,
    'role',            p_role,
    'staffing_status', v_new_staffing_status,
    'fully_staffed',   v_is_fully_staffed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_assign_job_position(uuid, uuid, text) TO authenticated;

COMMENT ON FUNCTION claim_job_position IS 'Crew: atomically claim a job position. Validates capacity, driver eligibility, and auto-closes marketplace when fully staffed.';
COMMENT ON FUNCTION admin_remove_job_assignment IS 'Admin: remove a crew assignment and correctly recompute per-role staffing_status.';
COMMENT ON FUNCTION admin_assign_job_position IS 'Admin: assign a crew member to a job position with capacity enforcement and auto-close on full.';
