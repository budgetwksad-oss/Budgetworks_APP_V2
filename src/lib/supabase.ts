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
  address: string | null;
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

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';

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
  public_quote_request_id: string | null;
  estimate_low: number | null;
  estimate_high: number | null;
  expected_price: number | null;
  cap_amount: number | null;
  pricing_snapshot: Record<string, unknown> | null;
  quote_inputs: Record<string, unknown> | null;
  staffing_defaults: Record<string, unknown> | null;
  accepted_at: string | null;
  declined_at: string | null;
  accepted_method: 'magic_link' | 'phone' | null;
};

export type JobStatus = 'scheduled_draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

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
  crew_pay_min: number | null;
  crew_pay_max: number | null;
  crew_hourly_rate: number | null;
  number_of_crew: number | null;
  job_duration_hours: number | null;
  crew_cost: number | null;
  remaining_margin: number | null;
  marketplace_posted_at: string | null;
  internal_notes: string | null;
  completion_notes: string | null;
  completed_at: string | null;
  source_quote_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  service_type: ServiceType | null;
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

export type AuditLogRow = {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_role: string | null;
  action_key: string;
  entity_type: string;
  entity_id: string | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
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

export type NotificationAudience = 'customer' | 'crew' | 'admin';

export type NotificationPreference = {
  id: string;
  user_id: string;
  audience: NotificationAudience;
  sms_enabled: boolean;
  email_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export async function upsertNotificationPreference(
  userId: string,
  audience: NotificationAudience,
  preferences: { sms_enabled?: boolean; email_enabled?: boolean }
): Promise<{ data: NotificationPreference | null; error: unknown }> {
  try {
    const { data: existing } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('audience', audience)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('notification_preferences')
        .update(preferences)
        .eq('id', existing.id)
        .select()
        .single();

      return { data, error };
    } else {
      const { data, error } = await supabase
        .from('notification_preferences')
        .insert([{
          user_id: userId,
          audience,
          ...preferences
        }])
        .select()
        .single();

      return { data, error };
    }
  } catch (error) {
    return { data: null, error };
  }
}

export async function getNotificationPreference(
  userId: string,
  audience: NotificationAudience
): Promise<{ data: NotificationPreference | null; error: unknown }> {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('audience', audience)
      .maybeSingle();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export type NotificationEventKey =
  | 'lead_received'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_declined'
  | 'job_scheduled'
  | 'job_cancelled'
  | 'job_claimed'
  | 'invoice_sent'
  | 'payment_received';

export type NotificationTemplateV2 = {
  id: string;
  event_key: NotificationEventKey;
  audience: NotificationAudience;
  subject: string | null;
  body: string;
  enabled: boolean;
  service_type: ServiceType | null;
  created_at: string;
  updated_at: string;
};

export async function getNotificationTemplatesV2(): Promise<{
  data: NotificationTemplateV2[] | null;
  error: unknown;
}> {
  try {
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .order('event_key', { ascending: true });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function upsertNotificationTemplateV2(
  template: Partial<NotificationTemplateV2> & { id?: string }
): Promise<{ data: NotificationTemplateV2 | null; error: unknown }> {
  try {
    if (template.id) {
      const enabled = template.enabled ?? true;
      const { data, error } = await supabase
        .from('notification_templates')
        .update({
          subject: template.subject,
          body: template.body,
          enabled,
          is_enabled: enabled,
          service_type: template.service_type
        })
        .eq('id', template.id)
        .select()
        .single();

      return { data, error };
    } else {
      const enabled = template.enabled ?? true;
      const { data, error } = await supabase
        .from('notification_templates')
        .insert([{
          event_key: template.event_key,
          audience: template.audience,
          channel: 'email',
          subject: template.subject,
          body: template.body,
          enabled,
          is_enabled: enabled,
          service_type: template.service_type ?? null
        }])
        .select()
        .single();

      return { data, error };
    }
  } catch (error) {
    return { data: null, error };
  }
}

export type NotificationChannel = 'sms' | 'email';
export type NotificationQueueStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export type NotificationQueueItem = {
  id: string;
  event_key: NotificationEventKey;
  audience: NotificationAudience;
  channel: NotificationChannel;
  to_email: string | null;
  to_phone: string | null;
  destination: string | null;
  rendered_subject: string | null;
  rendered_body: string;
  status: NotificationQueueStatus;
  attempts: number;
  created_at: string;
  sent_at: string | null;
  error: string | null;
  error_message: string | null;
  scheduled_for: string | null;
};

export type NotificationLog = {
  id: string;
  queue_id: string | null;
  event_key: NotificationEventKey;
  audience: NotificationAudience;
  channel: NotificationChannel;
  to_email: string | null;
  to_phone: string | null;
  destination: string | null;
  rendered_subject: string | null;
  rendered_body: string | null;
  status: NotificationQueueStatus;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
};

export async function getNotificationQueue(
  statuses: NotificationQueueStatus[] = ['pending', 'failed']
): Promise<{
  data: NotificationQueueItem[] | null;
  error: unknown;
}> {
  try {
    const { data, error } = await supabase
      .from('notification_queue')
      .select('*')
      .in('status', statuses)
      .order('created_at', { ascending: false })
      .limit(200);

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getNotificationQueueAll(): Promise<{
  data: NotificationQueueItem[] | null;
  error: unknown;
}> {
  try {
    const { data, error } = await supabase
      .from('notification_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateNotificationQueueStatus(
  queueId: string,
  status: NotificationQueueStatus,
  errorMessage?: string
): Promise<{ data: NotificationQueueItem | null; error: unknown }> {
  try {
    const updateData: Record<string, unknown> = { status };

    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString();
    } else if (status === 'failed' && errorMessage) {
      updateData.error = errorMessage;
      updateData.error_message = errorMessage;
    }

    const { data, error } = await supabase
      .from('notification_queue')
      .update(updateData)
      .eq('id', queueId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export type PricingServiceType = 'moving' | 'junk_removal' | 'demolition';

export type PricingSettingsRow = {
  id: string;
  service_type: PricingServiceType;
  settings: Record<string, unknown>;
  is_configured: boolean;
  updated_at: string;
};

export async function fetchPricingSettings(
  service_type: PricingServiceType
): Promise<{ data: PricingSettingsRow | null; error: unknown }> {
  try {
    const { data, error } = await supabase
      .from('pricing_settings')
      .select('*')
      .eq('service_type', service_type)
      .maybeSingle();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function upsertPricingSettings(
  service_type: PricingServiceType,
  settings: Record<string, unknown>,
  is_configured: boolean
): Promise<{ data: PricingSettingsRow | null; error: unknown }> {
  try {
    const { data, error } = await supabase
      .from('pricing_settings')
      .upsert({ service_type, settings, is_configured, updated_at: new Date().toISOString() }, { onConflict: 'service_type' })
      .select()
      .single();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export interface LogAuditParams {
  action_key: string;
  entity_type: string;
  entity_id?: string | null;
  job_id?: string | null;
  quote_id?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  actor_role?: string | null;
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let role: string | null = params.actor_role ?? null;
    if (!role) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      role = profile?.role ?? null;
    }

    await supabase.from('audit_log').insert({
      actor_user_id: user.id,
      actor_role: role,
      action_key: params.action_key,
      entity_type: params.entity_type,
      entity_id: params.entity_id ?? null,
      job_id: params.job_id ?? null,
      quote_id: params.quote_id ?? null,
      message: params.message ?? null,
      metadata: params.metadata ?? null,
    });
  } catch {
    // intentionally swallow audit log errors
  }
}

export async function logNotification(
  queueItem: NotificationQueueItem,
  status: NotificationQueueStatus,
  errorMessage?: string
): Promise<{ data: NotificationLog | null; error: unknown }> {
  try {
    const { data, error } = await supabase
      .from('notification_log')
      .insert([{
        queue_id: queueItem.id,
        event_key: queueItem.event_key,
        audience: queueItem.audience,
        channel: queueItem.channel,
        to_email: queueItem.to_email,
        to_phone: queueItem.to_phone,
        rendered_subject: queueItem.rendered_subject,
        rendered_body: queueItem.rendered_body,
        status,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
        error_message: errorMessage || null
      }])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getNotificationDeliveryStats(): Promise<{
  data: { pending: number; sent: number; failed: number; cancelled: number } | null;
  error: unknown;
}> {
  try {
    const { data, error } = await supabase
      .from('notification_queue')
      .select('status');

    if (error) return { data: null, error };

    const counts = { pending: 0, sent: 0, failed: 0, cancelled: 0 };
    for (const row of data || []) {
      const s = row.status as NotificationQueueStatus;
      if (s in counts) counts[s]++;
    }

    return { data: counts, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
