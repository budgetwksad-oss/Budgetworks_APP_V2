import { supabase } from './supabase';

export interface DashboardStats {
  totalRevenue: number;
  pendingRevenue: number;
  completedJobs: number;
  activeJobs: number;
  totalCustomers: number;
  activeCrewMembers: number;
  overdueInvoices: number;
  pendingQuotes: number;
}

export interface RevenueByMonth {
  month: string;
  revenue: number;
  invoiceCount: number;
}

export interface JobStatusBreakdown {
  status: string;
  count: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const [
      invoicesRes,
      jobsRes,
      customersRes,
      crewRes,
      quotesRes
    ] = await Promise.all([
      supabase.from('invoices').select('status, total_amount, due_date'),
      supabase.from('jobs').select('status'),
      supabase.from('profiles').select('id').eq('role', 'customer'),
      supabase.from('profiles').select('id').eq('role', 'crew'),
      supabase.from('quotes').select('status')
    ]);

    const invoices = invoicesRes.data || [];
    const jobs = jobsRes.data || [];

    const totalRevenue = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    const pendingRevenue = invoices
      .filter(inv => ['sent', 'unpaid', 'partial'].includes(inv.status))
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    const completedJobs = jobs.filter(job => job.status === 'completed').length;
    const activeJobs = jobs.filter(job => ['scheduled', 'in_progress'].includes(job.status)).length;

    // Calculate overdue invoices dynamically
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueInvoices = invoices.filter(inv => {
      if (!['sent', 'unpaid', 'partial'].includes(inv.status)) return false;
      const dueDate = new Date(inv.due_date);
      return dueDate < today;
    }).length;

    // Quotes use 'sent' status (not 'pending')
    const pendingQuotes = (quotesRes.data || []).filter(q => q.status === 'sent').length;

    return {
      totalRevenue,
      pendingRevenue,
      completedJobs,
      activeJobs,
      totalCustomers: customersRes.data?.length || 0,
      activeCrewMembers: crewRes.data?.length || 0,
      overdueInvoices,
      pendingQuotes
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
}

export async function getRevenueByMonth(months: number = 6): Promise<RevenueByMonth[]> {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data, error } = await supabase
      .from('invoices')
      .select('created_at, total_amount, status')
      .eq('status', 'paid')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    const revenueMap = new Map<string, { revenue: number; count: number }>();

    (data || []).forEach(invoice => {
      const date = new Date(invoice.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const existing = revenueMap.get(monthKey) || { revenue: 0, count: 0 };
      revenueMap.set(monthKey, {
        revenue: existing.revenue + (invoice.total_amount || 0),
        count: existing.count + 1
      });
    });

    const result: RevenueByMonth[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const data = revenueMap.get(monthKey) || { revenue: 0, count: 0 };
      result.push({
        month: monthName,
        revenue: data.revenue,
        invoiceCount: data.count
      });
    }

    return result;
  } catch (error) {
    console.error('Error fetching revenue by month:', error);
    throw error;
  }
}

export async function getJobStatusBreakdown(): Promise<JobStatusBreakdown[]> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('status');

    if (error) throw error;

    const statusMap = new Map<string, number>();

    (data || []).forEach(job => {
      statusMap.set(job.status, (statusMap.get(job.status) || 0) + 1);
    });

    return Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count
    }));
  } catch (error) {
    console.error('Error fetching job status breakdown:', error);
    throw error;
  }
}

export async function getRecentActivity(limit: number = 10) {
  try {
    const [jobsRes, invoicesRes, quotesRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('id, status, created_at, customer_id, profiles:customer_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('invoices')
        .select('id, invoice_number, status, created_at, customer_id, profiles:customer_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('quotes')
        .select('id, quote_number, status, created_at, customer_id, profiles:customer_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(limit)
    ]);

    const activities = [
      ...(jobsRes.data || []).map(job => ({
        id: job.id,
        type: 'job' as const,
        status: job.status,
        customer: (job.profiles as any)?.full_name || 'Unknown',
        timestamp: job.created_at
      })),
      ...(invoicesRes.data || []).map(inv => ({
        id: inv.id,
        type: 'invoice' as const,
        number: inv.invoice_number,
        status: inv.status,
        customer: (inv.profiles as any)?.full_name || 'Unknown',
        timestamp: inv.created_at
      })),
      ...(quotesRes.data || []).map(quote => ({
        id: quote.id,
        type: 'quote' as const,
        number: quote.quote_number,
        status: quote.status,
        customer: (quote.profiles as any)?.full_name || 'Unknown',
        timestamp: quote.created_at
      }))
    ];

    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    throw error;
  }
}
