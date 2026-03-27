/*
  # Drop all unused tables

  ## Summary
  This migration removes every table that is not accessed by the public-facing
  frontend. The only tables kept are:

  - public_quote_requests  – written to by the Quote Wizard
  - contact_messages       – written to by the Contact form
  - company_settings       – read by the Home page (phone number / business name)
  - testimonial_settings   – read by the Home page (star-rating widget config)
  - testimonials           – read by the Home page (published reviews)

  ## Changes

  ### FK constraints removed
  - testimonials.customer_id -> profiles (nullable, link no longer meaningful)
  - testimonials.job_id     -> jobs     (nullable, link no longer meaningful)

  ### Tables dropped (in safe dependency order)
  message_attachments, messages, communication_log,
  equipment_maintenance, job_equipment, equipment, inventory_items,
  job_costs, recurring_jobs, attachments, activity_logs, job_feedback,
  quote_templates, notifications, time_entries, payments, payment_reminders,
  invoice_access_links, invoices, quote_access_links, jobs, quotes,
  service_requests, profiles, pricing_rules, pricing_settings,
  notification_log, notification_queue, notification_preferences,
  notification_templates, notification_templates_legacy,
  audit_log, audit_logs, contact_submissions

  ## Notes
  - CASCADE is used so any remaining internal FK references are cleaned up
    automatically. The five kept tables have no outgoing FKs to the dropped
    tables after the testimonials constraints are removed.
  - No data is lost from the five kept tables.
*/

-- 1. Remove FK constraints on testimonials so we can safely drop their targets
ALTER TABLE IF EXISTS testimonials DROP CONSTRAINT IF EXISTS testimonials_customer_id_fkey;
ALTER TABLE IF EXISTS testimonials DROP CONSTRAINT IF EXISTS testimonials_job_id_fkey;

-- 2. Drop unused tables (safe order: children before parents, CASCADE for safety)
DROP TABLE IF EXISTS message_attachments CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS communication_log CASCADE;
DROP TABLE IF EXISTS equipment_maintenance CASCADE;
DROP TABLE IF EXISTS job_equipment CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS job_costs CASCADE;
DROP TABLE IF EXISTS recurring_jobs CASCADE;
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS job_feedback CASCADE;
DROP TABLE IF EXISTS quote_templates CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS payment_reminders CASCADE;
DROP TABLE IF EXISTS invoice_access_links CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS quote_access_links CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS service_requests CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS pricing_rules CASCADE;
DROP TABLE IF EXISTS pricing_settings CASCADE;
DROP TABLE IF EXISTS notification_log CASCADE;
DROP TABLE IF EXISTS notification_queue CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS notification_templates_legacy CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS contact_submissions CASCADE;
