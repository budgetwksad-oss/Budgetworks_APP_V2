/*
  # Add welcome notification template for new customer accounts

  ## Summary
  Adds a welcome email template sent when a customer creates an account.
  Uses event_key 'welcome_customer' with audience 'customer'.
*/

INSERT INTO notification_templates (event_key, audience, channel, subject, body, is_enabled, enabled)
VALUES (
  'welcome_customer', 'customer', 'email',
  'Welcome to BudgetWorks, {customer_name}!',
  E'Hi {customer_name},\n\nWelcome to BudgetWorks! Your account has been created successfully.\n\nYou can now:\n- Request quotes for moving, junk removal, and light demolition\n- Track your jobs and service history\n- View and pay invoices online\n\nLog in to your customer portal to get started.\n\nIf you have any questions, contact us at {company_phone}.\n\nThank you for choosing BudgetWorks!',
  true, true
)
ON CONFLICT (event_key, audience, channel, COALESCE(service_type, ''))
DO NOTHING;
