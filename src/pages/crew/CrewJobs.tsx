import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Job, Quote, ServiceRequest, TimeEntry } from '../../lib/supabase';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { MenuSection } from '../../components/layout/Sidebar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, MapPin, Calendar, Clock, Camera, Play, Square, CheckCircle, Navigation } from 'lucide-react';

type JobWithDetails = Job & {
  quote: Quote;
  service_request: ServiceRequest;
};

interface CrewJobsProps {
  sidebarSections?: MenuSection[];
  onBack?: () => void;
  onViewJob?: (jobId: string) => void;
}

export function CrewJobs({ sidebarSections, onBack, onViewJob }: CrewJobsProps = {}) {
  const { user } = useAuth();
  const [myJobs, setMyJobs] = useState<JobWithDetails[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobWithDetails | null>(null);
  const [timeEntry, setTimeEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadMyJobs();
  }, [user]);

  useEffect(() => {
    if (selectedJob) {
      loadTimeEntry();
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

        if (quote && request) {
          jobsWithDetails.push({
            ...job,
            quote,
            service_request: request,
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
      alert('Failed to clock in');
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
          hours_worked: Math.round(hoursWorked * 100) / 100,
        })
        .eq('id', timeEntry.id);

      if (error) throw error;
      setTimeEntry(null);
    } catch (error) {
      console.error('Error clocking out:', error);
      alert('Failed to clock out');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'scheduled' | 'in_progress' | 'completed') => {
    if (!selectedJob) return;
    setUpdating(true);

    try {
      const updates: any = { status: newStatus };

      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();

        if (timeEntry && !timeEntry.clock_out) {
          await handleClockOut();
        }
      }

      const { error } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', selectedJob.id);

      if (error) throw error;

      await loadMyJobs();
      const updatedJob = myJobs.find(j => j.id === selectedJob.id);
      if (updatedJob) {
        const { data } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', selectedJob.id)
          .maybeSingle();

        if (data) {
          setSelectedJob({
            ...updatedJob,
            ...data,
          });
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handlePhotoUpload = async (type: 'before' | 'after', event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedJob || !user || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${selectedJob.id}/${type}/${Date.now()}.${fileExt}`;

    setUploadingPhoto(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from('job-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('job-photos')
        .getPublicUrl(fileName);

      const currentPhotos = selectedJob.crew_photos || { before: [], after: [] };
      const photoEntry = {
        url: publicUrl,
        uploaded_by: user.id,
        uploaded_at: new Date().toISOString(),
      };

      const updatedPhotos = {
        ...currentPhotos,
        [type]: [...(currentPhotos[type] || []), photoEntry],
      };

      const { error: updateError } = await supabase
        .from('jobs')
        .update({ crew_photos: updatedPhotos })
        .eq('id', selectedJob.id);

      if (updateError) throw updateError;

      const updatedJob = { ...selectedJob, crew_photos: updatedPhotos };
      setSelectedJob(updatedJob);

      await loadMyJobs();
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
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
      case 'scheduled':
        return 'bg-blue-100 text-blue-700';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
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
    const crewPhotos = selectedJob.crew_photos || { before: [], after: [] };

    return (
      <PortalLayout
        portalName="Crew Portal"
        sidebarSections={sidebarSections}
        activeItemId="my-jobs"
        breadcrumbs={[
          { label: 'Dashboard', onClick: onBack },
          { label: 'My Jobs', onClick: () => setSelectedJob(null) },
          { label: getServiceLabel(selectedJob.service_request.service_type) }
        ]}
      >
        <div className="space-y-4 pb-6">
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
                  {getServiceLabel(selectedJob.service_request.service_type)}
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
                  <p className="text-lg">{selectedJob.service_request.location_address}</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    const address = encodeURIComponent(selectedJob.service_request.location_address);
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
                    Clock Out
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
                  Clock In
                </Button>
              )}
            </div>

            <div className="border-t pt-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Job Status</h3>

              <div className="space-y-3">
                {selectedJob.status === 'scheduled' && (
                  <Button
                    variant="primary"
                    onClick={() => handleUpdateStatus('in_progress')}
                    disabled={updating}
                    className="w-full text-lg py-4"
                  >
                    Start Job
                  </Button>
                )}

                {selectedJob.status === 'in_progress' && (
                  <Button
                    variant="primary"
                    onClick={() => handleUpdateStatus('completed')}
                    disabled={updating}
                    className="w-full text-lg py-4 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-6 h-6" />
                    Complete Job
                  </Button>
                )}

                {selectedJob.status === 'completed' && (
                  <div className="p-6 bg-green-50 rounded-lg text-center border-2 border-green-200">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-3" />
                    <p className="text-green-700 font-bold text-lg">Job Completed!</p>
                    <p className="text-sm text-green-600 mt-1">
                      {selectedJob.completed_at && `Finished at ${formatTimestamp(selectedJob.completed_at)}`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Photos</h3>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-gray-700">Before Photos</h4>
                    <span className="text-xs text-gray-500">{crewPhotos.before?.length || 0} photos</span>
                  </div>

                  {crewPhotos.before && crewPhotos.before.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {crewPhotos.before.map((photo, index) => (
                        <img
                          key={index}
                          src={photo.url}
                          alt={`Before ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                        />
                      ))}
                    </div>
                  )}

                  {selectedJob.status !== 'completed' && (
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handlePhotoUpload('before', e)}
                        disabled={uploadingPhoto}
                        className="hidden"
                      />
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-colors">
                        <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-600">
                          {uploadingPhoto ? 'Uploading...' : 'Take Before Photo'}
                        </p>
                      </div>
                    </label>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-gray-700">After Photos</h4>
                    <span className="text-xs text-gray-500">{crewPhotos.after?.length || 0} photos</span>
                  </div>

                  {crewPhotos.after && crewPhotos.after.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {crewPhotos.after.map((photo, index) => (
                        <img
                          key={index}
                          src={photo.url}
                          alt={`After ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                        />
                      ))}
                    </div>
                  )}

                  {selectedJob.status !== 'completed' && (
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handlePhotoUpload('after', e)}
                        disabled={uploadingPhoto}
                        className="hidden"
                      />
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors">
                        <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-600">
                          {uploadingPhoto ? 'Uploading...' : 'Take After Photo'}
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              </div>
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
                          {getServiceLabel(job.service_request.service_type)}
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
