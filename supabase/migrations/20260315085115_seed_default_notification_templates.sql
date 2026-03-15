/*
  # Seed Default Notification Templates

  ## Summary
  Inserts the canonical set of email notification templates for all operational
  events in BudgetWorks. Uses ON CONFLICT DO NOTHING so re-running is safe.

  ## Templates Covered
  - Lead received (admin)
  - Quote sent (customer), accepted (customer + admin), declined (admin)
  - Job scheduled (customer + crew), cancelled (customer + crew + admin), claimed (admin)
  - Invoice sent (customer)
  - Payment received (customer + admin)
*/

INSERT INTO notification_templates (event_key, audience, channel, subject, body, is_enabled, enabled)
VALUES
  (
    'lead_received', 'admin', 'email',
    'New Lead: {service_label}',
    E'New quote request from {customer_name} for {service_label}.\n\nContact method: {contact_method}\nLocation: {location_address}\nPreferred date: {preferred_date}\n\nLog in to review and respond promptly.',
    true, true
  ),
  (
    'quote_sent', 'customer', 'email',
    'Your Quote for {service_label} is Ready',
    E'Hi {customer_name},\n\nYour quote for {service_label} is ready for review.\n\nEstimated range: {range}\n\nReview and accept your quote here: {quote_link}\n\nOnce accepted we will contact you to schedule your service.\n\nQuestions? Call us at {company_phone}.',
    true, true
  ),
  (
    'quote_accepted', 'customer', 'email',
    'Quote Accepted — Thank You!',
    E'Hi {customer_name},\n\nThank you for accepting our quote for {service_label}!\n\nOur team will contact you shortly to confirm scheduling details.\n\nYou can track your job status in your customer portal.',
    true, true
  ),
  (
    'quote_accepted', 'admin', 'email',
    'Quote Accepted: {service_label} — {customer_name}',
    E'{customer_name} has accepted the quote for {service_label} ({range}).\n\nLog in to schedule the job and assign crew.',
    true, true
  ),
  (
    'quote_declined', 'admin', 'email',
    'Quote Declined: {service_label} — {customer_name}',
    E'{customer_name} declined the quote for {service_label}.\n\nConsider following up to address any concerns.',
    true, true
  ),
  (
    'job_scheduled', 'customer', 'email',
    'Job Scheduled: {service_label}',
    E'Hi {customer_name},\n\nYour {service_label} job has been scheduled.\n\nDate: {job_date}\nArrival window: {arrival_window}\n\nPlease ensure someone is available at the location. To reschedule call {company_phone}.',
    true, true
  ),
  (
    'job_scheduled', 'crew', 'email',
    'New Job Assignment: {service_label}',
    E'You have been assigned to a {service_label} job.\n\nDate: {job_date}\nArrival window: {arrival_window}\n\nLog in to view full job details.',
    true, true
  ),
  (
    'job_cancelled', 'customer', 'email',
    'Job Cancelled: {service_label}',
    E'Hi {customer_name},\n\nYour {service_label} job scheduled for {job_date} has been cancelled.\n\nContact us at {company_phone} if you have questions or would like to reschedule.',
    true, true
  ),
  (
    'job_cancelled', 'crew', 'email',
    'Job Cancelled: {service_label} on {job_date}',
    E'The {service_label} job on {job_date} has been cancelled.\n\nCheck your schedule for updates.',
    true, true
  ),
  (
    'job_cancelled', 'admin', 'email',
    'Job Cancelled: {service_label} — {customer_name}',
    E'The {service_label} job for {customer_name} on {job_date} has been cancelled.',
    true, true
  ),
  (
    'job_claimed', 'admin', 'email',
    'Job Claimed: {service_label}',
    E'A crew member has claimed the {service_label} job on {job_date}.\n\nLog in to review and confirm the assignment.',
    true, true
  ),
  (
    'invoice_sent', 'customer', 'email',
    'Your Invoice for {service_label} is Ready',
    E'Hi {customer_name},\n\nYour invoice for {service_label} is ready.\n\nAmount due: {invoice_total}\n\nView and pay your invoice: {invoice_link}\n\nThank you for your business!',
    true, true
  ),
  (
    'payment_received', 'customer', 'email',
    'Payment Received — Thank You!',
    E'Hi {customer_name},\n\nWe have received your payment of {invoice_total} for {service_label}.\n\nThank you for your business!',
    true, true
  ),
  (
    'payment_received', 'admin', 'email',
    'Payment Received: {customer_name}',
    E'Payment of {invoice_total} received from {customer_name} for {service_label}.',
    true, true
  )
ON CONFLICT (event_key, audience, channel, COALESCE(service_type, ''))
DO NOTHING;
