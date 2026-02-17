import { useEffect, useState } from 'react';
import { getResourceActivity, ResourceType } from '../../lib/activityLogger';
import {
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Clock,
  User
} from 'lucide-react';
import { Card } from './Card';

interface ActivityTimelineProps {
  resourceType: ResourceType;
  resourceId: string;
  title?: string;
}

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

export function ActivityTimeline({ resourceType, resourceId, title = 'Activity History' }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [resourceType, resourceId]);

  const loadActivities = async () => {
    setLoading(true);
    const logs = await getResourceActivity(resourceType, resourceId);
    setActivities(logs as ActivityLog[]);
    setLoading(false);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'sent':
        return <Send className="w-4 h-4 text-green-600" />;
      case 'approved':
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
      case 'cancelled':
      case 'deleted':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'viewed':
        return <Eye className="w-4 h-4 text-gray-600" />;
      case 'updated':
        return <Edit className="w-4 h-4 text-orange-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No activity yet</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        <div className="space-y-6">
          {activities.map((activity, index) => (
            <div key={activity.id} className="relative flex gap-4">
              <div className="relative z-10 flex-shrink-0 w-8 h-8 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center">
                {getActionIcon(activity.action)}
              </div>

              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.description}
                  </p>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(activity.created_at)}
                  </span>
                </div>

                {activity.profiles && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
                    <User className="w-3 h-3" />
                    <span>{activity.profiles.full_name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
