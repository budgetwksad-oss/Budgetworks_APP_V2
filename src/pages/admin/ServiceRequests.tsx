import { useState, useEffect } from 'react';
import { supabase, ServiceRequest } from '../../lib/supabase';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { MenuSection } from '../../components/layout/Sidebar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MapPin, Phone, Calendar, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { CreateQuote } from './CreateQuote';

interface ServiceRequestsProps {
  sidebarSections?: MenuSection[];
  onBack?: () => void;
}

export function ServiceRequests({ sidebarSections, onBack }: ServiceRequestsProps = {}) {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [showCreateQuote, setShowCreateQuote] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('service_requests')
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
      pending: 'bg-yellow-100 text-yellow-700',
      quoted: 'bg-blue-100 text-blue-700',
      accepted: 'bg-green-100 text-green-700',
      scheduled: 'bg-purple-100 text-purple-700',
      completed: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700',
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

  if (showCreateQuote && selectedRequest) {
    return (
      <CreateQuote
        request={selectedRequest}
        onBack={() => {
          setShowCreateQuote(false);
          loadRequests();
        }}
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
          { label: 'Service Requests', onClick: () => setSelectedRequest(null) },
          { label: getServiceLabel(selectedRequest.service_type) }
        ]}
      >
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={() => setSelectedRequest(null)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Requests
          </Button>

          <Card className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Request Details</h2>
                <p className="text-gray-600">Review and create a quote</p>
              </div>
              <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${getStatusBadge(selectedRequest.status)}`}>
                {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Service Type</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {getServiceLabel(selectedRequest.service_type)}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Requested Date</h3>
                <p className="text-lg text-gray-900">
                  {selectedRequest.created_at ? formatDate(selectedRequest.created_at) : 'Not specified'}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Location</h3>
                <div className="flex items-start gap-2 text-gray-900">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <p>{selectedRequest.location_address}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Phone</h3>
                <div className="flex items-center gap-2 text-gray-900">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <p>{selectedRequest.contact_phone || 'Not provided'}</p>
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

            {selectedRequest.photos_urls && selectedRequest.photos_urls.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Photos ({selectedRequest.photos_urls.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {selectedRequest.photos_urls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative group"
                    >
                      <img
                        src={url}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-300 group-hover:border-orange-500 transition-colors"
                      />
                      <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity rounded-lg" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-6 border-t">
              {selectedRequest.status === 'pending' && (
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => setShowCreateQuote(true)}
                >
                  Create Quote
                </Button>
              )}
              {selectedRequest.status === 'quoted' && (
                <div className="text-center w-full p-4 bg-blue-50 rounded-lg">
                  <p className="text-blue-700 font-medium">Quote has been sent to customer</p>
                </div>
              )}
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
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Service Requests</h2>
            <p className="text-gray-600">Manage all incoming service requests</p>
          </div>
          {onBack && (
            <Button variant="secondary" onClick={onBack}>
              Back to Dashboard
            </Button>
          )}
        </div>

        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">Loading requests...</p>
          </Card>
        ) : requests.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No service requests yet</p>
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
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{request.location_address}</span>
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
                    {request.photos_urls && request.photos_urls.length > 0 && (
                      <p className="mt-1 flex items-center gap-1 justify-end text-gray-400">
                        <ImageIcon className="w-4 h-4" />
                        {request.photos_urls.length}
                      </p>
                    )}
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
