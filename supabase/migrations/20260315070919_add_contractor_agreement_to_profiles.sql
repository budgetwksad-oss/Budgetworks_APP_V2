/*
  # Add Contractor Agreement Acceptance to Profiles

  ## Summary
  Adds columns to the profiles table so that crew members' acceptance of the
  independent contractor agreement is recorded at onboarding time.

  ## Changes

  ### Modified Tables
  - `profiles`
    - `contractor_agreement_accepted` (boolean, default false) — whether the crew member has accepted the contractor agreement
    - `contractor_agreement_accepted_at` (timestamptz, nullable) — timestamp of when the agreement was accepted

  ## Notes
  - No destructive changes
  - Only crew-role profiles are expected to use these columns
  - Uses IF NOT EXISTS guards on all column additions
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'contractor_agreement_accepted'
  ) THEN
    ALTER TABLE profiles ADD COLUMN contractor_agreement_accepted boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'contractor_agreement_accepted_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN contractor_agreement_accepted_at timestamptz;
  END IF;
END $$;
