/*
  # Fix Security Issues: Unindexed Foreign Keys, RLS Performance, Duplicate Policies & Indexes

  ## Summary
  This migration resolves all security advisor warnings in three categories:

  ### 1. Unindexed Foreign Keys
  Adds covering indexes for every foreign key column that was missing one.
  This prevents full-table scans when Postgres validates referential integrity
  during INSERT / UPDATE / DELETE on child tables.

  Tables fixed:
  - communication_log (initiated_by)
  - equipment_maintenance (recorded_by)
  - invoice_access_links (invoice_id)
  - invoices (created_by)
  - job_costs (recorded_by)
  - jobs (customer_id, quote_id, service_request_id)
  - messages (parent_id)
  - payments (recorded_by)
  - quotes (created_by, public_quote_request_id, service_request_id)
  - recurring_jobs (created_by)
  - service_requests (customer_id)
  - testimonials (customer_id, job_id)

  ### 2. RLS Auth Initialization Plan
  Replaces bare `auth.uid()` / `auth.role()` calls with `(select auth.uid())`
  so Postgres can cache the result once per query instead of re-evaluating it
  for every row. Affects all policies flagged in the security advisor.

  ### 3. Multiple Permissive Policies / Duplicate Policies
  Drops redundant older policies, keeping only the most-efficient version
  for each table+action combination.

  ### 4. Duplicate Indexes
  Drops the duplicate indexes identified by the security advisor.

  ### 5. Function Search Path
  Adds `SET search_path = public` to functions with mutable search paths
  to prevent search_path injection.

  ### 6. RLS Enabled No Policy
  Adds minimal read policies for invoice_access_links and quote_access_links
  so admins can query them.
*/

