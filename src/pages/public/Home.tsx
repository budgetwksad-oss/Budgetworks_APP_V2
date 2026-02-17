import { useState, useEffect } from 'react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { Truck, Trash2, Hammer, ArrowRight, CheckCircle, Clock, DollarSign, Users, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type PublicPage = 'home' | 'services' | 'about' | 'contact' | 'quote';

interface HomeProps {
  onNavigate: (page: PublicPage) => void;
  onLogin: () => void;
}

export function Home({ onNavigate, onLogin }: HomeProps) {
  const [testimonialSettings, setTestimonialSettings] = useState<any>(null);
  const [testimonials, setTestimonials] = useState<any[]>([]);

  useEffect(() => {
    const loadTestimonials = async () => {
      try {
        const [settingsRes, testimonialsRes] = await Promise.all([
          supabase.from('testimonial_settings').select('*').maybeSingle(),
          supabase
            .from('testimonials')
            .select('*')
            .eq('published', true)
            .order('featured', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(6)
        ]);

        if (settingsRes.data) {
          setTestimonialSettings(settingsRes.data);
        }

        if (testimonialsRes.data) {
          setTestimonials(testimonialsRes.data);
        }
      } catch (error) {
        console.error('Error loading testimonials:', error);
      }
    };

    loadTestimonials();
  }, []);

  const services = [
    {
      icon: Truck,
      title: 'Moving Services',
      description: 'Professional residential and commercial moving services. We handle everything from small apartments to large offices.',
      features: ['Packing assistance', 'Furniture handling', 'Same-day service'],
    },
    {
      icon: Trash2,
      title: 'Junk Removal',
      description: 'Fast and efficient junk removal for homes and businesses. We haul away anything you need gone.',
      features: ['Estate cleanouts', 'Renovation debris', 'Furniture removal'],
    },
    {
      icon: Hammer,
      title: 'Light Demolition',
      description: 'Safe and professional light demolition services for renovation and cleanup projects.',
      features: ['Interior walls', 'Deck removal', 'Fixture demolition'],
    },
  ];

  const steps = [
    {
      number: '1',
      title: 'Request a Quote',
      description: 'Fill out our simple form or give us a call. We respond quickly with honest pricing.',
    },
    {
      number: '2',
      title: 'Receive Estimate',
      description: 'Get a detailed quote within 24 hours. No hidden fees, just transparent pricing.',
    },
    {
      number: '3',
      title: 'Schedule Service',
      description: 'Choose a date and time that works for you. We work around your schedule.',
    },
    {
      number: '4',
      title: 'Job Completed',
      description: 'Our professional crew gets the job done right. Track progress in real-time.',
    },
  ];

  const benefits = [
    {
      icon: Clock,
      title: 'Fast Response',
      description: 'Quick quotes and flexible scheduling',
    },
    {
      icon: DollarSign,
      title: 'Honest Rates',
      description: 'Transparent pricing with no surprises',
    },
    {
      icon: Users,
      title: 'Professional Crew',
      description: 'Experienced and reliable team members',
    },
    {
      icon: CheckCircle,
      title: 'Dependable Service',
      description: 'On-time arrivals and quality work',
    },
  ];

  return (
    <PublicLayout currentPage="home" onNavigate={onNavigate} onLogin={onLogin}>
      <section className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmOGQxMSIgc3Ryb2tlLW9wYWNpdHk9Ii4xIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-20"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Fast Moving, Hauling &
              <span className="text-orange-500"> Junk Removal</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
              Quick quotes, honest rates, and dependable service in Halifax and Nova Scotia
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => onNavigate('quote')}
                className="group bg-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-all transform hover:scale-105 shadow-2xl shadow-orange-500/30 flex items-center space-x-2"
              >
                <span>Get Free Quote</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="tel:+19025551234"
                className="bg-white text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-xl"
              >
                Call (902) 555-1234
              </a>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-4">
              Our Services
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Professional moving, hauling, and demolition services tailored to your needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-orange-500 transform hover:-translate-y-2"
              >
                <div className="bg-orange-500 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-orange-500/30">
                  <service.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-black mb-4">{service.title}</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">{service.description}</p>
                <ul className="space-y-3">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-gray-700">
                      <CheckCircle className="w-5 h-5 text-orange-500 mr-3 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => onNavigate('services')}
              className="text-orange-500 hover:text-orange-600 font-semibold text-lg inline-flex items-center group"
            >
              View All Services
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Getting started is simple and straightforward
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-white rounded-2xl p-8 shadow-lg h-full">
                  <div className="bg-orange-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-lg shadow-orange-500/30">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-bold text-black mb-3">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-orange-500" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-4">
              Why Choose BudgetWorks
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We're committed to providing the best service in Halifax
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="bg-orange-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
                  <benefit.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-black mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {testimonialSettings?.is_enabled && testimonials.length > 0 && (
        <section className="py-16 md:py-24 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-4">
                What Our Customers Say
              </h2>
              {testimonialSettings.rating_value && testimonialSettings.review_count && (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-6 h-6 ${
                          i < Math.floor(testimonialSettings.rating_value)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-2xl font-bold text-gray-900">
                    {testimonialSettings.rating_value.toFixed(1)}
                  </span>
                  <span className="text-gray-600">
                    ({testimonialSettings.review_count} reviews)
                  </span>
                </div>
              )}
              {testimonialSettings.source_label && (
                <p className="text-gray-600">{testimonialSettings.source_label}</p>
              )}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 leading-relaxed">{testimonial.content}</p>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{testimonial.customer_name}</p>
                    {testimonial.service_type && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {testimonial.service_type === 'moving'
                          ? 'Moving'
                          : testimonial.service_type === 'junk_removal'
                          ? 'Junk Removal'
                          : testimonial.service_type === 'demolition'
                          ? 'Light Demo'
                          : testimonial.service_type}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 md:py-24 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl md:text-2xl mb-8 text-orange-50">
            Request your free quote today and experience the BudgetWorks difference
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => onNavigate('quote')}
              className="group bg-white text-orange-500 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-2xl flex items-center space-x-2"
            >
              <span>Get Free Quote</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className="bg-black text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-900 transition-all shadow-xl"
            >
              Contact Us
            </button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
