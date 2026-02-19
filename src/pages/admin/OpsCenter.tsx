import { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart2,
  Bell,
  Briefcase,
  Download,
  FileText,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import { supabase, AuditLogRow } from '../../lib/supabase';
import {
  exportLeadsCsv,
  exportJobsCsv,
  exportInvoicesCsv,
  exportOutboxCsv,
} from '../../lib/csvExport';

interface SystemCounts {
  leads_new: number;
  leads_in_review: number;
  quotes_sent: number;
  jobs_draft: number;
  jobs_scheduled: number;
  jobs_open_claims: number;
  invoices_unpaid: number;
  invoices_partial: number;
  invoices_paid: number;
  notif_pending: number;
  notif_failed: number;
}

interface StatusCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  accent: string;
  onGo: () => void;
}

function StatusCard({ icon, label, value, sub, accent, onGo }: StatusCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${accent}`}>{icon}</div>
        <button
          onClick={onGo}
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors"
        >
          Go <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
        <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

interface OpsCenterProps {
  onNavigate?: (page: string) => void;
}

export function OpsCenter({ onNavigate }: OpsCenterProps) {
  const [counts, setCounts] = useState<SystemCounts | null>(null);
  const [countsLoading, setCountsLoading] = useState(true);
  const [countsError, setCountsError] = useState('');

  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionSearch, setActionSearch] = useState('');

  const [exportingLeads, setExportingLeads] = useState(false);
  const [exportingJobs, setExportingJobs] = useState(false);
  const [exportingInvoices, setExportingInvoices] = useState(false);
  const [exportingOutbox, setExportingOutbox] = useState(false);
  const [exportError, setExportError] = useState('');

  const loadCounts = useCallback(async () => {
    setCountsLoading(true);
    setCountsError('');
    try {
      const [
        leadsRes,
        quotesRes,
        jobsDraftRes,
        jobsScheduledRes,
        jobsClaimsRes,
        invUnpaidRes,
        invPartialRes,
        invPaidRes,
        notifPendingRes,
        notifFailedRes,
      ] = await Promise.all([
        supabase
          .from('public_quote_requests')
          .select('status', { count: 'exact', head: false })
          .in('status', ['new', 'in_review']),
        supabase
          .from('quotes')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'sent'),
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'scheduled_draft'),
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'scheduled'),
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('is_open_for_claims', true),
        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'unpaid'),
        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'partial'),
        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'paid'),
        supabase
          .from('notification_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('notification_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'failed'),
      ]);

      const leadsNew = leadsRes.data?.filter((r: any) => r.status === 'new').length ?? 0;
      const leadsInReview = leadsRes.data?.filter((r: any) => r.status === 'in_review').length ?? 0;

      setCounts({
        leads_new: leadsNew,
        leads_in_review: leadsInReview,
        quotes_sent: quotesRes.count ?? 0,
        jobs_draft: jobsDraftRes.count ?? 0,
        jobs_scheduled: jobsScheduledRes.count ?? 0,
        jobs_open_claims: jobsClaimsRes.count ?? 0,
        invoices_unpaid: invUnpaidRes.count ?? 0,
        invoices_partial: invPartialRes.count ?? 0,
        invoices_paid: invPaidRes.count ?? 0,
        notif_pending: notifPendingRes.count ?? 0,
        notif_failed: notifFailedRes.count ?? 0,
      });
    } catch (err: any) {
      setCountsError(err.message || 'Failed to load system counts');
    } finally {
      setCountsLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError('');
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs((data as AuditLogRow[]) ?? []);
    } catch (err: any) {
      setLogsError(err.message || 'Failed to load audit log');
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCounts();
    loadLogs();
  }, [loadCounts, loadLogs]);

  const filteredLogs = logs.filter((log) => {
    const matchesEntity = entityFilter ? log.entity_type === entityFilter : true;
    const matchesAction = actionSearch
      ? log.action_key.toLowerCase().includes(actionSearch.toLowerCase())
      : true;
    return matchesEntity && matchesAction;
  });

  const entityTypes = Array.from(new Set(logs.map((l) => l.entity_type))).sort();

  const handleExport = async (
    fn: () => Promise<{ error: string | null }>,
    setLoading: (v: boolean) => void
  ) => {
    setExportError('');
    setLoading(true);
    const { error } = await fn();
    if (error) setExportError(error);
    setLoading(false);
  };

  const nav = (page: string) => onNavigate?.(page);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            Ops Center
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">System health at a glance, audit trail, and data exports</p>
        </div>
        <button
          onClick={() => { loadCounts(); loadLogs(); }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* ── System Status ── */}
      <section>
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">System Status</h4>
        {countsError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {countsError}
          </div>
        )}
        {countsLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading counts...
          </div>
        ) : counts ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatusCard
              icon={<Inbox className="w-4 h-4 text-amber-600" />}
              label="New Leads"
              value={counts.leads_new}
              sub={`${counts.leads_in_review} in review`}
              accent="bg-amber-50"
              onGo={() => nav('service-requests')}
            />
            <StatusCard
              icon={<FileText className="w-4 h-4 text-blue-600" />}
              label="Quotes Awaiting"
              value={counts.quotes_sent}
              sub="sent, no response yet"
              accent="bg-blue-50"
              onGo={() => nav('service-requests')}
            />
            <StatusCard
              icon={<Briefcase className="w-4 h-4 text-emerald-600" />}
              label="Scheduled Jobs"
              value={counts.jobs_scheduled}
              sub={`${counts.jobs_draft} draft`}
              accent="bg-emerald-50"
              onGo={() => nav('jobs')}
            />
            <StatusCard
              icon={<Users className="w-4 h-4 text-sky-600" />}
              label="Open for Claims"
              value={counts.jobs_open_claims}
              sub="marketplace jobs"
              accent="bg-sky-50"
              onGo={() => nav('jobs')}
            />
            <StatusCard
              icon={<DollarSignIcon className="w-4 h-4 text-red-500" />}
              label="Unpaid Invoices"
              value={counts.invoices_unpaid}
              sub={`${counts.invoices_partial} partial`}
              accent="bg-red-50"
              onGo={() => nav('invoices')}
            />
            <StatusCard
              icon={<DollarSignIcon className="w-4 h-4 text-emerald-600" />}
              label="Paid Invoices"
              value={counts.invoices_paid}
              accent="bg-emerald-50"
              onGo={() => nav('invoices')}
            />
            <StatusCard
              icon={<Bell className="w-4 h-4 text-orange-500" />}
              label="Notif. Pending"
              value={counts.notif_pending}
              sub={`${counts.notif_failed} failed`}
              accent="bg-orange-50"
              onGo={() => nav('settings')}
            />
          </div>
        ) : null}
      </section>

      {/* ── Activity Log ── */}
      <section>
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Activity Log</h4>
        <Card className="overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by action key..."
                value={actionSearch}
                onChange={(e) => setActionSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">All entity types</option>
              {entityTypes.map((et) => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
          </div>

          {logsError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {logsError}
            </div>
          )}

          {logsLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 px-4 py-8">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading audit log...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No log entries found.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {filteredLogs.map((log) => (
                <div key={log.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                  <div className="mt-0.5 shrink-0">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-xs font-mono font-medium text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
                        {log.action_key}
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">
                        {log.entity_type}
                      </span>
                      {log.actor_role && (
                        <span className="text-xs text-gray-400">{log.actor_role}</span>
                      )}
                    </div>
                    {log.message && (
                      <p className="text-sm text-gray-600 mt-0.5 truncate">{log.message}</p>
                    )}
                  </div>
                  <time className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </time>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* ── Exports ── */}
      <section>
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Data Exports</h4>
        {exportError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {exportError}
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ExportCard
            label="Leads"
            description="public_quote_requests"
            loading={exportingLeads}
            onClick={() => handleExport(exportLeadsCsv, setExportingLeads)}
          />
          <ExportCard
            label="Jobs"
            description="jobs table"
            loading={exportingJobs}
            onClick={() => handleExport(exportJobsCsv, setExportingJobs)}
          />
          <ExportCard
            label="Invoices"
            description="invoices table"
            loading={exportingInvoices}
            onClick={() => handleExport(exportInvoicesCsv, setExportingInvoices)}
          />
          <ExportCard
            label="Outbox"
            description="notification_queue"
            loading={exportingOutbox}
            onClick={() => handleExport(exportOutboxCsv, setExportingOutbox)}
          />
        </div>
      </section>
    </div>
  );
}

function DollarSignIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

interface ExportCardProps {
  label: string;
  description: string;
  loading: boolean;
  onClick: () => void;
}

function ExportCard({ label, description, loading, onClick }: ExportCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="group flex flex-col items-center gap-2 p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <div className="w-10 h-10 rounded-full bg-blue-50 group-hover:bg-blue-100 transition-colors flex items-center justify-center">
        {loading ? (
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        ) : (
          <Download className="w-5 h-5 text-blue-600" />
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-800">Export {label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
    </button>
  );
}
