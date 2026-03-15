/*
  # Crew Double-Booking Protection

  ## Summary
  Prevents a crew member from being assigned to — or claiming — a job whose
  scheduled time window overlaps with a job they are already assigned to.

  ## What "overlap" means
  Two jobs conflict when they share the same `scheduled_date` AND their
  `arrival_window_start`/`arrival_window_end` ranges overlap.  The standard
  interval-overlap test is used:
    A.start < B.end  AND  B.start < A.end

  Jobs with no arrival window times set are skipped (NULL is treated as
  no-conflict) so legacy or partially-configured jobs don't block new claims.

  ## Changes

  ### Modified Functions
  1. `claim_job_position(p_job_id, p_role)` — crew self-service claim
     - New check: raises exception if crew member has a conflicting job
     - Error message: "This crew member already has a job scheduled during this time."

  2. `admin_assign_job_position(p_job_id, p_user_id, p_role)` — admin manual assignment
     - New check: returns error JSON if target crew member has a conflicting job
     - Error message: "This crew member already has a job scheduled during this time."

  ## Notes
  - Only jobs with status IN ('scheduled', 'scheduled_draft', 'in_progress') are
    considered when checking for conflicts — completed/cancelled jobs are ignored.
  - The target job itself is excluded from the conflict query.
  - Admin-created quotes are unaffected (different code path).
*/

-- =====================================================
-- Helper: check_crew_schedule_conflict
-- Returns TRUE if p_user_id already has a job that
-- overlaps the time window of p_job_id.
-- =====================================================
CREATE OR REPLACE FUNCTION check_crew_schedule_conflict(
  p_user_id uuid,
  p_job_id  uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_job      record;
  v_conflict_exists boolean := false;
BEGIN
  SELECT scheduled_date, arrival_window_start, arrival_window_end
    INTO v_new_job
    FROM jobs
   WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- If the new job has no date or no time window, skip the check
  IF v_new_job.scheduled_date IS NULL
     OR v_new_job.arrival_window_start IS NULL
     OR v_new_job.arrival_window_end IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM jobs j
    WHERE j.id != p_job_id
      AND j.status IN ('scheduled', 'scheduled_draft', 'in_progress')
      AND j.scheduled_date = v_new_job.scheduled_date
      AND j.arrival_window_start IS NOT NULL
      AND j.arrival_window_end   IS NOT NULL
      -- Standard interval overlap: A.start < B.end AND B.start < A.end
      AND j.arrival_window_start < v_new_job.arrival_window_end
      AND v_new_job.arrival_window_start < j.arrival_window_end
      -- Crew member is in this job's assignments
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(j.crew_assignments, '[]'::jsonb)) AS a
        WHERE (a->>'user_id')::uuid = p_user_id
      )
  ) INTO v_conflict_exists;

  RETURN v_conflict_exists;
END;
$$;

GRANT EXECUTE ON FUNCTION check_crew_schedule_conflict(uuid, uuid) TO authenticated;

-- =====================================================
-- 1. Replace claim_job_position — add double-booking guard
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
  v_user_id             uuid;
  v_user_role           text;
  v_can_drive           boolean;
  v_job                 record;
  v_current_assignments jsonb;
  v_new_assignment      jsonb;
  v_drivers_count       int := 0;
  v_helpers_count       int := 0;
  v_drivers_needed      int;
  v_helpers_needed      int;
  v_new_staffing_status text;
  v_already_claimed     boolean;
  v_is_fully_staffed    boolean;
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

  -- Double-booking check
  IF check_crew_schedule_conflict(v_user_id, p_job_id) THEN
    RAISE EXCEPTION 'This crew member already has a job scheduled during this time.';
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
-- 2. Replace admin_assign_job_position — add double-booking guard
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
  v_caller_role         text;
  v_job                 record;
  v_current_assignments jsonb;
  v_new_assignment      jsonb;
  v_drivers_count       int := 0;
  v_helpers_count       int := 0;
  v_drivers_needed      int;
  v_helpers_needed      int;
  v_new_staffing_status text;
  v_is_fully_staffed    boolean;
  v_already_assigned    boolean;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can assign crew positions');
  END IF;

  IF p_role NOT IN ('driver', 'helper') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Role must be "driver" or "helper"');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND role = 'crew') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user is not a crew member');
  END IF;

  SELECT * INTO v_job FROM jobs WHERE id = p_job_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found');
  END IF;

  -- Double-booking check
  IF check_crew_schedule_conflict(p_user_id, p_job_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This crew member already has a job scheduled during this time.');
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
