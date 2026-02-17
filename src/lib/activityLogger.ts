import { supabase } from './supabase';

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'viewed'
  | 'approved'
  | 'rejected'
  | 'sent'
  | 'completed'
  | 'cancelled';

export type ResourceType =
  | 'service_request'
  | 'public_quote_request'
  | 'quote'
  | 'job'
  | 'invoice'
  | 'payment'
  | 'customer'
  | 'crew'
  | 'feedback'
  | 'template';

interface LogActivityParams {
  action: ActivityAction;
  resourceType: ResourceType;
  resourceId?: string;
  description: string;
  metadata?: Record<string, any>;
}

export async function logActivity({
  action,
  resourceType,
  resourceId,
  description,
  metadata = {}
}: LogActivityParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn('Cannot log activity: No user found');
      return;
    }

    const { error } = await supabase
      .from('activity_logs')
      .insert([{
        user_id: user.id,
        action,
        resource_type: resourceType,
        resource_id: resourceId || null,
        description,
        metadata,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (err) {
    console.error('Error in logActivity:', err);
  }
}

export async function getRecentActivity(limit: number = 20) {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        id,
        action,
        resource_type,
        resource_id,
        description,
        metadata,
        created_at,
        profiles!user_id (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    return [];
  }
}

export async function getUserActivity(userId: string, limit: number = 50) {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching user activity:', err);
    return [];
  }
}

export async function getResourceActivity(resourceType: ResourceType, resourceId: string) {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        id,
        action,
        description,
        created_at,
        profiles!user_id (
          full_name,
          email
        )
      `)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching resource activity:', err);
    return [];
  }
}
