/*
  # Make service_request_id nullable in quotes table

  1. Changes
    - Alter quotes.service_request_id to allow NULL values
    - This allows quotes to be created from either service_requests OR public_quote_requests
    - Previously service_request_id was required, but quotes can now be associated with public_quote_requests only

  2. Rationale
    - Public quote requests (from guest users) should be able to have quotes without requiring a service_request
    - Either service_request_id OR public_quote_request_id should be present, but not both required
*/

ALTER TABLE quotes 
  ALTER COLUMN service_request_id DROP NOT NULL;
