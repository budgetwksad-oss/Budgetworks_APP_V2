import { PublicLayout } from '../../components/layout/PublicLayout';
import { Truck, Trash2, Hammer, CheckCircle, ArrowRight } from 'lucide-react';

type PublicPage = 'home' | 'services' | 'about' | 'contact' | 'quote';

interface ServicesProps {
  onNavigate: (page: PublicPage) => void;
  onLogin: () => void;
}

export function Services({ onNavigate, onLogin }: ServicesProps) {
  const services = [
    {
      icon: Truck,
      title: 'Moving Services',
      description:
        'Professional moving services for homes and businesses across Halifax and Nova Scotia. Whether you\'re moving across town or across the province, our experienced team ensures your belongings are handled with care.',
      features: [
        'Residential moving',
        'Commercial moving',
        'Packing services',
        'Furniture assembly/disassembly',
        'Loading and unloading',
        'Same-day service available',
        'Short and long distance',
        'Storage solutions',
      ],
      color: 'orange',
    },
    {
      icon: Trash2,
      title: 'Junk Removal',
      description:
        'Fast and efficient junk removal services for any situation. From single items to full estate cleanouts, we handle it all. We dispose of everything responsibly and recycle when possible.',
      features: [
        'Estate cleanouts',
        'Renovation debris removal',
        'Furniture removal',
        'Appliance disposal',
        'Yard waste removal',
        'Construction cleanup',
        'Office cleanouts',
        'Garage and basement clearing',
      ],
      color: 'orange',
    },
    {
      icon: Hammer,
      title: 'Light Demolition',
      description:
        'Safe and professional light demolition services for renovation projects. Our crew has the experience and equipment to handle interior demolition and debris removal efficiently.',
      features: [
        'Interior wall removal',
        'Deck demolition',
        'Fixture removal',
        'Flooring removal',
        'Cabinet removal',
        'Shed demolition',
        'Fence removal',
        'Debris hauling',
      ],
      color: 'orange',
    },
  ];

  return (
    <PublicLayout currentPage="services" onNavigate={onNavigate} onLogin={onLogin}>
      <section className="relative bg-gradient-to-br from-gray-900 to-black text-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Our Services
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 leading-relaxed">
              Professional moving, hauling, and demolition services tailored to your needs in Halifax and Nova Scotia
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-20">
            {services.map((service, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                } gap-12 items-center`}
              >
                <div className="flex-1">
                  <div className="bg-orange-500 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30">
                    <service.icon className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
                    {service.title}
                  </h2>
                  <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                    {service.description}
                  </p>
                  <button
                    onClick={() => onNavigate('quote')}
                    className="group bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-all inline-flex items-center space-x-2 shadow-lg shadow-orange-500/30"
                  >
                    <span>Request Quote</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                <div className="flex-1">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 shadow-xl">
                    <h3 className="text-xl font-bold text-black mb-6">What's Included:</h3>
                    <ul className="grid sm:grid-cols-2 gap-4">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <CheckCircle className="w-5 h-5 text-orange-500 mr-3 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-6 text-center">
              Our Service Commitment
            </h2>
            <div className="space-y-6 text-gray-700 leading-relaxed">
              <p className="text-lg">
                At BudgetWorks, we believe in providing honest, transparent service at fair prices. No hidden fees, no surprises – just quality work you can count on.
              </p>
              <div className="grid md:grid-cols-3 gap-6 my-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-orange-500 mb-2">24hr</div>
                  <div className="text-sm font-semibold text-gray-600">Quote Response</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-orange-500 mb-2">100%</div>
                  <div className="text-sm font-semibold text-gray-600">Satisfaction</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-orange-500 mb-2">Local</div>
                  <div className="text-sm font-semibold text-gray-600">Halifax Team</div>
                </div>
              </div>
              <p className="text-lg">
                We serve Halifax and Nova Scotia with reliable moving, junk, and light demolition services. Our professional crew is licensed, insured, and committed to making your project as smooth as possible.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Ready for a Quote?
          </h2>
          <p className="text-xl md:text-2xl mb-8 text-orange-50">
            Get your free, no-obligation quote today. Quick response guaranteed!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => onNavigate('quote')}
              className="group bg-white text-orange-500 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-2xl flex items-center space-x-2"
            >
              <span>Get Free Quote</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="tel:+19025551234"
              className="bg-black text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-900 transition-all shadow-xl"
            >
              Call (902) 555-1234
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
