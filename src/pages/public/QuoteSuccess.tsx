import { PublicLayout } from '../../components/layout/PublicLayout';
import { CheckCircle, Mail, Phone, Home, ArrowRight } from 'lucide-react';

import { PublicPage } from '../../types/public';

interface QuoteSuccessProps {
  onNavigate: (page: PublicPage) => void;
  onLogin: () => void;
}

export function QuoteSuccess({ onNavigate, onLogin }: QuoteSuccessProps) {
  return (
    <PublicLayout currentPage="quote" onNavigate={onNavigate} onLogin={onLogin}>
      <section className="py-16 md:py-24 bg-gradient-to-br from-white to-gray-50 min-h-[70vh] flex items-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-6 shadow-2xl shadow-green-500/30 animate-bounce">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-4">
              Request Received!
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
              Thank you for choosing BudgetWorks. We'll review your request and send you a detailed quote within 24 hours.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 mb-8">
            <h2 className="text-2xl font-bold text-black mb-6">What Happens Next?</h2>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-orange-500 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold shadow-lg shadow-orange-500/30">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-black mb-1">
                    We'll Review Your Request
                  </h3>
                  <p className="text-gray-600">
                    Our team will carefully review your project details and prepare a customized quote.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-orange-500 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold shadow-lg shadow-orange-500/30">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-black mb-1">
                    Receive Your Quote
                  </h3>
                  <p className="text-gray-600">
                    You'll receive a detailed quote via email within 24 hours with transparent pricing.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-orange-500 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold shadow-lg shadow-orange-500/30">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-black mb-1">
                    Schedule Your Service
                  </h3>
                  <p className="text-gray-600">
                    Accept the quote and choose a convenient date and time for your service.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-200">
              <h3 className="font-bold text-black mb-3 flex items-center">
                <Mail className="w-5 h-5 text-orange-500 mr-2" />
                Check Your Email
              </h3>
              <p className="text-gray-700 text-sm">
                We've sent a confirmation to your email address. Keep an eye out for your quote!
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200">
              <h3 className="font-bold text-black mb-3 flex items-center">
                <Phone className="w-5 h-5 text-orange-500 mr-2" />
                Need Immediate Help?
              </h3>
              <a
                href="tel:+19025551234"
                className="text-orange-500 hover:text-orange-600 font-semibold text-sm"
              >
                Call us at (902) 555-1234
              </a>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 md:p-12 text-white text-center shadow-2xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Create an Account for Easy Tracking
            </h2>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Sign up to track your quotes, schedule services, and manage your jobs all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onLogin}
                className="group bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all inline-flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/30"
              >
                <span>Sign Up / Login</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => onNavigate('home')}
                className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all inline-flex items-center justify-center space-x-2"
              >
                <Home className="w-5 h-5" />
                <span>Back to Home</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
