import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  LayoutDashboard,
  Briefcase,
  DollarSign,
  FileText,
  MapPin,
  Phone,
  ClipboardList,
  UserPlus,
  ArrowRight,
  AlertCircle,
  Plus,
  Settings as SettingsIcon,
  Tag,
  Bell,
  BarChart2,
  Users,
  RefreshCw,
  Clock,
  CheckCircle2,
  Circle,
  Mail
} from 'lucide-react';
import { MenuSection } from '../../components/layout/Sidebar';
import { supabase, ServiceRequest, PublicQuoteRequest } from '../../lib/supabase';
import { ServiceRequests } from '../admin/ServiceRequests';
import { ManageJobs } from '../admin/ManageJobs';
import { CrewManagement } from '../admin/CrewManagement';
import { InvoiceManagement } from '../admin/InvoiceManagement';
import { Settings } from '../admin/Settings';
import { CreateQuote } from '../admin/CreateQuote';
import { PricingSettings } from '../admin/PricingSettings';
import { NotificationsOutbox } from '../admin/NotificationsOutbox';
import { NotificationsTemplates } from '../admin/NotificationsTemplates';
import { Reports } from '../admin/Reports';
import { ContactMessages } from '../admin/ContactMessages';

type Page =
  | 'dashboard'
  | 'service-requests'
  | 'jobs'
  | 'crew'
  | 'invoices'
  | 'create-quote'
  | 'pricing'
  | 'notifications'
  | 'reports'
  | 'contact-messages'
  | 'settings';

type LeadRow = (ServiceRequest | PublicQuoteRequest) & { _kind?: 'public' };

interface OpsData {
  newLeads: number;
  pendingQuotes: number;
  jobsNeedingCrew: number;
  jobsInProgress: number;
  unpaidInvoices: number;
  newContactMessages: number;
  todayJobs: JobRow[];
  recentLeads: LeadRow[];
  inProgressJobs: JobRow[];
  needsCrewJobs: JobRow[];
  overdueInvoices: InvoiceRow[];
}

type JobRow = {
  id: string;
  status: string;
  service_type?: string | null;
  scheduled_date?: string | null;
  crew_ids?: string[] | null;
  service_requests?: { location_address?: string } | null;
};

type InvoiceRow = {
  id: string;
  invoice_number?: string | null;
  due_date?: string | null;
  total_amount?: number | null;
  status?: string | null;
};

type NotificationsSubPage = 'delivery' | 'templates';