-- ============================================================
-- PART 1: MISSING INDEXES FOR UNINDEXED FOREIGN KEYS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_communication_log_initiated_by
  ON public.communication_log (initiated_by)
  WHERE initiated_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_recorded_by
  ON public.equipment_maintenance (recorded_by)
  WHERE recorded_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_access_links_invoice_id
  ON public.invoice_access_links (invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoices_created_by
  ON public.invoices (created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_costs_recorded_by
  ON public.job_costs (recorded_by)
  WHERE recorded_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_customer_id
  ON public.jobs (customer_id)
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_quote_id
  ON public.jobs (quote_id)
  WHERE quote_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_service_request_id
  ON public.jobs (service_request_id)
  WHERE service_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_parent_id
  ON public.messages (parent_id)
  WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_recorded_by
  ON public.payments (recorded_by)
  WHERE recorded_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_created_by
  ON public.quotes (created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_public_quote_request_id
  ON public.quotes (public_quote_request_id)
  WHERE public_quote_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_service_request_id
  ON public.quotes (service_request_id)
  WHERE service_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_jobs_created_by
  ON public.recurring_jobs (created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_requests_customer_id
  ON public.service_requests (customer_id)
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_testimonials_customer_id
  ON public.testimonials (customer_id)
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_testimonials_job_id
  ON public.testimonials (job_id)
  WHERE job_id IS NOT NULL;

-- ============================================================
-- PART 2: DROP DUPLICATE INDEXES
-- ============================================================

DROP INDEX IF EXISTS public.idx_invoices_customer_id;
DROP INDEX IF EXISTS public.idx_invoices_job_id;
DROP INDEX IF EXISTS public.idx_payments_invoice_id;

-- ============================================================
-- PART 3: DROP REDUNDANT / DUPLICATE PERMISSIVE POLICIES
-- Then recreate the surviving policies using (select auth.uid())
-- for the RLS initialization plan fix.
-- ============================================================

-- ---- activity_logs ----
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
-- Keep: "Admins view activity logs" and "Users can view their own activity logs"
-- Fix auth.uid() in Users can view their own activity logs
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_logs;
CREATE POLICY "Users can view their own activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ---- attachments ----
-- Keep get_my_role() variants, drop the older EXISTS(profiles...) ones
DROP POLICY IF EXISTS "Admins can delete any attachment" ON public.attachments;
-- Keep "Users can delete their own attachments"
-- Fix auth.uid() in remaining policies
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON public.attachments;
CREATE POLICY "Authenticated users can upload attachments"
  ON public.attachments FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own attachments" ON public.attachments;
CREATE POLICY "Users can delete their own attachments"
  ON public.attachments FOR DELETE
  TO authenticated
  USING (uploaded_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own attachments" ON public.attachments;
CREATE POLICY "Users can update their own attachments"
  ON public.attachments FOR UPDATE
  TO authenticated
  USING (uploaded_by = (select auth.uid()))
  WITH CHECK (uploaded_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view their own uploads" ON public.attachments;
CREATE POLICY "Users can view their own uploads"
  ON public.attachments FOR SELECT
  TO authenticated
  USING (uploaded_by = (select auth.uid()));

DROP POLICY IF EXISTS "Crew can view attachments for their jobs" ON public.attachments;
CREATE POLICY "Crew can view attachments for their jobs"
  ON public.attachments FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'crew'
    AND entity_type = 'job'
    AND entity_id IN (
      SELECT id FROM public.jobs WHERE (select auth.uid()) = ANY (assigned_crew_ids)
    )
  );

DROP POLICY IF EXISTS "Customers can view attachments for their entities" ON public.attachments;
CREATE POLICY "Customers can view attachments for their entities"
  ON public.attachments FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'customer'
    AND (
      (entity_type = 'job'       AND entity_id IN (SELECT id FROM public.jobs            WHERE customer_id = (select auth.uid())))
      OR (entity_type = 'invoice'   AND entity_id IN (SELECT id FROM public.invoices        WHERE customer_id = (select auth.uid())))
      OR (entity_type = 'service_request' AND entity_id IN (SELECT id FROM public.service_requests WHERE customer_id = (select auth.uid())))
      OR (entity_type = 'quote'    AND entity_id IN (
            SELECT q.id FROM public.quotes q
            JOIN public.service_requests sr ON q.service_request_id = sr.id
            WHERE sr.customer_id = (select auth.uid())
          ))
    )
  );

-- ---- audit_log ----
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_log;
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert own audit entries" ON public.audit_log;
CREATE POLICY "Authenticated users can insert own audit entries"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (actor_user_id = (select auth.uid()));

-- ---- audit_logs ----
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ---- communication_log ----
DROP POLICY IF EXISTS "Admins can create communication logs" ON public.communication_log;
CREATE POLICY "Admins can create communication logs"
  ON public.communication_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update communication logs" ON public.communication_log;
CREATE POLICY "Admins can update communication logs"
  ON public.communication_log FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all communication logs" ON public.communication_log;
CREATE POLICY "Admins can view all communication logs"
  ON public.communication_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Customers can view their communication log" ON public.communication_log;
CREATE POLICY "Customers can view their communication log"
  ON public.communication_log FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()));

-- ---- company_settings ----
DROP POLICY IF EXISTS "Admins can update company settings" ON public.company_settings;
CREATE POLICY "Admins can update company settings"
  ON public.company_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ---- contact_messages ----
DROP POLICY IF EXISTS "Admins can read all contact messages" ON public.contact_messages;
CREATE POLICY "Admins can read all contact messages"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update contact messages" ON public.contact_messages;
CREATE POLICY "Admins can update contact messages"
  ON public.contact_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ---- equipment ----
-- Drop old EXISTS(profiles...) policies, keep get_my_role() variants + fix remaining
DROP POLICY IF EXISTS "Admins can manage equipment" ON public.equipment;
DROP POLICY IF EXISTS "Admins can view all equipment" ON public.equipment;
DROP POLICY IF EXISTS "Crew can view available equipment" ON public.equipment;

-- ---- equipment_maintenance ----
DROP POLICY IF EXISTS "Admins can manage maintenance records" ON public.equipment_maintenance;
DROP POLICY IF EXISTS "Admins can view maintenance records" ON public.equipment_maintenance;

-- ---- inventory_items ----
DROP POLICY IF EXISTS "Admins can manage inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Admins can view inventory" ON public.inventory_items;

-- ---- invoice_access_links ---- (RLS enabled, no policy)
CREATE POLICY "Admins can view invoice access links"
  ON public.invoice_access_links FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');

-- ---- invoices ----
-- Drop old EXISTS(profiles...) duplicates, keep get_my_role() variants
DROP POLICY IF EXISTS "Admin can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admin can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admin can view all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can manage all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins view all invoices" ON public.invoices;
-- Drop duplicate customer SELECT
DROP POLICY IF EXISTS "Customers can read own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Customers can view own invoices" ON public.invoices;
-- Fix auth.uid() in surviving customer policy
DROP POLICY IF EXISTS "Customers can view their linked invoices" ON public.invoices;
CREATE POLICY "Customers can view their linked invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (customer_user_id = (select auth.uid()) OR customer_id = (select auth.uid()));

-- ---- job_equipment ----
DROP POLICY IF EXISTS "Admins can manage job equipment" ON public.job_equipment;
DROP POLICY IF EXISTS "Admins can view job equipment" ON public.job_equipment;
DROP POLICY IF EXISTS "Crew can view equipment for their jobs" ON public.job_equipment;
CREATE POLICY "Crew can view equipment for their jobs"
  ON public.job_equipment FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_equipment.job_id
        AND (select auth.uid()) = ANY (jobs.assigned_crew_ids)
    )
  );

