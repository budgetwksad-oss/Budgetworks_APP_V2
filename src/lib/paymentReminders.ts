import { supabase } from './supabase';

export interface PaymentReminderSchedule {
  invoice_id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  due_date: string;
  status: string;
}

export async function checkAndSendReminders() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        total_amount,
        due_date,
        status,
        customer_id,
        profiles:customer_id(full_name, email)
      `)
      .in('status', ['sent', 'partial', 'overdue']);

    if (invoicesError) throw invoicesError;

    const remindersToSend: Array<{
      invoice: any;
      reminderType: string;
    }> = [];

    for (const invoice of invoices || []) {
      const dueDate = new Date(invoice.due_date);
      dueDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const { data: lastReminder } = await supabase
        .from('payment_reminders')
        .select('reminder_type, sent_at')
        .eq('invoice_id', invoice.id)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastReminderDate = lastReminder ? new Date(lastReminder.sent_at) : null;
      const daysSinceLastReminder = lastReminderDate
        ? Math.floor((today.getTime() - lastReminderDate.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysDiff === 7 && (!lastReminder || lastReminder.reminder_type !== 'week_before')) {
        remindersToSend.push({ invoice, reminderType: 'week_before' });
      } else if (daysDiff === 1 && (!lastReminder || lastReminder.reminder_type !== 'day_before')) {
        remindersToSend.push({ invoice, reminderType: 'day_before' });
      } else if (daysDiff === -3 && daysSinceLastReminder >= 3) {
        remindersToSend.push({ invoice, reminderType: 'overdue_3_days' });
      } else if (daysDiff === -7 && daysSinceLastReminder >= 4) {
        remindersToSend.push({ invoice, reminderType: 'overdue_7_days' });
      }
    }

    const results = [];
    for (const { invoice, reminderType } of remindersToSend) {
      const profile = invoice.profiles as any;

      const result = await sendPaymentReminder({
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        customer_id: invoice.customer_id,
        customer_name: profile?.full_name || 'Valued Customer',
        customer_email: profile?.email || '',
        total_amount: invoice.total_amount,
        due_date: invoice.due_date,
        reminder_type: reminderType
      });

      results.push(result);
    }

    return {
      success: true,
      remindersSent: results.length,
      results
    };
  } catch (error) {
    console.error('Error checking payment reminders:', error);
    throw error;
  }
}

export async function sendPaymentReminder(data: {
  invoice_id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  due_date: string;
  reminder_type: string;
}) {
  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invoice-email`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invoice_id: data.invoice_id,
        customer_email: data.customer_email,
        customer_name: data.customer_name,
        invoice_number: data.invoice_number,
        invoice_total: data.total_amount,
        due_date: data.due_date,
        reminder_type: data.reminder_type
      })
    });

    const result = await response.json();

    if (result.success) {
      const { error: reminderError } = await supabase
        .from('payment_reminders')
        .insert([{
          invoice_id: data.invoice_id,
          reminder_type: data.reminder_type,
          sent_at: new Date().toISOString()
        }]);

      if (reminderError) {
        console.error('Error logging reminder:', reminderError);
      }
    }

    return result;
  } catch (error) {
    console.error('Error sending payment reminder:', error);
    throw error;
  }
}

export async function scheduleAutomaticReminders() {
  const REMINDER_INTERVAL = 24 * 60 * 60 * 1000;

  const runReminders = async () => {
    try {
      const result = await checkAndSendReminders();
      console.log('Payment reminders check complete:', result);
    } catch (error) {
      console.error('Error in scheduled reminders:', error);
    }
  };

  runReminders();

  setInterval(runReminders, REMINDER_INTERVAL);
}
