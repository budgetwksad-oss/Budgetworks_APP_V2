import { useState } from 'react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { Truck, Trash2, Hammer, CheckCircle } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';

type PublicPage = 'home' | 'services' | 'about' | 'contact' | 'quote' | 'quote-success';

interface PublicQuoteFormProps {
  onNavigate: (page: PublicPage) => void;
  onLogin: () => void;
  onSignup: () => void;
}

export function PublicQuoteForm({ onNavigate, onLogin }: PublicQuoteFormProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    serviceType: '',
    address: '',
    preferredDate: '',
    description: '',
    preferredContactMethod: 'email' as 'email' | 'sms' | 'call',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const serviceTypes = [
    { id: 'moving', label: 'Moving Services', icon: Truck },
    { id: 'junk_removal', label: 'Junk Removal', icon: Trash2 },
    { id: 'demolition', label: 'Light Demolition', icon: Hammer },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const { error: insertError } = await supabase.from('public_quote_requests').insert({
        contact_name: formData.fullName,
        contact_email: formData.email,
        contact_phone: formData.phone,
        service_type: formData.serviceType,
        location_address: formData.address,
        preferred_date: formData.preferredDate || null,
        description: formData.description,
        preferred_contact_method: formData.preferredContactMethod,
        status: 'new',
      });

      if (insertError) throw insertError;

      onNavigate('quote-success');
    } catch (err) {
      console.error('Error submitting quote request:', err);
      setError('Failed to submit request. Please try again or call us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicLayout currentPage="quote" onNavigate={onNavigate} onLogin={onLogin}>
      <section className="relative bg-gradient-to-br from-gray-900 to-black text-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Request a Free Quote
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 leading-relaxed">
              Get an honest estimate within 24 hours. No obligations, no hidden fees.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 md:p-12 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-black mb-2">Contact Information</h2>
                <p className="text-gray-600 mb-6">How can we reach you?</p>

                <div className="space-y-4">
                  <Input
                    label="Full Name"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    placeholder="John Doe"
                  />

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="Email Address"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      placeholder="john@example.com"
                    />

                    <Input
                      label="Phone Number"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      placeholder="(902) 555-0123"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-300 pt-6">
                <h2 className="text-2xl font-bold text-black mb-2">Service Details</h2>
                <p className="text-gray-600 mb-6">Tell us about your project</p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      What service do you need? *
                    </label>
                    <div className="grid md:grid-cols-3 gap-4">
                      {serviceTypes.map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, serviceType: service.id })}
                          className={`relative p-6 rounded-xl border-2 transition-all ${
                            formData.serviceType === service.id
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 bg-white hover:border-orange-300'
                          }`}
                        >
                          {formData.serviceType === service.id && (
                            <div className="absolute top-3 right-3">
                              <CheckCircle className="w-6 h-6 text-orange-500" />
                            </div>
                          )}
                          <service.icon
                            className={`w-10 h-10 mb-3 ${
                              formData.serviceType === service.id
                                ? 'text-orange-500'
                                : 'text-gray-400'
                            }`}
                          />
                          <div className="font-semibold text-black text-left">
                            {service.label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input
                    label="Service Location Address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                    placeholder="123 Main St, Halifax, NS"
                  />

                  <Input
                    label="Preferred Date (Optional)"
                    type="date"
                    value={formData.preferredDate}
                    onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                    placeholder="Select a date"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                      rows={5}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                      placeholder="Please describe your project, including any specific requirements or details that will help us provide an accurate quote..."
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <div className="border-t border-gray-300 pt-6">
                <Button type="submit" disabled={isSubmitting} className="w-full text-lg py-4">
                  {isSubmitting ? 'Submitting...' : 'Submit Quote Request'}
                </Button>
                <p className="text-center text-sm text-gray-600 mt-4">
                  We'll review your request and send you a detailed quote within 24 hours
                </p>
              </div>
            </form>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              Already have an account?{' '}
              <button onClick={onLogin} className="text-orange-500 hover:text-orange-600 font-semibold">
                Sign in
              </button>
            </p>
            <p className="text-sm text-gray-500">
              Create an account to track your quotes and jobs in real-time
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-4xl font-bold text-orange-500 mb-2">24hr</div>
              <div className="text-gray-700 font-semibold">Quote Response Time</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-500 mb-2">100%</div>
              <div className="text-gray-700 font-semibold">Free Quotes</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-500 mb-2">0</div>
              <div className="text-gray-700 font-semibold">Hidden Fees</div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
