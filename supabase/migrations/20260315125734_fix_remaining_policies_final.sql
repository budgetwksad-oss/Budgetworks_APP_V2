/*
  # Fix Remaining Duplicate Permissive Policies and RLS Issues

  ## Summary
  Consolidates remaining multiple permissive policies and fixes
  always-true RLS policies that were not resolved in previous migrations.
*/

-- ============================================================
-- messages: fix "Users send messages" auth init
-- ============================================================

DROP POLICY IF EXISTS "Users send messages" ON public.messages;
CREATE POLICY "Users send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (select auth.uid()));

-- ============================================================
-- activity_logs: merge 2 SELECT -> 1, fix INSERT always-true
-- ============================================================

DROP POLICY IF EXISTS "Admins view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users view own activity logs" ON public.activity_logs;
CREATE POLICY "View activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()) OR get_my_role() = 'admin');

DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON public.activity_logs;
CREATE POLICY "Authenticated users can create activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- attachments: merge INSERT duplicates, merge 4 SELECT -> 1
-- ============================================================

DROP POLICY IF EXISTS "Admins upload attachments" ON public.attachments;

DROP POLICY IF EXISTS "Admins view all attachments" ON public.attachments;
DROP POLICY IF EXISTS "Crew can view attachments for their jobs" ON public.attachments;
DROP POLICY IF EXISTS "Customers can view attachments for their entities" ON public.attachments;
DROP POLICY IF EXISTS "Users can view their own uploads" ON public.attachments;
CREATE POLICY "View attachments"
  ON public.attachments FOR SELECT
  TO authenticated
  USING (
    uploaded_by = (select auth.uid())
    OR get_my_role() = 'admin'
    OR (
      get_my_role() = 'crew'
      AND entity_type = 'job'
      AND entity_id IN (
        SELECT id FROM public.jobs WHERE (select auth.uid()) = ANY (assigned_crew_ids)
      )
    )
    OR (
      get_my_role() = 'customer'
      AND (
        (entity_type = 'job' AND entity_id IN (SELECT id FROM public.jobs WHERE customer_id = (select auth.uid())))
        OR (entity_type = 'invoice' AND entity_id IN (SELECT id FROM public.invoices WHERE customer_id = (select auth.uid())))
        OR (entity_type = 'service_request' AND entity_id IN (SELECT id FROM public.service_requests WHERE customer_id = (select auth.uid())))
        OR (entity_type = 'quote' AND entity_id IN (
          SELECT q.id FROM public.quotes q
          JOIN public.service_requests sr ON q.service_request_id = sr.id
          WHERE sr.customer_id = (select auth.uid())
        ))
      )
    )
  );

-- ============================================================
-- communication_log: 2 SELECT -> 1
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all communication logs" ON public.communication_log;
DROP POLICY IF EXISTS "Customers can view their communication log" ON public.communication_log;
CREATE POLICY "View communication log"
  ON public.communication_log FOR SELECT
  TO authenticated
  USING (
    customer_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- job_equipment: replace FOR ALL + SELECT with separate policies
-- ============================================================

DROP POLICY IF EXISTS "Admins manage job equipment" ON public.job_equipment;
DROP POLICY IF EXISTS "Crew view equipment for their jobs" ON public.job_equipment;
CREATE POLICY "View job equipment"
  ON public.job_equipment FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_equipment.job_id
        AND (select auth.uid()) = ANY (jobs.assigned_crew_ids)
    )
  );
CREATE POLICY "Admins manage job equipment"
  ON public.job_equipment FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "Admins update job equipment"
  ON public.job_equipment FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "Admins delete job equipment"
  ON public.job_equipment FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- ============================================================
-- job_feedback: 2 SELECT -> 1
-- ============================================================

DROP POLICY IF EXISTS "Admins view all feedback" ON public.job_feedback;
DROP POLICY IF EXISTS "Customers can view their own feedback" ON public.job_feedback;
CREATE POLICY "View job feedback"
  ON public.job_feedback FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()) OR get_my_role() = 'admin');

-- ============================================================
-- jobs: 4 SELECT -> 1, 2 UPDATE -> 1
-- (jobs also has "Customers can view their linked jobs" from prev migration dropped)
-- ============================================================

DROP POLICY IF EXISTS "Admins read all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Crew read assigned jobs" ON public.jobs;
DROP POLICY IF EXISTS "Customers can read own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Customers can view their linked jobs" ON public.jobs;
CREATE POLICY "View jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'admin'
    OR (select auth.uid()) = customer_id
    OR customer_user_id = (select auth.uid())
    OR (
      get_my_role() = 'crew'
      AND (is_open_for_claims = true OR (select auth.uid()) = ANY (assigned_crew_ids))
    )
  );

DROP POLICY IF EXISTS "Admins update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Crew update assigned jobs" ON public.jobs;
CREATE POLICY "Update jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (
    get_my_role() = 'admin'
    OR (get_my_role() = 'crew' AND (select auth.uid()) = ANY (assigned_crew_ids))
  )
  WITH CHECK (
    get_my_role() = 'admin'
    OR (get_my_role() = 'crew' AND (select auth.uid()) = ANY (assigned_crew_ids))
  );

