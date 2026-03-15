import { useState, useEffect, useRef } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Clock, Play, Square, Calendar, MapPin, AlertCircle, Camera, Upload, CheckCircle, Image } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Job {
  id: string;
  service_type: string;
  address: string;
  scheduled_date: string;
  before_photos: string[];
}

interface ActiveTimeLog {
  id: string;
  clock_in: string;
  job_id: string;
  jobs: {
    service_type: string;
    address: string;
  };
}

export function TimeClock({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [activeLog, setActiveLog] = useState<ActiveTimeLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    loadAssignedJobs();
    checkActiveLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (activeLog) {
      const interval = setInterval(() => {
        const start = new Date(activeLog.clock_in);
        const now = new Date();
        const diff = now.getTime() - start.getTime();

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setElapsedTime(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [activeLog]);

  const loadAssignedJobs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, service_type, address, scheduled_date, crew_assignments, before_photos')
        .contains('crew_assignments', [user.id])
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setJobs((data || []).map(j => ({ ...j, before_photos: j.before_photos || [] })));
    } catch (err) {
      console.error('Error loading jobs:', err);
    }
  };

  const checkActiveLog = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          id,
          clock_in,
          job_id,
          jobs!inner(
            service_type,
            address
          )
        `)
        .eq('crew_member_id', user.id)
        .is('clock_out', null)
        .maybeSingle();

      if (error) throw error;
      setActiveLog(data as unknown as ActiveTimeLog | null);
    } catch (err) {
      console.error('Error checking active log:', err);
    }
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId) ?? null;
  const beforePhotos = selectedJob?.before_photos ?? [];
  const hasBeforePhotos = beforePhotos.length > 0;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !selectedJobId) return;

    setError('');
    setUploadSuccess('');

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload image files only.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Each photo must be less than 5MB.');
        return;
      }
    }

    setUploading(true);
    try {
      const currentPhotos = [...beforePhotos];

      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `${selectedJobId}/before/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('job-photos')
          .upload(path, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('job-photos')
          .getPublicUrl(path);

        currentPhotos.push(publicUrl);
      }

      const { error: updateError } = await supabase
        .from('jobs')
        .update({ before_photos: currentPhotos })
        .eq('id', selectedJobId);

      if (updateError) throw updateError;

      setJobs(prev =>
        prev.map(j => j.id === selectedJobId ? { ...j, before_photos: currentPhotos } : j)
      );
      setUploadSuccess(`${files.length} photo${files.length > 1 ? 's' : ''} uploaded successfully.`);
      setTimeout(() => setUploadSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo(s). Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClockIn = async () => {
    if (!selectedJobId) {
      setError('Please select a job');
      return;
    }

    if (!hasBeforePhotos) {
      setError('Please upload before-job photos before starting the job.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          crew_member_id: user!.id,
          job_id: selectedJobId,
          clock_in: new Date().toISOString()
        })
        .select(`
          id,
          clock_in,
          job_id,
          jobs!inner(
            service_type,
            address
          )
        `)
        .single();

      if (error) throw error;

      setActiveLog(data as unknown as ActiveTimeLog);
      setSelectedJobId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clock in');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeLog) return;

    setLoading(true);
    setError('');

    try {
      const clockOutTime = new Date();
      const clockInTime = new Date(activeLog.clock_in);
      const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

      const { error } = await supabase
        .from('time_entries')
        .update({
          clock_out: clockOutTime.toISOString(),
          hours_worked: parseFloat(hoursWorked.toFixed(4)),
        })
        .eq('id', activeLog.id);

      if (error) throw error;

      setActiveLog(null);
      setElapsedTime('00:00:00');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clock out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalLayout
      portalName="Crew Portal"
      breadcrumbs={[
        { label: 'Dashboard', onClick: onBack },
        { label: 'Time Clock' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Time Clock</h2>
            <p className="text-gray-600 mt-1">Clock in and out of your assigned jobs</p>
          </div>
          <Button variant="secondary" onClick={onBack}>
            Back to Dashboard
          </Button>
        </div>

        {error && (
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </Card>
        )}

        {uploadSuccess && (
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p>{uploadSuccess}</p>
            </div>
          </Card>
        )}

        {activeLog ? (
          <Card className="p-8 bg-green-50 border-green-200">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                <Clock className="w-10 h-10 text-green-600 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Currently Clocked In</h3>
              <p className="text-gray-600 mb-1 capitalize">
                {activeLog.jobs.service_type.replace('_', ' ')}
              </p>
              <p className="text-sm text-gray-500 flex items-center justify-center gap-1 mb-6">
                <MapPin className="w-4 h-4" />
                {activeLog.jobs.address}
              </p>

              <div className="bg-white rounded-lg p-6 mb-6">
                <p className="text-sm text-gray-600 mb-2">Time Elapsed</p>
                <p className="text-4xl font-bold text-green-600 font-mono">{elapsedTime}</p>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleClockOut}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700"
              >
                <Square className="w-5 h-5 mr-2" />
                {loading ? 'Clocking Out...' : 'Clock Out'}
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-8">
            <div className="max-w-md mx-auto">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                  <Clock className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Start?</h3>
                <p className="text-gray-600">Select a job and clock in to begin tracking your time</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Job
                  </label>
                  {jobs.length === 0 ? (
                    <Card className="p-6 text-center bg-gray-50">
                      <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600 mb-2">No jobs assigned</p>
                      <p className="text-sm text-gray-500">
                        Contact your supervisor for job assignments
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {jobs.map((job) => (
                        <button
                          key={job.id}
                          onClick={() => { setSelectedJobId(job.id); setError(''); }}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                            selectedJobId === job.id
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <p className="font-semibold text-gray-900 capitalize mb-1">
                            {job.service_type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center gap-1 mb-1">
                            <MapPin className="w-3 h-3" />
                            {job.address}
                          </p>
                          <p className="text-xs text-gray-500">
                            {job.scheduled_date
                              ? new Date(job.scheduled_date).toLocaleDateString()
                              : 'Date TBD'}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedJobId && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className={`flex items-center justify-between px-4 py-3 ${hasBeforePhotos ? 'bg-green-50 border-b border-green-100' : 'bg-amber-50 border-b border-amber-100'}`}>
                      <div className="flex items-center gap-2">
                        <Camera className={`w-4 h-4 ${hasBeforePhotos ? 'text-green-600' : 'text-amber-600'}`} />
                        <span className={`text-sm font-medium ${hasBeforePhotos ? 'text-green-800' : 'text-amber-800'}`}>
                          Before Photos
                          {hasBeforePhotos
                            ? ` (${beforePhotos.length} uploaded)`
                            : ' — Required before clocking in'}
                        </span>
                      </div>
                      {hasBeforePhotos && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>

                    {!hasBeforePhotos && (
                      <div className="px-4 py-3 bg-amber-50">
                        <p className="text-sm text-amber-700 mb-3">
                          Please upload before-job photos before starting the job.
                        </p>
                      </div>
                    )}

                    <div className="p-4 bg-white space-y-3">
                      {beforePhotos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {beforePhotos.map((url, i) => (
                            <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                              <img src={url} alt={`Before photo ${i + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={uploading}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            {hasBeforePhotos ? 'Add More Photos' : 'Upload Before Photos'}
                          </>
                        )}
                      </button>
                      <p className="text-xs text-gray-500 text-center">Images only, max 5MB each. Multiple photos allowed.</p>
                    </div>
                  </div>
                )}

                {selectedJobId && !hasBeforePhotos && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <Image className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      Please upload before-job photos before starting the job.
                    </p>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleClockIn}
                  disabled={loading || !selectedJobId || !hasBeforePhotos}
                  className="w-full"
                  title={!hasBeforePhotos && selectedJobId ? 'Upload before photos to enable clock-in' : undefined}
                >
                  <Play className="w-5 h-5 mr-2" />
                  {loading ? 'Clocking In...' : 'Clock In'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Time Clock Tips</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Upload at least one before photo before clocking in</li>
                <li>Always clock in when you arrive at the job site</li>
                <li>Clock out when you leave or finish the job</li>
                <li>Make sure to select the correct job before clocking in</li>
                <li>Your time will be reviewed by your supervisor</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </PortalLayout>
  );
}