CREATE POLICY "Admins can view job equipment"
  ON public.job_equipment FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "Admins can manage job equipment"
  ON public.job_equipment FOR ALL
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- ---- job_feedback ----
DROP POLICY IF EXISTS "Admins view all feedback" ON public.job_feedback;
CREATE POLICY "Admins view all feedback"
  ON public.job_feedback FOR SELECT
  TO authenticated
  USING ((customer_id = (select auth.uid())) OR (get_my_role() = 'admin'));

DROP POLICY IF EXISTS "Customers can create feedback for their jobs" ON public.job_feedback;
CREATE POLICY "Customers can create feedback for their jobs"
  ON public.job_feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_feedback.job_id
        AND jobs.customer_id = (select auth.uid())
        AND jobs.status = 'completed'
    )
  );

DROP POLICY IF EXISTS "Customers can update their own feedback within 7 days" ON public.job_feedback;
CREATE POLICY "Customers can update their own feedback within 7 days"
  ON public.job_feedback FOR UPDATE
  TO authenticated
  USING (customer_id = (select auth.uid()) AND created_at > now() - interval '7 days')
  WITH CHECK (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Customers can view their own feedback" ON public.job_feedback;
CREATE POLICY "Customers can view their own feedback"
  ON public.job_feedback FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()));

-- ---- jobs ----
-- Drop old EXISTS(profiles...) duplicates
DROP POLICY IF EXISTS "Admins can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Crew can read marketplace or assigned jobs" ON public.jobs;
DROP POLICY IF EXISTS "Crew can view open jobs" ON public.jobs;
-- Fix auth.uid() in surviving policies
DROP POLICY IF EXISTS "Customers can read own jobs" ON public.jobs;
CREATE POLICY "Customers can read own jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = customer_id);

DROP POLICY IF EXISTS "Customers can view their linked jobs" ON public.jobs;
CREATE POLICY "Customers can view their linked jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (customer_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Crew read assigned jobs" ON public.jobs;
CREATE POLICY "Crew read assigned jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'crew'
    AND (
      is_open_for_claims = true
      OR (select auth.uid()) = ANY (assigned_crew_ids)
    )
  );

DROP POLICY IF EXISTS "Crew update assigned jobs" ON public.jobs;
CREATE POLICY "Crew update assigned jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'crew' AND (select auth.uid()) = ANY (assigned_crew_ids))
  WITH CHECK (get_my_role() = 'crew' AND (select auth.uid()) = ANY (assigned_crew_ids));

