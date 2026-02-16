/*
  # Add Invoices, Payments, Testimonials, Settings, and Audit System
  
  1. New Tables
    - invoices: Customer invoices with line items and totals
    - payments: Payment records linked to invoices
    - testimonials: Customer reviews and ratings
    - company_settings: Single-row configuration for business details
    - pricing_rules: Service pricing configuration
    - notification_templates: Email/SMS templates
    - audit_logs: Action tracking for compliance
    - contact_messages: Contact form submissions
  
  2. Table Updates
    - profiles: Add can_drive field for crew qualifications
    - service_requests: Add contact_name field
    - jobs: Add internal_notes field
  
  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for each role
*/

-- Add can_drive to profiles for crew qualifications
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_drive boolean DEFAULT false;

-- Add contact_name to service_requests
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS contact_name text;

-- Add internal_notes to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS internal_notes text;

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES quotes(id),
  customer_id uuid REFERENCES profiles(id) NOT NULL,
  
  line_items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  tax_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'unpaid', 'partial', 'paid', 'closed')),
  due_date date,
  sent_date timestamptz,
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Create function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
DECLARE
  new_number text;
  counter int;
BEGIN
  SELECT COUNT(*) + 1 INTO counter
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%';
  
  new_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::text, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  
  amount numeric(10,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'check', 'credit_card', 'debit_card', 'e_transfer', 'other')),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  reference_number text,
  notes text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- Create testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES profiles(id),
  job_id uuid REFERENCES jobs(id),
  
  customer_name text NOT NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content text NOT NULL,
  service_type text,
  
  published boolean DEFAULT false,
  featured boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_published ON testimonials(published);
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON testimonials(featured);

-- Create company_settings table (single row)
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL DEFAULT 'BudgetWorks Moving',
  phone text,
  email text,
  address text,
  logo_url text,
  tax_rate numeric(5,2) NOT NULL DEFAULT 13.00,
  primary_color text DEFAULT '#EF7D4C',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default settings if not exists
INSERT INTO company_settings (business_name, tax_rate)
SELECT 'BudgetWorks Moving', 13.00
WHERE NOT EXISTS (SELECT 1 FROM company_settings LIMIT 1);

-- Create pricing_rules table
CREATE TABLE IF NOT EXISTS pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type text NOT NULL CHECK (service_type IN ('moving', 'junk_removal', 'demolition')),
  
  base_fee numeric(10,2) NOT NULL DEFAULT 0,
  per_unit_rate numeric(10,2),
  unit_type text CHECK (unit_type IN ('km', 'hour', 'load', 'sqft')),
  
  description text,
  active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text UNIQUE NOT NULL CHECK (template_type IN (
    'request_received', 'quote_ready', 'quote_accepted', 'quote_rejected',
    'job_scheduled', 'job_completed', 'invoice_ready', 'payment_received'
  )),
  
  email_subject text NOT NULL,
  email_body text NOT NULL,
  sms_body text,
  
  active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default notification templates
INSERT INTO notification_templates (template_type, email_subject, email_body, sms_body, active)
VALUES
  ('request_received', 'We received your service request', 'Thank you for your service request. We will review it and send you a quote within 24 hours.', 'Thank you for your request! Quote coming soon.', true),
  ('quote_ready', 'Your quote is ready', 'Your quote is ready for review. Please log in to view and accept it.', 'Your quote is ready! Log in to view it.', true),
  ('quote_accepted', 'Quote accepted - Thank you!', 'Thank you for accepting our quote! We will contact you shortly to schedule your service.', 'Thanks for accepting! We''ll schedule soon.', true),
  ('job_scheduled', 'Your service is scheduled', 'Your service has been scheduled. Check your portal for details.', 'Service scheduled! Check details in your portal.', true),
  ('job_completed', 'Service completed', 'Your service has been completed. Thank you for choosing us!', 'Service complete! Thanks for choosing us.', true),
  ('invoice_ready', 'Your invoice is ready', 'Your invoice is ready for viewing. Please log in to review and pay.', 'Invoice ready! Log in to view.', true),
  ('payment_received', 'Payment received - Thank you', 'We have received your payment. Thank you for your business!', 'Payment received! Thank you!', true)
ON CONFLICT (template_type) DO NOTHING;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  ip_address inet,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text,
  message text NOT NULL,
  status text DEFAULT 'new' CHECK (status IN ('new', 'read', 'responded', 'archived')),
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at);

-- Enable RLS on all new tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "Customers can read own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Admins can manage all invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- RLS Policies for payments
CREATE POLICY "Customers can read own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = payments.invoice_id AND invoices.customer_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all payments"
  ON payments FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- RLS Policies for testimonials (public read published, admin manage all)
CREATE POLICY "Anyone can read published testimonials"
  ON testimonials FOR SELECT
  USING (published = true);

CREATE POLICY "Admins can manage all testimonials"
  ON testimonials FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- RLS Policies for company_settings (public read, admin update)
CREATE POLICY "Anyone can read company settings"
  ON company_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update company settings"
  ON company_settings FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- RLS Policies for pricing_rules
CREATE POLICY "Anyone can read active pricing rules"
  ON pricing_rules FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage pricing rules"
  ON pricing_rules FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- RLS Policies for notification_templates
CREATE POLICY "Admins can manage notification templates"
  ON notification_templates FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- RLS Policies for audit_logs (admin read only)
CREATE POLICY "Admins can read audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- RLS Policies for contact_messages
CREATE POLICY "Anyone can create contact messages"
  ON contact_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read all contact messages"
  ON contact_messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Admins can update contact messages"
  ON contact_messages FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- Add triggers for updated_at
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON testimonials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
