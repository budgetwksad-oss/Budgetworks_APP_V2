import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DollarSign, Search, X, Plus, Eye, Calendar, User, FileText, CreditCard, Download, Send, AlertCircle, CheckSquare, Square, Mail, Link, Copy, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { downloadInvoicePDF } from '../../lib/invoicePDF';
import { updateOverdueInvoices, isInvoiceOverdue, getDaysOverdue } from '../../lib/invoiceUtils';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  job_id: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  due_date: string;
  created_at: string;
  notes: string;
  line_items: any;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface InvoiceDetail extends Invoice {
  customer_name: string;
  customer_email: string;
  customer_address: string;
  payments: Array<{
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference_number: string;
  }>;
  remaining_balance: number;
}

export function InvoiceManagement({ onBack }: { onBack: () => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    payment_date: new Date().toISOString().split('T')[0]
  });
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [bulkSending, setBulkSending] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [invoiceLink, setInvoiceLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, []);

  useEffect(() => {
    let filtered = invoices;

    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        filtered = filtered.filter(inv => isInvoiceOverdue(inv.due_date, inv.status));
      } else {
        filtered = filtered.filter(inv => inv.status === statusFilter);
      }
    }

    if (searchTerm) {
      filtered = filtered.filter(inv =>
        inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredInvoices(filtered);
  }, [searchTerm, statusFilter, invoices]);

  const loadInvoices = async () => {
    try {
      await updateOverdueInvoices();

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          profiles:customer_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false});

      if (error) throw error;
      setInvoices(data || []);
      setFilteredInvoices(data || []);
    } catch (err: any) {
      console.error('Error loading invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(filteredInvoices.map(inv => inv.id));
    }
  };

  const toggleSelectInvoice = (invoiceId: string) => {
    if (selectedInvoices.includes(invoiceId)) {
      setSelectedInvoices(selectedInvoices.filter(id => id !== invoiceId));
    } else {
      setSelectedInvoices([...selectedInvoices, invoiceId]);
    }
  };

  const handleBulkSendInvoices = async () => {
    if (selectedInvoices.length === 0) {
      alert('Please select invoices to send');
      return;
    }

    if (!confirm(`Send ${selectedInvoices.length} invoice(s) via email?`)) {
      return;
    }

    setBulkSending(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const invoiceId of selectedInvoices) {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (!invoice || !invoice.profiles?.email) {
          errorCount++;
          continue;
        }

        try {
          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invoice-email`;
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              invoice_id: invoice.id,
              customer_email: invoice.profiles.email,
              customer_name: invoice.profiles.full_name || 'Valued Customer',
              invoice_number: invoice.invoice_number,
              invoice_total: invoice.total_amount,
              due_date: invoice.due_date
            })
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          errorCount++;
        }
      }

      alert(`Sent ${successCount} invoice(s) successfully${errorCount > 0 ? `. ${errorCount} failed.` : '.'}`);
      setSelectedInvoices([]);
    } catch (err: any) {
      console.error('Error sending invoices:', err);
      alert('Failed to send invoices: ' + err.message);
    } finally {
      setBulkSending(false);
    }
  };

  const handleBulkDownloadPDFs = async () => {
    if (selectedInvoices.length === 0) {
      alert('Please select invoices to download');
      return;
    }

    try {
      for (const invoiceId of selectedInvoices) {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (!invoice) continue;

        await downloadInvoicePDF({
          invoice_number: invoice.invoice_number,
          customer_name: invoice.profiles?.full_name || 'N/A',
          customer_email: invoice.profiles?.email || '',
          customer_address: '',
          created_at: invoice.created_at,
          due_date: invoice.due_date,
          line_items: invoice.line_items || [],
          subtotal: invoice.subtotal,
          tax_amount: invoice.tax_amount,
          total: invoice.total_amount,
          notes: invoice.notes,
          status: invoice.status
        });

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      alert(`Downloaded ${selectedInvoices.length} invoice(s)`);
      setSelectedInvoices([]);
    } catch (err: any) {
      console.error('Error downloading invoices:', err);
      alert('Failed to download invoices: ' + err.message);
    }
  };

  const handleBulkUpdateStatus = async (newStatus: string) => {
    if (selectedInvoices.length === 0) {
      alert('Please select invoices to update');
      return;
    }

    if (!confirm(`Update ${selectedInvoices.length} invoice(s) status to "${newStatus}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .in('id', selectedInvoices);

      if (error) throw error;

      await loadInvoices();
      alert(`Updated ${selectedInvoices.length} invoice(s) to ${newStatus}`);
      setSelectedInvoices([]);
    } catch (err: any) {
      console.error('Error updating invoices:', err);
      alert('Failed to update invoices: ' + err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedInvoices.length === 0) {
      alert('Please select invoices to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedInvoices.length} invoice(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .in('id', selectedInvoices);

      if (error) throw error;

      await loadInvoices();
      alert(`Deleted ${selectedInvoices.length} invoice(s)`);
      setSelectedInvoices([]);
    } catch (err: any) {
      console.error('Error deleting invoices:', err);
      alert('Failed to delete invoices: ' + err.message);
    }
  };

  const handleBulkExportCSV = () => {
    if (selectedInvoices.length === 0) {
      alert('Please select invoices to export');
      return;
    }

    const selected = invoices.filter(inv => selectedInvoices.includes(inv.id));

    const csvHeaders = ['Invoice Number', 'Customer', 'Email', 'Status', 'Subtotal', 'Tax', 'Total', 'Due Date', 'Created At'];
    const csvRows = selected.map(inv => [
      inv.invoice_number,
      inv.profiles?.full_name || 'N/A',
      inv.profiles?.email || 'N/A',
      inv.status,
      inv.subtotal.toFixed(2),
      inv.tax_amount.toFixed(2),
      inv.total_amount.toFixed(2),
      new Date(inv.due_date).toLocaleDateString(),
      new Date(inv.created_at).toLocaleDateString()
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    alert(`Exported ${selectedInvoices.length} invoice(s) to CSV`);
    setSelectedInvoices([]);
  };

  const loadInvoiceDetails = async (invoiceId: string) => {
    setLoadingDetails(true);
    try {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) return;

      const [paymentsRes, customerRes] = await Promise.all([
        supabase
          .from('payments')
          .select('id, amount, payment_date, payment_method, reference_number')
          .eq('invoice_id', invoiceId)
          .order('payment_date', { ascending: false }),
        supabase
          .from('profiles')
          .select('full_name, email, address')
          .eq('id', invoice.customer_id)
          .maybeSingle()
      ]);

      const totalPaid = (paymentsRes.data || []).reduce((sum, p) => sum + p.amount, 0);
      const remainingBalance = invoice.total_amount - totalPaid;

      setSelectedInvoice({
        ...invoice,
        customer_name: customerRes.data?.full_name || 'Unknown',
        customer_email: customerRes.data?.email || 'N/A',
        customer_address: customerRes.data?.address || '',
        payments: paymentsRes.data || [],
        remaining_balance: remainingBalance
      });

      setPaymentData({
        amount: remainingBalance > 0 ? remainingBalance.toFixed(2) : '',
        payment_method: 'cash',
        reference_number: '',
        payment_date: new Date().toISOString().split('T')[0]
      });
    } catch (err: any) {
      console.error('Error loading invoice details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentData.amount) return;

    setRecordingPayment(true);
    try {
      const amount = parseFloat(paymentData.amount);
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid payment amount');
        return;
      }

      if (amount > selectedInvoice.remaining_balance) {
        alert('Payment amount cannot exceed remaining balance');
        return;
      }

      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: selectedInvoice.id,
          amount: amount,
          payment_method: paymentData.payment_method,
          payment_date: paymentData.payment_date,
          reference_number: paymentData.reference_number || null
        });

      if (paymentError) throw paymentError;

      const newRemainingBalance = selectedInvoice.remaining_balance - amount;
      const newStatus = newRemainingBalance <= 0.01 ? 'paid' : 'partial';

      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', selectedInvoice.id);

      if (invoiceError) throw invoiceError;

      setShowPaymentModal(false);
      await loadInvoiceDetails(selectedInvoice.id);
      await loadInvoices();
    } catch (err: any) {
      console.error('Error recording payment:', err);
      alert('Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleDownloadPDF = (invoice: InvoiceDetail) => {
    const pdfData = {
      invoice_number: invoice.invoice_number,
      created_at: invoice.created_at,
      due_date: invoice.due_date,
      customer_name: invoice.customer_name,
      customer_email: invoice.customer_email,
      customer_address: invoice.customer_address,
      line_items: invoice.line_items || [],
      subtotal: invoice.subtotal,
      tax_amount: invoice.tax_amount,
      total: invoice.total_amount,
      notes: invoice.notes || '',
      status: invoice.status
    };

    downloadInvoicePDF(pdfData);
  };

  const handleSendInvoice = async (invoice: InvoiceDetail) => {
    setSendingInvoice(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invoice-email`;

      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const payload = {
        invoice_id: invoice.id,
        customer_email: invoice.customer_email,
        customer_name: invoice.customer_name,
        invoice_number: invoice.invoice_number,
        invoice_total: invoice.total_amount,
        due_date: invoice.due_date
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send invoice');
      }

      if (invoice.status === 'draft') {
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ status: 'sent' })
          .eq('id', invoice.id);

        if (updateError) throw updateError;

        await loadInvoiceDetails(invoice.id);
        await loadInvoices();
      }

      alert('Invoice sent successfully!');
    } catch (err: any) {
      console.error('Error sending invoice:', err);
      alert('Failed to send invoice: ' + err.message);
    } finally {
      setSendingInvoice(false);
    }
  };

  const handleGenerateLink = async (invoiceId: string) => {
    setGeneratingLink(true);
    setInvoiceLink(null);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { data, error } = await supabase.rpc('create_invoice_magic_link', {
        p_invoice_id: invoiceId,
        p_expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      const token: string = data?.token ?? '';
      setInvoiceLink(`${window.location.origin}/i/${token}`);
    } catch (err: any) {
      console.error('Error generating link:', err);
      alert('Failed to generate invoice link: ' + err.message);
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyInvoiceLink = () => {
    if (!invoiceLink) return;
    navigator.clipboard.writeText(invoiceLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      sent: 'bg-blue-100 text-blue-700',
      partial: 'bg-yellow-100 text-yellow-700',
      paid: 'bg-green-100 text-green-700',
      overdue: 'bg-red-100 text-red-700',
      closed: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <PortalLayout portalName="Admin Portal">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading invoices...</p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  if (selectedInvoice && !loadingDetails) {
    return (
      <PortalLayout
        portalName="Admin Portal"
        breadcrumbs={[
          { label: 'Dashboard', onClick: onBack },
          { label: 'Invoices', onClick: () => setSelectedInvoice(null) },
          { label: selectedInvoice.invoice_number }
        ]}
      >
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedInvoice.invoice_number}</h2>
              <p className="text-gray-600 mt-1">Invoice details and payment history</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="secondary"
                onClick={() => {
                  setInvoiceLink(null);
                  handleGenerateLink(selectedInvoice.id);
                }}
                disabled={generatingLink}
              >
                <Link className="w-4 h-4 mr-2" />
                {generatingLink ? 'Generating...' : 'Generate Link'}
              </Button>
              <Button variant="secondary" onClick={() => handleDownloadPDF(selectedInvoice)}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSendInvoice(selectedInvoice)}
                disabled={sendingInvoice}
              >
                <Send className="w-4 h-4 mr-2" />
                {sendingInvoice ? 'Sending...' : 'Send Invoice'}
              </Button>
              <Button variant="secondary" onClick={() => { setSelectedInvoice(null); setInvoiceLink(null); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {invoiceLink && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <Link className="w-5 h-5 text-green-700 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800 mb-1">Invoice link generated (valid 30 days)</p>
                <p className="text-xs text-green-700 truncate">{invoiceLink}</p>
              </div>
              <button
                onClick={handleCopyInvoiceLink}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors"
              >
                {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {linkCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedInvoice.total_amount)}</p>
                  <p className="text-sm text-gray-600">Total Amount</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <CreditCard className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(selectedInvoice.total_amount - selectedInvoice.remaining_balance)}
                  </p>
                  <p className="text-sm text-gray-600">Paid</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${selectedInvoice.remaining_balance > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                  <DollarSign className={`w-6 h-6 ${selectedInvoice.remaining_balance > 0 ? 'text-red-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedInvoice.remaining_balance)}</p>
                  <p className="text-sm text-gray-600">Balance Due</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Invoice Information</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedInvoice.status)}`}>
                {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Customer</p>
                  <p className="font-medium text-gray-900">{selectedInvoice.customer_name}</p>
                  <p className="text-sm text-gray-600">{selectedInvoice.customer_email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="font-medium text-gray-900">{new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Issue Date</p>
                  <p className="font-medium text-gray-900">{new Date(selectedInvoice.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            {selectedInvoice.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Notes</p>
                <p className="text-gray-900">{selectedInvoice.notes}</p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-sm font-semibold text-gray-900">Description</th>
                    <th className="text-right py-2 px-3 text-sm font-semibold text-gray-900">Quantity</th>
                    <th className="text-right py-2 px-3 text-sm font-semibold text-gray-900">Unit Price</th>
                    <th className="text-right py-2 px-3 text-sm font-semibold text-gray-900">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoice.line_items || []).map((item: any, index: number) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 px-3 text-gray-900">{item.description}</td>
                      <td className="py-2 px-3 text-right text-gray-900">{item.quantity}</td>
                      <td className="py-2 px-3 text-right text-gray-900">{formatCurrency(item.unit_price)}</td>
                      <td className="py-2 px-3 text-right text-gray-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td colSpan={3} className="py-2 px-3 text-right font-medium text-gray-900">Subtotal:</td>
                    <td className="py-2 px-3 text-right font-medium text-gray-900">{formatCurrency(selectedInvoice.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-2 px-3 text-right text-gray-600">Tax:</td>
                    <td className="py-2 px-3 text-right text-gray-900">{formatCurrency(selectedInvoice.tax_amount)}</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td colSpan={3} className="py-2 px-3 text-right font-bold text-gray-900">Total:</td>
                    <td className="py-2 px-3 text-right font-bold text-gray-900">{formatCurrency(selectedInvoice.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
              {selectedInvoice.remaining_balance > 0 && (
                <Button variant="primary" onClick={() => setShowPaymentModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              )}
            </div>
            {selectedInvoice.payments.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No payments recorded</p>
            ) : (
              <div className="space-y-3">
                {selectedInvoice.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(payment.payment_date).toLocaleDateString()} - {payment.payment_method}
                      </p>
                      {payment.reference_number && (
                        <p className="text-xs text-gray-500">Ref: {payment.reference_number}</p>
                      )}
                    </div>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                      Paid
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {showPaymentModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <Card className="max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Amount
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={paymentData.amount}
                      onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Balance due: {formatCurrency(selectedInvoice.remaining_balance)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <select
                      value={paymentData.payment_method}
                      onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Date
                    </label>
                    <Input
                      type="date"
                      value={paymentData.payment_date}
                      onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reference Number (Optional)
                    </label>
                    <Input
                      type="text"
                      value={paymentData.reference_number}
                      onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                      placeholder="Check #, Transaction ID, etc."
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="secondary"
                      onClick={() => setShowPaymentModal(false)}
                      className="flex-1"
                      disabled={recordingPayment}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleRecordPayment}
                      className="flex-1"
                      disabled={recordingPayment || !paymentData.amount}
                    >
                      {recordingPayment ? 'Recording...' : 'Record Payment'}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      portalName="Admin Portal"
      breadcrumbs={[
        { label: 'Dashboard', onClick: onBack },
        { label: 'Invoices' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-8 h-8 text-blue-600" />
              Invoice Management
            </h2>
            <p className="text-gray-600 mt-1">View and manage invoices and payments</p>
          </div>
          <Button variant="secondary" onClick={onBack}>
            Back to Dashboard
          </Button>
        </div>

        {invoices.filter(inv => isInvoiceOverdue(inv.due_date, inv.status)).length > 0 && (
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-900">
                  {invoices.filter(inv => isInvoiceOverdue(inv.due_date, inv.status)).length} Overdue Invoice
                  {invoices.filter(inv => isInvoiceOverdue(inv.due_date, inv.status)).length > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-red-700">
                  These invoices require immediate attention
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by invoice number, customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </Card>

          <Card className="p-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Invoices</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="partial">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              All Invoices ({filteredInvoices.length})
              {selectedInvoices.length > 0 && (
                <span className="ml-2 text-sm text-blue-600">
                  ({selectedInvoices.length} selected)
                </span>
              )}
            </h3>
            {selectedInvoices.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBulkSendInvoices}
                  disabled={bulkSending}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {bulkSending ? 'Sending...' : `Send ${selectedInvoices.length}`}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBulkDownloadPDFs}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBulkExportCSV}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <div className="relative group">
                  <Button
                    variant="secondary"
                    size="sm"
                  >
                    Status ▾
                  </Button>
                  <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <button
                      onClick={() => handleBulkUpdateStatus('sent')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Mark as Sent
                    </button>
                    <button
                      onClick={() => handleBulkUpdateStatus('paid')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Mark as Paid
                    </button>
                    <button
                      onClick={() => handleBulkUpdateStatus('draft')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Mark as Draft
                    </button>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-red-600 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No invoices found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Invoices will appear here once created'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 px-4 w-10">
                      <button
                        onClick={toggleSelectAll}
                        className="text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        {selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0 ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Invoice #</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Due Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleSelectInvoice(invoice.id)}
                          className="text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          {selectedInvoices.includes(invoice.id) ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-900">{invoice.profiles?.full_name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{invoice.profiles?.email || ''}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <p className="text-gray-600">{new Date(invoice.due_date).toLocaleDateString()}</p>
                          {isInvoiceOverdue(invoice.due_date, invoice.status) && (
                            <div className="flex items-center gap-1 text-red-600">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-xs font-medium">
                                {getDaysOverdue(invoice.due_date)}d overdue
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => loadInvoiceDetails(invoice.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
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
