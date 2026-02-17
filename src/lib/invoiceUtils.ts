export async function updateOverdueInvoices() {
  // DO NOT update invoice status to 'overdue' in the database
  // 'overdue' is not in the DB enum and should be computed dynamically
  // This function is kept for backwards compatibility but does nothing
  return { success: true };
}

export function isInvoiceOverdue(dueDate: string, status: string): boolean {
  if (!['sent', 'unpaid', 'partial'].includes(status)) {
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
