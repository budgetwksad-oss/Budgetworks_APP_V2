import { supabase } from './supabase';

function toCsvRow(obj: Record<string, unknown>): string {
  return Object.values(obj)
    .map((val) => {
      if (val === null || val === undefined) return '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    })
    .join(',');
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]).join(',');
  const body = rows.map(toCsvRow).join('\n');
  return `${headers}\n${body}`;
}

function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportLeadsCsv(): Promise<{ error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('public_quote_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) throw error;
    if (!data || data.length === 0) return { error: 'No leads to export.' };

    downloadCsv(toCsv(data as Record<string, unknown>[]), `leads_${Date.now()}.csv`);
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Export failed' };
  }
}

export async function exportJobsCsv(): Promise<{ error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, status, scheduled_date, scheduled_time, service_type, customer_name, customer_email, customer_phone, staffing_status, internal_notes, completed_at, created_at')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) throw error;
    if (!data || data.length === 0) return { error: 'No jobs to export.' };

    downloadCsv(toCsv(data as Record<string, unknown>[]), `jobs_${Date.now()}.csv`);
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Export failed' };
  }
}

export async function exportInvoicesCsv(): Promise<{ error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, customer_id, subtotal, tax_amount, total_amount, status, due_date, sent_date, created_at')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) throw error;
    if (!data || data.length === 0) return { error: 'No invoices to export.' };

    downloadCsv(toCsv(data as Record<string, unknown>[]), `invoices_${Date.now()}.csv`);
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Export failed' };
  }
}

export async function exportOutboxCsv(): Promise<{ error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('notification_queue')
      .select('id, event_key, audience, channel, destination, status, entity_type, entity_id, created_at, sent_at, failed_at, error_message')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) throw error;
    if (!data || data.length === 0) return { error: 'No outbox items to export.' };

    downloadCsv(toCsv(data as Record<string, unknown>[]), `outbox_${Date.now()}.csv`);
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Export failed' };
  }
}