-- ============================================================
-- notification_preferences: 2 SELECT -> 1
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can view own preferences" ON public.notification_preferences;
CREATE POLICY "View notification preferences"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- payment_reminders: 2 SELECT -> 1
-- ============================================================

DROP POLICY IF EXISTS "Admins view payment reminders" ON public.payment_reminders;
DROP POLICY IF EXISTS "Customers can view their invoice reminders" ON public.payment_reminders;
CREATE POLICY "View payment reminders"
  ON public.payment_reminders FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = payment_reminders.invoice_id
        AND invoices.customer_id = (select auth.uid())
    )
  );

-- ============================================================
-- payments: 2 SELECT -> 1
-- ============================================================

DROP POLICY IF EXISTS "Admins view all payments" ON public.payments;
DROP POLICY IF EXISTS "Customers can view payments for their invoices" ON public.payments;
CREATE POLICY "View payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = payments.invoice_id
        AND invoices.customer_id = (select auth.uid())
    )
  );

-- ============================================================
-- pricing_rules: FOR ALL + open SELECT -> split into role-aware policies
-- ============================================================

DROP POLICY IF EXISTS "Admins manage pricing rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "Anyone can read active pricing rules" ON public.pricing_rules;
CREATE POLICY "View active pricing rules"
  ON public.pricing_rules FOR SELECT
  USING (active = true OR get_my_role() = 'admin');
CREATE POLICY "Admins insert pricing rules"
  ON public.pricing_rules FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "Admins update pricing rules"
  ON public.pricing_rules FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "Admins delete pricing rules"
  ON public.pricing_rules FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- ============================================================
-- quotes: 4 SELECT -> 1, 2 UPDATE -> 1
-- ============================================================

DROP POLICY IF EXISTS "Admins read all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Crew can read quotes for accessible jobs" ON public.quotes;
DROP POLICY IF EXISTS "Customers can read own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Customers can view their linked quotes" ON public.quotes;
CREATE POLICY "View quotes"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'admin'
    OR customer_user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = quotes.service_request_id
        AND sr.customer_id = (select auth.uid())
    )
    OR (
      get_my_role() = 'crew'
      AND EXISTS (
        SELECT 1 FROM public.jobs
        WHERE jobs.quote_id = quotes.id
          AND (jobs.is_open_for_claims = true OR (select auth.uid()) = ANY (jobs.assigned_crew_ids))
      )
    )
  );

DROP POLICY IF EXISTS "Admins update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Customers can update own quotes" ON public.quotes;
CREATE POLICY "Update quotes"
  ON public.quotes FOR UPDATE
  TO authenticated
  USING (
    get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = quotes.service_request_id
        AND sr.customer_id = (select auth.uid())
    )
  )
  WITH CHECK (
    get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = quotes.service_request_id
        AND sr.customer_id = (select auth.uid())
    )
  );

-- ============================================================
-- recurring_jobs: 2 SELECT -> 1
-- ============================================================

DROP POLICY IF EXISTS "Admins view all recurring jobs" ON public.recurring_jobs;
DROP POLICY IF EXISTS "Customers can view their own recurring jobs" ON public.recurring_jobs;
CREATE POLICY "View recurring jobs"
  ON public.recurring_jobs FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()) OR get_my_role() = 'admin');

-- ============================================================
-- service_requests: 3 SELECT -> 1
-- ============================================================

DROP POLICY IF EXISTS "Admins view all service requests" ON public.service_requests;
DROP POLICY IF EXISTS "Crew can read service requests for accessible jobs" ON public.service_requests;
DROP POLICY IF EXISTS "Customers can read own requests" ON public.service_requests;
CREATE POLICY "View service requests"
  ON public.service_requests FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = customer_id
    OR get_my_role() = 'admin'
    OR (
      get_my_role() = 'crew'
      AND EXISTS (
        SELECT 1 FROM public.jobs
        WHERE jobs.service_request_id = service_requests.id
          AND (jobs.is_open_for_claims = true OR (select auth.uid()) = ANY (jobs.assigned_crew_ids))
      )
    )
  );

-- ============================================================
-- testimonials: 2 SELECT -> 1
-- ============================================================

DROP POLICY IF EXISTS "Admins view all testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Anyone can read published testimonials" ON public.testimonials;
CREATE POLICY "View testimonials"
  ON public.testimonials FOR SELECT
  USING (published = true OR get_my_role() = 'admin');

-- ============================================================
-- contact_submissions: fix always-true policies
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can update contact submissions" ON public.contact_submissions;
CREATE POLICY "Admins can update contact submissions"
  ON public.contact_submissions FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS "Authenticated users can view contact submissions" ON public.contact_submissions;
CREATE POLICY "Admins can view contact submissions"
  ON public.contact_submissions FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');
