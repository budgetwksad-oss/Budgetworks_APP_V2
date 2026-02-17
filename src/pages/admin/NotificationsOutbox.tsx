import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Send, Copy, X, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import {
  getNotificationQueue,
  updateNotificationQueueStatus,
  logNotification,
  NotificationQueueItem,
  NotificationQueueStatus
} from '../../lib/supabase';

const EVENT_LABELS: Record<string, string> = {
  lead_received: 'Lead Received',
  quote_sent: 'Quote Sent',
  quote_accepted: 'Quote Accepted',
  quote_declined: 'Quote Declined',
  job_scheduled: 'Job Scheduled',
  job_cancelled: 'Job Cancelled',
  job_claimed: 'Job Claimed',
  invoice_sent: 'Invoice Sent',
  payment_received: 'Payment Received'
};

export function NotificationsOutbox() {
  const [queueItems, setQueueItems] = useState<NotificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const { data, error } = await getNotificationQueue();
      if (error) throw error;
      setQueueItems(data || []);
    } catch (err) {
      console.error('Error loading queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (item: NotificationQueueItem) => {
    try {
      const textToCopy = item.channel === 'email' && item.rendered_subject
        ? `Subject: ${item.rendered_subject}\n\n${item.rendered_body}`
        : item.rendered_body;

      await navigator.clipboard.writeText(textToCopy);
      alert('Message copied to clipboard');
    } catch (err) {
      console.error('Error copying:', err);
      alert('Failed to copy message');
    }
  };

  const handleMarkSent = async (item: NotificationQueueItem) => {
    if (!confirm('Mark this notification as sent?')) {
      return;
    }

    setProcessing(item.id);
    try {
      const { error: updateError } = await updateNotificationQueueStatus(item.id, 'sent');
      if (updateError) throw updateError;

      const { error: logError } = await logNotification(item, 'sent');
      if (logError) throw logError;

      await loadQueue();
    } catch (err: any) {
      console.error('Error marking as sent:', err);
      alert('Failed to mark as sent: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleCancel = async (item: NotificationQueueItem) => {
    if (!confirm('Cancel this notification?')) {
      return;
    }

    setProcessing(item.id);
    try {
      const { error: updateError } = await updateNotificationQueueStatus(item.id, 'cancelled');
      if (updateError) throw updateError;

      const { error: logError } = await logNotification(item, 'cancelled');
      if (logError) throw logError;

      await loadQueue();
    } catch (err: any) {
      console.error('Error cancelling:', err);
      alert('Failed to cancel: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading outbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            Notification Outbox
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage pending and failed notification queue items
          </p>
        </div>
        <Button variant="secondary" onClick={loadQueue} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {queueItems.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Outbox Empty</h3>
          <p className="text-gray-600">
            No pending or failed notifications in the queue
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {queueItems.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {item.status === 'failed' ? (
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  ) : (
                    <Send className="w-6 h-6 text-blue-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-gray-700 uppercase bg-gray-200 px-2 py-0.5 rounded">
                      {EVENT_LABELS[item.event_key] || item.event_key}
                    </span>
                    <span className="text-xs font-medium text-gray-700 uppercase bg-blue-100 px-2 py-0.5 rounded">
                      {item.channel}
                    </span>
                    <span className="text-xs font-medium text-gray-700 uppercase bg-green-100 px-2 py-0.5 rounded">
                      {item.audience}
                    </span>
                    <span className={`text-xs font-medium uppercase px-2 py-0.5 rounded ${
                      item.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="mb-2">
                    <p className="text-sm font-medium text-gray-900">
                      To: {item.destination}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(item.created_at)}
                    </p>
                  </div>

                  {item.rendered_subject && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-gray-700 mb-1">Subject:</p>
                      <p className="text-sm text-gray-900">{item.rendered_subject}</p>
                    </div>
                  )}

                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Message:</p>
                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200 max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {item.rendered_body}
                    </div>
                  </div>

                  {item.error_message && (
                    <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded">
                      <p className="text-xs font-medium text-red-700 mb-1">Error:</p>
                      <p className="text-xs text-red-600">{item.error_message}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCopy(item)}
                      disabled={processing === item.id}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy Message
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleMarkSent(item)}
                      disabled={processing === item.id}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Mark Sent
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCancel(item)}
                      disabled={processing === item.id}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
