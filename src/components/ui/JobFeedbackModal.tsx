import { useState } from 'react';
import { X, Star, Send } from 'lucide-react';
import { Button } from './Button';
import { supabase } from '../../lib/supabase';

interface JobFeedbackModalProps {
  jobId: string;
  customerId: string;
  onClose: () => void;
  onSubmit: () => void;
  existingFeedback?: {
    rating: number;
    comment: string;
    service_quality: number;
    professionalism: number;
    timeliness: number;
    would_recommend: boolean;
  };
}

export function JobFeedbackModal({
  jobId,
  customerId,
  onClose,
  onSubmit,
  existingFeedback
}: JobFeedbackModalProps) {
  const [rating, setRating] = useState(existingFeedback?.rating || 0);
  const [_hoverRating, _setHoverRating] = useState(0);
  const [comment, setComment] = useState(existingFeedback?.comment || '');
  const [serviceQuality, setServiceQuality] = useState(existingFeedback?.service_quality || 0);
  const [professionalism, setProfessionalism] = useState(existingFeedback?.professionalism || 0);
  const [timeliness, setTimeliness] = useState(existingFeedback?.timeliness || 0);
  const [wouldRecommend, setWouldRecommend] = useState(existingFeedback?.would_recommend ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async () => {
    if (rating === 0) {
      setFormError('Please provide an overall rating');
      return;
    }
    setFormError('');

    setSubmitting(true);
    try {
      const feedbackData = {
        job_id: jobId,
        customer_id: customerId,
        rating,
        comment,
        service_quality: serviceQuality || null,
        professionalism: professionalism || null,
        timeliness: timeliness || null,
        would_recommend: wouldRecommend,
        updated_at: new Date().toISOString()
      };

      if (existingFeedback) {
        const { error } = await supabase
          .from('job_feedback')
          .update(feedbackData)
          .eq('job_id', jobId)
          .eq('customer_id', customerId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('job_feedback')
          .insert([feedbackData]);

        if (error) throw error;
      }

      onSubmit();
      onClose();
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      setFormError('Failed to submit feedback: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({
    value,
    onChange,
    label
  }: {
    value: number;
    onChange: (val: number) => void;
    label: string;
  }) => {
    const [hover, setHover] = useState(0);

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hover || value)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-xl font-semibold text-gray-900">
            {existingFeedback ? 'Update' : 'Submit'} Job Feedback
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <StarRating
            value={rating}
            onChange={setRating}
            label="Overall Rating *"
          />

          <div className="grid md:grid-cols-3 gap-4">
            <StarRating
              value={serviceQuality}
              onChange={setServiceQuality}
              label="Service Quality"
            />
            <StarRating
              value={professionalism}
              onChange={setProfessionalism}
              label="Professionalism"
            />
            <StarRating
              value={timeliness}
              onChange={setTimeliness}
              label="Timeliness"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Comments
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Share your experience with this service..."
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="recommend"
              checked={wouldRecommend}
              onChange={(e) => setWouldRecommend(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="recommend" className="text-sm font-medium text-gray-700">
              I would recommend this service to others
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white space-y-3">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}
          <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
          >
            <Send className="w-4 h-4 mr-2" />
            {submitting ? 'Submitting...' : existingFeedback ? 'Update Feedback' : 'Submit Feedback'}
          </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
