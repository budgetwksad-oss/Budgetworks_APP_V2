import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  DollarSign,
  TrendingUp,
  FileText,
  Calendar,
  MapPin,
  Phone,
  ClipboardList,
  Package,
  UserPlus,
  ArrowRight,
  AlertCircle,
  Plus,
  Settings as SettingsIcon
} from 'lucide-react';
import { MenuSection } from '../../components/layout/Sidebar';
import { supabase, ServiceRequest } from '../../lib/supabase';
import { ServiceRequests } from '../admin/ServiceRequests';
import { ManageJobs } from '../admin/ManageJobs';
import { CrewManagement } from '../admin/CrewManagement';
import { InvoiceManagement } from '../admin/InvoiceManagement';
import { Settings } from '../admin/Settings';
import { getDashboardStats, getRevenueByMonth, getRecentActivity } from '../../lib/analytics';
import { LineChart, DonutChart, StatCard } from '../../components/ui/Chart';

type Page =
  | 'dashboard'
  | 'service-requests'
  | 'jobs'
  | 'crew'
  | 'invoices'
  | 'create-quote'
  | 'settings';

interface Metrics {
  pendingRequests: number;
  activeQuotes: number;
  activeJobs: number;
  totalCustomers: number;
  crewMembers: number;
  unpaidInvoices: number;
  monthlyRevenue: number;
  todayJobs: number;
}

