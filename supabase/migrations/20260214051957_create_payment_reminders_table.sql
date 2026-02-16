/*
  # Create Payment Reminders Table

  1. New Tables
    - `payment_reminders`
      - `id` (uuid, primary key)
      - `invoice_id` (uuid, foreign key to invoices)
      - `reminder_type` (text) - Type of reminder: week_before, day_before, overdue_3_days, overdue_7_days
      - `sent_at` (timestamptz) - When the reminder was sent
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on `payment_reminders` table
    - Add policy for admin users to view all reminders
    - Add policy for customers to view their own invoice reminders

  3. Notes
    - This table tracks all payment reminders sent to prevent duplicate sends
    - Reminders are automatically scheduled based on invoice due dates
*/

CREATE TABLE IF NOT EXISTS payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  reminder_type text NOT NULL CHECK (reminder_type IN ('week_before', 'day_before', 'overdue_3_days', 'overdue_7_days')),
  sent_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all reminders"
  ON payment_reminders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Customers can view their invoice reminders"
  ON payment_reminders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = payment_reminders.invoice_id
      AND invoices.customer_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_payment_reminders_invoice_id ON payment_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_sent_at ON payment_reminders(sent_at);