function NotificationsPage({
  sidebarSections,
  onBack,
}: {
  sidebarSections: MenuSection[];
  onBack: () => void;
}) {
  const [sub, setSub] = useState<NotificationsSubPage>('delivery');

  return (
    <PortalLayout
      portalName="Admin Portal"
      sidebarSections={sidebarSections}
      activeItemId="notifications"
      breadcrumbs={[
        { label: 'Admin Portal', onClick: onBack },
        { label: 'Notifications' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex gap-1 border-b border-gray-200">
          {([
            { id: 'delivery', label: 'Delivery Queue' },
            { id: 'templates', label: 'Templates' },
          ] as const).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSub(id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                sub === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {sub === 'delivery' ? <NotificationsOutbox /> : <NotificationsTemplates />}
      </div>
    </PortalLayout>
  );
}

export function AdminPortal() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [loading, setLoading] = useState(true);
  const [ops, setOps] = useState<OpsData>({
    newLeads: 0,
    pendingQuotes: 0,
    jobsNeedingCrew: 0,
    jobsInProgress: 0,
    unpaidInvoices: 0,
    newContactMessages: 0,
    todayJobs: [],
    recentLeads: [],
    inProgressJobs: [],
    needsCrewJobs: [],
    overdueInvoices: [],
  });

  useEffect(() => {
    loadOpsData();
  }, []);

  const loadOpsData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [
        customerLeadsRes,
        guestLeadsRes,
        quotesRes,
        jobsRes,
        invoicesRes,
        contactMsgsRes,
      ] = await Promise.all([
        supabase
          .from('service_requests')
          .select('id, service_type, location_address, contact_phone, created_at, status')
          .in('status', ['pending'])
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('public_quote_requests')
          .select('id, service_type, location_address, contact_phone, contact_name, created_at, status')
          .in('status', ['new', 'in_review'])
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('quotes')
          .select('id, status, total_min, total_max, created_at')
          .in('status', ['sent', 'pending'])
          .order('created_at', { ascending: false }),
        supabase
          .from('jobs')
          .select('id, status, scheduled_date, arrival_start, service_type, crew_ids, service_requests!inner(location_address)')
          .in('status', ['scheduled', 'in_progress', 'pending_crew'])
          .order('scheduled_date', { ascending: true }),
        supabase
          .from('invoices')
          .select('id, invoice_number, total_amount, status, due_date, created_at')
          .in('status', ['sent', 'overdue', 'unpaid'])
          .order('due_date', { ascending: true })
          .limit(10),
        supabase
          .from('contact_messages')
          .select('id', { count: 'exact' })
          .eq('status', 'new'),
      ]);

      const allJobs = jobsRes.data || [];
      const todayJobsList = allJobs.filter(j => {
        if (!j.scheduled_date) return false;
        const d = new Date(j.scheduled_date);
        return d >= today && d < tomorrow;
      });
      const needsCrew = allJobs.filter(j =>
        j.status === 'pending_crew' || (j.status === 'scheduled' && (!j.crew_ids || j.crew_ids.length === 0))
      );
      const inProgress = allJobs.filter(j => j.status === 'in_progress');

      const leads = [
        ...(customerLeadsRes.data || []),
        ...(guestLeadsRes.data || []).map((r: PublicQuoteRequest) => ({ ...r, _kind: 'public' as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);

      setOps({
        newLeads: (customerLeadsRes.data?.length || 0) + (guestLeadsRes.data?.length || 0),
        pendingQuotes: quotesRes.data?.length || 0,
        jobsNeedingCrew: needsCrew.length,
        jobsInProgress: inProgress.length,
        unpaidInvoices: invoicesRes.data?.length || 0,
        newContactMessages: contactMsgsRes.count || 0,
        todayJobs: todayJobsList,
        recentLeads: leads as LeadRow[],
        inProgressJobs: inProgress.slice(0, 5),
        needsCrewJobs: needsCrew.slice(0, 5),
        overdueInvoices: invoicesRes.data || [],
      });
    } catch (err) {
      console.error('Error loading ops data:', err);
    } finally {
      setLoading(false);
    }
  };

  const sidebarSections: MenuSection[] = [
    {
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          onClick: () => setCurrentPage('dashboard')
        },
        {
          id: 'service-requests',
          label: 'Leads',
          icon: ClipboardList,
          onClick: () => setCurrentPage('service-requests'),
          badge: ops.newLeads
        },
        {
          id: 'create-quote',
          label: 'Quote Studio',
          icon: FileText,
          onClick: () => setCurrentPage('create-quote')
        },
        {
          id: 'jobs',
          label: 'Jobs',
          icon: Briefcase,
          onClick: () => setCurrentPage('jobs'),
          badge: ops.todayJobs.length
        },
        {
          id: 'crew',
          label: 'Crew',
          icon: UserPlus,
          onClick: () => setCurrentPage('crew')
        },
        {
          id: 'invoices',
          label: 'Invoices',
          icon: DollarSign,
          onClick: () => setCurrentPage('invoices'),
          badge: ops.unpaidInvoices
        },
        {
          id: 'pricing',
          label: 'Pricing',
          icon: Tag,
          onClick: () => setCurrentPage('pricing')
        },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: Bell,
          onClick: () => setCurrentPage('notifications')
        },
        {
          id: 'reports',
          label: 'Advanced Reporting',
          icon: BarChart2,
          onClick: () => setCurrentPage('reports')
        },
        {
          id: 'contact-messages',
          label: 'Contact Messages',
          icon: Mail,
          onClick: () => setCurrentPage('contact-messages'),
          badge: ops.newContactMessages
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: SettingsIcon,
          onClick: () => setCurrentPage('settings')
        }
      ]
    }
  ];

  if (currentPage === 'service-requests') {
    return (
      <ServiceRequests
        sidebarSections={sidebarSections}
        onBack={() => setCurrentPage('dashboard')}
      />
    );
  }

  if (currentPage === 'jobs') {
    return (
      <ManageJobs
        sidebarSections={sidebarSections}
        onBack={() => setCurrentPage('dashboard')}
      />
    );
  }

  if (currentPage === 'create-quote') {
    return (
      <CreateQuote
        lead={undefined}
        onBack={() => setCurrentPage('dashboard')}
        onSuccess={() => setCurrentPage('service-requests')}
        sidebarSections={sidebarSections}
      />
    );
  }

  if (currentPage === 'crew') {
    return (
      <CrewManagement onBack={() => setCurrentPage('dashboard')} />
    );
  }

  if (currentPage === 'invoices') {
    return (
      <InvoiceManagement onBack={() => setCurrentPage('dashboard')} />
    );
  }

  if (currentPage === 'settings') {
    return (
      <Settings onBack={() => setCurrentPage('dashboard')} />
    );
  }

  if (currentPage === 'pricing') {
    return (
      <PortalLayout
        portalName="Admin Portal"
        sidebarSections={sidebarSections}
        activeItemId={currentPage}
        breadcrumbs={[
          { label: 'Admin Portal', onClick: () => setCurrentPage('dashboard') },
          { label: 'Pricing' }
        ]}
      >
        <PricingSettings />
      </PortalLayout>
    );
  }

  if (currentPage === 'notifications') {
    return <NotificationsPage sidebarSections={sidebarSections} onBack={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'reports') {
    return (
      <Reports
        onBack={() => setCurrentPage('dashboard')}
      />
    );
  }

  if (currentPage === 'contact-messages') {
    return (
      <PortalLayout
        portalName="Admin Portal"
        sidebarSections={sidebarSections}
        activeItemId="contact-messages"
        breadcrumbs={[
          { label: 'Admin Portal', onClick: () => setCurrentPage('dashboard') },
          { label: 'Contact Messages' }
        ]}
      >
        <ContactMessages />
      </PortalLayout>
    );
  }

  const serviceLabel = (type: string) => {
    if (type === 'moving') return 'Moving';
    if (type === 'junk_removal') return 'Junk Removal';
    if (type === 'demolition') return 'Demolition';
    return type;
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric'
  });

  const fmtJobDate = (d: string | null) => {
    if (!d) return 'Unscheduled';
    return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const statCards = [
    {
      label: 'New Quote Requests',
      value: ops.newLeads,
      icon: ClipboardList,
      color: 'orange',
      urgent: ops.newLeads > 0,
      onClick: () => setCurrentPage('service-requests'),
    },
    {
      label: 'Pending Quotes',
      value: ops.pendingQuotes,
      icon: FileText,
      color: 'blue',
      urgent: false,
      onClick: () => setCurrentPage('create-quote'),
    },
    {
      label: 'Jobs Needing Crew',
      value: ops.jobsNeedingCrew,
      icon: UserPlus,
      color: 'amber',
      urgent: ops.jobsNeedingCrew > 0,
      onClick: () => setCurrentPage('jobs'),
    },
    {
      label: 'Jobs In Progress',
      value: ops.jobsInProgress,
      icon: Briefcase,
      color: 'green',
      urgent: false,
      onClick: () => setCurrentPage('jobs'),
    },
    {
      label: 'Unpaid Invoices',
      value: ops.unpaidInvoices,
      icon: DollarSign,
      color: 'red',
      urgent: ops.unpaidInvoices > 0,
      onClick: () => setCurrentPage('invoices'),
    },
  ] as const;

  const colorMap: Record<string, { bg: string; icon: string; ring: string; num: string }> = {
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600 bg-orange-100', ring: 'ring-orange-200', num: 'text-orange-700' },
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600 bg-blue-100',     ring: 'ring-blue-200',   num: 'text-blue-700'   },
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-600 bg-amber-100',   ring: 'ring-amber-200',  num: 'text-amber-700'  },
    green:  { bg: 'bg-green-50',  icon: 'text-green-600 bg-green-100',   ring: 'ring-green-200',  num: 'text-green-700'  },
    red:    { bg: 'bg-red-50',    icon: 'text-red-600 bg-red-100',       ring: 'ring-red-200',    num: 'text-red-700'    },
  };

  return (
    <PortalLayout
      portalName="Admin Portal"
      sidebarSections={sidebarSections}
      activeItemId={currentPage}
    >
      <div className="space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Operations</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={loadOpsData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="primary" onClick={() => setCurrentPage('service-requests')}>
              <Plus className="w-4 h-4 mr-1" />
              New Lead
            </Button>
          </div>
        </div>

        {ops.newLeads > 0 && (
          <div
            className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-xl cursor-pointer hover:bg-orange-100 transition-colors"
            onClick={() => setCurrentPage('service-requests')}
          >
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2.5 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {ops.newLeads} new quote request{ops.newLeads !== 1 ? 's' : ''} waiting
                </p>
                <p className="text-xs text-orange-700">Respond quickly to win the job</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-orange-500" />
          </div>
        )}

        {ops.jobsNeedingCrew > 0 && (
          <div
            className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors"
            onClick={() => setCurrentPage('jobs')}
          >
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2.5 rounded-lg">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {ops.jobsNeedingCrew} job{ops.jobsNeedingCrew !== 1 ? 's' : ''} need crew assignment
                </p>
                <p className="text-xs text-amber-700">Assign crew before the scheduled date</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-500" />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statCards.map(({ label, value, icon: Icon, color, urgent, onClick }) => {
            const c = colorMap[color];
            return (
              <button
                key={label}
                onClick={onClick}
                className={`p-4 rounded-xl border text-left transition-all hover:shadow-md ${
                  urgent && value > 0
                    ? `${c.bg} border-current ring-1 ${c.ring}`
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className={`inline-flex p-2 rounded-lg mb-3 ${c.icon}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className={`text-3xl font-bold mb-1 ${urgent && value > 0 ? c.num : 'text-gray-900'}`}>
                  {loading ? '—' : value}
                </p>
                <p className="text-xs text-gray-500 leading-tight">{label}</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <ClipboardList className="w-4 h-4 text-orange-500" />
                New Quote Requests
              </h3>
              <Button variant="secondary" size="sm" onClick={() => setCurrentPage('service-requests')}>
                View All
              </Button>
            </div>
            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
              ) : ops.recentLeads.length === 0 ? (
                <div className="py-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No pending requests</p>
                </div>
              ) : (
                ops.recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => setCurrentPage('service-requests')}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                          {serviceLabel(lead.service_type)}
                        </span>
                        {lead._kind === 'public' && (
                          <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                            Guest
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {lead.location_address}
                      </p>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <p className="text-xs text-gray-400">{fmtDate(lead.created_at)}</p>
                      {lead.contact_phone && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 justify-end mt-0.5">
                          <Phone className="w-3 h-3" />
                          {lead.contact_phone}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <Briefcase className="w-4 h-4 text-green-500" />
                Jobs In Progress
              </h3>
              <Button variant="secondary" size="sm" onClick={() => setCurrentPage('jobs')}>
                View All
              </Button>
            </div>
            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
              ) : ops.inProgressJobs.length === 0 ? (
                <div className="py-6 text-center">
                  <Circle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No jobs in progress</p>
                </div>
              ) : (
                ops.inProgressJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
                    onClick={() => setCurrentPage('jobs')}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {serviceLabel(job.service_type)}
                      </p>
                      <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {job.service_requests?.location_address || '—'}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0 text-right">
                      <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        In Progress
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-amber-500" />
                Jobs Needing Crew
              </h3>
              <Button variant="secondary" size="sm" onClick={() => setCurrentPage('crew')}>
                Assign Crew
              </Button>
            </div>
            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
              ) : ops.needsCrewJobs.length === 0 ? (
                <div className="py-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">All jobs have crew assigned</p>
                </div>
              ) : (
                ops.needsCrewJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                    onClick={() => setCurrentPage('jobs')}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {serviceLabel(job.service_type)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        {fmtJobDate(job.scheduled_date)}
                      </p>
                    </div>
                    <span className="ml-3 flex-shrink-0 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      No Crew
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-red-500" />
                Unpaid Invoices
              </h3>
              <Button variant="secondary" size="sm" onClick={() => setCurrentPage('invoices')}>
                View All
              </Button>
            </div>
            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
              ) : ops.overdueInvoices.length === 0 ? (
                <div className="py-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No outstanding invoices</p>
                </div>
              ) : (
                ops.overdueInvoices.slice(0, 5).map((inv) => {
                  const isOverdue = inv.status === 'overdue' ||
                    (inv.due_date && new Date(inv.due_date) < new Date());
                  return (
                    <div
                      key={inv.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer hover:opacity-80 ${
                        isOverdue
                          ? 'bg-red-50 border-red-100'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                      onClick={() => setCurrentPage('invoices')}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {inv.invoice_number || `INV-${inv.id.slice(0, 6).toUpperCase()}`}
                        </p>
                        {inv.due_date && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Due {fmtDate(inv.due_date)}
                          </p>
                        )}
                      </div>
                      <div className="ml-3 text-right flex-shrink-0">
                        <p className={`text-sm font-semibold ${isOverdue ? 'text-red-700' : 'text-gray-700'}`}>
                          ${(inv.total_amount || 0).toLocaleString('en-CA', { minimumFractionDigits: 0 })}
                        </p>
                        {isOverdue && (
                          <span className="text-xs text-red-600 font-medium">Overdue</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

        </div>

        {ops.todayJobs.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-blue-500" />
                Today's Schedule
                <span className="ml-1 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                  {ops.todayJobs.length}
                </span>
              </h3>
              <Button variant="secondary" size="sm" onClick={() => setCurrentPage('jobs')}>
                Full Calendar
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {ops.todayJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                  onClick={() => setCurrentPage('jobs')}
                >
                  <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{serviceLabel(job.service_type)}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {job.service_requests?.location_address || '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

      </div>
    </PortalLayout>
  );
}
