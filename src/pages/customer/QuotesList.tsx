import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Quote, ServiceRequest } from '../../lib/supabase';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { MenuSection } from '../../components/layout/Sidebar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ArrowLeft, FileText, Calendar, DollarSign, X } from 'lucide-react';

interface QuotesListProps {
  sidebarSections?: MenuSection[];
  onBack?: () => void;
}

export function QuotesList({ sidebarSections, onBack }: QuotesListProps = {}) {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<(Quote & { service_request: ServiceRequest })[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<(Quote & { service_request: ServiceRequest }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      const { data: requests, error: requestsError } = await supabase
        .from('service_requests')
        .select('*')
        .eq('customer_id', user?.id);

      if (requestsError) throw requestsError;

      const requestIds = requests?.map(r => r.id) || [];

      if (requestIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .in('service_request_id', requestIds)
        .order('created_at', { ascending: false });

      if (quotesError) throw quotesError;

      const quotesWithRequests = quotesData?.map(quote => ({
        ...quote,
        service_request: requests?.find(r => r.id === quote.service_request_id)!,
      })) || [];

      setQuotes(quotesWithRequests);
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getServiceLabel = (type: string) => {
    switch (type) {
      case 'moving': return 'Moving';
      case 'junk_removal': return 'Junk Removal';
      case 'demolition': return 'Demolition';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      sent: 'bg-blue-100 text-blue-700',
      accepted: 'bg-green-100 text-green-700',
      declined: 'bg-red-100 text-red-700',
      expired: 'bg-gray-100 text-gray-700',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleAcceptQuote = async (quoteId: string) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status: 'accepted' })
        .eq('id', quoteId);

      if (error) throw error;

      const { error: requestError } = await supabase
        .from('service_requests')
        .update({ status: 'accepted' })
        .eq('id', selectedQuote?.service_request_id);

      if (requestError) throw requestError;

      loadQuotes();
      setSelectedQuote(null);
    } catch (error) {
      console.error('Error accepting quote:', error);
    }
  };

  const handleRejectQuote = async (e: FormEvent) => {
    e.preventDefault();
    setRejecting(true);

    try {
      const updateData: any = { status: 'declined' };
      if (rejectReason.trim()) {
        updateData.notes = selectedQuote?.notes
          ? `${selectedQuote.notes}\n\nCustomer declined: ${rejectReason}`
          : `Customer declined: ${rejectReason}`;
      }

      const { error } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', selectedQuote?.id);

      if (error) throw error;

      const { error: requestError } = await supabase
        .from('service_requests')
        .update({ status: 'cancelled' })
        .eq('id', selectedQuote?.service_request_id);

      if (requestError) throw requestError;

      setShowRejectModal(false);
      setRejectReason('');
      loadQuotes();
      setSelectedQuote(null);
    } catch (error) {
      console.error('Error rejecting quote:', error);
    } finally {
      setRejecting(false);
    }
  };

  if (selectedQuote) {
    return (
      <PortalLayout
        portalName="Customer Portal"
        sidebarSections={sidebarSections}
        activeItemId="quotes"
        breadcrumbs={[
          { label: 'Dashboard', onClick: onBack },
          { label: 'My Quotes', onClick: () => setSelectedQuote(null) },
          { label: `Quote #${selectedQuote.quote_number}` }
        ]}
      >
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={() => setSelectedQuote(null)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Quotes
          </Button>

          <Card className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Quote #{selectedQuote.quote_number}</h2>
                <p className="text-gray-600">
                  {getServiceLabel(selectedQuote.service_request.service_type)} - {selectedQuote.service_request.location_address}
                </p>
              </div>
              <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${getStatusBadge(selectedQuote.status)}`}>
                {selectedQuote.status.charAt(0).toUpperCase() + selectedQuote.status.slice(1)}
              </span>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Quote Date</p>
                <p className="font-medium text-gray-900">{formatDate(selectedQuote.created_at)}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Valid Until</p>
                <p className="font-medium text-gray-900">{formatDate(selectedQuote.valid_until)}</p>
              </div>
            </div>

            <div className="border-t border-b py-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Line Items</h3>
              <div className="space-y-3">
                {selectedQuote.line_items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.description}</p>
                      <p className="text-sm text-gray-500">
                        {item.quantity} × ${item.unit_price.toFixed(2)}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900">${item.total.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span className="font-semibold">${Number(selectedQuote.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Tax ({(selectedQuote.tax_rate * 100).toFixed(2)}%):</span>
                <span className="font-semibold">${Number(selectedQuote.tax_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t">
                <span>Total:</span>
                <span className="text-orange-600">${Number(selectedQuote.total_amount).toFixed(2)}</span>
              </div>
            </div>

            {selectedQuote.notes && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedQuote.notes}</p>
              </div>
            )}

            {selectedQuote.status === 'sent' && (
              <div className="flex gap-3 pt-6 border-t">
                <Button
                  variant="ghost"
                  className="flex-1 text-red-600 hover:bg-red-50"
                  onClick={() => setShowRejectModal(true)}
                >
                  Decline Quote
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => handleAcceptQuote(selectedQuote.id)}
                >
                  Accept Quote
                </Button>
              </div>
            )}

            {selectedQuote.status === 'accepted' && (
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <p className="text-green-700 font-medium">Quote accepted! We'll contact you soon to schedule.</p>
              </div>
            )}

            {selectedQuote.status === 'declined' && (
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <p className="text-red-700 font-medium">Quote declined</p>
              </div>
            )}
          </Card>

          {showRejectModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <Card className="w-full max-w-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Decline Quote</h3>
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectReason('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleRejectQuote} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Reason for declining (Optional)
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Let us know why you're declining this quote..."
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-colors duration-200"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex-1"
                      onClick={() => {
                        setShowRejectModal(false);
                        setRejectReason('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      disabled={rejecting}
                    >
                      {rejecting ? 'Declining...' : 'Decline Quote'}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      portalName="Customer Portal"
      sidebarSections={sidebarSections}
      activeItemId="quotes"
      breadcrumbs={onBack ? [
        { label: 'Dashboard', onClick: onBack },
        { label: 'My Quotes' }
      ] : undefined}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">My Quotes</h2>
            <p className="text-gray-600">View and manage your service quotes</p>
          </div>
          {onBack && (
            <Button variant="secondary" onClick={onBack}>
              Back to Dashboard
            </Button>
          )}
        </div>

        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">Loading quotes...</p>
          </Card>
        ) : quotes.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No quotes yet</p>
            <p className="text-sm text-gray-400 mt-2">Request a service to receive a quote</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {quotes.map((quote) => (
              <Card
                key={quote.id}
                className="p-6 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedQuote(quote)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 text-sm font-semibold bg-orange-100 text-orange-700 rounded-full">
                        {getServiceLabel(quote.service_request.service_type)}
                      </span>
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadge(quote.status)}`}>
                        {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900">Quote #{quote.quote_number}</p>
                    <p className="text-sm text-gray-600">{quote.service_request.location_address}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">
                      ${Number(quote.total_amount).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Valid until {formatDate(quote.valid_until)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>{quote.line_items.length} items</span>
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
