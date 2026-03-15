import { PublicLayout } from '../../components/layout/PublicLayout';
import { Target, Heart, Shield, Users, Award, Clock, ThumbsUp, ArrowRight } from 'lucide-react';

import { PublicPage } from '../../types/public';

interface AboutProps {
  onNavigate: (page: PublicPage) => void;
  onLogin: () => void;
}

export function About({ onNavigate, onLogin }: AboutProps) {
  const values = [
    {
      icon: Heart,
      title: 'Customer First',
      description: 'Your satisfaction is our top priority. We go above and beyond to meet your needs.',
    },
    {
      icon: Shield,
      title: 'Reliability',
      description: 'On-time service and dependable results. We show up when we say we will.',
    },
    {
      icon: ThumbsUp,
      title: 'Quality Work',
      description: 'Professional service and attention to detail in everything we do.',
    },
    {
      icon: Target,
      title: 'Transparency',
      description: 'Honest pricing with no hidden fees. You know exactly what you\'re paying for.',
    },
  ];

  const features = [
    {
      icon: Users,
      title: 'Professional Team',
      description: 'Our experienced crew is trained, licensed, and insured for your peace of mind.',
    },
    {
      icon: Clock,
      title: 'Fast Response',
      description: 'Quick quotes within 24 hours and flexible scheduling to fit your timeline.',
    },
    {
      icon: Award,
      title: 'Quality Guaranteed',
      description: 'We stand behind our work with a commitment to excellence and customer satisfaction.',
    },
  ];

  return (
    <PublicLayout currentPage="about" onNavigate={onNavigate} onLogin={onLogin}>
      <section className="relative bg-gradient-to-br from-gray-900 to-black text-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              About BudgetWorks
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 leading-relaxed">
              Your trusted partner for moving, hauling, and demolition services in Halifax and Nova Scotia
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">Our Story</h2>
          </div>
          <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6">
            <p className="text-lg">
              BudgetWorks was founded with a simple mission: to provide Halifax and Nova Scotia with reliable, affordable, and professional moving and hauling services. We understand that moving can be stressful, junk can pile up, and renovation projects need expert help.
            </p>
            <p className="text-lg">
              That's why we've built our business on three core principles: <span className="font-semibold text-black">quick quotes</span>, <span className="font-semibold text-black">honest rates</span>, and <span className="font-semibold text-black">dependable service</span>. No surprises, no hidden fees – just straightforward, quality work.
            </p>
            <p className="text-lg">
              Our team consists of experienced professionals who take pride in their work. We're not just moving your belongings or hauling your junk – we're helping you transition to your next chapter, reclaim your space, or complete your renovation project. That's a responsibility we take seriously.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">Our Values</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all"
              >
                <div className="bg-orange-500 w-16 h-16 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30">
                  <value.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-black mb-3">{value.title}</h3>
                <p className="text-gray-600 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
              Why Choose BudgetWorks
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the difference with our professional service
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 shadow-lg"
              >
                <div className="bg-orange-500 w-14 h-14 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-black mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-6 text-center">
              Our Service Area
            </h2>
            <p className="text-lg text-gray-700 text-center mb-8 leading-relaxed">
              We proudly serve Halifax and communities throughout Nova Scotia. Whether you're in the city or surrounding areas, BudgetWorks is here to help with your moving, hauling, and demolition needs.
            </p>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-8 text-center border-2 border-orange-200">
              <div className="text-2xl font-bold text-black mb-2">Serving</div>
              <div className="text-4xl font-bold text-orange-500">Halifax & Nova Scotia</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Work With BudgetWorks
          </h2>
          <p className="text-xl md:text-2xl mb-8 text-orange-50">
            Experience reliable service with transparent pricing. Get your free quote today!
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
