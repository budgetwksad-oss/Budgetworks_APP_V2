import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  role: 'customer' | 'crew' | 'admin';
  full_name: string;
  phone: string | null;
  can_drive: boolean;
  created_at: string;
  updated_at: string;
};

export type ServiceType = 'moving' | 'junk_removal' | 'demolition';

export type ServiceRequestStatus = 'pending' | 'quoted' | 'accepted' | 'scheduled' | 'completed' | 'cancelled';

export type ServiceRequest = {
  id: string;
  customer_id: string;
  service_type: ServiceType;
  location_address: string;
  contact_name: string | null;
  preferred_date: string | null;
  contact_phone: string | null;
  description: string | null;
  photos_urls: string[];
  status: ServiceRequestStatus;
  created_at: string;
  updated_at: string;
};

export type QuoteLineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
};

export type QuoteStatus = 'sent' | 'accepted' | 'declined' | 'expired';

export type Quote = {
  id: string;
  service_request_id: string;
  quote_number: string;
  line_items: QuoteLineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  valid_until: string;
  notes: string | null;
  status: QuoteStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type CrewAssignment = {
  user_id: string;
  role: 'driver' | 'helper';
  claimed_at: string;
  assigned_by: string | null;
};

export type StaffingNeeds = {
  drivers: number;
  helpers: number;
};

export type CrewPhotos = {
  before: Array<{ url: string; uploaded_by: string; uploaded_at: string }>;
  after: Array<{ url: string; uploaded_by: string; uploaded_at: string }>;
};

export type Job = {
  id: string;
  quote_id: string;
  service_request_id: string;
  customer_id: string;
  status: JobStatus;
  scheduled_date: string | null;
  scheduled_time: string | null;
  arrival_window_start: string | null;
  arrival_window_end: string | null;
  staffing_needs: StaffingNeeds;
  crew_assignments: CrewAssignment[];
  is_open_for_claims: boolean;
  staffing_status: 'unstaffed' | 'partially_staffed' | 'fully_staffed';
  photos_urls: string[];
  crew_photos: CrewPhotos;
  assigned_crew_ids: string[];
  internal_notes: string | null;
  completion_notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TimeEntry = {
  id: string;
  job_id: string;
  crew_member_id: string;
  clock_in: string;
  clock_out: string | null;
  hours_worked: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceStatus = 'draft' | 'sent' | 'unpaid' | 'partial' | 'paid' | 'closed';

export type Invoice = {
  id: string;
  invoice_number: string;
  job_id: string | null;
  quote_id: string | null;
  customer_id: string;
  line_items: QuoteLineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  status: InvoiceStatus;
  due_date: string | null;
  sent_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type PaymentMethod = 'cash' | 'check' | 'credit_card' | 'debit_card' | 'e_transfer' | 'other';
export type PaymentStatus = 'completed' | 'pending' | 'failed' | 'refunded';

export type Payment = {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference_number: string | null;
  notes: string | null;
  status: PaymentStatus;
  created_at: string;
  created_by: string;
};

export type Testimonial = {
  id: string;
  customer_id: string | null;
  job_id: string | null;
  customer_name: string;
  rating: number;
  content: string;
  service_type: ServiceType | null;
  published: boolean;
  featured: boolean;
  created_at: string;
  updated_at: string;
};

export type CompanySettings = {
  id: string;
  business_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
  tax_rate: number;
  primary_color: string;
  created_at: string;
  updated_at: string;
};

export type PricingRule = {
  id: string;
  service_type: ServiceType;
  base_fee: number;
  per_unit_rate: number | null;
  unit_type: 'km' | 'hour' | 'load' | 'sqft' | null;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type NotificationTemplateType =
  | 'request_received'
  | 'quote_ready'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'job_scheduled'
  | 'job_completed'
  | 'invoice_ready'
  | 'payment_received';

export type NotificationTemplate = {
  id: string;
  template_type: NotificationTemplateType;
  email_subject: string;
  email_body: string;
  sms_body: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  user_id: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

export type ContactMessageStatus = 'new' | 'read' | 'responded' | 'archived';

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: ContactMessageStatus;
  created_at: string;
};