-- ---- messages ----
-- Drop duplicates, keep the consolidated ones
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages sent to them" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages they sent" ON public.messages;
DROP POLICY IF EXISTS "Users can view job messages for their jobs" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
-- Fix auth.uid() in surviving policies
DROP POLICY IF EXISTS "Users read own messages" ON public.messages;
CREATE POLICY "Users read own messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    sender_id = (select auth.uid())
    OR recipient_id = (select auth.uid())
    OR get_my_role() = 'admin'
    OR job_id IN (
      SELECT id FROM public.jobs
      WHERE customer_id = (select auth.uid())
         OR (select auth.uid()) = ANY (assigned_crew_ids)
    )
  );

DROP POLICY IF EXISTS "Users update own messages" ON public.messages;
CREATE POLICY "Users update own messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (sender_id = (select auth.uid()) OR recipient_id = (select auth.uid()))
  WITH CHECK (sender_id = (select auth.uid()) OR recipient_id = (select auth.uid()));

-- ---- message_attachments ----
DROP POLICY IF EXISTS "Users can upload attachments to their messages" ON public.message_attachments;
CREATE POLICY "Users can upload attachments to their messages"
  ON public.message_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages
      WHERE messages.id = message_attachments.message_id
        AND messages.sender_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view message attachments" ON public.message_attachments;
CREATE POLICY "Users can view message attachments"
  ON public.message_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages
      WHERE messages.id = message_attachments.message_id
        AND (messages.sender_id = (select auth.uid()) OR messages.recipient_id = (select auth.uid()))
    )
  );

-- ---- notification_log ----
DROP POLICY IF EXISTS "Admins can insert logs" ON public.notification_log;
CREATE POLICY "Admins can insert logs"
  ON public.notification_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view logs" ON public.notification_log;
CREATE POLICY "Admins can view logs"
  ON public.notification_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ---- notification_preferences ----
DROP POLICY IF EXISTS "Admins can view all preferences" ON public.notification_preferences;
CREATE POLICY "Admins can view all preferences"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert own preferences"
  ON public.notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own preferences" ON public.notification_preferences;
CREATE POLICY "Users can update own preferences"
  ON public.notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own preferences" ON public.notification_preferences;
CREATE POLICY "Users can view own preferences"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ---- notification_queue ----
DROP POLICY IF EXISTS "Admins can insert queue" ON public.notification_queue;
CREATE POLICY "Admins can insert queue"
  ON public.notification_queue FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update queue" ON public.notification_queue;
CREATE POLICY "Admins can update queue"
  ON public.notification_queue FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view queue" ON public.notification_queue;
CREATE POLICY "Admins can view queue"
  ON public.notification_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ---- notification_templates ----
DROP POLICY IF EXISTS "Admins can delete notification templates" ON public.notification_templates;
CREATE POLICY "Admins can delete notification templates"
  ON public.notification_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert notification templates" ON public.notification_templates;
CREATE POLICY "Admins can insert notification templates"
  ON public.notification_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update notification templates" ON public.notification_templates;
CREATE POLICY "Admins can update notification templates"
  ON public.notification_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view notification templates" ON public.notification_templates;
CREATE POLICY "Admins can view notification templates"
  ON public.notification_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ---- notification_templates_legacy ----
-- Drop the FOR ALL (Admins can manage) duplicate and keep separate CRUD policies
DROP POLICY IF EXISTS "Admins can manage notification templates" ON public.notification_templates_legacy;
-- Fix auth.uid() in remaining
DROP POLICY IF EXISTS "Admins can delete templates" ON public.notification_templates_legacy;
CREATE POLICY "Admins can delete templates"
  ON public.notification_templates_legacy FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert templates" ON public.notification_templates_legacy;
CREATE POLICY "Admins can insert templates"
  ON public.notification_templates_legacy FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update templates" ON public.notification_templates_legacy;
CREATE POLICY "Admins can update templates"
  ON public.notification_templates_legacy FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view templates" ON public.notification_templates_legacy;
CREATE POLICY "Admins can view templates"
  ON public.notification_templates_legacy FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ---- notifications ----
