import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Users, Search, Mail, Phone, MapPin, Calendar, DollarSign, Briefcase, FileText, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
}

interface CustomerStats {
  total_quotes: number;
  total_jobs: number;
  total_spent: number;
  unpaid_invoices: number;
}

interface CustomerDetail extends Customer {
  stats: CustomerStats;
  recent_quotes: Array<{
    id: string;
    service_type: string;
    status: string;
    total: number;
    created_at: string;
  }>;
  recent_jobs: Array<{
    id: string;
    service_type: string;
    status: string;
    scheduled_date: string;
  }>;
  recent_invoices: Array<{
    id: string;
    invoice_number: string;
    total: number;
    status: string;
    due_date: string;
  }>;
}

export function CustomerManagement({ onBack }: { onBack: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    const filtered = customers.filter(customer =>
      customer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm)
    );
    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, address, created_at')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const customersWithEmail = await Promise.all(
        (data || []).map(async (profile) => {
          const { data: authData } = await supabase.auth.admin.getUserById(profile.id);
          return {
            ...profile,
            email: authData?.user?.email || 'N/A'
          };
        })
      );

      setCustomers(customersWithEmail);
      setFilteredCustomers(customersWithEmail);
    } catch (err: any) {
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerDetails = async (customerId: string) => {
    setLoadingDetails(true);
    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;

      const [quotesRes, jobsRes, invoicesRes] = await Promise.all([
        supabase
          .from('quotes')
          .select('id, service_type, status, total, created_at')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('jobs')
          .select('id, service_type, status, scheduled_date')
          .eq('customer_id', customerId)
          .order('scheduled_date', { ascending: false })
          .limit(5),
        supabase
          .from('invoices')
          .select('id, invoice_number, total, status, due_date')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const [totalQuotes, totalJobs, totalSpentRes, unpaidInvoicesRes] = await Promise.all([
        supabase
          .from('quotes')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerId),
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerId),
        supabase
          .from('invoices')
          .select('total')
          .eq('customer_id', customerId)
          .eq('status', 'paid'),
        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerId)
          .in('status', ['sent', 'partial'])
      ]);

      const totalSpent = (totalSpentRes.data || []).reduce((sum, inv) => sum + (inv.total || 0), 0);

      setSelectedCustomer({
        ...customer,
        stats: {
          total_quotes: totalQuotes.count || 0,
          total_jobs: totalJobs.count || 0,
          total_spent: totalSpent,
          unpaid_invoices: unpaidInvoicesRes.count || 0
        },
        recent_quotes: quotesRes.data || [],
        recent_jobs: jobsRes.data || [],
        recent_invoices: invoicesRes.data || []
      });
    } catch (err: any) {
      console.error('Error loading customer details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      sent: 'bg-blue-100 text-blue-700',
      accepted: 'bg-green-100 text-green-700',
      declined: 'bg-red-100 text-red-700',
      scheduled: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-orange-100 text-orange-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-gray-100 text-gray-700',
      paid: 'bg-green-100 text-green-700',
      partial: 'bg-yellow-100 text-yellow-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <PortalLayout portalName="Admin Portal">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading customers...</p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  if (selectedCustomer && !loadingDetails) {
    return (
      <PortalLayout
        portalName="Admin Portal"
        breadcrumbs={[
          { label: 'Dashboard', onClick: onBack },
          { label: 'Customers', onClick: () => setSelectedCustomer(null) },
          { label: selectedCustomer.full_name }
        ]}
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedCustomer.full_name}</h2>
              <p className="text-gray-600 mt-1">Customer details and activity</p>
            </div>
            <Button variant="secondary" onClick={() => setSelectedCustomer(null)}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{selectedCustomer.stats.total_quotes}</p>
                  <p className="text-sm text-gray-600">Total Quotes</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Briefcase className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{selectedCustomer.stats.total_jobs}</p>
                  <p className="text-sm text-gray-600">Total Jobs</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${selectedCustomer.stats.total_spent.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Total Spent</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-red-100 p-3 rounded-lg">
                  <FileText className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{selectedCustomer.stats.unpaid_invoices}</p>
                  <p className="text-sm text-gray-600">Unpaid Invoices</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{selectedCustomer.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900">{selectedCustomer.phone || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium text-gray-900">{selectedCustomer.address || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Customer Since</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedCustomer.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Quotes</h3>
            {selectedCustomer.recent_quotes.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No quotes found</p>
            ) : (
              <div className="space-y-3">
                {selectedCustomer.recent_quotes.map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {quote.service_type.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(quote.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                        {quote.status}
                      </span>
                      <p className="font-bold text-gray-900">${quote.total.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Jobs</h3>
            {selectedCustomer.recent_jobs.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No jobs found</p>
            ) : (
              <div className="space-y-3">
                {selectedCustomer.recent_jobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {job.service_type.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'Not scheduled'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Invoices</h3>
            {selectedCustomer.recent_invoices.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No invoices found</p>
            ) : (
              <div className="space-y-3">
                {selectedCustomer.recent_invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                      <p className="text-sm text-gray-600">
                        Due: {new Date(invoice.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                      <p className="font-bold text-gray-900">${invoice.total.toLocaleString()}</p>
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

  return (
    <PortalLayout
      portalName="Admin Portal"
      breadcrumbs={[
        { label: 'Dashboard', onClick: onBack },
        { label: 'Customers' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-8 h-8 text-blue-600" />
              Customer Management
            </h2>
            <p className="text-gray-600 mt-1">View and manage all customers</p>
          </div>
          <Button variant="secondary" onClick={onBack}>
            Back to Dashboard
          </Button>
        </div>

        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              All Customers ({filteredCustomers.length})
            </h3>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No customers found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'Try adjusting your search' : 'Customers will appear here once they sign up'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Phone</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Joined</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{customer.full_name || 'N/A'}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-600">{customer.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-600">{customer.phone || 'N/A'}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-600">{new Date(customer.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => loadCustomerDetails(customer.id)}
                        >
                          View Details
                        </Button>
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
