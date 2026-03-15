import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, logAudit, triggerNotificationDispatch } from '../../lib/supabase';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { MenuSection } from '../../components/layout/Sidebar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ServiceAgreementModal } from '../../components/ui/ServiceAgreementModal';
import {
  ArrowLeft, FileText, Calendar, MapPin, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Clock, PlusCircle, Info, Truck, Trash2, Hammer,
} from 'lucide-react';

interface QuotesListProps {
  sidebarSections?: MenuSection[];
  onBack?: () => void;
}

interface PricingBreakdownLine {
  label: string;
  low: number;
  high: number;
  is_advisory?: boolean;
}

interface PricingSnapshot {
  service_type?: string;
  location?: string;
  preferred_date?: string;
  description?: string;
  total_low?: number;
  total_high?: number;
  subtotal_low?: number;
  subtotal_high?: number;
  breakdown_lines?: PricingBreakdownLine[];
}

interface QuoteRow {
  id: string;
  quote_number: string;
  status: string;
  estimate_low: number | null;
  estimate_high: number | null;
  expected_price: number | null;
  cap_amount: number | null;
  total_amount: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  line_items: { description: string; quantity: number; unit_price: number; total: number }[];
  notes: string | null;
  valid_until: string;
  created_at: string;
  accepted_at: string | null;
  declined_at: string | null;
  pricing_snapshot: PricingSnapshot | null;
}

const SERVICE_LABELS: Record<string, string> = {
  moving: 'Moving',
  junk_removal: 'Junk Removal',
  demolition: 'Light Demolition',
};

const SERVICE_ICONS: Record<string, React.ElementType> = {
  moving: Truck,
  junk_removal: Trash2,
  demolition: Hammer,
};