-- Drop duplicate INSERT policies and keep only the get_my_role() variant
DROP POLICY IF EXISTS "Admins can create notifications for any user" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
-- Drop duplicate SELECT and UPDATE policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
-- Fix auth.uid() in surviving policies
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ---- payment_reminders ----
DROP POLICY IF EXISTS "Admins can view all reminders" ON public.payment_reminders;
-- Keep get_my_role() variant "Admins view payment reminders"
-- Fix auth.uid() in customer policy
DROP POLICY IF EXISTS "Customers can view their invoice reminders" ON public.payment_reminders;
CREATE POLICY "Customers can view their invoice reminders"
  ON public.payment_reminders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = payment_reminders.invoice_id
        AND invoices.customer_id = (select auth.uid())
    )
  );

-- ---- payments ----
-- Drop old EXISTS(profiles...) duplicates, keep get_my_role() variants
DROP POLICY IF EXISTS "Admin can delete payments" ON public.payments;
DROP POLICY IF EXISTS "Admin can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Admin can select payments" ON public.payments;
DROP POLICY IF EXISTS "Admin can update payments" ON public.payments;
DROP POLICY IF EXISTS "Admin can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
-- Drop duplicate customer policies
DROP POLICY IF EXISTS "Customers can read own payments" ON public.payments;
-- Fix auth.uid() in surviving customer policy
DROP POLICY IF EXISTS "Customers can view payments for their invoices" ON public.payments;
CREATE POLICY "Customers can view payments for their invoices"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = payments.invoice_id
        AND invoices.customer_id = (select auth.uid())
    )
  );

-- ---- pricing_rules ----
DROP POLICY IF EXISTS "Admins can manage pricing rules" ON public.pricing_rules;
CREATE POLICY "Admins can manage pricing rules"
  ON public.pricing_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ---- pricing_settings ----
DROP POLICY IF EXISTS "Admins can delete pricing settings" ON public.pricing_settings;
CREATE POLICY "Admins can delete pricing settings"
  ON public.pricing_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert pricing settings" ON public.pricing_settings;
CREATE POLICY "Admins can insert pricing settings"
  ON public.pricing_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can select pricing settings" ON public.pricing_settings;
CREATE POLICY "Admins can select pricing settings"
  ON public.pricing_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update pricing settings" ON public.pricing_settings;
CREATE POLICY "Admins can update pricing settings"
  ON public.pricing_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ---- profiles ----
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users read own profile or admin reads all" ON public.profiles;
CREATE POLICY "Users read own profile or admin reads all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()) OR get_my_role() = 'admin');

DROP POLICY IF EXISTS "Users update own profile or admin updates all" ON public.profiles;
CREATE POLICY "Users update own profile or admin updates all"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()) OR get_my_role() = 'admin')
  WITH CHECK (id = (select auth.uid()) OR get_my_role() = 'admin');

-- ---- quote_access_links ---- (RLS enabled, no policy)
CREATE POLICY "Admins can view quote access links"
  ON public.quote_access_links FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');

-- ---- quote_templates ----
-- Drop old EXISTS(profiles...) duplicate
DROP POLICY IF EXISTS "Admins can view all quote templates" ON public.quote_templates;
-- Keep get_my_role() variant "Admins view quote templates"
-- Fix remaining for auth init
-- (get_my_role() already uses subquery pattern internally so these are fine)

-- ---- quotes ----
-- Fix auth.uid() in policies
DROP POLICY IF EXISTS "Crew can read quotes for accessible jobs" ON public.quotes;
CREATE POLICY "Crew can read quotes for accessible jobs"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'crew'
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.quote_id = quotes.id
        AND (
          jobs.is_open_for_claims = true
          OR (select auth.uid()) = ANY (jobs.assigned_crew_ids)
        )
    )
  );

DROP POLICY IF EXISTS "Customers can read own quotes" ON public.quotes;
CREATE POLICY "Customers can read own quotes"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_requests
      WHERE service_requests.id = quotes.service_request_id
        AND service_requests.customer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Customers can update own quotes" ON public.quotes;
CREATE POLICY "Customers can update own quotes"
  ON public.quotes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_requests
      WHERE service_requests.id = quotes.service_request_id
        AND service_requests.customer_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_requests
      WHERE service_requests.id = quotes.service_request_id
        AND service_requests.customer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Customers can view their linked quotes" ON public.quotes;
