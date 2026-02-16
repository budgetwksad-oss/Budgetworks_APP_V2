import { useEffect, useState } from 'react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Star, Loader2, ThumbsUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Testimonial {
  id: string;
  rating: number;
  comment: string;
  would_recommend: boolean;
  service_quality?: number;
  professionalism?: number;
  timeliness?: number;
  customer_name: string;
  service_type: string;
  created_at: string;
}

export function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    recommendationRate: 0
  });

  useEffect(() => {
    loadTestimonials();
  }, []);

  const loadTestimonials = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('job_feedback')
        .select(`
          id,
          rating,
          comment,
          would_recommend,
          service_quality,
          professionalism,
          timeliness,
          created_at,
          profiles!customer_id (
            full_name
          ),
          jobs!job_id (
            service_type
          )
        `)
        .gte('rating', 4)
        .not('comment', 'is', null)
        .neq('comment', '')
        .order('rating', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedTestimonials: Testimonial[] = (data || []).map(item => ({
        id: item.id,
        rating: item.rating,
        comment: item.comment || '',
        would_recommend: item.would_recommend,
        service_quality: item.service_quality || undefined,
        professionalism: item.professionalism || undefined,
        timeliness: item.timeliness || undefined,
        customer_name: (item.profiles as any)?.full_name || 'Anonymous Customer',
        service_type: (item.jobs as any)?.service_type || 'service',
        created_at: item.created_at
      }));

      setTestimonials(formattedTestimonials);

      if (formattedTestimonials.length > 0) {
        const avgRating = formattedTestimonials.reduce((sum, t) => sum + t.rating, 0) / formattedTestimonials.length;
        const recommendCount = formattedTestimonials.filter(t => t.would_recommend).length;

        setStats({
          averageRating: avgRating,
          totalReviews: formattedTestimonials.length,
          recommendationRate: (recommendCount / formattedTestimonials.length) * 100
        });
      }
    } catch (err) {
      console.error('Error loading testimonials:', err);
      setError('Failed to load testimonials');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating
                ? 'fill-orange-500 text-orange-500'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            What Our Customers Say
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Don't just take our word for it. Here's what our satisfied customers
            have to say about their experience with our services.
          </p>
        </div>

        {/* Stats Banner */}
        {!loading && testimonials.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="p-6 text-center bg-gradient-to-br from-orange-50 to-orange-100">
              <div className="flex items-center justify-center mb-2">
                <Star className="w-8 h-8 text-orange-500 fill-orange-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {stats.averageRating.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Average Rating</div>
            </Card>
            <Card className="p-6 text-center bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {stats.totalReviews}
              </div>
              <div className="text-sm text-gray-600">Customer Reviews</div>
            </Card>
            <Card className="p-6 text-center bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex items-center justify-center mb-2">
                <ThumbsUp className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {stats.recommendationRate.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Would Recommend</div>
            </Card>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadTestimonials}>Try Again</Button>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && testimonials.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-gray-600 text-lg">
              No testimonials available yet. Be the first to share your experience!
            </p>
          </Card>
        )}

        {/* Testimonials Grid */}
        {!loading && !error && testimonials.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <Card
                key={testimonial.id}
                className="p-6 hover:shadow-lg transition-shadow"
              >
                <div className="mb-4">{renderStars(testimonial.rating)}</div>

                <p className="text-gray-700 mb-4 leading-relaxed italic">
                  "{testimonial.comment}"
                </p>

                {(testimonial.service_quality || testimonial.professionalism || testimonial.timeliness) && (
                  <div className="grid grid-cols-3 gap-2 mb-4 text-xs text-center">
                    {testimonial.service_quality && (
                      <div>
                        <div className="text-gray-600 mb-1">Quality</div>
                        <div className="font-semibold text-gray-900">{testimonial.service_quality}/5</div>
                      </div>
                    )}
                    {testimonial.professionalism && (
                      <div>
                        <div className="text-gray-600 mb-1">Professional</div>
                        <div className="font-semibold text-gray-900">{testimonial.professionalism}/5</div>
                      </div>
                    )}
                    {testimonial.timeliness && (
                      <div>
                        <div className="text-gray-600 mb-1">Timely</div>
                        <div className="font-semibold text-gray-900">{testimonial.timeliness}/5</div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {testimonial.customer_name}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">
                      {testimonial.service_type.replace('_', ' ')}
                    </p>
                  </div>
                  {testimonial.would_recommend && (
                    <div className="flex items-center gap-1 text-green-600">
                      <ThumbsUp className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Card className="p-8 bg-gradient-to-br from-gray-50 to-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Experience Premium Service?
            </h2>
            <p className="text-gray-600 mb-6">
              Join hundreds of satisfied customers and get your free quote today.
            </p>
            <Button variant="primary" onClick={() => window.location.href = '/get-quote'}>
              Get Your Free Quote
            </Button>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
