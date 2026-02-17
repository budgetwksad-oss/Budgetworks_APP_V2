import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { CheckCircle, XCircle, Clock, DollarSign, MapPin, Briefcase, AlertCircle } from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [response, setResponse] = useState<'accept' | 'decline' | null>(null);

  useEffect(() => {
    loadQuote();
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

      if (!data) {
        setError('invalid');
        return;
      }

      setQuote(data);
    } catch (err) {
      console.error('Error:', err);
      setError('invalid');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (action: 'accept' | 'decline') => {
    try {
      setResponding(true);

      const { error: rpcError } = await supabase.rpc('respond_to_quote_by_token', {
        p_token: token,
        p_action: action,
      });

      if (rpcError) {
        console.error('Error responding to quote:', rpcError);
        alert('There was an error processing your response. Please try again.');
        return;
      }

      setResponse(action);
    } catch (err) {
      console.error('Error:', err);
      alert('There was an error processing your response. Please try again.');
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
    const badges: Record<string, { label: string; color: string; icon: any }> = {
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

  if (error === 'invalid' || !quote) {
    return (
      <PublicLayout currentPage="home" onNavigate={() => {}} onLogin={onLogin}>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Link No Longer Valid
            </h1>
            <p className="text-gray-600 mb-6 leading-relaxed">
              This link is no longer valid. It may have expired or been used already. Request a fresh quote to get started.
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
                  Quote Accepted
                </h1>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Thank you for accepting our quote. We'll confirm scheduling shortly and reach out to coordinate the details.
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
                        ${quote.estimate_low.toFixed(2)} - ${quote.estimate_high.toFixed(2)}
                      </div>
                    ) : quote.expected_price ? (
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        ${quote.expected_price.toFixed(2)}
                      </div>
                    ) : null}

                    {quote.cap_amount && (
                      <div className="text-sm text-gray-700 mt-2">
                        Not-to-exceed: <span className="font-semibold">${quote.cap_amount.toFixed(2)}</span>
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
                      ${quote.estimate_low.toFixed(2)} - ${quote.estimate_high.toFixed(2)}
                    </div>
                  ) : quote.expected_price ? (
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      ${quote.expected_price.toFixed(2)}
                    </div>
                  ) : null}

                  {quote.cap_amount && (
                    <div className="text-sm text-gray-700 mt-2 bg-white rounded px-3 py-2">
                      Not-to-exceed: <span className="font-semibold">${quote.cap_amount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleResponse('accept')}
              disabled={responding}
              className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {responding ? 'Processing...' : 'Accept Quote'}
            </button>
            <button
              onClick={() => handleResponse('decline')}
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
  );
}
