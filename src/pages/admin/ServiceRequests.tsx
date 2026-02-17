import { useState, useEffect } from 'react';
import { supabase, PublicQuoteRequest } from '../../lib/supabase';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { MenuSection } from '../../components/layout/Sidebar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MapPin, Phone, Calendar, ArrowLeft, Mail, User, FileText } from 'lucide-react';
import { CreateQuote } from './CreateQuote';

interface ServiceRequestsProps {
  sidebarSections?: MenuSection[];
  onBack?: () => void;
}

export function ServiceRequests({ sidebarSections, onBack }: ServiceRequestsProps = {}) {
  const [requests, setRequests] = useState<PublicQuoteRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PublicQuoteRequest | null>(null);
  const [showCreateQuote, setShowCreateQuote] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('public_quote_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('public_quote_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      await loadRequests();
      if (selectedRequest?.id === id) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
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
      new: 'bg-yellow-100 text-yellow-700',
      in_review: 'bg-blue-100 text-blue-700',
      quoted: 'bg-green-100 text-green-700',
      closed: 'bg-gray-100 text-gray-700',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      new: 'New',
      in_review: 'In Review',
      quoted: 'Quoted',
      closed: 'Closed',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (showCreateQuote && selectedRequest) {
    return (
      <CreateQuote
        lead={selectedRequest}
        onBack={() => {
          setShowCreateQuote(false);
          loadRequests();
        }}
        onSuccess={() => {
          setShowCreateQuote(false);
          setSelectedRequest(null);
          loadRequests();
        }}
        sidebarSections={sidebarSections}
      />
    );
  }

  if (selectedRequest) {
    return (
      <PortalLayout
        portalName="Admin Portal"
        sidebarSections={sidebarSections}
        activeItemId="service-requests"
        breadcrumbs={[
          { label: 'Dashboard', onClick: onBack },
          { label: 'Leads', onClick: () => setSelectedRequest(null) },
          { label: selectedRequest.contact_name }
        ]}
      >
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={() => setSelectedRequest(null)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Leads
          </Button>

          <Card className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Lead Details</h2>
                <p className="text-gray-600">Guest quote request</p>
              </div>
              <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${getStatusBadge(selectedRequest.status)}`}>
                {getStatusLabel(selectedRequest.status)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Name</h3>
                <div className="flex items-center gap-2 text-gray-900">
                  <User className="w-5 h-5 text-gray-400" />
                  <p className="text-lg font-semibold">{selectedRequest.contact_name}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Email</h3>
                <div className="flex items-center gap-2 text-gray-900">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <a href={`mailto:${selectedRequest.contact_email}`} className="text-orange-600 hover:text-orange-700">
                    {selectedRequest.contact_email}
                  </a>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Phone</h3>
                <div className="flex items-center gap-2 text-gray-900">
                  <Phone className="w-5 h-5 text-gray-400" />
                  {selectedRequest.contact_phone ? (
                    <a href={`tel:${selectedRequest.contact_phone}`} className="text-orange-600 hover:text-orange-700">
                      {selectedRequest.contact_phone}
                    </a>
                  ) : (
                    <p>Not provided</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Preferred Contact</h3>
                <p className="text-lg text-gray-900 capitalize">
                  {selectedRequest.preferred_contact_method}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Service Type</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {getServiceLabel(selectedRequest.service_type)}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Submitted</h3>
                <p className="text-lg text-gray-900">
                  {formatDate(selectedRequest.created_at)}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Location</h3>
                <div className="flex items-start gap-2 text-gray-900">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <p>{selectedRequest.location_address}</p>
                </div>
              </div>

              {selectedRequest.preferred_date && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Preferred Date</h3>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <p>{formatDate(selectedRequest.preferred_date)}</p>
                  </div>
                </div>
              )}
            </div>

            {selectedRequest.description && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {selectedRequest.description}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-6 border-t">
              <div className="flex gap-2 flex-wrap">
                {(selectedRequest.status === 'new' || selectedRequest.status === 'in_review') && (
                  <Button
                    variant="primary"
                    onClick={() => setShowCreateQuote(true)}
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Create Quote
                  </Button>
                )}
                {selectedRequest.status === 'new' && (
                  <Button
                    variant="secondary"
                    onClick={() => updateRequestStatus(selectedRequest.id, 'in_review')}
                  >
                    Mark In Review
                  </Button>
                )}
                {selectedRequest.status === 'quoted' && (
                  <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
                    Quote sent
                  </div>
                )}
                {(selectedRequest.status === 'quoted' || selectedRequest.status === 'in_review') && (
                  <Button
                    variant="secondary"
                    onClick={() => updateRequestStatus(selectedRequest.id, 'closed')}
                  >
                    Close Lead
                  </Button>
                )}
                {selectedRequest.status === 'closed' && (
                  <Button
                    variant="secondary"
                    onClick={() => updateRequestStatus(selectedRequest.id, 'new')}
                  >
                    Reopen
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      portalName="Admin Portal"
      sidebarSections={sidebarSections}
      activeItemId="service-requests"
      breadcrumbs={onBack ? [
        { label: 'Dashboard', onClick: onBack },
        { label: 'Service Requests' }
      ] : undefined}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Guest Quote Leads</h2>
            <p className="text-gray-600">Public quote submissions from potential customers</p>
          </div>
          {onBack && (
            <Button variant="secondary" onClick={onBack}>
              Back to Dashboard
            </Button>
          )}
        </div>

        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">Loading leads...</p>
          </Card>
        ) : requests.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No quote requests yet</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card
                key={request.id}
                className="p-6 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedRequest(request)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-3 py-1 text-sm font-semibold bg-orange-100 text-orange-700 rounded-full">
                        {getServiceLabel(request.service_type)}
                      </span>
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadge(request.status)}`}>
                        {getStatusLabel(request.status)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-900 font-medium">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{request.contact_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{request.location_address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{request.contact_email}</span>
                      </div>
                      {request.contact_phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{request.contact_phone}</span>
                        </div>
                      )}
                      {request.preferred_date && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>Preferred: {formatDate(request.preferred_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-sm text-gray-500">
                    <p>{formatDate(request.created_at)}</p>
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
