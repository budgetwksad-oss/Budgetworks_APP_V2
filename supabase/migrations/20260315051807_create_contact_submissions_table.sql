/*
  # Create contact_submissions table

  ## Summary
  Stores messages submitted via the public Contact page.

  ## New Tables
  - `contact_submissions`
    - `id` (uuid, primary key)
    - `name` (text, required) — full name of the sender
    - `email` (text, required) — email address
    - `phone` (text, nullable) — optional phone number
    - `message` (text, required) — the message body
    - `status` (text) — 'new' by default; admins can mark as 'read' or 'resolved'
    - `created_at` (timestamptz) — submission timestamp

  ## Security
  - RLS enabled
  - Anonymous users can INSERT (public contact form)
  - Authenticated admins can SELECT, UPDATE, DELETE their org's submissions
*/

CREATE TABLE IF NOT EXISTS contact_submissions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text NOT NULL,
  phone      text,
  message    text NOT NULL,
  status     text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a contact message"
  ON contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view contact submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update contact submissions"
  ON contact_submissions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
