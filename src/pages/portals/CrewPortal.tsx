import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  LayoutDashboard,
  Calendar,
  MapPin,
  CheckCircle,
  Clock,
  Package,
  User,
  ArrowRight
} from 'lucide-react';
import { MenuSection } from '../../components/layout/Sidebar';
import { CrewJobs } from '../crew/CrewJobs';
import { AvailableJobs } from '../crew/AvailableJobs';
import { JobDetail } from '../crew/JobDetail';
import { Profile } from '../customer/Profile';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type Page = 'dashboard' | 'my-jobs' | 'available-jobs' | 'profile' | 'job-detail';

interface Metrics {
  todayJobs: number;
  upcomingJobs: number;
  completedJobs: number;
  hoursThisWeek: number;
  isCurrentlyClockedIn: boolean;
}

export function CrewPortal() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [metrics, setMetrics] = useState<Metrics>({
    todayJobs: 0,
    upcomingJobs: 0,
    completedJobs: 0,
    hoursThisWeek: 0,
    isCurrentlyClockedIn: false
  });
  const [todayJobs, setTodayJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    loadTodayJobs();
  }, [user]);

  const loadMetrics = async () => {
    if (!user) return;

    try {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, status, scheduled_date, crew_assignments')
        .contains('crew_assignments', [user.id]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayJobs = (jobs || []).filter(j => {
        if (!j.scheduled_date) return false;
        const jobDate = new Date(j.scheduled_date);
        return jobDate >= today && jobDate < tomorrow;
      }).length;

      const upcomingJobs = (jobs || []).filter(j => {
        if (!j.scheduled_date) return false;
        const jobDate = new Date(j.scheduled_date);
        return jobDate >= tomorrow;
      }).length;

      const completedJobs = (jobs || []).filter(j => j.status === 'completed').length;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: timeLogs } = await supabase
        .from('time_entries')
        .select('clock_in, clock_out')
        .eq('crew_member_id', user.id)
        .gte('clock_in', weekAgo.toISOString());

      const hoursThisWeek = (timeLogs || [])
        .filter(log => log.clock_out)
        .reduce((sum, log) => {
          const start = new Date(log.clock_in);
          const end = new Date(log.clock_out!);
          return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }, 0);

      const { data: activeLog } = await supabase
        .from('time_entries')
        .select('id')
        .eq('crew_member_id', user.id)
        .is('clock_out', null)
        .maybeSingle();

      setMetrics({
        todayJobs,
        upcomingJobs,
        completedJobs,
        hoursThisWeek,
        isCurrentlyClockedIn: !!activeLog
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayJobs = async () => {
    if (!user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data } = await supabase
        .from('jobs')
        .select('id, service_type, address, scheduled_date, status')
        .contains('crew_assignments', [user.id])
        .gte('scheduled_date', today.toISOString())
        .lt('scheduled_date', tomorrow.toISOString())
        .order('scheduled_date', { ascending: true });

      setTodayJobs(data || []);
    } catch (error) {
      console.error('Error loading today jobs:', error);
    }
  };

  const sidebarSections: MenuSection[] = [
    {
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          onClick: () => setCurrentPage('dashboard')
        },
        {
          id: 'available-jobs',
          label: 'Available Jobs',
          icon: Package,
          onClick: () => setCurrentPage('available-jobs')
        },
        {
          id: 'my-jobs',
          label: 'My Jobs',
          icon: Calendar,
          onClick: () => setCurrentPage('my-jobs'),
          badge: metrics.todayJobs
        },
        {
          id: 'profile',
          label: 'Profile',
          icon: User,
          onClick: () => setCurrentPage('profile')
        }
      ]
    }
  ];

  if (currentPage === 'my-jobs') {
    return (
      <CrewJobs
        sidebarSections={sidebarSections}
        onBack={() => setCurrentPage('dashboard')}
        onViewJob={(jobId) => {
          setSelectedJobId(jobId);
          setCurrentPage('job-detail');
        }}
      />
    );
  }

  if (currentPage === 'available-jobs') {
    return (
      <AvailableJobs
        sidebarSections={sidebarSections}
        onBack={() => setCurrentPage('dashboard')}
      />
    );
  }

  if (currentPage === 'profile') {
    return <Profile onBack={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'job-detail' && selectedJobId) {
    return (
      <JobDetail
        jobId={selectedJobId}
        onBack={() => setCurrentPage('my-jobs')}
      />
    );
  }

  return (
    <PortalLayout
      portalName="Crew Portal"
      sidebarSections={sidebarSections}
      activeItemId={currentPage}
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Today's Schedule</h2>
          <p className="text-gray-600">Your assigned jobs and tasks</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            className="p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setCurrentPage('my-jobs')}
          >
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.todayJobs}</p>
                <p className="text-sm text-gray-600">Today's Jobs</p>
              </div>
            </div>
          </Card>

          <Card
            className="p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setCurrentPage('my-jobs')}
          >
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.upcomingJobs}</p>
                <p className="text-sm text-gray-600">Upcoming Jobs</p>
              </div>
            </div>
          </Card>

          <Card
            className="p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setCurrentPage('my-jobs')}
          >
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.completedJobs}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </Card>
        </div>

        {todayJobs.length > 0 ? (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Today's Jobs</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage('my-jobs')}
              >
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {todayJobs.map(job => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedJobId(job.id);
                    setCurrentPage('job-detail');
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {job.service_type.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {job.address}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="bg-gray-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Calendar className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Jobs Scheduled Today</h3>
              <p className="text-gray-600 mb-6">
                You don't have any jobs assigned for today. Check available jobs or contact your admin.
              </p>
              <Button
                variant="primary"
                onClick={() => setCurrentPage('available-jobs')}
              >
                Browse Available Jobs
              </Button>
            </div>
          </Card>
        )}
      </div>
    </PortalLayout>
  );
}
