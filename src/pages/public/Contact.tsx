import { useState } from 'react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { Mail, Phone, MapPin, Clock, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { PublicPage } from '../../types/public';

interface ContactProps {
  onNavigate: (page: PublicPage) => void;
  onLogin: () => void;
}

export function Contact({ onNavigate, onLogin }: ContactProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmed = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || null,
      message: formData.message.trim(),
    };

    if (!trimmed.name || !trimmed.email || !trimmed.message) {
      setError('Please fill in all required fields.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const { error: dbError } = await supabase
      .from('contact_submissions')
      .insert(trimmed);

    setIsSubmitting(false);

    if (dbError) {
      setError('Something went wrong. Please try again or call us directly.');
      return;
    }

    setIsSubmitted(true);
    setFormData({ name: '', email: '', phone: '', message: '' });
  };

  const contactInfo = [
    {
      icon: Phone,
      title: 'Phone',
      details: '(902) 555-1234',
      link: 'tel:+19025551234',
    },
    {
      icon: Mail,
      title: 'Email',
      details: 'info@budgetworks.ca',
      link: 'mailto:info@budgetworks.ca',
    },
    {
      icon: MapPin,
      title: 'Service Area',
      details: 'Halifax & Nova Scotia',
      link: null,
    },
    {
      icon: Clock,
      title: 'Hours',
      details: 'Mon-Sat: 8AM-6PM',
      link: null,
    },
  ];

  return (
    <PublicLayout currentPage="contact" onNavigate={onNavigate} onLogin={onLogin}>
      <section className="relative bg-gradient-to-br from-gray-900 to-black text-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">Get In Touch</h1>
            <p className="text-xl md:text-2xl text-gray-300 leading-relaxed">
              Have questions? Need a quote? We're here to help you with all your moving, hauling, and demolition needs.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">Contact Us</h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Fill out the form and we'll get back to you as soon as possible. For immediate assistance, give us a call!
              </p>

              <div className="space-y-6 mb-8">
                {contactInfo.map((info, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="bg-orange-500 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/30">
                      <info.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-black mb-1">{info.title}</h3>
                      {info.link ? (
                        <a
                          href={info.link}
                          className="text-gray-600 hover:text-orange-500 transition-colors"
                        >
                          {info.details}
                        </a>
                      ) : (
                        <p className="text-gray-600">{info.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-200">
                <h3 className="font-bold text-black mb-2">Need a quote?</h3>
                <p className="text-gray-700 mb-4">
                  For faster service, use our quote request form to get a detailed estimate.
                </p>
                <button
                  onClick={() => onNavigate('quote')}
                  className="group bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-all inline-flex items-center space-x-2 shadow-lg shadow-orange-500/30"
                >
                  <span>Request Quote</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 shadow-xl">
              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="bg-green-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <CheckCircle className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-black mb-3">Message Sent!</h3>
                  <p className="text-gray-600">
                    Thank you for contacting us. We'll get back to you shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <h3 className="text-2xl font-bold text-black mb-6">Send us a message</h3>

                  {error && (
                    <div className="flex items-start space-x-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Input
                    label="Full Name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="John Doe"
                  />

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
                    placeholder="(902) 555-0123"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      rows={5}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                      placeholder="How can we help you?"
                    />
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Request a free quote and experience the BudgetWorks difference
          </p>
          <button
            onClick={() => onNavigate('quote')}
            className="group bg-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-all transform hover:scale-105 shadow-2xl shadow-orange-500/30 inline-flex items-center space-x-2"
          >
            <span>Get Free Quote</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>
    </PublicLayout>
  );
}
