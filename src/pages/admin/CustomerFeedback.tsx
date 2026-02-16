import { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Star, MessageSquare, User, Briefcase, Calendar, ThumbsUp, ThumbsDown, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FeedbackWithDetails {
  id: string;
  job_id: string;
  rating: number;
  comment: string;
  service_quality: number | null;
  professionalism: number | null;
  timeliness: number | null;
  would_recommend: boolean;
  created_at: string;
  customer_name: string;
  customer_email: string;
  service_type: string;
  job_completed_at: string;
}

interface CustomerFeedbackProps {
  onBack: () => void;
}

export function CustomerFeedback({ onBack }: CustomerFeedbackProps) {
  const [feedback, setFeedback] = useState<FeedbackWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [stats, setStats] = useState({
    totalFeedback: 0,
    averageRating: 0,
    recommendationRate: 0,
    avgServiceQuality: 0,
    avgProfessionalism: 0,
    avgTimeliness: 0
  });

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('job_feedback')
        .select(`
          id,
          job_id,
          rating,
          comment,
          service_quality,
          professionalism,
          timeliness,
          would_recommend,
          created_at,
          profiles!customer_id (
            full_name,
            email
          ),
          jobs!job_id (
            service_type,
            completed_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedFeedback: FeedbackWithDetails[] = (data || []).map(item => ({
        id: item.id,
        job_id: item.job_id,
        rating: item.rating,
        comment: item.comment || '',
        service_quality: item.service_quality,
        professionalism: item.professionalism,
        timeliness: item.timeliness,
        would_recommend: item.would_recommend,
        created_at: item.created_at,
        customer_name: (item.profiles as any)?.full_name || 'Unknown',
        customer_email: (item.profiles as any)?.email || 'N/A',
        service_type: (item.jobs as any)?.service_type || 'N/A',
        job_completed_at: (item.jobs as any)?.completed_at || ''
      }));

      setFeedback(formattedFeedback);
      calculateStats(formattedFeedback);
    } catch (err: any) {
      console.error('Error loading feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (feedbackList: FeedbackWithDetails[]) => {
    if (feedbackList.length === 0) {
      setStats({
        totalFeedback: 0,
        averageRating: 0,
        recommendationRate: 0,
        avgServiceQuality: 0,
        avgProfessionalism: 0,
        avgTimeliness: 0
      });
      return;
    }

    const totalRating = feedbackList.reduce((sum, f) => sum + f.rating, 0);
    const recommendCount = feedbackList.filter(f => f.would_recommend).length;

    const qualityRatings = feedbackList.filter(f => f.service_quality !== null);
    const professionalismRatings = feedbackList.filter(f => f.professionalism !== null);
    const timelinessRatings = feedbackList.filter(f => f.timeliness !== null);

    setStats({
      totalFeedback: feedbackList.length,
      averageRating: totalRating / feedbackList.length,
      recommendationRate: (recommendCount / feedbackList.length) * 100,
      avgServiceQuality: qualityRatings.length > 0
        ? qualityRatings.reduce((sum, f) => sum + (f.service_quality || 0), 0) / qualityRatings.length
        : 0,
      avgProfessionalism: professionalismRatings.length > 0
        ? professionalismRatings.reduce((sum, f) => sum + (f.professionalism || 0), 0) / professionalismRatings.length
        : 0,
      avgTimeliness: timelinessRatings.length > 0
        ? timelinessRatings.reduce((sum, f) => sum + (f.timeliness || 0), 0) / timelinessRatings.length
        : 0
    });
  };

  const filteredFeedback = filter === 'all'
    ? feedback
    : feedback.filter(f => f.rating === parseInt(filter));

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getServiceLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <PortalLayout portalName="Admin Portal">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading feedback...</p>
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
        { label: 'Customer Feedback' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-8 h-8 text-blue-600" />
              Customer Feedback
            </h2>
            <p className="text-gray-600 mt-1">Reviews and ratings from completed jobs</p>
          </div>
          <Button variant="secondary" onClick={onBack}>
            Back to Dashboard
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium mb-1">Total Feedback</p>
                <p className="text-3xl font-bold text-blue-900">{stats.totalFeedback}</p>
              </div>
              <MessageSquare className="w-12 h-12 text-blue-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700 font-medium mb-1">Avg Rating</p>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold text-yellow-900">{stats.averageRating.toFixed(1)}</p>
                  <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                </div>
              </div>
              <TrendingUp className="w-12 h-12 text-yellow-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium mb-1">Would Recommend</p>
                <p className="text-3xl font-bold text-green-900">{stats.recommendationRate.toFixed(0)}%</p>
              </div>
              <ThumbsUp className="w-12 h-12 text-green-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium mb-1">Service Quality</p>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold text-purple-900">{stats.avgServiceQuality.toFixed(1)}</p>
                  <span className="text-sm text-purple-700">/5</span>
                </div>
              </div>
              <Star className="w-12 h-12 text-purple-500 opacity-50" />
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filter by rating:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({feedback.length})
              </button>
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = feedback.filter(f => f.rating === rating).length;
                return (
                  <button
                    key={rating}
                    onClick={() => setFilter(rating.toString() as any)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors flex items-center gap-1 ${
                      filter === rating.toString()
                        ? 'bg-yellow-400 text-gray-900'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {rating} <Star className="w-3 h-3 fill-current" /> ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {filteredFeedback.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No feedback available</p>
            <p className="text-sm text-gray-400 mt-1">Customer feedback will appear here once jobs are completed</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredFeedback.map((item) => (
              <Card key={item.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-gray-900">{item.customer_name}</span>
                      </div>
                      <span className="text-gray-400">•</span>
                      <div className="flex items-center gap-1">
                        {renderStars(item.rating)}
                        <span className="text-sm font-semibold text-gray-700 ml-1">
                          {item.rating}.0
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        <span>{getServiceLabel(item.service_type)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                      {item.would_recommend ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <ThumbsUp className="w-4 h-4" />
                          <span>Would recommend</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600">
                          <ThumbsDown className="w-4 h-4" />
                          <span>Would not recommend</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {item.comment && (
                  <div className="mb-4">
                    <p className="text-gray-700 italic bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                      "{item.comment}"
                    </p>
                  </div>
                )}

                {(item.service_quality || item.professionalism || item.timeliness) && (
                  <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                    {item.service_quality && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Service Quality</p>
                        <div className="flex items-center gap-1">
                          {renderStars(item.service_quality)}
                        </div>
                      </div>
                    )}
                    {item.professionalism && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Professionalism</p>
                        <div className="flex items-center gap-1">
                          {renderStars(item.professionalism)}
                        </div>
                      </div>
                    )}
                    {item.timeliness && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Timeliness</p>
                        <div className="flex items-center gap-1">
                          {renderStars(item.timeliness)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
