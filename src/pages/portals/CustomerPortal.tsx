import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  DollarSign,
  User,
  Briefcase,
  Plus,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { MenuSection } from '../../components/layout/Sidebar';
import { RequestQuote } from '../customer/RequestQuote';
import { QuotesList } from '../customer/QuotesList';
import { JobsList } from '../customer/JobsList';
import { InvoicesList } from '../customer/InvoicesList';
import { InvoiceDetail } from '../customer/InvoiceDetail';
import { Profile } from '../customer/Profile';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type Page =
  | 'dashboard'
  | 'quotes'
  | 'jobs'
  | 'invoices'
  | 'invoice-detail'
  | 'profile'
  | 'request-quote';

interface Metrics {
  activeQuotes: number;
  scheduledJobs: number;
  completedJobs: number;
  unpaidInvoices: number;
  totalOwed: number;
}

export function CustomerPortal() {
  const { user, profile } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [metrics, setMetrics] = useState<Metrics>({
    activeQuotes: 0,
    scheduledJobs: 0,
    completedJobs: 0,
    unpaidInvoices: 0,
    totalOwed: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    loadRecentActivity();
  }, [user]);

  const loadMetrics = async () => {
    if (!user) return;

    try {
      const [quotesRes, jobsRes, invoicesRes] = await Promise.all([
        supabase
          .from('quotes')
          .select(`
            id,
            status,
            service_requests!inner(customer_id)
          `)
          .eq('service_requests.customer_id', user.id),
        supabase
          .from('jobs')
          .select('id, status')
          .eq('customer_id', user.id),
        supabase
          .from('invoices')
          .select(`
            id,
            total_amount,
            status,
            jobs!inner(customer_id)
          `)
          .eq('jobs.customer_id', user.id)
      ]);

      const quotes = quotesRes.data || [];
      const jobs = jobsRes.data || [];
      const invoices = invoicesRes.data || [];

      const activeQuotes = quotes.filter(q => q.status === 'sent').length;
      const scheduledJobs = jobs.filter(j => j.status === 'scheduled').length;
      const completedJobs = jobs.filter(j => j.status === 'completed').length;
      const unpaidInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'closed').length;
      const totalOwed = invoices
        .filter(i => i.status !== 'paid' && i.status !== 'closed')
        .reduce((sum, i) => sum + i.total_amount, 0);

      setMetrics({
        activeQuotes,
        scheduledJobs,
        completedJobs,
        unpaidInvoices,
        totalOwed
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    if (!user) return;

    try {
      const { data: quotes } = await supabase
        .from('quotes')
        .select(`
          id,
          created_at,
          status,
          total_amount,
          service_requests!inner(customer_id)
        `)
        .eq('service_requests.customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, created_at, status, service_type')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      const combined = [
        ...(quotes || []).map(q => ({ ...q, type: 'quote' })),
        ...(jobs || []).map(j => ({ ...j, type: 'job' }))
      ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      setRecentActivity(combined);
    } catch (error) {
      console.error('Error loading activity:', error);
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
          id: 'quotes',
          label: 'Quotes',
          icon: ClipboardList,
          onClick: () => setCurrentPage('quotes'),
          badge: metrics.activeQuotes
        },
        {
          id: 'jobs',
          label: 'My Jobs',
          icon: Briefcase,
          onClick: () => setCurrentPage('jobs'),
          badge: metrics.scheduledJobs
        },
        {
          id: 'invoices',
          label: 'Invoices',
          icon: FileText,
          onClick: () => setCurrentPage('invoices'),
          badge: metrics.unpaidInvoices
        },
        {
          id: 'profile',
          label: 'Profile & Preferences',
          icon: User,
          onClick: () => setCurrentPage('profile')
        }
      ]
    }
  ];

  if (profile?.role !== 'customer') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You do not have permission to access this area.</p>
        </div>
      </div>
    );
  }

  if (currentPage === 'request-quote') {
    return (
      <RequestQuote
        onClose={() => setCurrentPage('dashboard')}
        onSuccess={() => {
          setCurrentPage('quotes');
          loadMetrics();
        }}
      />
    );
  }

  if (currentPage === 'quotes') {
    return (
      <QuotesList
        sidebarSections={sidebarSections}
        onBack={() => setCurrentPage('dashboard')}
      />
    );
  }

  if (currentPage === 'jobs') {
    return (
      <JobsList
        onBack={() => setCurrentPage('dashboard')}
      />
    );
  }

  if (currentPage === 'invoices') {
    return (
      <InvoicesList
        onBack={() => setCurrentPage('dashboard')}
        onViewDetail={(id) => {
          setSelectedInvoiceId(id);
          setCurrentPage('invoice-detail');
        }}
      />
    );
  }

  if (currentPage === 'invoice-detail' && selectedInvoiceId) {
    return (
      <InvoiceDetail
        invoiceId={selectedInvoiceId}
        onBack={() => setCurrentPage('invoices')}
      />
    );
  }

  if (currentPage === 'profile') {
    return <Profile onBack={() => setCurrentPage('dashboard')} />;
  }

  return (
    <PortalLayout
      portalName="Customer Portal"
      sidebarSections={sidebarSections}
      activeItemId={currentPage}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
            <p className="text-gray-600">Manage your service requests and track your jobs</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setCurrentPage('request-quote')}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Request Quote
          </Button>
        </div>

        {metrics.totalOwed > 0 && (
          <Card className="p-6 bg-orange-50 border-orange-200">
            <div className="flex items-start gap-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Outstanding Balance</h3>
                <p className="text-2xl font-bold text-orange-600">${metrics.totalOwed.toFixed(2)}</p>
                <p className="text-sm text-gray-600 mt-1">
                  You have {metrics.unpaidInvoices} unpaid invoice{metrics.unpaidInvoices !== 1 ? 's' : ''}
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => setCurrentPage('invoices')}
                size="sm"
              >
                View Invoices
              </Button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            className="p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setCurrentPage('quotes')}
          >
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <ClipboardList className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.activeQuotes}</p>
                <p className="text-sm text-gray-600">Active Quotes</p>
              </div>
            </div>
          </Card>

          <Card
            className="p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setCurrentPage('jobs')}
          >
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.scheduledJobs}</p>
                <p className="text-sm text-gray-600">Scheduled Jobs</p>
              </div>
            </div>
          </Card>

          <Card
            className="p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setCurrentPage('invoices')}
          >
            <div className="flex items-center gap-4">
              <div className="bg-red-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.unpaidInvoices}</p>
                <p className="text-sm text-gray-600">Unpaid Invoices</p>
              </div>
            </div>
          </Card>
        </div>

        {recentActivity.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {item.type === 'quote' ? (
                      <ClipboardList className="w-5 h-5 text-orange-600" />
                    ) : (
                      <FileText className="w-5 h-5 text-blue-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.type === 'quote' ? 'Quote Received' : 'Service Update'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentPage('quotes')}
                    className="text-orange-600 hover:text-orange-700"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {recentActivity.length === 0 && !loading && (
          <Card className="p-8 text-center">
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Get Started?</h3>
              <p className="text-gray-600 mb-6">
                Request a quote for moving, junk removal, or light demolition services
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={() => setCurrentPage('request-quote')}
              >
                Request a Quote
              </Button>
            </div>
          </Card>
        )}
      </div>
    </PortalLayout>
  );
}
