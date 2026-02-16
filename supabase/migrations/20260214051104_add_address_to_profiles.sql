/*
  # Add address field to profiles table

  1. Changes
    - Add `address` column to `profiles` table to store user addresses
    - Column is optional (nullable) to allow existing profiles to continue working

  2. Notes
    - This field is used in the Profile UI for both customers and crew members
    - No default value needed as it's optional information
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN address text;
  END IF;
END $$;
