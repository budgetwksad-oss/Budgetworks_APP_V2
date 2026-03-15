import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Job, Quote, ServiceRequest, TimeEntry } from '../../lib/supabase';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { MenuSection } from '../../components/layout/Sidebar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  ArrowLeft, MapPin, Calendar, Clock, Play, Square, Navigation,
  Camera, CheckCircle, AlertCircle, XCircle
} from 'lucide-react';

type JobWithDetails = Job & {
  quote: Quote;
  service_request: ServiceRequest;
};

interface CrewJobsProps {
  sidebarSections?: MenuSection[];
  onBack?: () => void;
}

export function CrewJobs({ sidebarSections, onBack }: CrewJobsProps = {}) {
  const { user } = useAuth();
  const [myJobs, setMyJobs] = useState<JobWithDetails[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobWithDetails | null>(null);
  const [timeEntry, setTimeEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [completionError, setCompletionError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };
  const [selectedPhotoTab, setSelectedPhotoTab] = useState<'before' | 'after'>('before');
  const [jobCrewPhotos, setJobCrewPhotos] = useState<{ before: any[]; after: any[] }>({ before: [], after: [] });

  useEffect(() => {
    loadMyJobs();
  }, [user]);

  useEffect(() => {
    if (selectedJob) {
      loadTimeEntry();
      loadJobPhotos(selectedJob.id);
    }
  }, [selectedJob]);

  const loadMyJobs = async () => {
    if (!user) return;

    try {
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .contains('assigned_crew_ids', [user.id])
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

        if (quote) {
          jobsWithDetails.push({
            ...job,
            quote,
            service_request: request || {
              id: job.service_request_id,
              customer_id: job.customer_id,
              service_type: job.service_type || quote?.pricing_snapshot?.service_type || 'moving',
              location_address: quote?.pricing_snapshot?.location || 'See job details',
              contact_name: job.customer_name,
              preferred_date: null,
              contact_phone: job.customer_phone,
              description: quote?.pricing_snapshot?.description || null,
              photos_urls: [],
              status: 'accepted',
              created_at: job.created_at,
              updated_at: job.updated_at,
            },
          });
        }
      }

      setMyJobs(jobsWithDetails);
    } catch (error) {
      console.error('Error loading my jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeEntry = async () => {
    if (!selectedJob || !user) return;

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('job_id', selectedJob.id)
        .eq('crew_member_id', user.id)
        .is('clock_out', null)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setTimeEntry(data);
    } catch (error) {
      console.error('Error loading time entry:', error);
    }
  };

  const loadJobPhotos = async (jobId: string) => {
    try {
      const { data } = await supabase
        .from('jobs')
        .select('crew_photos')
        .eq('id', jobId)
        .maybeSingle();
      if (data?.crew_photos) {
        setJobCrewPhotos({
          before: data.crew_photos.before || [],
          after: data.crew_photos.after || [],
        });
      } else {
        setJobCrewPhotos({ before: [], after: [] });
      }
    } catch {
      setJobCrewPhotos({ before: [], after: [] });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedJob || !user) return;
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('Image must be under 10 MB');
      return;
    }

    setUploadingPhoto(true);
    setPhotoError('');

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${selectedJob.id}/${selectedPhotoTab}/${Date.now()}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from('job-photos')
        .upload(path, file, { upsert: false });

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from('job-photos')
        .getPublicUrl(path);

      const { data: result, error: rpcError } = await supabase.rpc('crew_upload_job_photo', {
        p_job_id: selectedJob.id,
        p_photo_url: publicUrl,
        p_type: selectedPhotoTab,
      });

      if (rpcError) throw rpcError;
      if (result?.success === false) throw new Error(result.error || 'Upload failed');

      await loadJobPhotos(selectedJob.id);
    } catch (err: any) {
      setPhotoError(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!selectedJob) return;
    setCompleting(true);
    setCompletionError('');

    try {
      const { data: result, error } = await supabase.rpc('crew_complete_job', {
        p_job_id: selectedJob.id,
        p_completion_notes: null,
      });

      if (error) throw error;
      if (result?.success === false) throw new Error(result.error || 'Could not complete job');

      await loadMyJobs();
      setSelectedJob(null);
    } catch (err: any) {
      setCompletionError(err.message || 'Failed to complete job');
    } finally {
      setCompleting(false);
    }
  };

  const handleClockIn = async () => {
    if (!selectedJob || !user) return;
    setUpdating(true);

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          job_id: selectedJob.id,
          crew_member_id: user.id,
          clock_in: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      setTimeEntry(data);
    } catch (error) {
      console.error('Error clocking in:', error);
      showToast('error', 'Failed to clock in');
    } finally {
      setUpdating(false);
    }
  };

  const handleClockOut = async () => {
    if (!timeEntry) return;
    setUpdating(true);

    try {
      const clockOutTime = new Date();
      const clockInTime = new Date(timeEntry.clock_in);
      const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

      const { error } = await supabase
        .from('time_entries')
        .update({
          clock_out: clockOutTime.toISOString(),
          hours_worked: parseFloat(hoursWorked.toFixed(4)),
        })
        .eq('id', timeEntry.id);

      if (error) throw error;
      setTimeEntry(null);
    } catch (error) {
      console.error('Error clocking out:', error);
      showToast('error', 'Failed to clock out');
    } finally {
      setUpdating(false);
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
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
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

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getMyRole = (job: JobWithDetails) => {
    const assignments = job.crew_assignments || [];
    const myAssignment = assignments.find(a => a.user_id === user?.id);
    return myAssignment?.role || 'helper';
  };

  if (selectedJob) {
    const myRole = getMyRole(selectedJob);
    const hasBeforePhotos = jobCrewPhotos.before.length > 0;
    const hasAfterPhotos = jobCrewPhotos.after.length > 0;
    const isOpenSession = !!timeEntry;
    const canComplete = hasBeforePhotos && hasAfterPhotos && !isOpenSession;

    return (
      <PortalLayout
        portalName="Crew Portal"
        sidebarSections={sidebarSections}
        activeItemId="my-jobs"
        breadcrumbs={[
          { label: 'Dashboard', onClick: onBack },
          { label: 'My Jobs', onClick: () => setSelectedJob(null) },
          { label: getServiceLabel(selectedJob.service_request?.service_type || selectedJob.service_type || '') }
        ]}
      >
        <div className="space-y-4 pb-6">
          {toast && (
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              <span className="text-sm font-medium">{toast.message}</span>
              <button onClick={() => setToast(null)} className="ml-auto text-current opacity-60 hover:opacity-100"><AlertCircle className="w-4 h-4" /></button>
            </div>
          )}
          <Button
            variant="ghost"
            onClick={() => setSelectedJob(null)}
            className="flex items-center gap-2 mb-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to My Jobs
          </Button>

          <Card className="p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="px-4 py-2 text-sm font-bold bg-orange-100 text-orange-700 rounded-full">
                  {getServiceLabel(selectedJob.service_request?.service_type || selectedJob.service_type || '')}
                </span>
                <span className={`px-4 py-2 text-sm font-bold rounded-full ${getStatusBadge(selectedJob.status)}`}>
                  {selectedJob.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className="px-4 py-2 text-sm font-bold bg-gray-100 text-gray-700 rounded-full capitalize">
                  {myRole}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Details</h2>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Location</h3>
                <div className="flex items-start gap-2 text-gray-900">
                  <MapPin className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <p className="text-lg">{selectedJob.service_request?.location_address || ''}</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    const address = encodeURIComponent(selectedJob.service_request?.location_address || '');
                    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
                  }}
                  className="mt-2 flex items-center gap-2 text-blue-600"
                >
                  <Navigation className="w-4 h-4" />
                  Open in Maps
                </Button>
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

              {selectedJob.service_request?.contact_phone && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">Contact</h3>
                  <p className="text-lg text-gray-900">{selectedJob.service_request.contact_phone}</p>
                </div>
              )}
            </div>

            {selectedJob.service_request?.description && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Description</h3>
                <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {selectedJob.service_request.description}
                </p>
              </div>
            )}

            <div className="border-t pt-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Time Tracking</h3>

              {timeEntry ? (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-green-700">Clocked In</span>
                      <span className="text-2xl font-bold text-green-700">
                        {formatTimestamp(timeEntry.clock_in)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={handleClockOut}
                    disabled={updating}
                    className="w-full text-lg py-4 flex items-center justify-center gap-2"
                  >
                    <Square className="w-6 h-6" />
                    {updating ? 'Clocking Out...' : 'Clock Out'}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleClockIn}
                  disabled={updating || selectedJob.status === 'completed'}
                  className="w-full text-lg py-4 flex items-center justify-center gap-2"
                >
                  <Play className="w-6 h-6" />
                  {updating ? 'Clocking In...' : 'Clock In'}
                </Button>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="text-xl font-bold text-gray-900 mb-1">Job Photos</h3>
              <p className="text-sm text-gray-500 mb-4">
                Before and after photos are required to complete the job.
              </p>

              {photoError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="text-red-800 text-sm">{photoError}</p>
                </div>
              )}

              {selectedJob.status !== 'completed' && (
                <>
                  <div className="flex gap-2 mb-4">
                    {(['before', 'after'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setSelectedPhotoTab(tab)}
                        className={`flex-1 py-3 rounded-lg text-sm font-semibold capitalize transition-colors ${
                          selectedPhotoTab === tab
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tab} Photos
                        {jobCrewPhotos[tab].length === 0 ? (
                          <span className={`ml-1 text-xs ${selectedPhotoTab === tab ? 'text-orange-200' : 'text-red-500'}`}>
                            (required)
                          </span>
                        ) : (
                          <span className={`ml-1 text-xs ${selectedPhotoTab === tab ? 'text-orange-200' : 'text-green-600'}`}>
                            ({jobCrewPhotos[tab].length})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    id="crew-photo-upload"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                  <label htmlFor="crew-photo-upload">
                    <div className={`w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mb-4 ${
                      uploadingPhoto
                        ? 'opacity-50 cursor-not-allowed border-gray-200'
                        : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50'
                    }`}>
                      {uploadingPhoto ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                          <p className="text-sm text-gray-600">Uploading...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Camera className="w-8 h-8 text-gray-400" />
                          <p className="text-sm font-medium text-gray-700">
                            Tap to take or choose a {selectedPhotoTab} photo
                          </p>
                          <p className="text-xs text-gray-400">Max 10 MB</p>
                        </div>
                      )}
                    </div>
                  </label>
                </>
              )}

              {(['before', 'after'] as const).map(tab => {
                const photos = jobCrewPhotos[tab];
                if (photos.length === 0) return null;
                return (
                  <div key={tab} className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 capitalize flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      {tab} Photos ({photos.length})
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {photos.map((p: any, i: number) => (
                        <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={typeof p === 'string' ? p : p.url}
                            alt={`${tab} ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedJob.status === 'in_progress' && (
              <div className="border-t pt-6">
                {completionError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-red-800 text-sm">{completionError}</p>
                  </div>
                )}

                {(!hasBeforePhotos || !hasAfterPhotos || isOpenSession) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2 mb-4">
                    <p className="text-sm font-semibold text-amber-800">Required before completing:</p>
                    <ul className="space-y-1">
                      {isOpenSession && (
                        <li className="flex items-center gap-2 text-sm text-amber-700">
                          <XCircle className="w-4 h-4 flex-shrink-0" />
                          Clock out first
                        </li>
                      )}
                      {!hasBeforePhotos && (
                        <li className="flex items-center gap-2 text-sm text-amber-700">
                          <XCircle className="w-4 h-4 flex-shrink-0" />
                          Upload at least one before photo
                        </li>
                      )}
                      {!hasAfterPhotos && (
                        <li className="flex items-center gap-2 text-sm text-amber-700">
                          <XCircle className="w-4 h-4 flex-shrink-0" />
                          Upload at least one after photo
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <Button
                  variant="primary"
                  onClick={handleCompleteJob}
                  disabled={completing || !canComplete}
                  className={`w-full text-lg py-4 flex items-center justify-center gap-2 ${
                    canComplete ? 'bg-green-600 hover:bg-green-700' : ''
                  }`}
                >
                  <CheckCircle className="w-6 h-6" />
                  {completing ? 'Completing...' : 'Mark Job Complete'}
                </Button>
              </div>
            )}

            {selectedJob.status === 'completed' && (
              <div className="border-t pt-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
                  <p className="font-semibold text-green-800">Job Completed</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      portalName="Crew Portal"
      sidebarSections={sidebarSections}
      activeItemId="my-jobs"
      breadcrumbs={onBack ? [
        { label: 'Dashboard', onClick: onBack },
        { label: 'My Jobs' }
      ] : undefined}
    >
      <div className="space-y-4 pb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">My Jobs</h2>
            <p className="text-gray-600">Jobs you're assigned to</p>
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
        ) : myJobs.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No assigned jobs</p>
            <p className="text-sm text-gray-400 mt-2">Claim jobs from "Available Jobs"</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {myJobs.map((job) => {
              const myRole = getMyRole(job);

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
                          {getServiceLabel(job.service_request?.service_type || job.service_type || '')}
                        </span>
                        <span className={`px-3 py-1.5 text-sm font-bold rounded-full ${getStatusBadge(job.status)}`}>
                          {job.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="px-3 py-1.5 text-sm font-bold bg-gray-100 text-gray-700 rounded-full capitalize">
                          {myRole}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-gray-700 mb-2">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="font-semibold text-base">{job.service_request?.location_address || ''}</span>
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
