import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  MapPin,
  Calendar,
  Users,
  Camera,
  CheckCircle,
  AlertCircle,
  FileText,
  Clock,
  Upload
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { FileAttachments } from '../../components/ui/FileAttachments';

interface JobDetail {
  id: string;
  service_type: string;
  address: string;
  scheduled_date: string;
  status: string;
  notes: string | null;
  crew_assignments: string[];
  before_photos: string[];
  during_photos: string[];
  after_photos: string[];
}

export function JobDetail({ jobId, onBack }: { jobId: string; onBack: () => void }) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPhotoType, setSelectedPhotoType] = useState<'before' | 'during' | 'after'>('before');
  const [confirmingComplete, setConfirmingComplete] = useState(false);

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setJob(data);
    } catch (err: any) {
      console.error('Error loading job:', err);
      setError('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${jobId}/${selectedPhotoType}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('job-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('job-photos')
        .getPublicUrl(fileName);

      const fieldName = `${selectedPhotoType}_photos`;
      const currentPhotos = job?.[fieldName as keyof JobDetail] || [];
      const updatedPhotos = [...(currentPhotos as string[]), publicUrl];

      const { error: updateError } = await supabase
        .from('jobs')
        .update({ [fieldName]: updatedPhotos })
        .eq('id', jobId);

      if (updateError) throw updateError;

      setSuccess('Photo uploaded successfully!');
      loadJob();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', jobId);

      if (error) throw error;

      setSuccess(`Job status updated to ${newStatus}!`);
      loadJob();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteJob = () => {
    if (!job) return;

    if ((job.before_photos || []).length === 0 || (job.after_photos || []).length === 0) {
      setError('Please upload before and after photos before completing the job');
      return;
    }

    setConfirmingComplete(true);
  };

  const confirmCompleteJob = async () => {
    setConfirmingComplete(false);
    await handleUpdateStatus('completed');
  };

  if (loading) {
    return (
      <PortalLayout portalName="Crew Portal">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading job details...</p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  if (!job) {
    return (
      <PortalLayout portalName="Crew Portal">
        <Card className="p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Job Not Found</h3>
          <p className="text-gray-600 mb-6">The job you're looking for doesn't exist.</p>
          <Button variant="primary" onClick={onBack}>
            Back to Jobs
          </Button>
        </Card>
      </PortalLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: any }> = {
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Calendar },
      in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      completed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle }
    };
    const { bg, text, icon: Icon } = config[status] || config.scheduled;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full ${bg} ${text}`}>
        <Icon className="w-4 h-4" />
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    );
  };

  return (
    <PortalLayout
      portalName="Crew Portal"
      breadcrumbs={[
        { label: 'Dashboard', onClick: onBack },
        { label: 'My Jobs', onClick: onBack },
        { label: 'Job Details' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 capitalize">
              {job.service_type.replace('_', ' ')}
            </h2>
            {getStatusBadge(job.status)}
          </div>
          <Button variant="secondary" onClick={onBack}>
            Back to Jobs
          </Button>
        </div>

        {error && (
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </Card>
        )}

        {success && (
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <p>{success}</p>
            </div>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Job Details
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Service Type</p>
                <p className="font-medium text-gray-900 capitalize">
                  {job.service_type.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Location
                </p>
                <p className="font-medium text-gray-900">{job.address}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Scheduled Date
                </p>
                <p className="font-medium text-gray-900">
                  {job.scheduled_date
                    ? new Date(job.scheduled_date).toLocaleDateString()
                    : 'Not scheduled'}
                </p>
              </div>
              {job.notes && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Notes</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{job.notes}</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Actions
            </h3>
            <div className="space-y-3">
              {job.status === 'scheduled' && (
                <Button
                  variant="primary"
                  onClick={() => handleUpdateStatus('in_progress')}
                  className="w-full"
                  disabled={loading}
                >
                  Start Job
                </Button>
              )}
              {job.status === 'in_progress' && (
                confirmingComplete ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-800 mb-3">Mark this job as completed?</p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmingComplete(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                      <button onClick={confirmCompleteJob} disabled={loading} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">Confirm Complete</button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handleCompleteJob}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={loading}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Job
                  </Button>
                )
              )}
              {job.status === 'completed' && (
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium text-green-700">Job Completed</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Job Photos
          </h3>

          {job.status !== 'completed' && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex gap-2 mb-3">
                {(['before', 'during', 'after'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedPhotoType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      selectedPhotoType === type
                        ? 'bg-orange-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                  className="hidden"
                  id="photo-upload"
                />
                <label htmlFor="photo-upload">
                  <Button
                    as="span"
                    variant="primary"
                    size="sm"
                    disabled={uploading}
                    className="cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : `Upload ${selectedPhotoType} Photo`}
                  </Button>
                </label>
                <p className="text-sm text-gray-600">Max 5MB, images only</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {(['before', 'during', 'after'] as const).map(type => {
              const photos = job[`${type}_photos`] || [];
              return (
                <div key={type}>
                  <h4 className="font-medium text-gray-900 mb-3 capitalize flex items-center gap-2">
                    {type} Photos
                    {type === 'before' && job.status !== 'completed' && photos.length === 0 && (
                      <span className="text-xs text-red-600 font-normal">(Required)</span>
                    )}
                    {type === 'after' && job.status === 'in_progress' && photos.length === 0 && (
                      <span className="text-xs text-red-600 font-normal">(Required to complete)</span>
                    )}
                  </h4>
                  {photos.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No {type} photos uploaded</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {photos.map((url, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={url}
                            alt={`${type} photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <FileAttachments
          entityType="job"
          entityId={jobId}
          allowUpload={true}
          title="Job Documents & Files"
        />
      </div>
    </PortalLayout>
  );
}
