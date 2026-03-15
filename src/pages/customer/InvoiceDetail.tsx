import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Download, CheckCircle, Clock, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { downloadInvoicePDF } from '../../lib/invoicePDF';

interface InvoiceData {
  id: string;
  invoice_number: string;
  issue_date: string | null;
  created_at: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'unpaid' | 'partial' | 'paid' | 'closed';
  notes: string | null;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  customer_id: string;
  jobs: {
    service_type: string;
    scheduled_date: string;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
  }>;
}

function formatCAD(amount: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}

export function InvoiceDetail({ invoiceId, onBack }: { invoiceId: string; onBack: () => void }) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          jobs(
            service_type,
            scheduled_date
          )
        `)
        .eq('id', invoiceId)
        .maybeSingle();

      if (invoiceError) throw invoiceError;

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      if (invoiceData?.customer_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', invoiceData.customer_id)
          .maybeSingle();
        setCustomerName(profileData?.full_name || '');
        setCustomerEmail(profileData?.email || '');
      }

      setInvoice({
        ...invoiceData,
        payments: paymentsData || []
      });
    } catch (error) {
      console.error('Error loading invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    const { data: companyData } = await supabase
      .from('company_settings')
      .select('business_name, address, phone, email')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    downloadInvoicePDF(
      {
        invoice_number: invoice.invoice_number,
        created_at: invoice.issue_date || invoice.created_at,
        due_date: invoice.due_date,
        customer_name: customerName || 'Customer',
        customer_email: customerEmail,
        line_items: invoice.line_items || [],
        subtotal: invoice.subtotal,
        tax_amount: invoice.tax_amount,
        total: invoice.total_amount,
        notes: invoice.notes || '',
        status: invoice.status,
      },
      companyData
        ? {
            name: companyData.business_name || 'BudgetWorks',
            address: companyData.address || 'Halifax, Nova Scotia',
            phone: companyData.phone || '',
            email: companyData.email || '',
          }
        : undefined
    );
  };

  if (loading) {
    return (
      <PortalLayout portalName="Customer Portal">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading invoice...</p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  if (!invoice) {
    return (
      <PortalLayout portalName="Customer Portal">
        <Card className="p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Invoice Not Found</h3>
          <p className="text-gray-600 mb-6">The invoice you're looking for doesn't exist.</p>
          <Button variant="primary" onClick={onBack}>
            Back to Invoices
          </Button>
        </Card>
      </PortalLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    const config = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
      sent: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
      unpaid: { bg: 'bg-red-100', text: 'text-red-700', icon: Clock },
      partial: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      paid: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      closed: { bg: 'bg-gray-100', text: 'text-gray-700', icon: CheckCircle }
    };
    const { bg, text, icon: Icon } = config[status as keyof typeof config] ?? config.sent;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full ${bg} ${text}`}>
        <Icon className="w-4 h-4" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = invoice.total_amount - totalPaid;
  const issueDate = invoice.issue_date || invoice.created_at;

  return (
    <PortalLayout
      portalName="Customer Portal"
      breadcrumbs={[
        { label: 'Dashboard', onClick: () => onBack() },
        { label: 'Invoices', onClick: () => onBack() },
        { label: `Invoice #${invoice.invoice_number}` }
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Invoice #{invoice.invoice_number}
            </h2>
            {getStatusBadge(invoice.status)}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="secondary" onClick={onBack}>
              Back
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Invoice Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Issue Date:</span>
                <span className="font-medium text-gray-900">
                  {new Date(issueDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Due Date:</span>
                <span className="font-medium text-gray-900">
                  {new Date(invoice.due_date).toLocaleDateString()}
                </span>
              </div>
              {invoice.jobs && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Type:</span>
                    <span className="font-medium text-gray-900 capitalize">
                      {invoice.jobs.service_type?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Date:</span>
                    <span className="font-medium text-gray-900">
                      {invoice.jobs.scheduled_date
                        ? new Date(invoice.jobs.scheduled_date).toLocaleDateString()
                        : 'Not scheduled'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Payment Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-semibold text-gray-900">
                  {formatCAD(invoice.total_amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="font-medium text-green-600">
                  {formatCAD(totalPaid)}
                </span>
              </div>
              <div className="pt-3 border-t flex justify-between">
                <span className="font-semibold text-gray-900">Balance Due:</span>
                <span className={`font-bold text-lg ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCAD(balanceDue)}
                </span>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Line Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left text-sm text-gray-600">
                  <th className="pb-3 font-semibold">Description</th>
                  <th className="pb-3 font-semibold text-center">Quantity</th>
                  <th className="pb-3 font-semibold text-right">Unit Price</th>
                  <th className="pb-3 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(invoice.line_items || []).map((item, index) => (
                  <tr key={index} className="text-sm">
                    <td className="py-3 text-gray-900">{item.description}</td>
                    <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-600">{formatCAD(item.unit_price)}</td>
                    <td className="py-3 text-right font-medium text-gray-900">{formatCAD(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t">
                <tr className="text-sm">
                  <td colSpan={3} className="pt-3 text-right font-medium text-gray-600">Subtotal:</td>
                  <td className="pt-3 text-right font-medium text-gray-900">{formatCAD(invoice.subtotal)}</td>
                </tr>
                <tr className="text-sm">
                  <td colSpan={3} className="pt-2 text-right font-medium text-gray-600">Tax (HST):</td>
                  <td className="pt-2 text-right font-medium text-gray-900">{formatCAD(invoice.tax_amount)}</td>
                </tr>
                <tr className="text-base">
                  <td colSpan={3} className="pt-3 text-right font-bold text-gray-900">Total (CAD):</td>
                  <td className="pt-3 text-right font-bold text-gray-900">{formatCAD(invoice.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {invoice.payments.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Payment History
            </h3>
            <div className="space-y-3">
              {invoice.payments.map(payment => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatCAD(payment.amount)}
                      </p>
                      <p className="text-sm text-gray-600 capitalize">
                        {payment.payment_method.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-600">
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {invoice.notes && (
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
          </Card>
        )}

        {balanceDue > 0 && (
          <Card className="p-6 bg-orange-50 border-orange-200">
            <div className="text-center">
              <h3 className="font-semibold text-gray-900 mb-2">Ready to Pay?</h3>
              <p className="text-gray-600 mb-4">
                Contact us to make a payment on this invoice
              </p>
              <Button variant="primary" size="lg">
                Contact for Payment
              </Button>
            </div>
          </Card>
        )}
      </div>
    </PortalLayout>
  );
}
