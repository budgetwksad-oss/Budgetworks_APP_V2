import { useState, useEffect } from 'react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { ArrowRight, CheckCircle, Star, ChevronDown, ChevronUp, MapPin, FileText, Calendar, Wrench } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { setSEO } from '../../lib/seo';

type PublicPage = 'home' | 'services' | 'about' | 'contact' | 'quote';

interface HomeProps {
  onNavigate: (page: PublicPage) => void;
  onLogin: () => void;
  onSignup?: () => void;
}

const SERVICE_LABEL: Record<string, string> = {
  moving: 'Moving',
  junk_removal: 'Junk Removal',
  demolition: 'Light Demo',
};

function ServiceImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className="w-full h-48 bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center">
        <span className="text-gray-500 text-sm tracking-wide uppercase font-medium">{alt}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className="w-full h-48 object-cover"
    />
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors pr-4">
          {question}
        </span>
        {open ? (
          <ChevronUp className="w-5 h-5 text-orange-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 group-hover:text-orange-500 transition-colors" />
        )}
      </button>
      {open && (
        <p className="pb-5 text-gray-600 leading-relaxed">{answer}</p>
      )}
    </div>
  );
}

export function Home({ onNavigate, onLogin, onSignup }: HomeProps) {
  const [testimonialSettings, setTestimonialSettings] = useState<any>(null);
  const [testimonials, setTestimonials] = useState<any[]>([]);

  useEffect(() => {
    setSEO({
      title: 'BudgetWorks | Moving, Junk Removal & Light Demo in Halifax',
      description: 'BudgetWorks offers affordable moving, junk removal, and light demolition services across Halifax and the HRM. Fast quotes, honest rates, dependable crews.',
      canonicalPath: '/',
    });

    const injectJsonLd = async () => {
      const existingScript = document.getElementById('json-ld-localbusiness');
      if (existingScript) existingScript.remove();

      let telephone: string | undefined;
      try {
        const { data } = await supabase
          .from('company_settings')
          .select('phone')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (data?.phone) telephone = data.phone;
      } catch {
      }

      const schema: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: 'BudgetWorks',
        url: 'https://budgetworks.ca',
        areaServed: {
          '@type': 'AdministrativeArea',
          name: 'Halifax Regional Municipality',
        },
      };
      if (telephone) schema.telephone = telephone;

      const script = document.createElement('script');
      script.id = 'json-ld-localbusiness';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    };

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
            .limit(6),
        ]);
        if (settingsRes.data) setTestimonialSettings(settingsRes.data);
        if (testimonialsRes.data) setTestimonials(testimonialsRes.data);
      } catch (error) {
        console.error('Error loading testimonials:', error);
      }
    };

    injectJsonLd();
    loadTestimonials();

    return () => {
      const script = document.getElementById('json-ld-localbusiness');
      if (script) script.remove();
    };
  }, []);

  const services = [
    {
      slug: 'moving',
      title: 'Moving',
      image: '/images/service-moving.jpg',
      description: 'Residential and commercial moves handled with care. Whether it\'s a one-bedroom apartment or a full office, we show up on time and get it done.',
      bullets: [
        'Apartments, houses, offices',
        'Furniture disassembly & reassembly',
        'Flexible same-day availability',
      ],
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
          <rect x="1" y="3" width="15" height="13" rx="1" />
          <path d="M16 8h4l3 3v5h-7V8z" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
    },
    {
      slug: 'junk-removal',
      title: 'Junk Removal',
      image: '/images/service-junk.jpg',
      description: 'Got stuff that needs to go? We haul it away — furniture, appliances, renovation debris, estate cleanouts. No load too big or too small.',
      bullets: [
        'Estate and garage cleanouts',
        'Renovation and construction debris',
        'Appliances and old furniture',
      ],
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      ),
    },
    {
      slug: 'light-demo',
      title: 'Light Demolition',
      image: '/images/service-demo.jpg',
      description: 'Clearing space for a renovation? We handle interior demo work cleanly and safely — walls, decks, fixtures, and more.',
      bullets: [
        'Interior wall removal',
        'Deck and shed takedown',
        'Fixture and cabinet removal',
      ],
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      ),
    },
  ];

  const steps = [
    {
      icon: FileText,
      number: '01',
      title: 'Request a Quote',
      description: 'Fill out the quick form or call us. We reply fast with a clear price range — no runaround.',
    },
    {
      icon: Calendar,
      number: '02',
      title: 'Confirm Your Schedule',
      description: 'Pick a date that works. We work around you — including evenings and weekends.',
    },
    {
      icon: Wrench,
      number: '03',
      title: 'We Handle the Job',
      description: 'Our crew shows up on time, does the work, and leaves the space clean. That\'s it.',
    },
  ];

  const accountBenefits = [
    'Track your quotes and invoices in one place',
    'Faster repeat bookings — your info is already saved',
    'See job updates and crew arrival times',
    'Download invoices anytime',
  ];

  const faqs = [
    {
      question: 'How fast can you schedule?',
      answer: 'For most jobs we can get you in within a few days. If you need something sooner, call us directly and we will do our best to fit you in.',
    },
    {
      question: 'Do you provide a truck for moves?',
      answer: 'Yes. Our crew brings the truck. You just need to be ready to go. We handle loading, transport, and unloading.',
    },
    {
      question: 'What happens after I accept the quote?',
      answer: 'We confirm your date, send a job summary, and you are all set. On the day of the job, you will get a heads-up when the crew is on the way.',
    },
  ];

  const neighborhoods = [
    'Halifax', 'Dartmouth', 'Bedford', 'Sackville', 'Clayton Park',
    'Spryfield', 'Timberlea', 'Cole Harbour', 'Fall River', 'Lower Sackville',
  ];

  return (
    <PublicLayout currentPage="home" onNavigate={onNavigate} onLogin={onLogin}>

      {/* ── HERO ── */}
      <section className="relative bg-gray-950 text-white overflow-hidden min-h-[90vh] flex items-center">
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M0 0h4v4H0V0zm8 0h4v4H8V0zm8 0h4v4h-4V0zM0 8h4v4H0V8zm8 8h4v4H8v-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36 w-full">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-medium px-4 py-2 rounded-full mb-8 tracking-wide uppercase">
              <MapPin className="w-4 h-4" />
              Serving Halifax &amp; the HRM
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.05] mb-6 tracking-tight">
              Moving, Junk Removal
              <br />
              <span className="text-orange-500">&amp; Light Demo</span>
              <br />
              <span className="text-gray-300 text-4xl sm:text-5xl md:text-6xl font-semibold">done right in Halifax.</span>
            </h1>

            <p className="text-xl text-gray-400 mb-10 leading-relaxed max-w-xl">
              A local crew you can count on. We give you a real price up front, show up when we say we will, and get the job done without the headaches.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <button
                onClick={() => onNavigate('quote')}
                className="group bg-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-600 active:bg-orange-700 transition-all shadow-2xl shadow-orange-500/20 flex items-center justify-center gap-2"
              >
                Get a Quote
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="tel:+19025551234"
                className="bg-white/5 border border-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                Call Us
              </a>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-500">
              {['Fast scheduling', 'Clear pricing ranges', 'Reliable crew'].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── SERVICES ── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-14">
            <p className="text-orange-500 font-semibold uppercase tracking-widest text-sm mb-3">What we do</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">Three services.<br />One reliable crew.</h2>
            <p className="text-lg text-gray-500 max-w-xl">
              Whether you're relocating, clearing out, or tearing down, we handle the heavy work so you don't have to.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {services.map((service) => (
              <div
                key={service.slug}
                className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-orange-300 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <div className="overflow-hidden">
                  <ServiceImage src={service.image} alt={service.title} />
                </div>

                <div className="p-7 flex flex-col flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-orange-500 text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/25 flex-shrink-0 group-hover:scale-105 transition-transform">
                      {service.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{service.title}</h3>
                  </div>

                  <p className="text-gray-600 leading-relaxed mb-5 text-[15px]">{service.description}</p>

                  <ul className="space-y-2.5 mb-7 flex-1">
                    {service.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-gray-700 text-[14px]">
                        <CheckCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => onNavigate('quote')}
                    className="mt-auto inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 font-semibold text-sm group/btn"
                  >
                    Get a quote for {service.title.toLowerCase()}
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 md:py-28 bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-14">
            <p className="text-orange-500 font-semibold uppercase tracking-widest text-sm mb-3">Simple process</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">From quote to done<br />in three steps.</h2>
            <p className="text-gray-400 text-lg max-w-xl">Takes about two minutes to request a quote. We'll take it from there.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-14">
            {steps.map((step, i) => (
              <div key={i} className="relative bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-orange-500/40 transition-colors">
                <div className="flex items-start gap-4 mb-5">
                  <span className="text-orange-500 font-black text-4xl leading-none tracking-tighter">{step.number}</span>
                  <div className="bg-orange-500/10 text-orange-400 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <step.icon className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400 leading-relaxed text-[15px]">{step.description}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-orange-500/60" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => onNavigate('quote')}
              className="group bg-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-all shadow-2xl shadow-orange-500/20 inline-flex items-center gap-2 w-fit"
            >
              Request a Quote Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ── ACCOUNT BENEFITS ── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
            <div>
              <p className="text-orange-500 font-semibold uppercase tracking-widest text-sm mb-3">Optional — but handy</p>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">
                An account makes<br />repeat jobs easier.
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                You don't need an account to get a quote or book a job. But if you work with us more than once, having one saves time.
              </p>
              <ul className="space-y-4 mb-10">
                {accountBenefits.map((b) => (
                  <li key={b} className="flex items-center gap-3 text-gray-700">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-orange-500" />
                    </div>
                    {b}
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-3">
                {onSignup ? (
                  <button
                    onClick={onSignup}
                    className="bg-gray-900 text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors inline-flex items-center gap-2 w-fit"
                  >
                    Create a Free Account
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={onLogin}
                    className="bg-gray-900 text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors inline-flex items-center gap-2 w-fit"
                  >
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <p className="text-sm text-gray-400 self-center">No account needed to get a quote.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Track quotes', sub: 'See status in real time' },
                { label: 'Job summaries', sub: 'Details in one place' },
                { label: 'Invoice history', sub: 'Download anytime' },
                { label: 'Fast rebooking', sub: 'Your info is saved' },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 border border-gray-100 rounded-xl p-5 hover:border-orange-200 transition-colors">
                  <p className="font-bold text-gray-900 mb-1">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      {testimonialSettings?.is_enabled && testimonials.length > 0 && (
        <section className="py-20 md:py-28 bg-gray-50 border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
              <div>
                <p className="text-orange-500 font-semibold uppercase tracking-widest text-sm mb-3">Real customers</p>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900">What people say<br />about us.</h2>
              </div>
              {testimonialSettings.rating_value && testimonialSettings.review_count && (
                <div className="flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.floor(testimonialSettings.rating_value)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-200 fill-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-500">
                      <span className="font-bold text-gray-900 text-lg">{testimonialSettings.rating_value.toFixed(1)}</span>
                      {' '}out of 5 &mdash; {testimonialSettings.review_count} reviews
                    </p>
                    {testimonialSettings.source_label && (
                      <p className="text-xs text-gray-400 mt-0.5">{testimonialSettings.source_label}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all flex flex-col"
                >
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 leading-relaxed flex-1 text-[15px] mb-5">"{t.content}"</p>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <p className="font-semibold text-gray-900 text-sm">{t.customer_name}</p>
                    {t.service_type && (
                      <span className="text-xs px-2.5 py-1 bg-orange-50 text-orange-600 rounded-full font-medium border border-orange-100">
                        {SERVICE_LABEL[t.service_type] ?? t.service_type}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SERVICE AREAS ── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
            <div>
              <p className="text-orange-500 font-semibold uppercase tracking-widest text-sm mb-3">Coverage</p>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">
                Serving Halifax<br />and the HRM.
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                We work across the Halifax Regional Municipality — from the peninsula to the suburbs. If you're not sure whether we cover your area, just ask.
              </p>
              <button
                onClick={() => onNavigate('quote')}
                className="group bg-orange-500 text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors inline-flex items-center gap-2"
              >
                Check availability
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-5">
                <MapPin className="w-5 h-5 text-orange-500" />
                <span className="text-gray-900 font-semibold">Areas we serve</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {neighborhoods.map((n) => (
                  <span
                    key={n}
                    className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:border-orange-300 hover:text-orange-700 hover:bg-orange-50 transition-colors"
                  >
                    {n}
                  </span>
                ))}
                <span className="px-4 py-2 bg-orange-50 border border-orange-200 text-orange-600 rounded-lg text-sm font-medium">
                  + surrounding HRM
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 md:py-28 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-orange-500 font-semibold uppercase tracking-widest text-sm mb-3">Common questions</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">Quick answers.</h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 mb-10">
            {faqs.map((faq) => (
              <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => onNavigate('contact')}
              className="text-orange-500 hover:text-orange-600 font-semibold text-base inline-flex items-center gap-2 group"
            >
              Have another question? Contact us
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 md:py-28 bg-gray-950 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight">
            Ready when you are.
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
            Get a quote in minutes. No pressure, no commitment until you're ready.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('quote')}
              className="group bg-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-all shadow-2xl shadow-orange-500/20 flex items-center justify-center gap-2"
            >
              Get a Quote
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className="bg-white/5 border border-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              Contact Us
            </button>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
