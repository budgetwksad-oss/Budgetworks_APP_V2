import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FileText, Download, Eye, DollarSign, Calendar, AlertCircle, PlusCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string | null;
  created_at: string;
  due_date: string;
  total_amount: number;
  tax_amount: number;
  status: 'draft' | 'sent' | 'unpaid' | 'partial' | 'paid' | 'closed';
  job_id: string | null;
  jobs: {
    service_type: string;
  } | null;
}

function formatCAD(amount: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}

export function InvoicesList({ onBack, onViewDetail }: { onBack: () => void; onViewDetail: (invoiceId: string) => void }) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'sent' | 'unpaid' | 'partial' | 'paid' | 'closed'>('all');

  useEffect(() => {
    loadInvoices();
  }, [user]);

  const loadInvoices = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          jobs(
            service_type
          )
        `)
        .eq('customer_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      sent: 'bg-blue-100 text-blue-700',
      unpaid: 'bg-red-100 text-red-700',
      partial: 'bg-yellow-100 text-yellow-700',
      paid: 'bg-green-100 text-green-700',
      closed: 'bg-gray-100 text-gray-700'
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredInvoices = invoices.filter(inv =>
    filter === 'all' || inv.status === filter
  );

  const totalOwed = invoices
    .filter(inv => inv.status !== 'paid' && inv.status !== 'closed')
    .reduce((sum, inv) => sum + inv.total_amount, 0);

  if (loading) {
    return (
      <PortalLayout portalName="Customer Portal">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading invoices...</p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      portalName="Customer Portal"
      breadcrumbs={[
        { label: 'Dashboard', onClick: onBack },
        { label: 'Invoices' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Invoices</h2>
            <p className="text-gray-600 mt-1">View and manage your invoices</p>
          </div>
          <Button variant="secondary" onClick={onBack}>
            Back to Dashboard
          </Button>
        </div>

        {totalOwed > 0 && (
          <Card className="p-6 bg-orange-50 border-orange-200">
            <div className="flex items-start gap-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Outstanding Balance</h3>
                <p className="text-2xl font-bold text-orange-600">{formatCAD(totalOwed)}</p>
                <p className="text-sm text-gray-600 mt-1">You have unpaid invoices requiring attention</p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['all', 'unpaid', 'partial', 'paid'] as const).map(filterStatus => (
            <button
              key={filterStatus}
              onClick={() => setFilter(filterStatus)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === filterStatus
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
              <span className="ml-2 text-xs opacity-75">
                ({filterStatus === 'all' ? invoices.length : invoices.filter(inv => inv.status === filterStatus).length})
              </span>
            </button>
          ))}
        </div>

        {filteredInvoices.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Invoices Found</h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? 'You have no invoices yet'
                : `You have no ${filter} invoices`}
            </p>
            {filter === 'all' && (
              <Button
                variant="primary"
                onClick={() => window.location.href = '/quote'}
                className="inline-flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Get a Quote
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredInvoices.map(invoice => (
              <Card key={invoice.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          Invoice #{invoice.invoice_number}
                        </h3>
                        {invoice.jobs && (
                          <p className="text-sm text-gray-600 capitalize">
                            {invoice.jobs.service_type.replace('_', ' ')}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 mb-1 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Sent
                        </p>
                        <p className="font-medium text-gray-900">
                          {(invoice.issue_date || invoice.created_at)
                            ? new Date(invoice.issue_date || invoice.created_at).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Due
                        </p>
                        <p className="font-medium text-gray-900">
                          {new Date(invoice.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1 flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          Amount
                        </p>
                        <p className="font-semibold text-gray-900">
                          {formatCAD(invoice.total_amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Tax</p>
                        <p className="font-medium text-gray-900">
                          {formatCAD(invoice.tax_amount)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex lg:flex-col gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onViewDetail(invoice.id)}
                      className="flex-1 lg:flex-none"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button variant="secondary" size="sm" className="flex-1 lg:flex-none">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
