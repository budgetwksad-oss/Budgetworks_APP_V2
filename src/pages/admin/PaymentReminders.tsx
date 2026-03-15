import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Bell, Mail, Calendar, DollarSign, User, AlertCircle, CheckCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { checkAndSendReminders } from '../../lib/paymentReminders';

interface ReminderHistory {
  id: string;
  invoice_id: string;
  reminder_type: string;
  sent_at: string;
  invoice: {
    invoice_number: string;
    total: number;
    customer: {
      full_name: string;
      email: string;
    };
  };
}

interface PaymentRemindersProps {
  onBack: () => void;
}

export function PaymentReminders({ onBack }: PaymentRemindersProps) {
  const [reminderHistory, setReminderHistory] = useState<ReminderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<any>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    loadReminderHistory();
  }, []);

  const loadReminderHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_reminders')
        .select(`
          id,
          invoice_id,
          reminder_type,
          sent_at,
          invoices:invoice_id (
            invoice_number,
            total,
            profiles:customer_id (
              full_name,
              email
            )
          )
        `)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedData = (data || []).map(item => ({
        id: item.id,
        invoice_id: item.invoice_id,
        reminder_type: item.reminder_type,
        sent_at: item.sent_at,
        invoice: {
          invoice_number: (item.invoices as any)?.invoice_number || 'N/A',
          total: (item.invoices as any)?.total || 0,
          customer: {
            full_name: (item.invoices as any)?.profiles?.full_name || 'Unknown',
            email: (item.invoices as any)?.profiles?.email || 'N/A'
          }
        }
      }));

      setReminderHistory(formattedData);
    } catch (err: any) {
      console.error('Error loading reminder history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckReminders = async () => {
    setSending(true);
    setLastCheckResult(null);
    try {
      const result = await checkAndSendReminders();
      setLastCheckResult(result);
      await loadReminderHistory();

      if (result.remindersSent > 0) {
        showToast('success', `Successfully sent ${result.remindersSent} payment reminder(s)!`);
      } else {
        showToast('success', 'No payment reminders needed at this time.');
      }
    } catch (err: any) {
      console.error('Error checking reminders:', err);
      showToast('error', 'Failed to check reminders: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const getReminderTypeLabel = (type: string) => {
    switch (type) {
      case 'week_before':
        return 'Due in 7 days';
      case 'day_before':
        return 'Due tomorrow';
      case 'overdue_3_days':
        return '3 days overdue';
      case 'overdue_7_days':
        return '7 days overdue';
      default:
        return type;
    }
  };

  const getReminderTypeColor = (type: string) => {
    switch (type) {
      case 'week_before':
        return 'bg-blue-100 text-blue-700';
      case 'day_before':
        return 'bg-yellow-100 text-yellow-700';
      case 'overdue_3_days':
        return 'bg-orange-100 text-orange-700';
      case 'overdue_7_days':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <PortalLayout portalName="Admin Portal">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reminders...</p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      portalName="Admin Portal"
      breadcrumbs={[
        { label: 'Dashboard', onClick: onBack },
        { label: 'Payment Reminders' }
      ]}
    >
      <div className="space-y-6">
        {toast && (
          <div className={`flex items-center gap-3 p-4 rounded-lg border ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-auto text-current opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
          </div>
        )}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-8 h-8 text-blue-600" />
              Payment Reminders
            </h2>
            <p className="text-gray-600 mt-1">Automated payment reminder system</p>
          </div>
          <Button variant="secondary" onClick={onBack}>
            Back to Dashboard
          </Button>
        </div>

        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Automated Reminder Schedule</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• 7 days before due date - Friendly reminder</li>
                <li>• 1 day before due date - Final reminder</li>
                <li>• 3 days after due date - First overdue notice</li>
                <li>• 7 days after due date - Second overdue notice</li>
              </ul>
              <div className="mt-4">
                <Button
                  variant="primary"
                  onClick={handleCheckReminders}
                  disabled={sending}
                  size="sm"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {sending ? 'Checking...' : 'Check & Send Reminders Now'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {lastCheckResult && (
          <Card className="p-6 bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900">
                  Last Check: {lastCheckResult.remindersSent} reminder(s) sent
                </h3>
                <p className="text-sm text-gray-600">
                  System successfully checked all eligible invoices
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Reminder History
          </h3>
          {reminderHistory.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No reminders sent yet</p>
              <p className="text-sm text-gray-400 mt-1">Click the button above to check for reminders</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminderHistory.map((reminder) => (
                <div
                  key={reminder.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getReminderTypeColor(reminder.reminder_type)}`}>
                          {getReminderTypeLabel(reminder.reminder_type)}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          Invoice #{reminder.invoice.invoice_number}
                        </span>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <User className="w-4 h-4 text-gray-400" />
                          <span>{reminder.invoice.customer.full_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span>{reminder.invoice.customer.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span>${reminder.invoice.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {new Date(reminder.sent_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(reminder.sent_at).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PortalLayout>
  );
}
