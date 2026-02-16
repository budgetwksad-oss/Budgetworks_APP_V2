import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from './Button';

interface Job {
  id: string;
  scheduled_date: string;
  scheduled_time?: string;
  service_type: string;
  status: string;
  customer_name?: string;
}

interface JobCalendarProps {
  jobs: Job[];
  onJobClick?: (job: Job) => void;
}

export function JobCalendar({ jobs, onJobClick }: JobCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getJobsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return jobs.filter(job => job.scheduled_date && job.scheduled_date.startsWith(dateStr));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500';
      case 'in_progress':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="min-h-24 bg-gray-50"></div>);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayJobs = getJobsForDate(day);
    const isTodayDate = isToday(day);

    days.push(
      <div
        key={day}
        className={`min-h-24 p-2 border border-gray-200 ${
          isTodayDate ? 'bg-blue-50 border-blue-500' : 'bg-white'
        }`}
      >
        <div className={`text-sm font-semibold mb-1 ${
          isTodayDate ? 'text-blue-600' : 'text-gray-700'
        }`}>
          {day}
          {isTodayDate && (
            <span className="ml-1 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">Today</span>
          )}
        </div>
        <div className="space-y-1">
          {dayJobs.slice(0, 3).map(job => (
            <button
              key={job.id}
              onClick={() => onJobClick?.(job)}
              className={`w-full text-left text-xs px-2 py-1 rounded ${getStatusColor(job.status)} text-white hover:opacity-80 transition-opacity`}
              title={`${job.service_type.replace('_', ' ')} - ${job.customer_name || ''}`}
            >
              <div className="truncate font-medium">
                {job.scheduled_time || 'TBD'}
              </div>
              <div className="truncate opacity-90">
                {job.service_type.replace('_', ' ')}
              </div>
            </button>
          ))}
          {dayJobs.length > 3 && (
            <div className="text-xs text-gray-600 text-center">
              +{dayJobs.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-blue-600" />
          {monthName}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={previousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={today}>
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center font-semibold text-sm text-gray-700 bg-gray-100 border-b border-gray-200">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days}
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500"></div>
          <span className="text-xs text-gray-700">Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500"></div>
          <span className="text-xs text-gray-700">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span className="text-xs text-gray-700">Completed</span>
        </div>
      </div>
    </div>
  );
}
