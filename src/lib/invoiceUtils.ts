import { supabase } from './supabase';

export async function updateOverdueInvoices() {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('invoices')
      .update({ status: 'overdue' })
      .lt('due_date', today)
      .in('status', ['sent', 'partial']);

    if (error) {
      console.error('Error updating overdue invoices:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in updateOverdueInvoices:', err);
    return { success: false, error: err };
  }
}

export function isInvoiceOverdue(dueDate: string, status: string): boolean {
  if (status === 'paid' || status === 'closed') {
    return false;
  }

  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return due < today;
}

export function getDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

export function getPaymentReminders(dueDate: string): {
  shouldSendReminder: boolean;
  reminderType: 'week_before' | 'day_before' | 'overdue_3_days' | 'overdue_7_days' | null;
} {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 7) {
    return { shouldSendReminder: true, reminderType: 'week_before' };
  }

  if (diffDays === 1) {
    return { shouldSendReminder: true, reminderType: 'day_before' };
  }

  if (diffDays === -3) {
    return { shouldSendReminder: true, reminderType: 'overdue_3_days' };
  }

  if (diffDays === -7) {
    return { shouldSendReminder: true, reminderType: 'overdue_7_days' };
  }

  return { shouldSendReminder: false, reminderType: null };
}
