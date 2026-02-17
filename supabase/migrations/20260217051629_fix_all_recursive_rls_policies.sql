/*
  # Fix All Recursive RLS Policies

  1. Problem
    - Many tables have RLS policies with recursive subqueries on profiles table
    - These cause "infinite recursion" errors blocking access
    - Affects service_requests, quotes, jobs, invoices, and many other tables

  2. Solution
    - Update ALL policies to use get_my_role() helper function
    - This avoids recursion by using security definer

  3. Tables Fixed
    - service_requests, quotes, jobs, invoices, payments
    - payment_reminders, job_feedback, quote_templates
    - notifications, activity_logs, attachments, recurring_jobs
    - job_costs, equipment, equipment_maintenance, messages
    - testimonials, and more
*/

-- SERVICE_REQUESTS
DROP POLICY IF EXISTS "Admins can view all service requests" ON service_requests;
DROP POLICY IF EXISTS "Admins can update all service requests" ON service_requests;

CREATE POLICY "Admins view all service requests"
  ON service_requests FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR get_my_role() = 'admin');

CREATE POLICY "Admins update all service requests"
  ON service_requests FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- QUOTES
DROP POLICY IF EXISTS "Admins can read all quotes" ON quotes;
DROP POLICY IF EXISTS "Admins can create quotes" ON quotes;
DROP POLICY IF EXISTS "Admins can update quotes" ON quotes;
DROP POLICY IF EXISTS "Admins can delete quotes" ON quotes;

CREATE POLICY "Admins read all quotes"
  ON quotes FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "Admins create quotes"
  ON quotes FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins update quotes"
  ON quotes FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins delete quotes"
  ON quotes FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- JOBS
DROP POLICY IF EXISTS "Admins can read all jobs" ON jobs;
DROP POLICY IF EXISTS "Admins can create jobs" ON jobs;
DROP POLICY IF EXISTS "Admins can update all jobs" ON jobs;
DROP POLICY IF EXISTS "Admins can delete jobs" ON jobs;
DROP POLICY IF EXISTS "Crew members can view their assigned jobs" ON jobs;
DROP POLICY IF EXISTS "Crew can read jobs assigned to them" ON jobs;
DROP POLICY IF EXISTS "Crew can update their assigned jobs" ON jobs;
DROP POLICY IF EXISTS "Drivers can claim open jobs" ON jobs;
DROP POLICY IF EXISTS "Crew members can read job details" ON jobs;

CREATE POLICY "Admins read all jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "Admins create jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins update jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins delete jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "Crew read assigned jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'crew' 
    AND auth.uid() = ANY(assigned_crew_ids)
  );

CREATE POLICY "Crew update assigned jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (
    get_my_role() = 'crew' 
    AND auth.uid() = ANY(assigned_crew_ids)
  )
  WITH CHECK (
    get_my_role() = 'crew' 
    AND auth.uid() = ANY(assigned_crew_ids)
  );

-- INVOICES
DROP POLICY IF EXISTS "Admins can view all invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can create invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can update invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can delete invoices" ON invoices;

CREATE POLICY "Admins view all invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR get_my_role() = 'admin');

CREATE POLICY "Admins create invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- PAYMENTS
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
DROP POLICY IF EXISTS "Admins can create payments" ON payments;
DROP POLICY IF EXISTS "Admins can update payments" ON payments;
DROP POLICY IF EXISTS "Admins can delete payments" ON payments;

CREATE POLICY "Admins view all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "Admins create payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins delete payments"
  ON payments FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- PAYMENT_REMINDERS
DROP POLICY IF EXISTS "Admins can view payment reminders" ON payment_reminders;
DROP POLICY IF EXISTS "Admins can create payment reminders" ON payment_reminders;

CREATE POLICY "Admins view payment reminders"
  ON payment_reminders FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "Admins create payment reminders"
  ON payment_reminders FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

-- JOB_FEEDBACK
DROP POLICY IF EXISTS "Admins can view all feedback" ON job_feedback;

CREATE POLICY "Admins view all feedback"
  ON job_feedback FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR get_my_role() = 'admin');

-- QUOTE_TEMPLATES
DROP POLICY IF EXISTS "Admins can view quote templates" ON quote_templates;
DROP POLICY IF EXISTS "Admins can create quote templates" ON quote_templates;
DROP POLICY IF EXISTS "Admins can update quote templates" ON quote_templates;
DROP POLICY IF EXISTS "Admins can delete quote templates" ON quote_templates;

CREATE POLICY "Admins view quote templates"
  ON quote_templates FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "Admins create quote templates"
  ON quote_templates FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins update quote templates"
  ON quote_templates FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins delete quote templates"
  ON quote_templates FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ACTIVITY_LOGS
