/*
  # Fix Company Settings and Invoice Schema

  1. Company Settings Improvements
    - Add invoice_terms text field (nullable)
    - Add invoice_footer text field (nullable)
    - Convert tax_rate from percentage (13.00) to fraction (0.13/0.14)
    - Update existing rows if tax_rate > 1

  2. Notes
    - DO NOT add 'overdue' to invoice status enum
    - Overdue will be computed dynamically in the UI
*/

-- Add invoice_terms and invoice_footer to company_settings
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS invoice_terms text,
ADD COLUMN IF NOT EXISTS invoice_footer text;

-- Update tax_rate to be a fraction for Nova Scotia HST (14%)
-- If tax_rate is > 1, assume it's a percentage and convert to fraction
UPDATE company_settings
SET tax_rate = tax_rate / 100
WHERE tax_rate > 1;

-- Set default tax_rate to 0.14 (14% HST for Nova Scotia)
ALTER TABLE company_settings
ALTER COLUMN tax_rate SET DEFAULT 0.14;

-- Update any existing row to have 0.14 if it's still the old default
UPDATE company_settings
SET
  tax_rate = 0.14,
  invoice_terms = 'Payment due within 30 days',
  invoice_footer = 'Thank you for your business!'
WHERE
  invoice_terms IS NULL
  AND invoice_footer IS NULL;