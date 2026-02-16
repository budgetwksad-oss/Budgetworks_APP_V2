/*
  # Create Job Feedback Table

  1. New Tables
    - job_feedback
      - id (uuid, primary key)
      - job_id (uuid, foreign key to jobs)
      - customer_id (uuid, foreign key to profiles)
      - rating (integer) - Rating from 1-5 stars
      - comment (text) - Customer feedback comment
      - service_quality (integer) - Service quality rating 1-5
      - professionalism (integer) - Professionalism rating 1-5
      - timeliness (integer) - Timeliness rating 1-5
      - would_recommend (boolean) - Would recommend service
      - created_at (timestamptz) - Feedback submission timestamp
      - updated_at (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on job_feedback table
    - Add policy for customers to create feedback for their own jobs
    - Add policy for customers to view their own feedback
    - Add policy for admin to view all feedback
    - Add policy for customers to update their own feedback

  3. Notes
    - Customers can only submit one feedback per job
    - Feedback can be edited within 7 days of submission
    - All feedback is visible to admin for quality monitoring
*/

CREATE TABLE IF NOT EXISTS job_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  service_quality integer CHECK (service_quality >= 1 AND service_quality <= 5),
  professionalism integer CHECK (professionalism >= 1 AND professionalism <= 5),
  timeliness integer CHECK (timeliness >= 1 AND timeliness <= 5),
  would_recommend boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(job_id, customer_id)
);

ALTER TABLE job_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can create feedback for their jobs"
  ON job_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_feedback.job_id
      AND jobs.customer_id = auth.uid()
      AND jobs.status = 'completed'
    )
  );

CREATE POLICY "Customers can view their own feedback"
  ON job_feedback
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Admins can view all feedback"
  ON job_feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Customers can update their own feedback within 7 days"
  ON job_feedback
  FOR UPDATE
  TO authenticated
  USING (
    customer_id = auth.uid()
    AND created_at > now() - INTERVAL '7 days'
  )
  WITH CHECK (customer_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_job_feedback_job_id ON job_feedback(job_id);
CREATE INDEX IF NOT EXISTS idx_job_feedback_customer_id ON job_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_feedback_rating ON job_feedback(rating);
