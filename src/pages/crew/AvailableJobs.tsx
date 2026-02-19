import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Job, Quote, ServiceRequest, CrewAssignment } from '../../lib/supabase';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { MenuSection } from '../../components/layout/Sidebar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, MapPin, Calendar, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';

type JobWithDetails = Job & {
  quote: Quote;
  service_request: ServiceRequest;
};

interface AvailableJobsProps {
  sidebarSections?: MenuSection[];
  onBack?: () => void;
}

export function AvailableJobs({ sidebarSections, onBack }: AvailableJobsProps = {}) {
  const { user } = useAuth();
  const [availableJobs, setAvailableJobs] = useState<JobWithDetails[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canDrive, setCanDrive] = useState<boolean>(false);

  useEffect(() => {
    loadAvailableJobs();
    loadUserProfile();
  }, []);

  const [crewName, setCrewName] = useState<string>('');

  const loadUserProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('can_drive, full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      setCanDrive(data?.can_drive || false);
      setCrewName(data?.full_name || '');
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadAvailableJobs = async () => {
    try {
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_open_for_claims', true)
        .eq('status', 'scheduled')
        .order('scheduled_date', { ascending: true });

      if (jobsError) throw jobsError;

      const jobsWithDetails: JobWithDetails[] = [];

      for (const job of jobsData || []) {
        const { data: quote } = await supabase
          .from('quotes')
          .select('*')
          .eq('id', job.quote_id)
          .maybeSingle();

        const { data: request } = await supabase
          .from('service_requests')
          .select('*')
          .eq('id', job.service_request_id)
          .maybeSingle();

        if (quote && request) {
          jobsWithDetails.push({
            ...job,
            quote,
            service_request: request,
          });
        }
      }

      setAvailableJobs(jobsWithDetails);
    } catch (error) {
      console.error('Error loading available jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailablePositions = (job: JobWithDetails) => {
    const needs = job.staffing_needs || { drivers: 0, helpers: 0 };
    const assignments = job.crew_assignments || [];

    const assignedDrivers = assignments.filter(a => a.role === 'driver').length;
    const assignedHelpers = assignments.filter(a => a.role === 'helper').length;

    return {
      drivers: Math.max(0, needs.drivers - assignedDrivers),
      helpers: Math.max(0, needs.helpers - assignedHelpers),
    };
  };

  const isAlreadyClaimed = (job: JobWithDetails) => {
    const assignments = job.crew_assignments || [];
    return assignments.some(a => a.user_id === user?.id);
  };

  const handleClaimPosition = async (role: 'driver' | 'helper') => {
    if (!selectedJob || !user) return;
    setClaiming(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.rpc('claim_job_position', {
        p_job_id: selectedJob.id,
        p_role: role,
      });

      if (error) {
        throw error;
      }

      // Enqueue job_claimed admin notification (fire-and-forget)
      try {
        const serviceLabel = (() => {
          switch (selectedJob.service_request.service_type) {
            case 'moving': return 'Moving';
            case 'junk_removal': return 'Junk Removal';
            case 'demolition': return 'Light Demo';
            default: return selectedJob.service_request.service_type || '';
          }
        })();

        await supabase.rpc('enqueue_admin_ops', {
          p_event_key: 'job_claimed',
          p_channel: 'sms',
          p_service_type: selectedJob.service_request.service_type || 'moving',
          p_payload: {
            service_label: serviceLabel,
            job_date: selectedJob.scheduled_date || '',
            role: role,
            crew_name: crewName,
            company_phone: '',
          },
        });
      } catch (_enqueueErr) {
        // Non-fatal
      }

      await loadAvailableJobs();
      setSelectedJob(null);
      setErrorMessage(null);
    } catch (error: any) {
      console.error('Error claiming position:', error);
      const message = error?.message || 'Failed to claim position. Please try again.';
      setErrorMessage(message);
    } finally {
      setClaiming(false);
    }
  };

  const getServiceLabel = (type: string) => {
    switch (type) {
      case 'moving': return 'Moving';
      case 'junk_removal': return 'Junk Removal';
      case 'demolition': return 'Light Demo';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
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
    const available = getAvailablePositions(selectedJob);
    const alreadyClaimed = isAlreadyClaimed(selectedJob);

    return (
      <PortalLayout
        portalName="Crew Portal"
        sidebarSections={sidebarSections}
        activeItemId="available-jobs"
        breadcrumbs={[
          { label: 'Dashboard', onClick: onBack },
          { label: 'Available Jobs', onClick: () => { setSelectedJob(null); setErrorMessage(null); } },
          { label: getServiceLabel(selectedJob.service_request.service_type) }
        ]}
      >
        <div className="space-y-4 pb-6">
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedJob(null);
              setErrorMessage(null);
            }}
            className="flex items-center gap-2 mb-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Button>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-red-800 text-sm">{errorMessage}</p>
            </div>
          )}

          <Card className="p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-4 py-2 text-sm font-bold bg-orange-100 text-orange-700 rounded-full">
                  {getServiceLabel(selectedJob.service_request.service_type)}
                </span>
                {alreadyClaimed && (
                  <span className="px-4 py-2 text-sm font-bold bg-green-100 text-green-700 rounded-full flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    You're on this job
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Details</h2>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Location</h3>
                <div className="flex items-start gap-2 text-gray-900">
                  <MapPin className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <p className="text-lg">{selectedJob.service_request.location_address}</p>
                </div>
              </div>

              {selectedJob.scheduled_date && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">Date</h3>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    <p className="text-lg">{formatDate(selectedJob.scheduled_date)}</p>
                  </div>
                </div>
              )}

              {selectedJob.arrival_window_start && selectedJob.arrival_window_end && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">Arrival Window</h3>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <p className="text-lg">
                      {formatTime(selectedJob.arrival_window_start)} - {formatTime(selectedJob.arrival_window_end)}
                    </p>
                  </div>
                </div>
              )}

              {selectedJob.crew_pay_min && selectedJob.crew_pay_max && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">Estimated Pay</h3>
                  <p className="text-lg font-bold text-green-700">
                    ${selectedJob.crew_pay_min.toFixed(0)}–${selectedJob.crew_pay_max.toFixed(0)}
                  </p>
                </div>
              )}

              {selectedJob.service_request.contact_phone && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">Contact</h3>
                  <p className="text-lg text-gray-900">{selectedJob.service_request.contact_phone}</p>
                </div>
              )}
            </div>

            {selectedJob.service_request.description && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Description</h3>
                <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {selectedJob.service_request.description}
                </p>
              </div>
            )}

            <div className="border-t pt-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Claim a Position</h3>

              {alreadyClaimed ? (
                <div className="p-6 bg-green-50 rounded-lg text-center">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-3" />
                  <p className="text-green-700 font-bold text-lg mb-1">Position Claimed!</p>
                  <p className="text-sm text-green-600">Check "My Jobs" to manage this job</p>
                </div>
              ) : (available.drivers === 0 && available.helpers === 0) ? (
                <div className="p-6 bg-gray-50 rounded-lg text-center">
                  <p className="text-gray-500 font-medium">All positions have been filled</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {available.drivers > 0 && (
                    <Card className="p-6 border-2 border-orange-200 bg-orange-50">
                      <div className="text-center">
                        <Users className="w-16 h-16 text-orange-600 mx-auto mb-3" />
                        <h4 className="text-xl font-bold text-gray-900 mb-2">Driver</h4>
                        <p className="text-sm text-gray-700 mb-4 font-medium">
                          {available.drivers} position{available.drivers !== 1 ? 's' : ''} available
                        </p>
                        {canDrive ? (
                          <Button
                            variant="primary"
                            onClick={() => handleClaimPosition('driver')}
                            disabled={claiming}
                            className="w-full text-lg py-4"
                          >
                            {claiming ? 'Claiming...' : 'Claim Driver Position'}
                          </Button>
                        ) : (
                          <p className="text-sm text-gray-600 italic">
                            Driver role requires driving eligibility.
                          </p>
                        )}
                      </div>
                    </Card>
                  )}

                  {available.helpers > 0 && (
                    <Card className="p-6 border-2 border-blue-200 bg-blue-50">
                      <div className="text-center">
                        <Users className="w-16 h-16 text-blue-600 mx-auto mb-3" />
                        <h4 className="text-xl font-bold text-gray-900 mb-2">Helper</h4>
                        <p className="text-sm text-gray-700 mb-4 font-medium">
                          {available.helpers} position{available.helpers !== 1 ? 's' : ''} available
                        </p>
                        <Button
                          variant="secondary"
                          onClick={() => handleClaimPosition('helper')}
                          disabled={claiming}
                          className="w-full text-lg py-4"
                        >
                          {claiming ? 'Claiming...' : 'Claim Helper Position'}
                        </Button>
                      </div>
                    </Card>
                  )}
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
      portalName="Crew Portal"
      sidebarSections={sidebarSections}
      activeItemId="available-jobs"
      breadcrumbs={onBack ? [
        { label: 'Dashboard', onClick: onBack },
        { label: 'Available Jobs' }
      ] : undefined}
    >
      <div className="space-y-4 pb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Available Jobs</h2>
            <p className="text-gray-600">Claim positions on open jobs</p>
          </div>
          {onBack && (
            <Button variant="secondary" onClick={onBack}>
              Back to Dashboard
            </Button>
          )}
        </div>

        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">Loading...</p>
          </Card>
        ) : availableJobs.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No jobs available</p>
            <p className="text-sm text-gray-400 mt-2">Check back later</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {availableJobs.map((job) => {
              const available = getAvailablePositions(job);
              const alreadyClaimed = isAlreadyClaimed(job);

              return (
                <Card
                  key={job.id}
                  className="p-5 hover:shadow-lg transition-all cursor-pointer active:scale-98"
                  onClick={() => setSelectedJob(job)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="px-3 py-1.5 text-sm font-bold bg-orange-100 text-orange-700 rounded-full">
                          {getServiceLabel(job.service_request.service_type)}
                        </span>
                        {alreadyClaimed && (
                          <span className="px-3 py-1.5 text-sm font-bold bg-green-100 text-green-700 rounded-full">
                            Claimed
                          </span>
                        )}
                      </div>
                      <div className="flex items-start gap-2 text-gray-700 mb-2">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="font-semibold text-base">{job.service_request.location_address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    {job.scheduled_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">{formatDate(job.scheduled_date)}</span>
                      </div>
                    )}
                    {job.arrival_window_start && job.arrival_window_end && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">
                          {formatTime(job.arrival_window_start)} - {formatTime(job.arrival_window_end)}
                        </span>
                      </div>
                    )}
                    {job.crew_pay_min && job.crew_pay_max && (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-700">
                          ${job.crew_pay_min.toFixed(0)}–${job.crew_pay_max.toFixed(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Users className="w-5 h-5 text-orange-600" />
                      <span>
                        {available.drivers > 0 && `${available.drivers} Driver${available.drivers !== 1 ? 's' : ''}`}
                        {available.drivers > 0 && available.helpers > 0 && ' • '}
                        {available.helpers > 0 && `${available.helpers} Helper${available.helpers !== 1 ? 's' : ''}`}
                        {available.drivers === 0 && available.helpers === 0 && 'All positions filled'}
                      </span>
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
