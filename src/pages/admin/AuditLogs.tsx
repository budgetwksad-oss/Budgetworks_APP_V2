import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { MenuSection } from '../../components/layout/Sidebar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ShieldCheck, RefreshCw, Search, X, Calendar, User } from 'lucide-react';

interface AuditLogRow {
  id: string;
  created_at: string;
  action_key: string;
  entity_type: string;
  entity_id: string | null;
  job_id: string | null;
  quote_id: string | null;
  message: string | null;
  actor_role: string | null;
  actor_user_id: string | null;
  metadata: Record<string, unknown> | null;
  profiles: { full_name: string; email: string } | null;
}

interface AuditLogsProps {
  sidebarSections?: MenuSection[];
  onBack: () => void;
}

const ACTION_COLORS: Record<string, string> = {
  quote_created:    'text-blue-700 bg-blue-100',
  quote_sent:       'text-blue-700 bg-blue-100',
  quote_accepted:   'text-green-700 bg-green-100',
  quote_declined:   'text-red-700 bg-red-100',
  job_created:      'text-green-700 bg-green-100',
  crew_assigned:    'text-amber-700 bg-amber-100',
  job_started:      'text-yellow-700 bg-yellow-100',
  job_completed:    'text-green-700 bg-green-100',
  job_cancelled:    'text-red-700 bg-red-100',
  invoice_sent:     'text-blue-700 bg-blue-100',
  payment_received: 'text-green-700 bg-green-100',
};

const ACTION_LABELS: Record<string, string> = {
  quote_created:    'Quote Created',
  quote_sent:       'Quote Sent',
  quote_accepted:   'Quote Accepted',
  quote_declined:   'Quote Declined',
  job_created:      'Job Created',
  crew_assigned:    'Crew Assigned',
  job_started:      'Job Started',
  job_completed:    'Job Completed',
  job_cancelled:    'Job Cancelled',
  invoice_sent:     'Invoice Sent',
  payment_received: 'Payment Received',
};

const ALL_ACTION_KEYS = Object.keys(ACTION_LABELS);

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortId(id: string | null): string {
  if (!id) return '—';
  return id.slice(0, 8).toUpperCase();
}

export function AuditLogs({ sidebarSections, onBack }: AuditLogsProps) {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [actionFilter, setActionFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('');
  const [quoteFilter, setQuoteFilter] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select(`
          id,
          created_at,
          action_key,
          entity_type,
          entity_id,
          job_id,
          quote_id,
          message,
          actor_role,
          actor_user_id,
          metadata,
          profiles!actor_user_id(full_name, email)
        `)
        .in('action_key', ALL_ACTION_KEYS)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs((data as unknown as AuditLogRow[]) || []);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (actionFilter !== 'all' && log.action_key !== actionFilter) return false;
    if (jobFilter.trim()) {
      const q = jobFilter.trim().toLowerCase();
      if (!log.job_id?.toLowerCase().includes(q)) return false;
    }
    if (quoteFilter.trim()) {
      const q = quoteFilter.trim().toLowerCase();
      if (!log.quote_id?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const hasFilters = actionFilter !== 'all' || jobFilter.trim() || quoteFilter.trim();

  const clearFilters = () => {
    setActionFilter('all');
    setJobFilter('');
    setQuoteFilter('');
  };

  return (
    <PortalLayout
      portalName="Admin Portal"
      sidebarSections={sidebarSections}
      activeItemId="audit-logs"
      breadcrumbs={[
        { label: 'Admin Portal', onClick: onBack },
        { label: 'Audit Logs' },
      ]}
    >
      <div className="space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-gray-600" />
              Audit Logs
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Operational event trail — newest first</p>
          </div>
          <Button variant="secondary" onClick={loadLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Action Type</label>
              <select
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All Actions</option>
                {ALL_ACTION_KEYS.map(key => (
                  <option key={key} value={key}>{ACTION_LABELS[key]}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Filter by Job ID</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={jobFilter}
                  onChange={e => setJobFilter(e.target.value)}
                  placeholder="Paste job ID..."
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Filter by Quote ID</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={quoteFilter}
                  onChange={e => setQuoteFilter(e.target.value)}
                  placeholder="Paste quote ID..."
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-end gap-2">
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
              <span className="text-sm text-gray-500 whitespace-nowrap py-2">
                {filteredLogs.length} of {logs.length}
              </span>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading audit logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center">
              <ShieldCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                {hasFilters ? 'No logs match the current filters.' : 'No audit events recorded yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Timestamp</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Event</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Job ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Quote ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="text-xs">{formatTimestamp(log.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${ACTION_COLORS[log.action_key] ?? 'text-gray-700 bg-gray-100'}`}>
                          {ACTION_LABELS[log.action_key] ?? log.action_key}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-gray-800 text-xs leading-snug truncate" title={log.message ?? ''}>
                          {log.message || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.job_id ? (
                          <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded" title={log.job_id}>
                            {shortId(log.job_id)}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.quote_id ? (
                          <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded" title={log.quote_id}>
                            {shortId(log.quote_id)}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-600">
                            {log.profiles?.full_name ?? log.actor_role ?? 'system'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>
    </PortalLayout>
  );
}
