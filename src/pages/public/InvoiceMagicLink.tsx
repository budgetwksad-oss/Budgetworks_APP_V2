import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { DollarSign, Calendar, User, Phone, AlertCircle, CheckCircle, Clock, XCircle, FileText, Package } from 'lucide-react';

interface InvoiceMagicLinkProps {
  token: string;
  onLogin: () => void;
  onNavigateHome?: () => void;
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceData {
  invoice_id: string;
  invoice_number: string;
  customer_name: string | null;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  status: string;
  due_date: string | null;
  issue_date: string | null;
  notes: string | null;
  company_name: string | null;
  company_phone: string | null;
  service_type: string | null;
  line_items: LineItem[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  draft:   { label: 'Draft',    color: 'bg-gray-100 text-gray-700',   icon: FileText    },
  sent:    { label: 'Unpaid',   color: 'bg-blue-100 text-blue-700',   icon: Clock       },
  unpaid:  { label: 'Unpaid',   color: 'bg-blue-100 text-blue-700',   icon: Clock       },
  overdue: { label: 'Overdue',  color: 'bg-red-100 text-red-700',     icon: AlertCircle },
  paid:    { label: 'Paid',     color: 'bg-green-100 text-green-700', icon: CheckCircle },
  partial: { label: 'Partial',  color: 'bg-amber-100 text-amber-700', icon: Clock       },
  void:    { label: 'Void',     color: 'bg-gray-100 text-gray-500',   icon: XCircle     },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.sent;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${cfg.color}`}>
      <Icon className="w-4 h-4" />
      {cfg.label}
    </span>
  );
}

function formatCAD(amount: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function InvoiceMagicLink({ token, onLogin, onNavigateHome }: InvoiceMagicLinkProps) {
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [error, setError] = useState<'invalid' | 'expired' | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_invoice_by_token', {
          p_token: token,
        });

        if (rpcError || !data || !data.success) {
          const msg: string = data?.error ?? rpcError?.message ?? '';
          setError(msg.toLowerCase().includes('expir') ? 'expired' : 'invalid');
          return;
        }

        const inv = data.invoice;
        const company = data.company ?? {};

        setInvoice({
          invoice_id:     inv.id,
          invoice_number: inv.invoice_number ?? `INV-${inv.id.slice(0, 8).toUpperCase()}`,
          customer_name:  inv.customer_name ?? data.customer?.name ?? null,
          total_amount:   Number(inv.total_amount ?? 0),
          amount_paid:    Number(inv.amount_paid ?? inv.paid_amount ?? 0),
          balance_due:    Number(inv.balance_due ?? inv.balance_amount ?? inv.total_amount ?? 0),
          subtotal:       Number(inv.subtotal ?? 0),
          tax_rate:       Number(inv.tax_rate ?? 0),
          tax_amount:     Number(inv.tax_amount ?? 0),
          status:         inv.status ?? 'sent',
          due_date:       inv.due_date ?? null,
          issue_date:     inv.issue_date ?? null,
          notes:          inv.notes ?? null,
          company_name:   company.business_name ?? company.name ?? null,
          company_phone:  company.phone ?? null,
          service_type:   inv.service_type ?? null,
          line_items:     Array.isArray(inv.line_items) ? inv.line_items : [],
        });
      } catch (err) {
        console.error('Error loading invoice:', err);
        setError('invalid');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  if (loading) {
    return (
      <PublicLayout currentPage="home" onNavigate={() => {}} onLogin={onLogin}>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading invoice...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error || !invoice) {
    return (
      <PublicLayout currentPage="home" onNavigate={() => {}} onLogin={onLogin}>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              {error === 'expired' ? 'Link Expired' : 'Link Not Found'}
            </h1>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {error === 'expired'
                ? 'This invoice link has expired. Please contact us and we can send you a fresh link.'
                : 'This link is invalid or has already been used. Please contact us if you need assistance.'}
            </p>
            <button
              onClick={onNavigateHome}
              className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const isPaid = invoice.status === 'paid';

  return (
    <PublicLayout currentPage="home" onNavigate={() => {}} onLogin={onLogin}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-4">

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-8 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium uppercase tracking-wide mb-1">Invoice</p>
                  <p className="text-2xl font-bold">{invoice.invoice_number}</p>
                  {invoice.company_name && (
                    <p className="text-gray-300 text-sm mt-1">{invoice.company_name}</p>
                  )}
                </div>
                <StatusBadge status={invoice.status} />
              </div>
            </div>

            <div className="p-6 space-y-5">
              {invoice.customer_name && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Billed to</p>
                    <p className="font-semibold text-gray-900">{invoice.customer_name}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {invoice.issue_date && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Issue date</p>
                      <p className="font-medium text-gray-900 text-sm">{formatDate(invoice.issue_date)}</p>
                    </div>
                  </div>
                )}
                {invoice.due_date && (
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      !isPaid && new Date(invoice.due_date) < new Date()
                        ? 'bg-red-100'
                        : 'bg-gray-100'
                    }`}>
                      <Calendar className={`w-4 h-4 ${
                        !isPaid && new Date(invoice.due_date) < new Date()
                          ? 'text-red-600'
                          : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Due date</p>
                      <p className={`font-medium text-sm ${
                        !isPaid && new Date(invoice.due_date) < new Date()
                          ? 'text-red-600 font-semibold'
                          : 'text-gray-900'
                      }`}>
                        {formatDate(invoice.due_date)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {invoice.line_items.length > 0 && (
                <div className="border-t pt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700">Service Summary</span>
                  </div>
                  <div className="space-y-2">
                    {invoice.line_items.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-3 text-sm">
                        <span className="text-gray-700 flex-1">{item.description}</span>
                        <span className="font-medium text-gray-900 whitespace-nowrap">{formatCAD(item.total)}</span>
                      </div>
                    ))}
                    {invoice.subtotal > 0 && (
                      <>
                        <div className="flex justify-between text-sm text-gray-500 border-t pt-2 mt-2">
                          <span>Subtotal</span>
                          <span>{formatCAD(invoice.subtotal)}</span>
                        </div>
                        {invoice.tax_amount > 0 && (
                          <div className="flex justify-between text-sm text-gray-500">
                            <span>HST ({(invoice.tax_rate * 100).toFixed(0)}%)</span>
                            <span>{formatCAD(invoice.tax_amount)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t pt-5">
                <div className={`rounded-xl p-5 ${isPaid ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <DollarSign className={`w-6 h-6 ${isPaid ? 'text-green-600' : 'text-orange-600'}`} />
                    <span className="text-sm font-medium text-gray-700">Payment Summary (CAD)</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-700">
                      <span>Invoice Total</span>
                      <span className="font-semibold">{formatCAD(invoice.total_amount)}</span>
                    </div>
                    {invoice.amount_paid > 0 && (
                      <div className="flex justify-between text-green-700">
                        <span>Amount Paid</span>
                        <span className="font-semibold">-{formatCAD(invoice.amount_paid)}</span>
                      </div>
                    )}
                    <div className={`flex justify-between pt-2 border-t ${isPaid ? 'border-green-200' : 'border-orange-200'}`}>
                      <span className="font-bold text-gray-900 text-base">Balance Due</span>
                      <span className={`font-bold text-xl ${isPaid ? 'text-green-700' : 'text-orange-700'}`}>
                        {formatCAD(invoice.balance_due)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!isPaid && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-orange-600" />
                How to Pay
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                To pay this invoice, reply to the message you received, call us directly, or send an e-transfer if previously arranged with our team.
              </p>
              {invoice.company_phone && (
                <a
                  href={`tel:${invoice.company_phone}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Call us</p>
                    <p className="font-semibold text-gray-900">{invoice.company_phone}</p>
                  </div>
                </a>
              )}
            </div>
          )}

          {invoice.notes && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-2 text-sm uppercase tracking-wide text-gray-500">Notes</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{invoice.notes}</p>
            </div>
          )}

          {isPaid && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
              <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
              <p className="font-bold text-green-800">This invoice has been paid. Thank you!</p>
            </div>
          )}

        </div>
      </div>
    </PublicLayout>
  );
}
