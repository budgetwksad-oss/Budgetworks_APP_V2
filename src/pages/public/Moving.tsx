import { useEffect, useState } from 'react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { ArrowRight, CheckCircle, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { setSEO, setFAQSchema } from '../../lib/seo';

type PublicPage = 'home' | 'services' | 'about' | 'contact' | 'quote';

interface MovingProps {
  onNavigate: (page: PublicPage) => void;
  onLogin: () => void;
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
      {open && <p className="pb-5 text-gray-600 leading-relaxed">{answer}</p>}
    </div>
  );
}

const faqs = [
  {
    question: 'Do you bring the truck?',
    answer: 'Yes. Our crew arrives with the truck — you do not need to arrange any vehicle. We can also coordinate multiple trips or larger trucks for bigger moves when needed.',
  },
  {
    question: 'Can you help with packing?',
    answer: 'We can assist with loading and wrapping furniture. If you need full packing services, mention it when you request your quote and we will note it in your estimate.',
  },
  {
    question: 'How far in advance do I need to book?',
    answer: 'We try to accommodate bookings a few days out. For weekend or month-end moves, booking at least a week ahead gives you the best chance at your preferred time slot.',
  },
  {
    question: 'What affects the price of a move?',
    answer: 'The main factors are crew size, number of hours, distance between locations, and whether stairs or a freight elevator are involved. We give you a clear price range upfront before anything is confirmed.',
  },
  {
    question: 'Do you move items that are awkward or oversized?',
    answer: 'Yes. Pianos, large appliances, and bulky furniture are things we handle regularly. Let us know in the quote request so we can plan the right crew and equipment.',
  },
];

const highlights = [
  'Apartments, houses, condos, and offices',
  'Furniture disassembly and reassembly included',
  'Truck and crew supplied — nothing to arrange',
  'Flexible scheduling, including evenings and weekends',
  'Same-day availability when schedule allows',
  'Serving Halifax, Dartmouth, Bedford, and surrounding HRM',
];

const priceFactors = [
  {
    title: 'Crew size',
    detail: 'A one-bedroom apartment needs fewer hands than a four-bedroom house. We match the crew to the job.',
  },
  {
    title: 'Number of hours',
    detail: 'Most local moves are priced by the hour. A straightforward move typically takes less time than one with stairs, a lot of furniture, or long carries.',
  },
  {
    title: 'Distance',
    detail: 'Local moves within the HRM are priced differently than longer hauls. We are upfront about any travel time that factors into the estimate.',
  },
  {
    title: 'Access and stairs',
    detail: 'Ground-floor access speeds things up. Stairs, tight hallways, or limited parking can add time and affect the final price.',
  },
  {
    title: 'Specialty items',
    detail: 'Pianos, safes, pool tables, and large appliances take extra care and may affect the quote. Mention them upfront so nothing is a surprise.',
  },
];

export function Moving({ onNavigate, onLogin }: MovingProps) {
  useEffect(() => {
    setSEO({
      title: 'Moving Services in Halifax & HRM | BudgetWorks',
      description: 'Professional moving services in Halifax, Dartmouth, Bedford, and across the HRM. Local crew, truck included, honest pricing. Get a quote from BudgetWorks.',
      canonicalPath: '/moving',
    });

    const cleanup = setFAQSchema('json-ld-faq-moving', faqs);
    return cleanup;
  }, []);

  return (
    <PublicLayout currentPage="services" onNavigate={onNavigate} onLogin={onLogin}>

      {/* Hero */}
      <section className="relative bg-gray-950 text-white overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-medium px-4 py-2 rounded-full mb-8 tracking-wide uppercase">
              <MapPin className="w-4 h-4" />
              Halifax &amp; HRM
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.05] mb-6 tracking-tight">
              Moving Services<br />
              <span className="text-orange-500">in Halifax.</span>
            </h1>
            <p className="text-xl text-gray-400 mb-10 leading-relaxed max-w-xl">
              We show up with a truck and a crew that knows what they're doing. Local moves, apartment relocations, office moves — handled cleanly and on time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => onNavigate('quote')}
                className="group bg-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-all shadow-2xl shadow-orange-500/20 flex items-center justify-center gap-2"
              >
                Get a Moving Quote
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="tel:+19025551234"
                className="bg-white/5 border border-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                Call Us
              </a>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* What's included */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-start">
            <div>
              <p className="text-orange-500 font-semibold uppercase tracking-widest text-sm mb-3">What you get</p>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">
                A crew that handles<br />the whole move.
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                You don't need to rent a truck or round up friends. We bring everything and handle the loading, transport, and unloading — so you can focus on getting settled.
              </p>
              <button
                onClick={() => onNavigate('quote')}
                className="group bg-orange-500 text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors inline-flex items-center gap-2"
              >
                Request a Quote
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div>
              <ul className="space-y-4">
                {highlights.map((h) => (
                  <li key={h} className="flex items-start gap-3 text-gray-700">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-orange-500" />
                    </div>
                    <span className="text-[15px] leading-relaxed">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* What affects price */}
      <section className="py-20 md:py-28 bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-14">
            <p className="text-orange-500 font-semibold uppercase tracking-widest text-sm mb-3">Pricing</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">What affects<br />your moving cost.</h2>
            <p className="text-gray-400 text-lg max-w-xl">
              We don't list exact prices because every move is different. Here's what we look at when putting together your quote.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {priceFactors.map((f) => (
              <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-orange-500/40 transition-colors">
                <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-400 text-[15px] leading-relaxed">{f.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <button
              onClick={() => onNavigate('quote')}
              className="group bg-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-all shadow-2xl shadow-orange-500/20 inline-flex items-center gap-2"
            >
              Get a Price Range
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-28 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-orange-500 font-semibold uppercase tracking-widest text-sm mb-3">FAQ</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">Moving questions,<br />answered.</h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 mb-10">
            {faqs.map((faq) => (
              <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
          <div className="text-center">
            <button
              onClick={() => onNavigate('quote')}
              className="group bg-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-all shadow-2xl shadow-orange-500/20 inline-flex items-center gap-2"
            >
              Book Your Move
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
