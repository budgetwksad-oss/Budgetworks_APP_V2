import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Clock, Play, Square, Calendar, MapPin, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Job {
  id: string;
  service_type: string;
  address: string;
  scheduled_date: string;
}

interface ActiveTimeLog {
  id: string;
  clock_in_time: string;
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

  useEffect(() => {
    if (!user) return;
    loadAssignedJobs();
    checkActiveLog();
    // loadAssignedJobs and checkActiveLog are stable for the lifetime of this component
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (activeLog) {
      const interval = setInterval(() => {
        const start = new Date(activeLog.clock_in_time);
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
        .select('id, service_type, address, scheduled_date, crew_assignments')
        .contains('crew_assignments', [user.id])
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setJobs(data || []);
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
          clock_in_time,
          job_id,
          jobs!inner(
            service_type,
            address
          )
        `)
        .eq('crew_member_id', user.id)
        .is('clock_out_time', null)
        .maybeSingle();

      if (error) throw error;
      setActiveLog(data as unknown as ActiveTimeLog | null);
    } catch (err) {
      console.error('Error checking active log:', err);
    }
  };

  const handleClockIn = async () => {
    if (!selectedJobId) {
      setError('Please select a job');
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
          clock_in_time: new Date().toISOString()
        })
        .select(`
          id,
          clock_in_time,
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
      const { error } = await supabase
        .from('time_entries')
        .update({
          clock_out_time: new Date().toISOString()
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
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
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
                          onClick={() => setSelectedJobId(job.id)}
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

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleClockIn}
                  disabled={loading || !selectedJobId}
                  className="w-full"
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
