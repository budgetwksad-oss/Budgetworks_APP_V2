import { useEffect, useState } from 'react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { ArrowRight, CheckCircle, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { setSEO, setFAQSchema } from '../../lib/seo';

type PublicPage = 'home' | 'services' | 'about' | 'contact' | 'quote' | 'quote-success' | 'moving' | 'junk-removal' | 'light-demo';

interface LightDemoProps {
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
    question: 'What counts as "light" demolition?',
    answer: 'Light demolition covers non-structural interior work — removing walls that are not load-bearing, taking out cabinets, tearing up flooring, pulling decks, and similar tasks. If you are unsure whether your project qualifies, describe it in the quote and we will let you know.',
  },
  {
    question: 'Do you handle debris removal after the demo?',
    answer: 'Yes. Hauling the debris away is part of the job. We leave the space cleared and ready for the next phase of your renovation.',
  },
  {
    question: 'Do I need a permit for light demolition in Halifax?',
    answer: 'Permit requirements depend on the scope of work and the municipality. For most interior light demo, no permit is required, but for anything involving structural elements or exterior changes, it is worth checking with Halifax Regional Municipality before starting.',
  },
  {
    question: 'What affects the price of a demo job?',
    answer: 'The main factors are the size of the area, type of materials being removed, accessibility, and how much debris needs to be hauled. We assess each job individually and give you a clear range in your quote.',
  },
  {
    question: 'How do I prepare for a demo job?',
    answer: 'Clear the area of personal items and valuables if possible. Make sure utilities in the work area are turned off (we can advise if unsure). Beyond that, we handle the rest.',
  },
];

const highlights = [
  'Non-structural interior wall removal',
  'Cabinet and fixture takedown',
  'Deck, shed, and fence removal',
  'Flooring and tile tear-out',
  'Debris hauled away as part of the job',
  'Serving Halifax, Dartmouth, Bedford, and surrounding HRM',
];

const priceFactors = [
  {
    title: 'Scope of the area',
    detail: 'A single wall in one room is a different job from a full kitchen gut. The more area involved, the more time and labour required.',
  },
  {
    title: 'Materials being removed',
    detail: 'Drywall and wood framing are straightforward. Tile, concrete, or material with hazardous elements (like old insulation) may take extra effort or special disposal.',
  },
  {
    title: 'Access to the work area',
    detail: 'Tight spaces, narrow doorways, or multi-floor homes where debris needs to be carried down stairs all affect how long a job takes.',
  },
  {
    title: 'Volume of debris',
    detail: 'The amount of material we need to haul out factors into the total cost. We estimate this upfront so there are no surprises at the end.',
  },
  {
    title: 'Hazardous materials',
    detail: 'Asbestos, lead paint, or other regulated materials require licensed abatement before demo can proceed. We will flag this if we see it during assessment.',
  },
];

export function LightDemo({ onNavigate, onLogin }: LightDemoProps) {
  useEffect(() => {
    setSEO({
      title: 'Light Demolition Services in Halifax & HRM | BudgetWorks',
      description: 'Interior light demolition in Halifax, Dartmouth, Bedford, and across the HRM. Walls, decks, cabinets, fixtures — cleared and hauled away. Get a quote from BudgetWorks.',
      canonicalPath: '/light-demo',
    });

    const cleanup = setFAQSchema('json-ld-faq-light-demo', faqs);
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
              Light Demolition<br />
              <span className="text-orange-500">in Halifax.</span>
            </h1>
            <p className="text-xl text-gray-400 mb-10 leading-relaxed max-w-xl">
              Prepping for a renovation? We handle the tear-down — walls, decks, cabinets, flooring — and haul the debris away so your contractor can start fresh.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => onNavigate('quote')}
                className="group bg-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-all shadow-2xl shadow-orange-500/20 flex items-center justify-center gap-2"
              >
                Get a Demo Quote
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

      {/* What we do */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-start">
            <div>
              <p className="text-orange-500 font-semibold uppercase tracking-widest text-sm mb-3">What we handle</p>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">
                We tear it out.<br />You build it back.
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                Light demo is the grunt work that comes before the renovation. We do that part cleanly and efficiently, so you're not paying a contractor to do it at their rates. We clear the space, and we take the debris with us.
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
            <h2 className="text-4xl md:text-5xl font-bold mb-4">What affects<br />your demo cost.</h2>
            <p className="text-gray-400 text-lg max-w-xl">
              Demo jobs vary widely depending on what's being removed and where. Here's what we look at when quoting.
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
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">Demo questions,<br />answered.</h2>
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
              Book Demo Work
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
