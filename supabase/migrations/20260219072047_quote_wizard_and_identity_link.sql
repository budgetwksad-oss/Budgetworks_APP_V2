/*
  # Quote Wizard Answers + Identity Linking Columns

  ## Summary
  Additive migration to support structured wizard answers on quote requests
  and cross-table identity linking so guest records can be tied to a user
  account later (matched by email).

  ## Changes

  ### 1. public_quote_requests
  - Add `details` (jsonb, nullable): stores structured wizard step answers

  ### 2. quotes
  - Add `customer_user_id` (uuid, nullable): links quote to a registered user
  - Add `customer_email_snapshot` (text, nullable): email captured at quote time
    for later account linking

  ### 3. invoices
  - Add `customer_user_id` (uuid, nullable): links invoice to a registered user
  - Add `customer_email_snapshot` (text, nullable): email captured at invoice time

  ### 4. jobs
  - Add `customer_user_id` (uuid, nullable): links job to a registered user

  ### 5. Indexes (all IF NOT EXISTS)
  - public_quote_requests: lower(contact_email) for case-insensitive email lookup
  - quotes: customer_user_id
  - invoices: customer_user_id
  - jobs: customer_user_id

  ## Notes
  - No existing columns are modified or dropped
  - No existing enums or constraints are changed
  - All new columns are nullable to avoid breaking existing rows
*/

-- 1. public_quote_requests: wizard answers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'public_quote_requests' AND column_name = 'details'
  ) THEN
    ALTER TABLE public_quote_requests ADD COLUMN details jsonb NULL;
  END IF;
END $$;

-- 2. quotes: identity linking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'customer_user_id'
  ) THEN
    ALTER TABLE quotes ADD COLUMN customer_user_id uuid NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'customer_email_snapshot'
  ) THEN
    ALTER TABLE quotes ADD COLUMN customer_email_snapshot text NULL;
  END IF;
END $$;

-- 3. invoices: identity linking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'customer_user_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN customer_user_id uuid NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'customer_email_snapshot'
  ) THEN
    ALTER TABLE invoices ADD COLUMN customer_email_snapshot text NULL;
  END IF;
END $$;

-- 4. jobs: identity linking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'customer_user_id'
  ) THEN
    ALTER TABLE jobs ADD COLUMN customer_user_id uuid NULL;
  END IF;
END $$;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_public_quote_requests_email
  ON public_quote_requests (lower(contact_email));

CREATE INDEX IF NOT EXISTS idx_quotes_customer_user_id
  ON quotes (customer_user_id);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_user_id
  ON invoices (customer_user_id);

CREATE INDEX IF NOT EXISTS idx_jobs_customer_user_id
  ON jobs (customer_user_id);
