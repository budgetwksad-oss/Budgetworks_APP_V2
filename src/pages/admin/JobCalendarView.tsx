import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { JobCalendar } from '../../components/ui/JobCalendar';
import { Calendar, X, MapPin, Clock, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface JobWithDetails {
  id: string;
  scheduled_date: string;
  scheduled_time?: string;
  service_type: string;
  status: string;
  customer_name: string;
  location: string;
  crew_names?: string[];
}

interface JobCalendarViewProps {
  onBack: () => void;
}

export function JobCalendarView({ onBack }: JobCalendarViewProps) {
  const [jobs, setJobs] = useState<JobWithDetails[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          service_type,
          status,
          crew_assigned,
          service_requests!inner (
            location_address
          ),
          profiles!customer_id (
            full_name
          )
        `)
        .not('scheduled_date', 'is', null)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      const formattedJobs: JobWithDetails[] = [];

      for (const job of data || []) {
        const crewNames: string[] = [];
        if (job.crew_assigned && job.crew_assigned.length > 0) {
          const { data: crewData } = await supabase
            .from('profiles')
            .select('full_name')
            .in('id', job.crew_assigned);

          if (crewData) {
            crewNames.push(...crewData.map(c => c.full_name));
          }
        }

        formattedJobs.push({
          id: job.id,
          scheduled_date: job.scheduled_date,
          scheduled_time: job.scheduled_time || undefined,
          service_type: job.service_type,
          status: job.status,
          customer_name: (job.profiles as any)?.full_name || 'Unknown Customer',
          location: (job.service_requests as any)?.location_address || 'No address',
          crew_names: crewNames
        });
      }

      setJobs(formattedJobs);
    } catch (err: any) {
      console.error('Error loading jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJobClick = (job: any) => {
    const fullJob = jobs.find(j => j.id === job.id);
    if (fullJob) {
      setSelectedJob(fullJob);
    }
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
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

  if (loading) {
    return (
      <PortalLayout portalName="Admin Portal">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading calendar...</p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      portalName="Admin Portal"
      breadcrumbs={[
        { label: 'Dashboard', onClick: onBack },
        { label: 'Job Calendar' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-8 h-8 text-blue-600" />
              Job Calendar
            </h2>
            <p className="text-gray-600 mt-1">View all scheduled jobs in calendar format</p>
          </div>
          <Button variant="secondary" onClick={onBack}>
            Back to Dashboard
          </Button>
        </div>

        <JobCalendar jobs={jobs} onJobClick={handleJobClick} />

        {selectedJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 capitalize mb-1">
                    {selectedJob.service_type.replace(/_/g, ' ')}
                  </h3>
                  <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadge(selectedJob.status)}`}>
                    {selectedJob.status}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Customer</label>
                  <p className="text-gray-900 font-medium">{selectedJob.customer_name}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Location
                  </label>
                  <p className="text-gray-900">{selectedJob.location}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Date
                    </label>
                    <p className="text-gray-900">
                      {new Date(selectedJob.scheduled_date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>

                  {selectedJob.scheduled_time && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Time
                      </label>
                      <p className="text-gray-900">{formatTime(selectedJob.scheduled_time)}</p>
                    </div>
                  )}
                </div>

                {selectedJob.crew_names && selectedJob.crew_names.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1 mb-2">
                      <Users className="w-4 h-4" />
                      Assigned Crew
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.crew_names.map((name, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <Button variant="secondary" onClick={() => setSelectedJob(null)}>
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
