import { PublicLayout } from '../../components/layout/PublicLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CheckCircle, Clock, Mail, Phone } from 'lucide-react';

export function QuoteRequestConfirmation() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Card className="p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Request Received!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Thank you for choosing BudgetWorks Moving. We've received your service request
            and our team is reviewing it now.
          </p>

          {/* What Happens Next */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              What happens next?
            </h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-orange-600 font-semibold">1</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Review (within 2 hours)</p>
                  <p className="text-gray-600 text-sm">
                    Our team will review your request and any photos you've provided.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-orange-600 font-semibold">2</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Quote Preparation (within 24 hours)</p>
                  <p className="text-gray-600 text-sm">
                    We'll create a detailed, itemized quote tailored to your specific needs.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-orange-600 font-semibold">3</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Notification</p>
                  <p className="text-gray-600 text-sm">
                    You'll receive an email when your quote is ready. If you have an account,
                    you can also view it in your customer portal.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex items-center justify-center gap-4 p-4 bg-orange-50 rounded-lg mb-8">
            <Clock className="w-5 h-5 text-orange-600" />
            <p className="text-gray-700">
              <span className="font-semibold">Typical response time:</span> Most quotes are sent within
              24 hours during business hours.
            </p>
          </div>

          {/* Create Account CTA */}
          <div className="border-t border-gray-200 pt-8 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Track Your Quote Online
            </h2>
            <p className="text-gray-600 mb-6">
              Create a free account to track your quote, view service history, and manage your bookings.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="primary"
                onClick={() => window.location.href = '/register'}
              >
                Create Account
              </Button>
              <Button
                variant="ghost"
                onClick={() => window.location.href = '/login'}
              >
                I Already Have an Account
              </Button>
            </div>
          </div>

          {/* Contact Info */}
          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Need to talk to someone?
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="tel:1-800-BUDGET-MOVE"
                className="flex items-center justify-center gap-2 text-gray-700 hover:text-orange-600 transition-colors"
              >
                <Phone className="w-5 h-5" />
                <span>1-800-BUDGET-MOVE</span>
              </a>
              <a
                href="mailto:quotes@budgetworks.ca"
                className="flex items-center justify-center gap-2 text-gray-700 hover:text-orange-600 transition-colors"
              >
                <Mail className="w-5 h-5" />
                <span>quotes@budgetworks.ca</span>
              </a>
            </div>
          </div>

          {/* Return Home */}
          <div className="mt-8">
            <Button
              variant="ghost"
              onClick={() => window.location.href = '/'}
            >
              Return to Home
            </Button>
          </div>
        </Card>
      </div>
    </PublicLayout>
  );
}