DROP POLICY IF EXISTS "Admins can view activity logs" ON activity_logs;

CREATE POLICY "Admins view activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');

-- ATTACHMENTS
DROP POLICY IF EXISTS "Admins can view all attachments" ON attachments;
DROP POLICY IF EXISTS "Admins can upload attachments" ON attachments;

CREATE POLICY "Admins view all attachments"
  ON attachments FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "Admins upload attachments"
  ON attachments FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

-- RECURRING_JOBS
DROP POLICY IF EXISTS "Admins can view all recurring jobs" ON recurring_jobs;
DROP POLICY IF EXISTS "Admins can create recurring jobs" ON recurring_jobs;
DROP POLICY IF EXISTS "Admins can update recurring jobs" ON recurring_jobs;
DROP POLICY IF EXISTS "Admins can delete recurring jobs" ON recurring_jobs;

CREATE POLICY "Admins view all recurring jobs"
  ON recurring_jobs FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "Admins create recurring jobs"
  ON recurring_jobs FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins update recurring jobs"
  ON recurring_jobs FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins delete recurring jobs"
  ON recurring_jobs FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- JOB_COSTS
DROP POLICY IF EXISTS "Admins can view all job costs" ON job_costs;
DROP POLICY IF EXISTS "Admins can create job costs" ON job_costs;
DROP POLICY IF EXISTS "Admins can update job costs" ON job_costs;
DROP POLICY IF EXISTS "Admins can delete job costs" ON job_costs;

CREATE POLICY "Admins view all job costs"
  ON job_costs FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "Admins create job costs"
  ON job_costs FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins update job costs"
  ON job_costs FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins delete job costs"
  ON job_costs FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- EQUIPMENT
DROP POLICY IF EXISTS "Admins can view equipment" ON equipment;
DROP POLICY IF EXISTS "Admins can create equipment" ON equipment;
DROP POLICY IF EXISTS "Admins can update equipment" ON equipment;
DROP POLICY IF EXISTS "Admins can delete equipment" ON equipment;
DROP POLICY IF EXISTS "Crew can view equipment" ON equipment;

CREATE POLICY "Admins view equipment"
  ON equipment FOR SELECT
  TO authenticated
  USING (get_my_role() IN ('admin', 'crew'));

CREATE POLICY "Admins create equipment"
  ON equipment FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins update equipment"
  ON equipment FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins delete equipment"
  ON equipment FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- EQUIPMENT_MAINTENANCE
DROP POLICY IF EXISTS "Admins can view equipment maintenance" ON equipment_maintenance;
DROP POLICY IF EXISTS "Admins can create equipment maintenance" ON equipment_maintenance;
DROP POLICY IF EXISTS "Admins can update equipment maintenance" ON equipment_maintenance;
DROP POLICY IF EXISTS "Admins can delete equipment maintenance" ON equipment_maintenance;

CREATE POLICY "Admins view equipment maintenance"
  ON equipment_maintenance FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "Admins create equipment maintenance"
  ON equipment_maintenance FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins update equipment maintenance"
  ON equipment_maintenance FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admins delete equipment maintenance"
  ON equipment_maintenance FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- MESSAGES
DROP POLICY IF EXISTS "Users can read own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Admins can read all messages" ON messages;

CREATE POLICY "Users read own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR get_my_role() = 'admin');

CREATE POLICY "Users send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users update own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid())
  WITH CHECK (sender_id = auth.uid() OR recipient_id = auth.uid());

-- TESTIMONIALS
DROP POLICY IF EXISTS "Admins can view all testimonials" ON testimonials;
DROP POLICY IF EXISTS "Admins can update testimonials" ON testimonials;

CREATE POLICY "Admins view all testimonials"
  ON testimonials FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin' OR published = true);

CREATE POLICY "Admins update testimonials"
  ON testimonials FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- TIME_ENTRIES
DROP POLICY IF EXISTS "Crew can view own time entries" ON time_entries;
DROP POLICY IF EXISTS "Crew can create time entries" ON time_entries;
DROP POLICY IF EXISTS "Crew can update own time entries" ON time_entries;
DROP POLICY IF EXISTS "Admins can view all time entries" ON time_entries;

CREATE POLICY "Crew view own time entries"
  ON time_entries FOR SELECT
  TO authenticated
  USING (crew_member_id = auth.uid() OR get_my_role() = 'admin');

CREATE POLICY "Crew create time entries"
  ON time_entries FOR INSERT
  TO authenticated
  WITH CHECK (crew_member_id = auth.uid());

CREATE POLICY "Crew update own time entries"
  ON time_entries FOR UPDATE
  TO authenticated
  USING (crew_member_id = auth.uid() OR get_my_role() = 'admin')
  WITH CHECK (crew_member_id = auth.uid() OR get_my_role() = 'admin');