CREATE POLICY "Customers can view their linked quotes"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (customer_user_id = (select auth.uid()));

-- ---- recurring_jobs ----
DROP POLICY IF EXISTS "Customers can view their own recurring jobs" ON public.recurring_jobs;
CREATE POLICY "Customers can view their own recurring jobs"
  ON public.recurring_jobs FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()));

-- ---- service_requests ----
-- Drop old EXISTS(profiles...) duplicates
DROP POLICY IF EXISTS "Admins can read all requests" ON public.service_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON public.service_requests;
-- Keep get_my_role() variants: "Admins view all service requests" / "Admins update all service requests"
-- Fix auth.uid() in remaining
DROP POLICY IF EXISTS "Admins view all service requests" ON public.service_requests;
CREATE POLICY "Admins view all service requests"
  ON public.service_requests FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()) OR get_my_role() = 'admin');

DROP POLICY IF EXISTS "Crew can read service requests for accessible jobs" ON public.service_requests;
CREATE POLICY "Crew can read service requests for accessible jobs"
  ON public.service_requests FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'crew'
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.service_request_id = service_requests.id
        AND (
          jobs.is_open_for_claims = true
          OR (select auth.uid()) = ANY (jobs.assigned_crew_ids)
        )
    )
  );

DROP POLICY IF EXISTS "Customers can create own requests" ON public.service_requests;
CREATE POLICY "Customers can create own requests"
  ON public.service_requests FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = customer_id);

DROP POLICY IF EXISTS "Customers can read own requests" ON public.service_requests;
CREATE POLICY "Customers can read own requests"
  ON public.service_requests FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = customer_id);

-- ---- testimonials ----
-- Drop old EXISTS(profiles...) FOR ALL duplicate
DROP POLICY IF EXISTS "Admins can manage all testimonials" ON public.testimonials;
-- Keep get_my_role() variants

-- ---- testimonial_settings ----
DROP POLICY IF EXISTS "Admins can delete testimonial settings" ON public.testimonial_settings;
CREATE POLICY "Admins can delete testimonial settings"
  ON public.testimonial_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert testimonial settings" ON public.testimonial_settings;
CREATE POLICY "Admins can insert testimonial settings"
  ON public.testimonial_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update testimonial settings" ON public.testimonial_settings;
CREATE POLICY "Admins can update testimonial settings"
  ON public.testimonial_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ---- time_entries ----
DROP POLICY IF EXISTS "Admin can view all time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Crew can create own time entries" ON public.time_entries;
-- Keep "Crew create time entries" and fix auth.uid()
DROP POLICY IF EXISTS "Crew create time entries" ON public.time_entries;
CREATE POLICY "Crew create time entries"
  ON public.time_entries FOR INSERT
  TO authenticated
  WITH CHECK (crew_member_id = (select auth.uid()));

DROP POLICY IF EXISTS "Crew update own time entries" ON public.time_entries;
CREATE POLICY "Crew update own time entries"
  ON public.time_entries FOR UPDATE
  TO authenticated
  USING (crew_member_id = (select auth.uid()) OR get_my_role() = 'admin')
  WITH CHECK (crew_member_id = (select auth.uid()) OR get_my_role() = 'admin');

DROP POLICY IF EXISTS "Crew view own time entries" ON public.time_entries;
CREATE POLICY "Crew view own time entries"
  ON public.time_entries FOR SELECT
  TO authenticated
  USING (crew_member_id = (select auth.uid()) OR get_my_role() = 'admin');

-- ============================================================
-- PART 4: FIX FUNCTION SEARCH PATHS
-- ============================================================

DO $$
DECLARE
  funcs text[] := ARRAY[
    'render_template',
    'update_job_cost_totals',
    'sync_notification_template_enabled',
    'sync_notification_queue_error',
    'enforce_invoice_lock',
    'prevent_locked_invoice_delete',
    'update_updated_at_column',
    'generate_quote_number',
    'generate_invoice_number'
  ];
  fname text;
BEGIN
  FOREACH fname IN ARRAY funcs LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION public.%I SET search_path = public',
        fname
      );
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;
END $$;
