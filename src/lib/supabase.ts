import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ServiceType = 'moving' | 'junk_removal' | 'demolition';

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

export type PublicQuoteRequestStatus = 'new' | 'in_review' | 'quoted' | 'closed';
export type PreferredContactMethod = 'sms' | 'email' | 'call';

export type PublicQuoteRequest = {
  id: string;
  service_type: ServiceType;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  preferred_contact_method: PreferredContactMethod;
  location_address: string;
  preferred_date: string | null;
  description: string | null;
  status: PublicQuoteRequestStatus;
  created_at: string;
  updated_at: string;
};
