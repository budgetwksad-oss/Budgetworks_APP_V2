/*
  # Ops Audit Log + Admin Recovery RPCs + Performance Indexes

  ## Summary
  This migration adds operational tooling for admin visibility and recovery capabilities.

  ## 1. New Tables

  ### audit_log
  A append-only audit trail for all significant operations across the platform.
  - `id` - UUID primary key
  - `created_at` - timestamp of the event
  - `actor_user_id` - who performed the action (nullable for system events)
  - `actor_role` - role of the actor at time of action
  - `action_key` - machine-readable event identifier (e.g. 'job.crew_assigned')
  - `entity_type` - the domain object affected: 'lead'|'quote'|'job'|'invoice'|'notification'
  - `entity_id` - UUID of the affected record
  - `message` - human-readable description
  - `metadata` - arbitrary JSONB for extra context

  ## 2. New Functions / RPCs

  ### admin_remove_job_assignment(p_job_id, p_user_id)
  Safely removes a single crew member from a job and recomputes staffing_status.
  Returns { success, job_id, staffing_status, assigned_count }.

  ### admin_reset_job_claims(p_job_id)
  Fully clears all crew assignments from a job and resets it to unstaffed.
  Returns { success, job_id }.

  ## 3. Performance Indexes
  - audit_log(created_at DESC)
  - audit_log(entity_type, entity_id)
  - audit_log(action_key)

  ## 4. Security
  - RLS enabled on audit_log
  - Admins can SELECT all rows
  - Authenticated users can INSERT only their own actor rows
  - No UPDATE or DELETE policies (immutable log)
  - RPCs verify caller is admin via profiles.role check
*/

-- ============================================================
-- A) audit_log table
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  actor_user_id  uuid        NULL,
  actor_role     text        NULL,
  action_key     text        NOT NULL,
  entity_type    text        NOT NULL,
  entity_id      uuid        NULL,
  message        text        NULL,
  metadata       jsonb       NULL
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can insert own audit entries"
  ON audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

-- ============================================================
-- Indexes for audit_log
-- ============================================================

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx
  ON audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_entity_idx
  ON audit_log (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS audit_log_action_key_idx
  ON audit_log (action_key);

-- ============================================================
-- B) RPC: admin_remove_job_assignment
-- ============================================================

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
  v_caller_role    text;
  v_job            jobs%ROWTYPE;
  v_new_crew_ids   uuid[];
  v_new_assignments jsonb;
  v_assigned_count  int;
  v_staffing_needed int;
  v_staffing_status text;
BEGIN
  -- Verify caller is admin
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Caller is not an admin');
  END IF;

  -- Lock the job row
  SELECT * INTO v_job
  FROM jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found');
  END IF;

  -- Remove user from assigned_crew_ids
  SELECT ARRAY(
    SELECT unnest(COALESCE(v_job.assigned_crew_ids, '{}'))
    EXCEPT
    SELECT p_user_id
  ) INTO v_new_crew_ids;

  -- Remove matching entries from crew_assignments jsonb array
  SELECT COALESCE(
    jsonb_agg(elem),
    '[]'::jsonb
  ) INTO v_new_assignments
  FROM jsonb_array_elements(COALESCE(v_job.crew_assignments, '[]'::jsonb)) AS elem
  WHERE (elem->>'user_id')::uuid IS DISTINCT FROM p_user_id;

  v_assigned_count := COALESCE(array_length(v_new_crew_ids, 1), 0);

  -- Recompute staffing_status
  v_staffing_needed := COALESCE(v_job.staffing_needs, 1);

  IF v_assigned_count = 0 THEN
    v_staffing_status := 'unstaffed';
  ELSIF v_assigned_count >= v_staffing_needed THEN
    v_staffing_status := 'fully_staffed';
  ELSE
    v_staffing_status := 'partially_staffed';
  END IF;

  -- Persist changes
  UPDATE jobs
  SET
    assigned_crew_ids  = v_new_crew_ids,
    crew_assignments   = v_new_assignments,
    staffing_status    = v_staffing_status
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'success',        true,
    'job_id',         p_job_id,
    'staffing_status', v_staffing_status,
    'assigned_count', v_assigned_count
  );
END;
$$;

-- ============================================================
-- C) RPC: admin_reset_job_claims
-- ============================================================

CREATE OR REPLACE FUNCTION admin_reset_job_claims(
  p_job_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- Verify caller is admin
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Caller is not an admin');
  END IF;

  -- Lock and clear all assignments
  UPDATE jobs
  SET
    assigned_crew_ids     = '{}',
    crew_assignments      = '[]'::jsonb,
    staffing_status       = 'unstaffed',
    is_open_for_claims    = false,
    marketplace_posted_at = NULL
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'job_id',  p_job_id
  );
END;
$$;
