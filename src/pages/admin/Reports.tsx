import { useState } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FileText, Download, Calendar, TrendingUp, Users, Briefcase, DollarSign, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  exportToCSV,
  exportToPDF,
  prepareJobsReport,
  prepareInvoicesReport,
  prepareCustomersReport,
  prepareRevenueReport
} from '../../lib/reportExports';
import { getRevenueByMonth } from '../../lib/analytics';

interface ReportsProps {
  onBack: () => void;
}

export function Reports({ onBack }: ReportsProps) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const generateJobsReport = async (format: 'csv' | 'pdf') => {
    setGenerating('jobs');
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          service_type,
          status,
          scheduled_date,
          service_requests!inner(location_address),
          profiles!customer_id(full_name),
          quotes!quote_id(total_amount)
        `)
        .gte('created_at', `${dateRange.start}T00:00:00`)
        .lte('created_at', `${dateRange.end}T23:59:59`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedJobs = (data || []).map(job => ({
        id: job.id,
        service_type: job.service_type,
        customer_name: (job.profiles as any)?.full_name,
        status: job.status,
        scheduled_date: job.scheduled_date,
        location: (job.service_requests as any)?.location_address,
        total_amount: (job.quotes as any)?.total_amount
      }));

      const reportData = prepareJobsReport(formattedJobs);

      if (format === 'csv') {
        exportToCSV(reportData);
      } else {
        await exportToPDF(reportData);
      }
    } catch (err: any) {
      console.error('Error generating jobs report:', err);
      showToast('error', 'Failed to generate report: ' + err.message);
    } finally {
      setGenerating(null);
    }
  };

  const generateInvoicesReport = async (format: 'csv' | 'pdf') => {
    setGenerating('invoices');
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          invoice_number,
          issue_date,
          due_date,
          status,
          total_amount,
          amount_paid,
          profiles!customer_id(full_name)
        `)
        .gte('issue_date', `${dateRange.start}T00:00:00`)
        .lte('issue_date', `${dateRange.end}T23:59:59`)
        .order('issue_date', { ascending: false });

      if (error) throw error;

      const formattedInvoices = (data || []).map(inv => ({
        invoice_number: inv.invoice_number,
        customer_name: (inv.profiles as any)?.full_name,
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        status: inv.status,
        total_amount: inv.total_amount,
        balance_due: (inv.total_amount || 0) - (inv.amount_paid || 0)
      }));

      const reportData = prepareInvoicesReport(formattedInvoices);

      if (format === 'csv') {
        exportToCSV(reportData);
      } else {
        await exportToPDF(reportData);
      }
    } catch (err: any) {
      console.error('Error generating invoices report:', err);
      showToast('error', 'Failed to generate report: ' + err.message);
    } finally {
      setGenerating(null);
    }
  };

  const generateCustomersReport = async (format: 'csv' | 'pdf') => {
    setGenerating('customers');
    try {
      const { data: customers, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, created_at')
        .eq('role', 'customer');

      if (error) throw error;

      const customersWithStats = await Promise.all(
        (customers || []).map(async (customer) => {
          const { data: jobs } = await supabase
            .from('jobs')
            .select('id, quotes!quote_id(total_amount)')
            .eq('customer_id', customer.id);

          const totalJobs = jobs?.length || 0;
          const totalSpent = jobs?.reduce((sum, job) => {
            return sum + ((job.quotes as any)?.total_amount || 0);
          }, 0) || 0;

          return {
            ...customer,
            total_jobs: totalJobs,
            total_spent: totalSpent
          };
        })
      );

      const reportData = prepareCustomersReport(customersWithStats);

      if (format === 'csv') {
        exportToCSV(reportData);
      } else {
        await exportToPDF(reportData);
      }
    } catch (err: any) {
      console.error('Error generating customers report:', err);
      showToast('error', 'Failed to generate report: ' + err.message);
    } finally {
      setGenerating(null);
    }
  };

  const generateRevenueReport = async (format: 'csv' | 'pdf') => {
    setGenerating('revenue');
    try {
      const revenueData = await getRevenueByMonth(12);
      const reportData = prepareRevenueReport(revenueData);

      if (format === 'csv') {
        exportToCSV(reportData);
      } else {
        await exportToPDF(reportData);
      }
    } catch (err: any) {
      console.error('Error generating revenue report:', err);
      showToast('error', 'Failed to generate report: ' + err.message);
    } finally {
      setGenerating(null);
    }
  };

  const reportTypes = [
    {
      id: 'jobs',
      title: 'Jobs Report',
      description: 'Complete list of jobs with status and details',
      icon: Briefcase,
      color: 'blue',
      onGenerate: generateJobsReport
    },
    {
      id: 'invoices',
      title: 'Invoices Report',
      description: 'Financial summary of all invoices and payments',
      icon: DollarSign,
      color: 'green',
      onGenerate: generateInvoicesReport
    },
    {
      id: 'customers',
      title: 'Customers Report',
      description: 'Customer information and spending analysis',
      icon: Users,
      color: 'orange',
      onGenerate: generateCustomersReport
    },
    {
      id: 'revenue',
      title: 'Revenue Report',
      description: 'Monthly revenue trends and analytics',
      icon: TrendingUp,
      color: 'purple',
      onGenerate: generateRevenueReport
    }
  ];

  const getColorClasses = (color: string) => {
    const classes = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      orange: 'bg-orange-100 text-orange-600',
      purple: 'bg-purple-100 text-purple-600'
    };
    return classes[color as keyof typeof classes] || classes.blue;
  };

  return (
    <PortalLayout
      portalName="Admin Portal"
      breadcrumbs={[
        { label: 'Dashboard', onClick: onBack },
        { label: 'Reports' }
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
              <FileText className="w-8 h-8 text-blue-600" />
              Reports & Analytics
            </h2>
            <p className="text-gray-600 mt-1">Generate and export business reports</p>
          </div>
          <Button variant="secondary" onClick={onBack}>
            Back to Dashboard
          </Button>
        </div>

        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Date Range</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {reportTypes.map((report) => (
            <Card key={report.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 rounded-lg ${getColorClasses(report.color)}`}>
                  <report.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg mb-1">
                    {report.title}
                  </h3>
                  <p className="text-sm text-gray-600">{report.description}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => report.onGenerate('csv')}
                  disabled={generating === report.id}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {generating === report.id ? 'Generating...' : 'Export CSV'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => report.onGenerate('pdf')}
                  disabled={generating === report.id}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {generating === report.id ? 'Generating...' : 'Export PDF'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PortalLayout>
  );
}
