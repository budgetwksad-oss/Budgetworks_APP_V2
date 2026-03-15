import { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Send,
  Copy,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  Ban,
  Inbox,
  Mail,
  Phone
} from 'lucide-react';
import {
  getNotificationQueueAll,
  updateNotificationQueueStatus,
  logNotification,
  NotificationQueueItem,
  NotificationQueueStatus,
  getNotificationDeliveryStats
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

type Tab = 'pending' | 'sent' | 'failed' | 'all';

const TABS: { id: Tab; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'pending', label: 'Pending', icon: Clock },
  { id: 'failed', label: 'Failed', icon: AlertCircle },
  { id: 'sent', label: 'Sent', icon: CheckCircle },
  { id: 'all', label: 'All', icon: Inbox },
];

function statusBadge(status: NotificationQueueStatus) {
  const map: Record<NotificationQueueStatus, string> = {
    pending: 'bg-amber-100 text-amber-700',
    sent: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

function StatusIcon({ status }: { status: NotificationQueueStatus }) {
  if (status === 'sent') return <CheckCircle className="w-5 h-5 text-green-500" />;
  if (status === 'failed') return <AlertCircle className="w-5 h-5 text-red-500" />;
  if (status === 'cancelled') return <Ban className="w-5 h-5 text-gray-400" />;
  return <Clock className="w-5 h-5 text-amber-500" />;
}

function getDestinationDisplay(item: NotificationQueueItem): string {
  if (item.to_email) return item.to_email;
  if (item.to_phone) return item.to_phone;
  if (item.destination) return item.destination;
  return '—';
}

export function NotificationsOutbox() {
  const [allItems, setAllItems] = useState<NotificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('pending');
  const [stats, setStats] = useState({ pending: 0, sent: 0, failed: 0, cancelled: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [queueRes, statsRes] = await Promise.all([
        getNotificationQueueAll(),
        getNotificationDeliveryStats(),
      ]);
      setAllItems(queueRes.data || []);
      if (statsRes.data) setStats(statsRes.data);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleItems = tab === 'all'
    ? allItems
    : allItems.filter(i => i.status === tab);

  const handleCopy = async (item: NotificationQueueItem) => {
    const text = item.channel === 'email' && item.rendered_subject
      ? `Subject: ${item.rendered_subject}\n\n${item.rendered_body}`
      : item.rendered_body;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      alert('Failed to copy');
    }
  };

  const handleMarkSent = async (item: NotificationQueueItem) => {
    if (!confirm('Mark this notification as sent?')) return;
    setProcessing(item.id);
    try {
      const { error } = await updateNotificationQueueStatus(item.id, 'sent');
      if (error) throw error;
      await logNotification(item, 'sent');
      await loadData();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleCancel = async (item: NotificationQueueItem) => {
    if (!confirm('Cancel this notification?')) return;
    setProcessing(item.id);
    try {
      const { error } = await updateNotificationQueueStatus(item.id, 'cancelled');
      if (error) throw error;
      await logNotification(item, 'cancelled');
      await loadData();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('en-CA', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            Notification Delivery
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Track and manage email notifications across all events
          </p>
        </div>
        <Button variant="secondary" onClick={loadData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { key: 'pending', label: 'Pending', color: 'amber', icon: Clock },
          { key: 'sent', label: 'Sent', color: 'green', icon: CheckCircle },
          { key: 'failed', label: 'Failed', color: 'red', icon: AlertCircle },
          { key: 'cancelled', label: 'Cancelled', color: 'gray', icon: Ban },
        ] as const).map(({ key, label, color, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key === 'cancelled' ? 'all' : key)}
            className={`p-4 rounded-xl border text-left transition-all ${
              tab === key ? 'ring-2 ring-offset-1' : 'hover:bg-gray-50'
            } border-gray-200 bg-white`}
          >
            <div className={`inline-flex p-2 rounded-lg mb-2 bg-${color}-100`}>
              <Icon className={`w-4 h-4 text-${color}-600`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats[key] ?? 0}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {id !== 'all' && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                id === 'pending' ? 'bg-amber-100 text-amber-700' :
                id === 'failed' ? 'bg-red-100 text-red-700' :
                'bg-green-100 text-green-700'
              }`}>
                {id === 'pending' ? stats.pending : id === 'failed' ? stats.failed : stats.sent}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading notifications...</p>
          </div>
        </div>
      ) : visibleItems.length === 0 ? (
        <Card className="p-10 text-center">
          <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-600">No {tab === 'all' ? '' : tab} notifications</p>
          <p className="text-sm text-gray-400 mt-1">
            {tab === 'pending' && 'No notifications are waiting to be delivered.'}
            {tab === 'failed' && 'No delivery failures — everything is working correctly.'}
            {tab === 'sent' && 'No sent notifications yet.'}
            {tab === 'all' && 'The notification queue is empty.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  <StatusIcon status={item.status} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                      {EVENT_LABELS[item.event_key] || item.event_key}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {item.channel === 'email'
                        ? <Mail className="w-3 h-3" />
                        : <Phone className="w-3 h-3" />}
                      {item.channel}
                    </span>
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                      {item.audience}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusBadge(item.status)}`}>
                      {item.status}
                    </span>
                    {item.attempts > 0 && (
                      <span className="text-xs text-gray-400">
                        {item.attempts} attempt{item.attempts !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="font-medium text-gray-800 truncate">
                      To: {getDestinationDisplay(item)}
                    </span>
                    <span className="text-xs text-gray-400 ml-3 flex-shrink-0">
                      {formatDate(item.created_at)}
                    </span>
                  </div>

                  {item.rendered_subject && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Subject</p>
                      <p className="text-sm text-gray-900">{item.rendered_subject}</p>
                    </div>
                  )}

                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Message</p>
                    <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-28 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {item.rendered_body}
                    </div>
                  </div>

                  {(item.error || item.error_message) && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs font-semibold text-red-700 mb-1">Delivery Error</p>
                      <p className="text-xs text-red-600">{item.error_message || item.error}</p>
                    </div>
                  )}

                  {item.sent_at && (
                    <p className="text-xs text-green-600 mb-2">
                      Delivered {formatDate(item.sent_at)}
                    </p>
                  )}

                  {(item.status === 'pending' || item.status === 'failed') && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopy(item)}
                        disabled={processing === item.id}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
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
                        className="text-red-600 hover:bg-red-50 hover:border-red-200"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