export function AdminPortal() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [todayJobs, setTodayJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics>({
    pendingRequests: 0,
    activeQuotes: 0,
    activeJobs: 0,
    totalCustomers: 0,
    crewMembers: 0,
    unpaidInvoices: 0,
    monthlyRevenue: 0,
    todayJobs: 0
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [stats, revenue, activity, requestsRes, jobsRes] = await Promise.all([
        getDashboardStats(),
        getRevenueByMonth(6),
        getRecentActivity(8),
        supabase
          .from('service_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('jobs')
          .select(`
            id,
            status,
            scheduled_date,
            service_type,
            service_requests!inner(location_address)
          `)
      ]);

      const jobs = jobsRes.data || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayJobsList = jobs.filter(j => {
        if (!j.scheduled_date) return false;
        const jobDate = new Date(j.scheduled_date);
        return jobDate >= today && jobDate < tomorrow;
      });

      const thisMonth = revenue[revenue.length - 1]?.revenue || 0;

      setMetrics({
        pendingRequests: stats.pendingQuotes,
        activeQuotes: stats.pendingQuotes,
        activeJobs: stats.activeJobs,
        totalCustomers: stats.totalCustomers,
        crewMembers: stats.activeCrewMembers,
        unpaidInvoices: stats.overdueInvoices,
        monthlyRevenue: thisMonth,
        todayJobs: todayJobsList.length
      });

      setRevenueData(revenue);
      setRecentActivity(activity);
      setServiceRequests(requestsRes.data || []);
      setTodayJobs(todayJobsList);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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
          badge: metrics.pendingRequests
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
          badge: metrics.todayJobs
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
          badge: metrics.unpaidInvoices
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
      <PortalLayout
        portalName="Admin Portal"
        sidebarSections={sidebarSections}
        activeItemId="create-quote"
      >
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Quote Studio</h3>
          <p className="text-gray-600 mb-4">Create quotes from service requests</p>
          <Button
            variant="primary"
            onClick={() => setCurrentPage('service-requests')}
          >
            Go to Service Requests
          </Button>
        </div>
      </PortalLayout>
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

  const getServiceLabel = (type: string) => {
    switch (type) {
      case 'moving':
        return 'Moving';
      case 'junk_removal':
        return 'Junk Removal';
      case 'demolition':
        return 'Demolition';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleGlobalNavigation = (page: string, id?: string) => {
    setCurrentPage(page as Page);
  };

  return (
    <PortalLayout
      portalName="Admin Portal"
      sidebarSections={sidebarSections}
      activeItemId={currentPage}
      showSearch={true}
      onNavigate={handleGlobalNavigation}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
            <p className="text-gray-600">Manage operations, quotes, and team</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setCurrentPage('service-requests')}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            View Requests
          </Button>
        </div>

        {metrics.pendingRequests > 0 && (
          <Card className="p-6 bg-orange-50 border-orange-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Pending Service Requests</h3>
                  <p className="text-sm text-gray-600">
                    You have {metrics.pendingRequests} request{metrics.pendingRequests !== 1 ? 's' : ''} awaiting response
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => setCurrentPage('service-requests')}
                size="sm"
              >
                Review Now
              </Button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            className="p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setCurrentPage('service-requests')}
          >
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <ClipboardList className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.pendingRequests}</p>
                <p className="text-sm text-gray-600">Pending Requests</p>
              </div>
            </div>
          </Card>

          <Card
            className="p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setCurrentPage('create-quote')}
          >
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
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
              <div className="bg-green-100 p-3 rounded-lg">
                <Briefcase className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.activeJobs}</p>
                <p className="text-sm text-gray-600">Active Jobs</p>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">${metrics.monthlyRevenue.toFixed(0)}</p>
                <p className="text-sm text-gray-600">Revenue (Month)</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalCustomers}</p>
                <p className="text-sm text-gray-600">Total Customers</p>
              </div>
            </div>
          </Card>

          <Card
            className="p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setCurrentPage('crew')}
          >
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <UserPlus className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.crewMembers}</p>
                <p className="text-sm text-gray-600">Crew Members</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Revenue Trend (Last 6 Months)
            </h3>
            <div className="h-64">
              {revenueData.length > 0 ? (
                <LineChart
                  data={revenueData.map(item => ({
                    label: item.month,
                    value: item.revenue
                  }))}
                  color="#10B981"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p>No revenue data available</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Service Distribution
            </h3>
            <div className="h-64 flex items-center justify-center">
              <DonutChart
                data={[
                  { label: 'Moving', value: metrics.activeJobs * 0.4, color: '#3B82F6' },
                  { label: 'Junk Removal', value: metrics.activeJobs * 0.35, color: '#10B981' },
                  { label: 'Demolition', value: metrics.activeJobs * 0.25, color: '#F59E0B' }
                ]}
                size={180}
                thickness={25}
              />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                Recent Quote Requests
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage('service-requests')}
              >
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : serviceRequests.length === 0 ? (
                <p className="text-sm text-gray-500">No pending quote requests</p>
              ) : (
                serviceRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => setCurrentPage('service-requests')}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="inline-block px-2.5 py-1 text-xs font-semibold bg-orange-100 text-orange-700 rounded-full">
                        {getServiceLabel(request.service_type)}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(request.created_at)}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{request.location_address}</span>
                      </div>
                      {request.contact_phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{request.contact_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Today's Jobs
              </h3>
              <Button variant="secondary" size="sm" onClick={() => setCurrentPage('jobs')}>
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {todayJobs.length === 0 ? (
                <p className="text-sm text-gray-500">No jobs scheduled for today</p>
              ) : (
                todayJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => setCurrentPage('jobs')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 capitalize mb-1">
                          {job.service_type.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.service_requests?.location_address || 'No address'}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Recent Activity
          </h3>
          <div className="space-y-2">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500">No recent activity</p>
            ) : (
              recentActivity.map((activity, index) => (
                <div
                  key={`${activity.type}-${activity.id}-${index}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {activity.type === 'job' && (
                      <div className="bg-green-100 p-2 rounded">
                        <Briefcase className="w-4 h-4 text-green-600" />
                      </div>
                    )}
                    {activity.type === 'invoice' && (
                      <div className="bg-blue-100 p-2 rounded">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                      </div>
                    )}
                    {activity.type === 'quote' && (
                      <div className="bg-orange-100 p-2 rounded">
                        <FileText className="w-4 h-4 text-orange-600" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.type === 'job' && `Job ${activity.status}`}
                        {activity.type === 'invoice' && `Invoice ${activity.number} ${activity.status}`}
                        {activity.type === 'quote' && `Quote ${activity.number} ${activity.status}`}
                      </p>
                      <p className="text-xs text-gray-500">{activity.customer}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </PortalLayout>
  );
}
