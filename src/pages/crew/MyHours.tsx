import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Clock, Calendar, MapPin, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface TimeLog {
  id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  job_id: string;
  jobs: {
    service_type: string;
    address: string;
  };
}

export function MyHours({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    loadTimeLogs();
  }, [user, filter]);

  const loadTimeLogs = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('time_entries')
        .select(`
          id,
          clock_in_time,
          clock_out_time,
          job_id,
          jobs!inner(
            service_type,
            address
          )
        `)
        .eq('crew_member_id', user.id)
        .order('clock_in_time', { ascending: false });

      if (filter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('clock_in_time', weekAgo.toISOString());
      } else if (filter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('clock_in_time', monthAgo.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setTimeLogs(data || []);
    } catch (err: any) {
      console.error('Error loading time logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateHours = (clockIn: string, clockOut: string | null) => {
    if (!clockOut) return 0;
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const totalHours = timeLogs
    .filter(log => log.clock_out_time)
    .reduce((sum, log) => sum + calculateHours(log.clock_in_time, log.clock_out_time), 0);

  const groupedByWeek = timeLogs.reduce((acc, log) => {
    const date = new Date(log.clock_in_time);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = weekStart.toISOString().split('T')[0];

    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(log);
    return acc;
  }, {} as Record<string, TimeLog[]>);

  if (loading) {
    return (
      <PortalLayout portalName="Crew Portal">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading hours...</p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      portalName="Crew Portal"
      breadcrumbs={[
        { label: 'Dashboard', onClick: onBack },
        { label: 'My Hours' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Hours</h2>
            <p className="text-gray-600 mt-1">View your time logs and hours worked</p>
          </div>
          <Button variant="secondary" onClick={onBack}>
            Back to Dashboard
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(totalHours)}</p>
                <p className="text-sm text-gray-600">
                  Total {filter === 'week' ? 'This Week' : filter === 'month' ? 'This Month' : 'All Time'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{timeLogs.length}</p>
                <p className="text-sm text-gray-600">Total Shifts</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {timeLogs.length > 0 ? formatDuration(totalHours / timeLogs.length) : '0h 0m'}
                </p>
                <p className="text-sm text-gray-600">Avg Per Shift</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['week', 'month', 'all'] as const).map(period => (
            <button
              key={period}
              onClick={() => setFilter(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === period
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>

        {timeLogs.length === 0 ? (
          <Card className="p-12 text-center">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Hours Logged</h3>
            <p className="text-gray-600">
              {filter === 'week'
                ? 'You have no logged hours this week'
                : filter === 'month'
                ? 'You have no logged hours this month'
                : 'You have no logged hours yet'}
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByWeek).map(([weekStart, logs]) => {
              const weekHours = logs
                .filter(log => log.clock_out_time)
                .reduce((sum, log) => sum + calculateHours(log.clock_in_time, log.clock_out_time), 0);

              return (
                <Card key={weekStart} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">
                      Week of {new Date(weekStart).toLocaleDateString()}
                    </h3>
                    <span className="text-sm font-medium text-gray-600">
                      {formatDuration(weekHours)} total
                    </span>
                  </div>

                  <div className="space-y-3">
                    {logs.map(log => {
                      const hours = log.clock_out_time
                        ? calculateHours(log.clock_in_time, log.clock_out_time)
                        : 0;
                      const isActive = !log.clock_out_time;

                      return (
                        <div
                          key={log.id}
                          className={`p-4 rounded-lg border ${
                            isActive
                              ? 'border-green-200 bg-green-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 capitalize mb-1">
                                {log.jobs.service_type.replace('_', ' ')}
                              </p>
                              <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                                <MapPin className="w-3 h-3" />
                                {log.jobs.address}
                              </p>
                              <div className="flex flex-wrap gap-3 text-sm">
                                <span className="text-gray-600">
                                  <span className="font-medium">In:</span>{' '}
                                  {new Date(log.clock_in_time).toLocaleString()}
                                </span>
                                {log.clock_out_time ? (
                                  <span className="text-gray-600">
                                    <span className="font-medium">Out:</span>{' '}
                                    {new Date(log.clock_out_time).toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-green-600 font-medium flex items-center gap-1">
                                    <Clock className="w-4 h-4 animate-pulse" />
                                    Currently Active
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {isActive ? (
                                <span className="text-sm text-green-600 font-medium">In Progress</span>
                              ) : (
                                <span className="text-lg font-bold text-gray-900">
                                  {formatDuration(hours)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
