/*
  # Add Service Agreement Acceptance to Quotes

  ## Summary
  Adds tracking columns to the quotes table so that when a customer accepts a quote
  via magic link, their agreement to the BudgetWorks Service Agreement is recorded.

  ## Changes

  ### Modified Tables
  - `quotes`
    - `agreement_accepted` (boolean, default false) — whether the customer has accepted the service agreement
    - `agreement_accepted_at` (timestamptz, nullable) — timestamp of when the agreement was accepted
    - `agreement_accepted_ip` (text, nullable) — optional IP address for audit trail

  ## Notes
  - No destructive changes
  - Uses IF NOT EXISTS guards on all column additions
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'agreement_accepted'
  ) THEN
    ALTER TABLE quotes ADD COLUMN agreement_accepted boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'agreement_accepted_at'
  ) THEN
    ALTER TABLE quotes ADD COLUMN agreement_accepted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'agreement_accepted_ip'
  ) THEN
    ALTER TABLE quotes ADD COLUMN agreement_accepted_ip text;
  END IF;
END $$;
