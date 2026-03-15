import { useState, useEffect } from 'react';
import { supabase, logAudit } from '../../lib/supabase';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { ServiceAgreementModal } from '../../components/ui/ServiceAgreementModal';
import { CheckCircle, XCircle, Clock, DollarSign, MapPin, Briefcase, AlertCircle, type LucideIcon } from 'lucide-react';

interface QuoteMagicLinkProps {
  token: string;
  onLogin: () => void;
  onNavigateHome?: () => void;
}

interface QuoteData {
  quote_id: string;
  service_type: string;
  location?: string;
  estimate_low?: number;
  estimate_high?: number;
  expected_price?: number;
  cap_amount?: number;
  status: 'sent' | 'accepted' | 'declined' | 'expired';
  customer_name?: string;
  customer_email?: string;
  lead_id?: string;
}

export function QuoteMagicLink({ token, onLogin, onNavigateHome }: QuoteMagicLinkProps) {
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [error, setError] = useState<'invalid' | 'expired' | null>(null);
  const [responding, setResponding] = useState(false);
  const [response, setResponse] = useState<'accept' | 'decline' | null>(null);
  const [showAgreement, setShowAgreement] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadQuote = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_quote_by_token', {
        p_token: token,
      });

      if (rpcError) {
        console.error('Error loading quote:', rpcError);
        setError('invalid');
        return;
      }

      if (!data || !data.success) {
        const msg: string = data?.error ?? '';
        setError(msg.toLowerCase().includes('expir') ? 'expired' : 'invalid');
        return;
      }

      const quoteData: QuoteData = {
        quote_id: data.quote.id,
        service_type: data.service?.service_type || data.quote.pricing_snapshot?.service_type || 'unknown',
        location: data.service?.location_address,
        estimate_low: data.quote.estimate_low,
        estimate_high: data.quote.estimate_high,
        expected_price: data.quote.expected_price,
        cap_amount: data.quote.cap_amount,
        status: data.quote.status,
        customer_name: data.customer?.name,
        customer_email: data.customer?.email,
        lead_id: data.service?.id,
      };

      setQuote(quoteData);
    } catch (err) {
      console.error('Error:', err);
      setError('invalid');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptClick = () => {
    setShowAgreement(true);
  };

  const handleAgreementAccept = async () => {
    try {
      setResponding(true);

      const { data: rpcData, error: rpcError } = await supabase.rpc('respond_to_quote_by_token_notify', {
        p_token: token,
        p_action: 'accept',
      });

      if (rpcError) {
        console.error('Error responding to quote:', rpcError);
        setActionError('There was an error processing your response. Please try again.');
        return;
      }

      if (!rpcData?.success) {
        console.error('Quote response failed:', rpcData?.error);
        setActionError('There was an error processing your response. Please try again.');
        return;
      }

      setShowAgreement(false);
      setResponse('accept');

      if (quote) {
        logAudit({
          action_key: 'quote_accepted',
          entity_type: 'quote',
          entity_id: quote.quote_id,
          quote_id: quote.quote_id,
          message: 'Quote accepted via magic link',
          actor_role: 'customer',
        });
      }
    } catch (err) {
      console.error('Error:', err);
      setActionError('There was an error processing your response. Please try again.');
    } finally {
      setResponding(false);
    }
  };

  const handleDecline = async () => {
    try {
      setResponding(true);

      const { data: rpcData, error: rpcError } = await supabase.rpc('respond_to_quote_by_token_notify', {
        p_token: token,
        p_action: 'decline',
      });

      if (rpcError) {
        console.error('Error responding to quote:', rpcError);
        setActionError('There was an error processing your response. Please try again.');
        return;
      }

      if (!rpcData?.success) {
        console.error('Quote decline failed:', rpcData?.error);
        setActionError('There was an error processing your response. Please try again.');
        return;
      }

      setResponse('decline');

      if (quote) {
        logAudit({
          action_key: 'quote_declined',
          entity_type: 'quote',
          entity_id: quote.quote_id,
          quote_id: quote.quote_id,
          message: 'Quote declined via magic link',
          actor_role: 'customer',
        });
      }
    } catch (err) {
      console.error('Error:', err);
      setActionError('There was an error processing your response. Please try again.');
    } finally {
      setResponding(false);
    }
  };

  const getServiceTypeLabel = (serviceType: string): string => {
    const labels: Record<string, string> = {
      moving: 'Moving',
      junk_removal: 'Junk Removal',
      demolition: 'Light Demo',
    };
    return labels[serviceType] || serviceType;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string; icon: LucideIcon }> = {
      sent: { label: 'Awaiting Response', color: 'bg-blue-100 text-blue-800', icon: Clock },
      accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      declined: { label: 'Declined', color: 'bg-red-100 text-red-800', icon: XCircle },
      expired: { label: 'Expired', color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
    };

    const badge = badges[status] || badges.sent;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <PublicLayout currentPage="home" onNavigate={() => {}} onLogin={onLogin}>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading quote...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error || !quote) {
    const isExpired = error === 'expired';
    return (
      <PublicLayout currentPage="home" onNavigate={() => {}} onLogin={onLogin}>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isExpired ? 'bg-amber-100' : 'bg-red-100'}`}>
              <AlertCircle className={`w-8 h-8 ${isExpired ? 'text-amber-600' : 'text-red-600'}`} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              {isExpired ? 'Quote Link Expired' : 'Link Not Found'}
            </h1>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {isExpired
                ? 'This quote link has expired. Please contact us and we can send you a fresh one.'
                : 'This link is invalid or has already been used. Contact us if you need assistance.'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onNavigateHome}
                className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
              >
                Back to Home
              </button>
              <button
                onClick={onLogin}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (response) {
    return (
      <PublicLayout currentPage="home" onNavigate={() => {}} onLogin={onLogin}>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            {response === 'accept' ? (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  Job Confirmed
                </h1>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Your quote has been accepted and your service agreement is on file. We'll confirm scheduling
                  shortly and reach out to coordinate the details.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-900">
                    If you need to change anything, reply to the message or give us a call.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-gray-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  Quote Declined
                </h1>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  No problem. If you want a revised quote with different options, just reply to the message and we'll adjust.
                </p>
              </>
            )}
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

  if (quote.status === 'expired' || quote.status === 'accepted' || quote.status === 'declined') {
    return (
      <PublicLayout currentPage="home" onNavigate={() => {}} onLogin={onLogin}>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-3">Your Quote</h1>
              <div className="flex justify-center">
                {getStatusBadge(quote.status)}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Briefcase className="w-5 h-5 text-gray-600 mt-1" />
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Service Type</div>
                    <div className="font-semibold text-gray-900">
                      {getServiceTypeLabel(quote.service_type)}
                    </div>
                  </div>
                </div>

                {quote.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-600 mt-1" />
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Location</div>
                      <div className="font-semibold text-gray-900">{quote.location}</div>
                    </div>
                  </div>
                )}

                {!quote.location && (
                  <div className="text-sm text-gray-600">
                    Details included in quote
                  </div>
                )}
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-6 h-6 text-orange-600 mt-1" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-2">Pricing</div>
                    {quote.estimate_low && quote.estimate_high ? (
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        ${quote.estimate_low.toFixed(2)} – ${quote.estimate_high.toFixed(2)} CAD
                      </div>
                    ) : quote.expected_price ? (
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        ${quote.expected_price.toFixed(2)} CAD
                      </div>
                    ) : null}

                    {quote.cap_amount && (
                      <div className="text-sm text-gray-700 mt-2">
                        Not-to-exceed: <span className="font-semibold">${quote.cap_amount.toFixed(2)} CAD</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {quote.status === 'expired' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-yellow-900">
                    This quote has expired. Please request a new quote or contact us to discuss your project.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={onNavigateHome}
                className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <>
      <PublicLayout currentPage="home" onNavigate={() => {}} onLogin={onLogin}>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-3">Your Quote</h1>
              <div className="flex justify-center">
                {getStatusBadge(quote.status)}
              </div>
            </div>

            <div className="space-y-6 mb-8">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Briefcase className="w-5 h-5 text-gray-600 mt-1" />
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Service Type</div>
                    <div className="font-semibold text-gray-900">
                      {getServiceTypeLabel(quote.service_type)}
                    </div>
                  </div>
                </div>

                {quote.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-600 mt-1" />
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Location</div>
                      <div className="font-semibold text-gray-900">{quote.location}</div>
                    </div>
                  </div>
                )}

                {!quote.location && (
                  <div className="text-sm text-gray-600">
                    Details included in quote
                  </div>
                )}
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-6 h-6 text-orange-600 mt-1" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-2">Estimated Total</div>
                    {quote.estimate_low && quote.estimate_high ? (
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        ${quote.estimate_low.toFixed(2)} – ${quote.estimate_high.toFixed(2)} CAD
                      </div>
                    ) : quote.expected_price ? (
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        ${quote.expected_price.toFixed(2)} CAD
                      </div>
                    ) : null}

                    {quote.cap_amount && (
                      <div className="text-sm text-gray-700 mt-2 bg-white rounded px-3 py-2">
                        Not-to-exceed: <span className="font-semibold">${quote.cap_amount.toFixed(2)} CAD</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg px-4 py-3 mb-6 text-sm text-gray-600 text-center">
              Accepting this quote will prompt you to review and sign the BudgetWorks Service Agreement.
            </div>

            {actionError && (
              <div className="flex items-center gap-3 p-4 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{actionError}</span>
                <button onClick={() => setActionError(null)} className="ml-auto text-red-600 hover:text-red-800"><XCircle className="w-4 h-4" /></button>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleAcceptClick}
                disabled={responding}
                className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {responding ? 'Processing...' : 'Accept Quote'}
              </button>
              <button
                onClick={handleDecline}
                disabled={responding}
                className="w-full bg-gray-200 text-gray-700 py-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Decline Quote
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Questions? Contact us to discuss any details
              </p>
            </div>
          </div>
        </div>
      </PublicLayout>

      {showAgreement && (
        <ServiceAgreementModal
          onAccept={handleAgreementAccept}
          onCancel={() => setShowAgreement(false)}
          submitting={responding}
        />
      )}
    </>
  );
}
