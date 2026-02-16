import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Star, TrendingUp, Briefcase, Clock, Award, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CrewMember {
  id: string;
  full_name: string;
  email: string;
}

interface CrewStats {
  totalJobs: number;
  completedJobs: number;
  totalHours: number;
  averageRating: number;
  totalRatings: number;
  feedbackBreakdown: {
    service_quality: number;
    professionalism: number;
    timeliness: number;
  };
  recentJobs: Array<{
    id: string;
    service_type: string;
    scheduled_date: string;
    status: string;
    rating?: number;
  }>;
}

interface CrewPerformanceProps {
  onBack: () => void;
}

export function CrewPerformance({ onBack }: CrewPerformanceProps) {
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<string | null>(null);
  const [crewStats, setCrewStats] = useState<CrewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    loadCrewMembers();
  }, []);

  const loadCrewMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'crew')
        .order('full_name');

      if (error) throw error;
      setCrewMembers(data || []);
    } catch (err: any) {
      console.error('Error loading crew members:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCrewStats = async (crewId: string) => {
    setLoadingStats(true);
    try {
      const [jobsRes, timeRes, feedbackRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, service_type, scheduled_date, status, crew_assigned')
          .contains('crew_assigned', [crewId])
          .order('scheduled_date', { ascending: false })
          .limit(10),
        supabase
          .from('time_entries')
          .select('hours_worked')
          .eq('crew_member_id', crewId),
        supabase
          .from('job_feedback')
          .select(`
            rating,
            service_quality,
            professionalism,
            timeliness,
            job_id
          `)
      ]);

      const jobs = jobsRes.data || [];
      const timeEntries = timeRes.data || [];
      const allFeedback = feedbackRes.data || [];

      const jobIds = jobs.map(j => j.id);
      const relevantFeedback = allFeedback.filter(f => jobIds.includes(f.job_id));

      const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
      const completedJobs = jobs.filter(j => j.status === 'completed').length;

      let averageRating = 0;
      let avgServiceQuality = 0;
      let avgProfessionalism = 0;
      let avgTimeliness = 0;

      if (relevantFeedback.length > 0) {
        averageRating = relevantFeedback.reduce((sum, f) => sum + f.rating, 0) / relevantFeedback.length;
        avgServiceQuality = relevantFeedback
          .filter(f => f.service_quality)
          .reduce((sum, f) => sum + f.service_quality!, 0) / relevantFeedback.filter(f => f.service_quality).length || 0;
        avgProfessionalism = relevantFeedback
          .filter(f => f.professionalism)
          .reduce((sum, f) => sum + f.professionalism!, 0) / relevantFeedback.filter(f => f.professionalism).length || 0;
        avgTimeliness = relevantFeedback
          .filter(f => f.timeliness)
          .reduce((sum, f) => sum + f.timeliness!, 0) / relevantFeedback.filter(f => f.timeliness).length || 0;
      }

      const recentJobs = jobs.map(job => {
        const feedback = relevantFeedback.find(f => f.job_id === job.id);
        return {
          ...job,
          rating: feedback?.rating
        };
      });

      setCrewStats({
        totalJobs: jobs.length,
        completedJobs,
        totalHours,
        averageRating,
        totalRatings: relevantFeedback.length,
        feedbackBreakdown: {
          service_quality: avgServiceQuality,
          professionalism: avgProfessionalism,
          timeliness: avgTimeliness
        },
        recentJobs
      });
    } catch (err: any) {
      console.error('Error loading crew stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSelectCrew = (crewId: string) => {
    setSelectedCrew(crewId);
    loadCrewStats(crewId);
  };

  const selectedCrewMember = crewMembers.find(c => c.id === selectedCrew);

  if (loading) {
    return (
      <PortalLayout portalName="Admin Portal">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading crew members...</p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  if (selectedCrew && selectedCrewMember) {
    return (
      <PortalLayout
        portalName="Admin Portal"
        breadcrumbs={[
          { label: 'Dashboard', onClick: onBack },
          { label: 'Crew Performance', onClick: () => setSelectedCrew(null) },
          { label: selectedCrewMember.full_name }
        ]}
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedCrewMember.full_name}</h2>
              <p className="text-gray-600 mt-1">Performance metrics and feedback</p>
            </div>
            <Button variant="secondary" onClick={() => setSelectedCrew(null)}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>

          {loadingStats ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : crewStats ? (
            <>
              <div className="grid md:grid-cols-4 gap-4">
                <Card className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <Briefcase className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{crewStats.totalJobs}</p>
                      <p className="text-sm text-gray-600">Total Jobs</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-lg">
                      <Award className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{crewStats.completedJobs}</p>
                      <p className="text-sm text-gray-600">Completed</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-yellow-100 p-3 rounded-lg">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{crewStats.totalHours.toFixed(1)}</p>
                      <p className="text-sm text-gray-600">Hours Worked</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <Star className="w-6 h-6 text-orange-600 fill-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {crewStats.averageRating > 0 ? crewStats.averageRating.toFixed(1) : 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">Avg Rating</p>
                    </div>
                  </div>
                </Card>
              </div>

              {crewStats.totalRatings > 0 && (
                <Card className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Performance Breakdown
                  </h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Service Quality</span>
                        <span className="text-sm font-bold text-gray-900">
                          {crewStats.feedbackBreakdown.service_quality.toFixed(1)}/5.0
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(crewStats.feedbackBreakdown.service_quality / 5) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Professionalism</span>
                        <span className="text-sm font-bold text-gray-900">
                          {crewStats.feedbackBreakdown.professionalism.toFixed(1)}/5.0
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(crewStats.feedbackBreakdown.professionalism / 5) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Timeliness</span>
                        <span className="text-sm font-bold text-gray-900">
                          {crewStats.feedbackBreakdown.timeliness.toFixed(1)}/5.0
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full"
                          style={{ width: `${(crewStats.feedbackBreakdown.timeliness / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Based on {crewStats.totalRatings} customer rating{crewStats.totalRatings !== 1 ? 's' : ''}
                  </p>
                </Card>
              )}

              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Recent Jobs</h3>
                <div className="space-y-3">
                  {crewStats.recentJobs.length === 0 ? (
                    <p className="text-sm text-gray-500">No recent jobs</p>
                  ) : (
                    crewStats.recentJobs.map((job) => (
                      <div
                        key={job.id}
                        className="p-4 bg-gray-50 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-gray-900 capitalize">
                            {job.service_type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(job.scheduled_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            job.status === 'completed' ? 'bg-green-100 text-green-700' :
                            job.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {job.status}
                          </span>
                          {job.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold text-gray-900">{job.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </>
          ) : null}
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      portalName="Admin Portal"
      breadcrumbs={[
        { label: 'Dashboard', onClick: onBack },
        { label: 'Crew Performance' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-8 h-8 text-blue-600" />
              Crew Performance
            </h2>
            <p className="text-gray-600 mt-1">View performance metrics and customer ratings</p>
          </div>
          <Button variant="secondary" onClick={onBack}>
            Back to Dashboard
          </Button>
        </div>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Select Crew Member</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {crewMembers.length === 0 ? (
              <p className="text-gray-500">No crew members found</p>
            ) : (
              crewMembers.map((member) => (
                <Card
                  key={member.id}
                  className="p-4 hover:shadow-md transition-all cursor-pointer border-2 hover:border-blue-500"
                  onClick={() => handleSelectCrew(member.id)}
                >
                  <p className="font-semibold text-gray-900">{member.full_name}</p>
                  <p className="text-sm text-gray-600">{member.email}</p>
                </Card>
              ))
            )}
          </div>
        </Card>
      </div>
    </PortalLayout>
  );
}
