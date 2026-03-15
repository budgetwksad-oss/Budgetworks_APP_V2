/*
  # Final policy deduplication

  ## Summary
  Remove all remaining old duplicate SELECT/DELETE policies that coexist alongside
  the new unified consolidated policies. This resolves the remaining
  "Multiple Permissive Policies" warnings from the security advisor.

  Tables cleaned up:
  - attachments: remove 3 old SELECT policies (keep "View attachments")
                 remove old "Admins delete any attachment" (keep "Users delete own attachments")
  - communication_log: remove old "Customers view their communication log" (keep "View communication log")
  - equipment: merge 2 SELECT policies into 1
  - invoices: merge 2 SELECT policies into 1
  - messages: merge 2 SELECT policies into 1
  - payment_reminders: remove old customer SELECT (keep "View payment reminders")
  - payments: remove old customer SELECT (keep "View payments")
  - time_entries: merge 2 SELECT policies into 1
*/

-- ---- attachments ----
DROP POLICY IF EXISTS "Crew view attachments for their jobs" ON public.attachments;
DROP POLICY IF EXISTS "Customers view attachments for their entities" ON public.attachments;
DROP POLICY IF EXISTS "Users view own uploads" ON public.attachments;
-- "View attachments" covers all three above

DROP POLICY IF EXISTS "Admins delete any attachment" ON public.attachments;
-- "Users delete own attachments" remains; admins covered via get_my_role check below
CREATE POLICY "Admins delete any attachment"
  ON public.attachments FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin' OR uploaded_by = (select auth.uid()));
DROP POLICY IF EXISTS "Users delete own attachments" ON public.attachments;

-- ---- communication_log ----
DROP POLICY IF EXISTS "Customers view their communication log" ON public.communication_log;
-- "View communication log" already covers customer + admin

-- ---- equipment: merge 2 SELECT -> 1 ----
DROP POLICY IF EXISTS "Admins view equipment" ON public.equipment;
DROP POLICY IF EXISTS "Crew can view available equipment" ON public.equipment;
CREATE POLICY "View equipment"
  ON public.equipment FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'admin'
    OR get_my_role() IN ('crew', 'driver')
  );

-- ---- invoices: merge 2 SELECT -> 1 ----
DROP POLICY IF EXISTS "Admins view all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Customers view own invoices" ON public.invoices;
CREATE POLICY "View invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'admin'
    OR customer_id = (select auth.uid())
    OR customer_user_id = (select auth.uid())
  );

-- ---- messages: merge 2 SELECT -> 1 ----
DROP POLICY IF EXISTS "Admins view all messages" ON public.messages;
DROP POLICY IF EXISTS "Users read own messages" ON public.messages;
CREATE POLICY "View messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'admin'
    OR sender_id = (select auth.uid())
    OR recipient_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = messages.job_id
        AND (select auth.uid()) = ANY (j.assigned_crew_ids)
    )
  );

-- ---- payment_reminders ----
DROP POLICY IF EXISTS "Customers view their invoice reminders" ON public.payment_reminders;
-- "View payment reminders" already covers customer + admin

-- ---- payments ----
DROP POLICY IF EXISTS "Customers view payments for their invoices" ON public.payments;
-- "View payments" already covers customer + admin

-- ---- time_entries: merge 2 SELECT -> 1 ----
DROP POLICY IF EXISTS "Admin view all time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Crew view own time entries" ON public.time_entries;
CREATE POLICY "View time entries"
  ON public.time_entries FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'admin'
    OR crew_member_id = (select auth.uid())
  );