function formatCAD(amount: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function getServiceLabel(snap: PricingSnapshot | null): string {
  return SERVICE_LABELS[snap?.service_type ?? ''] ?? 'Service';
}

function getEstimateRange(quote: QuoteRow): { low: number; high: number } | null {
  const snap = quote.pricing_snapshot;
  const low = quote.estimate_low ?? snap?.total_low ?? null;
  const high = quote.estimate_high ?? snap?.total_high ?? null;
  if (low != null && high != null) return { low, high };
  if (quote.total_amount > 0) return { low: quote.total_amount, high: quote.total_amount };
  return null;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
    sent: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
    accepted: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
    declined: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    expired: { bg: 'bg-gray-100', text: 'text-gray-500', icon: Clock },
    draft: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  };
  const s = styles[status] ?? styles.expired;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold rounded-full ${s.bg} ${s.text}`}>
      <Icon className="w-3.5 h-3.5" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function BreakdownTable({ lines }: { lines: PricingBreakdownLine[] }) {
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const isLast = i === lines.length - 1;
        const sameValue = line.low === line.high;
        return (
          <div
            key={i}
            className={`flex justify-between items-center text-sm
              ${isLast ? 'font-semibold text-gray-900 pt-2 border-t border-gray-200' : line.is_advisory ? 'text-amber-700' : 'text-gray-700'}`}
          >
            <span>{line.label}</span>
            <span className="font-medium">
              {sameValue ? formatCAD(line.low) : `${formatCAD(line.low)} – ${formatCAD(line.high)}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function QuoteDetail({
  quote,
  onBack,
  sidebarSections,
  onAccepted,
  onDeclined,
}: {
  quote: QuoteRow;
  onBack: () => void;
  sidebarSections?: MenuSection[];
  onAccepted: (id: string) => void;
  onDeclined: (id: string) => void;
}) {
  const snap = quote.pricing_snapshot;
  const range = getEstimateRange(quote);
  const breakdownLines: PricingBreakdownLine[] = snap?.breakdown_lines ?? [];
  const hasLineItems = (quote.line_items || []).length > 0 && quote.total_amount > 0;
  const location = snap?.location;
  const preferredDate = snap?.preferred_date;
  const description = snap?.description;
  const serviceLabel = getServiceLabel(snap);
  const ServiceIcon = SERVICE_ICONS[snap?.service_type ?? ''] ?? FileText;

  const [showBreakdown, setShowBreakdown] = useState(true);
  const [showAgreement, setShowAgreement] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [actionError, setActionError] = useState('');

  const handleAcceptConfirmed = async () => {
    try {
      setAccepting(true);
      setActionError('');

      const { error } = await supabase
        .from('quotes')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_method: 'magic_link',
          agreement_accepted: true,
          agreement_accepted_at: new Date().toISOString(),
        })
        .eq('id', quote.id);

      if (error) throw error;

      logAudit({
        action_key: 'quote_accepted',
        entity_type: 'quote',
        entity_id: quote.id,
        quote_id: quote.id,
        message: 'Quote accepted by customer via portal',
        actor_role: 'customer',
      });

      try {
        const { data: settingsData } = await supabase
          .from('company_settings')
          .select('email')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (settingsData?.email) {
          await supabase.rpc('enqueue_notification', {
            p_event_key: 'quote_accepted',
            p_audience: 'admin',
            p_channel: 'email',
            p_service_type: snap?.service_type ?? null,
            p_to_email: settingsData.email,
            p_to_phone: '',
            p_payload: {
              customer_name: 'Customer',
              service_label: serviceLabel,
              range: range ? `${formatCAD(range.low)}–${formatCAD(range.high)}` : '',
            },
          });
          void triggerNotificationDispatch();
        }
      } catch {
        // non-fatal
      }

      setShowAgreement(false);
      onAccepted(quote.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to accept quote');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    try {
      setDeclining(true);
      setActionError('');

      const updateData: Record<string, unknown> = {
        status: 'declined',
        declined_at: new Date().toISOString(),
      };
      if (declineReason.trim()) {
        updateData.notes = quote.notes
          ? `${quote.notes}\n\nCustomer declined: ${declineReason}`
          : `Customer declined: ${declineReason}`;
      }

      const { error } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', quote.id);

      if (error) throw error;

      logAudit({
        action_key: 'quote_declined',
        entity_type: 'quote',
        entity_id: quote.id,
        quote_id: quote.id,
        message: 'Quote declined by customer via portal',
        metadata: declineReason.trim() ? { reason: declineReason } : undefined,
        actor_role: 'customer',
      });

      try {
        const { data: settingsData } = await supabase
          .from('company_settings')
          .select('email')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (settingsData?.email) {
          await supabase.rpc('enqueue_notification', {
            p_event_key: 'quote_declined',
            p_audience: 'admin',
            p_channel: 'email',
            p_service_type: snap?.service_type ?? null,
            p_to_email: settingsData.email,
            p_to_phone: '',
            p_payload: {
              customer_name: 'Customer',
              service_label: serviceLabel,
            },
          });
          void triggerNotificationDispatch();
        }
      } catch {
        // non-fatal
      }

      setShowDeclineModal(false);
      onDeclined(quote.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to decline quote');
    } finally {
      setDeclining(false);
    }
  };

  return (
    <PortalLayout
      portalName="Customer Portal"
      sidebarSections={sidebarSections}
      activeItemId="quotes"
      breadcrumbs={[
        { label: 'Dashboard', onClick: onBack },
        { label: 'My Quotes', onClick: onBack },
        { label: `Quote #${quote.quote_number}` },
      ]}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Quotes
        </Button>

        <Card className="overflow-hidden">
          <div className="bg-gray-900 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 p-2.5 rounded-lg">
                <ServiceIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-lg">{serviceLabel}</p>
                <p className="text-gray-400 text-sm">Quote #{quote.quote_number}</p>
              </div>
            </div>
            <StatusBadge status={quote.status} />
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Issued</p>
                <p className="font-medium text-gray-900">{formatDate(quote.created_at)}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Valid Until</p>
                <p className="font-medium text-gray-900">{formatDate(quote.valid_until)}</p>
              </div>
              {location && (
                <div className="col-span-2">
                  <p className="text-gray-500 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Location
                  </p>
                  <p className="font-medium text-gray-900">{location}</p>
                </div>
              )}
              {preferredDate && (
                <div>
                  <p className="text-gray-500 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Preferred Date
                  </p>
                  <p className="font-medium text-gray-900">{formatDate(preferredDate)}</p>
                </div>
              )}
            </div>

            {description && description.trim() && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Job Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{description}</p>
              </div>
            )}

            {range && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-orange-800">Estimated Price</p>
                  {quote.cap_amount && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                      Not to exceed {formatCAD(quote.cap_amount)}
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-3">
                  {range.low === range.high ? (
                    <p className="text-3xl font-bold text-orange-600">{formatCAD(range.low)}</p>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-orange-600">{formatCAD(range.low)}</p>
                      <p className="text-gray-400 text-xl font-light mb-0.5">–</p>
                      <p className="text-2xl font-bold text-orange-600">{formatCAD(range.high)}</p>
                    </>
                  )}
                  <p className="text-xs text-gray-500 mb-1">CAD incl. HST</p>
                </div>

                {breakdownLines.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-orange-200">
                    <button
                      type="button"
                      onClick={() => setShowBreakdown((v) => !v)}
                      className="flex items-center gap-1 text-xs font-medium text-orange-700 hover:text-orange-900 transition-colors mb-3"
                    >
                      {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
                    </button>
                    {showBreakdown && <BreakdownTable lines={breakdownLines} />}
                  </div>
                )}
              </div>
            )}

            {hasLineItems && !range && (
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <p className="text-sm font-semibold text-gray-700">Line Items</p>
                </div>
                <div className="divide-y">
                  {quote.line_items.map((item, i) => (
                    <div key={i} className="px-4 py-3 flex justify-between items-start text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{item.description}</p>
                        <p className="text-gray-500">{item.quantity} × {formatCAD(item.unit_price)}</p>
                      </div>
                      <p className="font-semibold text-gray-900">{formatCAD(item.total)}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 px-4 py-3 border-t space-y-1">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatCAD(quote.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax ({(quote.tax_rate * 100).toFixed(0)}%)</span>
                    <span>{formatCAD(quote.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 pt-1 border-t text-base">
                    <span>Total</span>
                    <span className="text-orange-600">{formatCAD(quote.total_amount)}</span>
                  </div>
                </div>
              </div>
            )}

            {quote.notes && (
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 mb-1">Notes from BudgetWorks</p>
                  <p className="text-sm text-blue-700 whitespace-pre-wrap">{quote.notes}</p>
                </div>
              </div>
            )}

            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{actionError}</p>
              </div>
            )}

            {quote.status === 'sent' && (
              <div className="flex gap-3 pt-2 border-t">
                <Button
                  variant="ghost"
                  className="flex-1 text-red-600 hover:bg-red-50 border border-red-200"
                  onClick={() => setShowDeclineModal(true)}
                  disabled={declining}
                >
                  Decline Quote
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => setShowAgreement(true)}
                  disabled={accepting}
                >
                  Accept Quote
                </Button>
              </div>
            )}

            {quote.status === 'accepted' && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Quote Accepted</p>
                  <p className="text-sm text-green-700">Our team will contact you shortly to confirm scheduling.</p>
                </div>
              </div>
            )}

            {quote.status === 'declined' && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-sm font-medium text-red-700">Quote declined.</p>
              </div>
            )}

            {quote.status === 'expired' && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                <p className="text-sm text-gray-600">This quote has expired. Contact us for an updated quote.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {showAgreement && (
        <ServiceAgreementModal
          onAccept={handleAcceptConfirmed}
          onCancel={() => setShowAgreement(false)}
          submitting={accepting}
        />
      )}

      {showDeclineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Decline Quote</h3>
              <button
                onClick={() => { setShowDeclineModal(false); setDeclineReason(''); }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Reason for declining (optional)
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Let us know why..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-sm"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => { setShowDeclineModal(false); setDeclineReason(''); }}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleDecline}
                  disabled={declining}
                >
                  {declining ? 'Declining...' : 'Decline Quote'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </PortalLayout>
  );
}

export function QuotesList({ sidebarSections, onBack }: QuotesListProps = {}) {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<QuoteRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadQuotes();
  }, [user]);

  const loadQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('customer_user_id', user?.id)
        .in('status', ['sent', 'accepted', 'declined', 'expired'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (err) {
      console.error('Error loading quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccepted = (id: string) => {
    setQuotes((prev) => prev.map((q) => q.id === id ? { ...q, status: 'accepted', accepted_at: new Date().toISOString() } : q));
    setSelectedQuote(null);
  };

  const handleDeclined = (id: string) => {
    setQuotes((prev) => prev.map((q) => q.id === id ? { ...q, status: 'declined', declined_at: new Date().toISOString() } : q));
    setSelectedQuote(null);
  };

  if (selectedQuote) {
    return (
      <QuoteDetail
        quote={selectedQuote}
        onBack={() => setSelectedQuote(null)}
        sidebarSections={sidebarSections}
        onAccepted={handleAccepted}
        onDeclined={handleDeclined}
      />
    );
  }

  return (
    <PortalLayout
      portalName="Customer Portal"
      sidebarSections={sidebarSections}
      activeItemId="quotes"
      breadcrumbs={onBack ? [{ label: 'Dashboard', onClick: onBack }, { label: 'My Quotes' }] : undefined}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-1">My Quotes</h2>
            <p className="text-gray-500">Review and respond to your service estimates</p>
          </div>
          {onBack && (
            <Button variant="secondary" onClick={onBack}>Back to Dashboard</Button>
          )}
        </div>

        {loading ? (
          <Card className="p-8 text-center">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading your quotes...</p>
          </Card>
        ) : quotes.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quotes Yet</h3>
            <p className="text-gray-500 mb-6">Request a service and we'll send you a personalized estimate.</p>
            <Button
              variant="primary"
              onClick={() => window.location.href = '/quote'}
              className="inline-flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Get a Quote
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {quotes.map((quote) => {
              const snap = quote.pricing_snapshot;
              const range = getEstimateRange(quote);
              const serviceLabel = getServiceLabel(snap);
              const ServiceIcon = SERVICE_ICONS[snap?.service_type ?? ''] ?? FileText;
              return (
                <Card
                  key={quote.id}
                  className="p-5 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => setSelectedQuote(quote)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-100 group-hover:bg-orange-100 p-2.5 rounded-lg transition-colors">
                        <ServiceIcon className="w-5 h-5 text-gray-500 group-hover:text-orange-600 transition-colors" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">{serviceLabel}</p>
                          <StatusBadge status={quote.status} />
                        </div>
                        <p className="text-sm text-gray-500">
                          Quote #{quote.quote_number} &middot; {formatDate(quote.created_at)}
                        </p>
                        {snap?.location && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {snap.location}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-4">
                      {range ? (
                        <>
                          {range.low === range.high ? (
                            <p className="text-xl font-bold text-orange-600">{formatCAD(range.low)}</p>
                          ) : (
                            <>
                              <p className="text-xl font-bold text-orange-600">{formatCAD(range.low)}</p>
                              <p className="text-sm text-gray-400">– {formatCAD(range.high)}</p>
                            </>
                          )}
                          <p className="text-xs text-gray-400">incl. HST</p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">See details</p>
                      )}
                      {quote.status === 'sent' && (
                        <p className="text-xs text-blue-600 font-medium mt-1">Awaiting your response</p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
