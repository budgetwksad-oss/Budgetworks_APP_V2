import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Job, Quote, ServiceRequest } from '../../lib/supabase';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { MenuSection } from '../../components/layout/Sidebar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Briefcase, Calendar, Clock, MapPin, Image as ImageIcon, CheckCircle, Package, Star, MessageSquare } from 'lucide-react';
import { JobFeedbackModal } from '../../components/ui/JobFeedbackModal';

type JobWithDetails = Job & {
  quote: Quote;
  service_request: ServiceRequest;
};

interface JobsListProps {
  sidebarSections?: MenuSection[];
  onBack?: () => void;
}

export function JobsList({ sidebarSections, onBack }: JobsListProps = {}) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobWithDetails[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackJobId, setFeedbackJobId] = useState<string | null>(null);
  const [jobFeedback, setJobFeedback] = useState<Record<string, any>>({});

  useEffect(() => {
    loadJobs();
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('job_feedback')
        .select('*')
        .eq('customer_id', user?.id);

      if (error) throw error;

      const feedbackMap: Record<string, any> = {};
      (data || []).forEach(feedback => {
        feedbackMap[feedback.job_id] = feedback;
      });
      setJobFeedback(feedbackMap);
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  };

  const loadJobs = async () => {
    try {
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      const jobsWithDetails: JobWithDetails[] = [];

      for (const job of jobsData || []) {
        const { data: quote, error: quoteError } = await supabase
          .from('quotes')
          .select('*')
          .eq('id', job.quote_id)
          .single();

        if (quoteError) continue;

        const { data: request, error: requestError } = await supabase
          .from('service_requests')
          .select('*')
          .eq('id', job.service_request_id)
          .single();

        if (requestError) continue;

        jobsWithDetails.push({
          ...job,
          quote,
          service_request: request,
        });
      }

      setJobs(jobsWithDetails);
    } catch (error) {
      console.error('Error loading jobs:', error);
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
      scheduled: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (selectedJob) {
    return (
      <PortalLayout
        portalName="Customer Portal"
        sidebarSections={sidebarSections}
        activeItemId="jobs"
        breadcrumbs={[
          { label: 'Dashboard', onClick: onBack },
          { label: 'My Jobs', onClick: () => setSelectedJob(null) },
          { label: getServiceLabel(selectedJob.service_request.service_type) }
        ]}
      >
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={() => setSelectedJob(null)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </Button>

          <Card className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Job Details</h2>
                <p className="text-gray-600">
                  {getServiceLabel(selectedJob.service_request.service_type)} - Quote #{selectedJob.quote.quote_number}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${getStatusBadge(selectedJob.status)}`}>
                  {getStatusLabel(selectedJob.status)}
                </span>
                {selectedJob.status === 'completed' && (
                  <Button
                    variant={jobFeedback[selectedJob.id] ? "secondary" : "primary"}
                    size="sm"
                    onClick={() => {
                      setFeedbackJobId(selectedJob.id);
                      setShowFeedbackModal(true);
                    }}
                  >
                    {jobFeedback[selectedJob.id] ? (
                      <>
                        <Star className="w-4 h-4 mr-2 fill-yellow-400 text-yellow-400" />
                        Update Feedback
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Leave Feedback
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Location</h3>
                <div className="flex items-start gap-2 text-gray-900">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <p>{selectedJob.service_request.location_address}</p>
                </div>
              </div>

              {selectedJob.scheduled_date && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Scheduled</h3>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <p>
                      {formatDate(selectedJob.scheduled_date)}
                      {selectedJob.scheduled_time && ` at ${formatTime(selectedJob.scheduled_time)}`}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Quote Total</h3>
                <p className="text-2xl font-bold text-orange-600">
                  ${Number(selectedJob.quote.total_amount).toFixed(2)}
                </p>
              </div>

              {selectedJob.completed_at && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Completed</h3>
                  <div className="flex items-center gap-2 text-gray-900">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <p>{formatDate(selectedJob.completed_at)}</p>
                  </div>
                </div>
              )}
            </div>

            {selectedJob.completion_notes && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Completion Notes</h3>
                <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {selectedJob.completion_notes}
                </p>
              </div>
            )}

            {selectedJob.photos_urls && selectedJob.photos_urls.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Job Photos ({selectedJob.photos_urls.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {selectedJob.photos_urls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative group"
                    >
                      <img
                        src={url}
                        alt={`Job photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-300 group-hover:border-orange-500 transition-colors"
                      />
                      <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity rounded-lg" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quote Breakdown</h3>
              <div className="space-y-3 mb-4">
                {selectedJob.quote.line_items.map((item, index) => (
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
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span className="font-semibold">${Number(selectedJob.quote.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Tax:</span>
                  <span className="font-semibold">${Number(selectedJob.quote.tax_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t">
                  <span>Total:</span>
                  <span className="text-orange-600">${Number(selectedJob.quote.total_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
        {showFeedbackModal && feedbackJobId && (
          <JobFeedbackModal
            jobId={feedbackJobId}
            customerId={user?.id || ''}
            onClose={() => {
              setShowFeedbackModal(false);
              setFeedbackJobId(null);
            }}
            onSubmit={() => {
              loadFeedback();
            }}
            existingFeedback={jobFeedback[feedbackJobId]}
          />
        )}
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      portalName="Customer Portal"
      sidebarSections={sidebarSections}
      activeItemId="jobs"
      breadcrumbs={onBack ? [
        { label: 'Dashboard', onClick: onBack },
        { label: 'My Jobs' }
      ] : undefined}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">My Jobs</h2>
            <p className="text-gray-600">Track your scheduled and completed jobs</p>
          </div>
          {onBack && (
            <Button variant="secondary" onClick={onBack}>
              Back to Dashboard
            </Button>
          )}
        </div>

        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">Loading jobs...</p>
          </Card>
        ) : jobs.length === 0 ? (
          <Card className="p-8 text-center">
            <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No jobs yet</p>
            <p className="text-sm text-gray-400 mt-2">Jobs are created when you accept a quote</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {jobs.map((job) => (
              <Card
                key={job.id}
                className="p-6 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedJob(job)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 text-sm font-semibold bg-orange-100 text-orange-700 rounded-full">
                        {getServiceLabel(job.service_request.service_type)}
                      </span>
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadge(job.status)}`}>
                        {getStatusLabel(job.status)}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="font-medium">{job.service_request.location_address}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">
                      ${Number(job.quote.total_amount).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm text-gray-600">
                  {job.scheduled_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {formatDate(job.scheduled_date)}
                        {job.scheduled_time && ` at ${formatTime(job.scheduled_time)}`}
                      </span>
                    </div>
                  )}
                  {job.photos_urls && job.photos_urls.length > 0 && (
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      <span>{job.photos_urls.length} photos</span>
                    </div>
                  )}
                  {job.status === 'completed' && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Completed</span>
                    </div>
                  )}
                  {job.status === 'completed' && jobFeedback[job.id] && (
                    <div className="flex items-center gap-2 text-yellow-600">
                      <Star className="w-4 h-4 fill-yellow-400" />
                      <span>Rated {jobFeedback[job.id].rating}/5</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      {showFeedbackModal && feedbackJobId && (
        <JobFeedbackModal
          jobId={feedbackJobId}
          customerId={user?.id || ''}
          onClose={() => {
            setShowFeedbackModal(false);
            setFeedbackJobId(null);
          }}
          onSubmit={() => {
            loadFeedback();
          }}
          existingFeedback={jobFeedback[feedbackJobId]}
        />
      )}
    </PortalLayout>
  );
}
