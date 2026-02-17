/*
  # Add Notes Fields to Lead Tables

  1. Changes
    - Add internal_notes column to public_quote_requests table
    - Add internal_notes column to service_requests table
    - These fields allow admins to track notes, communication history, and other details about each lead

  2. Rationale
    - Provides a place for admins to document conversations, follow-ups, and important details
    - Helps maintain context and history for each lead
    - Internal notes are admin-only and not visible to customers
*/

-- Add internal_notes to public_quote_requests
ALTER TABLE public_quote_requests
ADD COLUMN IF NOT EXISTS internal_notes text DEFAULT '';

-- Add internal_notes to service_requests
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS internal_notes text DEFAULT '';

-- Add comment for clarity
COMMENT ON COLUMN public_quote_requests.internal_notes IS 'Admin-only notes for tracking lead details, conversations, and follow-ups';
COMMENT ON COLUMN service_requests.internal_notes IS 'Admin-only notes for tracking lead details, conversations, and follow-ups';
