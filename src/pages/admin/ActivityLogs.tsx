import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Activity, Filter, User, Calendar, RefreshCw } from 'lucide-react';
import { getRecentActivity } from '../../lib/activityLogger';

interface ActivityLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  description: string;
  metadata: any;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

interface ActivityLogsProps {
  onBack: () => void;
}

export function ActivityLogs({ onBack }: ActivityLogsProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getRecentActivity(100);
      setLogs(data as unknown as ActivityLog[]);
    } catch (err) {
      console.error('Error loading activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter !== 'all' && log.action !== filter) return false;
    if (resourceFilter !== 'all' && log.resource_type !== resourceFilter) return false;
    return true;
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'text-green-700 bg-green-100';
      case 'updated':
        return 'text-blue-700 bg-blue-100';
      case 'deleted':
        return 'text-red-700 bg-red-100';
      case 'completed':
        return 'text-purple-700 bg-purple-100';
      case 'cancelled':
        return 'text-gray-700 bg-gray-100';
      case 'approved':
        return 'text-green-700 bg-green-100';
      case 'rejected':
        return 'text-red-700 bg-red-100';
      case 'sent':
        return 'text-blue-700 bg-blue-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getResourceLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (loading) {
    return (
      <PortalLayout portalName="Admin Portal">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading activity logs...</p>
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
        { label: 'Activity Logs' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-8 h-8 text-blue-600" />
              Activity Logs
            </h2>
            <p className="text-gray-600 mt-1">System audit trail and user activity</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadLogs}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="secondary" onClick={onBack}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
              <option value="completed">Completed</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="sent">Sent</option>
            </select>

            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Resources</option>
              <option value="service_request">Service Requests</option>
              <option value="quote">Quotes</option>
              <option value="job">Jobs</option>
              <option value="invoice">Invoices</option>
              <option value="payment">Payments</option>
              <option value="customer">Customers</option>
              <option value="crew">Crew</option>
              <option value="feedback">Feedback</option>
            </select>

            <span className="text-sm text-gray-600 ml-auto">
              Showing {filteredLogs.length} of {logs.length} activities
            </span>
          </div>
        </Card>

        <Card className="p-6">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No activity logs found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                        {log.action.toUpperCase()}
                      </span>
                      <span className="px-2.5 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">
                        {getResourceLabel(log.resource_type)}
                      </span>
                      {log.profiles && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          <span>{log.profiles.full_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 ml-auto">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(log.created_at)}</span>
                      </div>
                    </div>
                    <p className="text-gray-900">{log.description}</p>
                    {log.resource_id && (
                      <p className="text-xs text-gray-500 mt-1">ID: {log.resource_id}</p>
                    )}
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
