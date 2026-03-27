import { useEffect, useState } from 'react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { ArrowRight, CheckCircle, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { setSEO, setFAQSchema } from '../../lib/seo';

import { PublicPage } from '../../types/public';

interface JunkRemovalProps {
  onNavigate: (page: PublicPage) => void;
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
    question: 'What kinds of items do you haul away?',
    answer: 'Furniture, appliances, electronics, renovation debris, yard waste, mattresses, boxes — most household and light commercial items. If you are not sure whether we can take something, just ask when you request a quote.',
  },
  {
    question: 'Do I need to sort or bag anything before you arrive?',
    answer: 'Not necessarily. For most pickups, you just point to what needs to go and we load it. If there are hazardous materials like paint or chemicals, those we cannot take, so let us know in advance.',
  },
  {
    question: 'How is junk removal priced?',
    answer: 'Pricing is generally based on volume — how much space your junk takes up in our truck. The number of items, weight, and how easy they are to access also factor in. We give you a clear estimate before we start.',
  },
  {
    question: 'Can you handle a full estate or garage cleanout?',
    answer: 'Yes. Cleanouts are a common job for us. Whether it is one room or an entire property, we can handle it in a single visit or across multiple trips depending on the volume.',
  },
  {
    question: 'How quickly can you come?',
    answer: 'For most jobs we can schedule within a few days. If something is urgent, call us directly and we will do our best to get out sooner.',
  },
];

const highlights = [
  'Furniture, appliances, and bulky items',
  'Estate cleanouts and hoarding situations handled with care',
  'Renovation debris and construction waste',
  'Garage, basement, and yard cleanouts',
  'Single-item pickups and full-load jobs',
  'Serving Halifax, Dartmouth, Bedford, and surrounding HRM',
];

const priceFactors = [
  {
    title: 'Volume of material',
    detail: 'Most junk removal is priced by how much space it takes up in the truck. A single couch is a very different job from a full garage.',
  },
  {
    title: 'Item weight',
    detail: 'Heavier loads — concrete, tiles, dirt — take more effort and may affect the price. Light items like furniture and cardboard are straightforward.',
  },
  {
    title: 'Access to the items',
    detail: 'Items at ground level are easy to grab. If things are in a basement, attic, or need to be moved through tight spaces, that adds time.',
  },
  {
    title: 'Number of trips',
    detail: 'Large cleanouts may require more than one truckload. We can estimate this from your quote request and let you know upfront.',
  },
  {
    title: 'Type of material',
    detail: 'Hazardous materials like paint, solvents, and batteries cannot be hauled. Everything else — furniture, appliances, general clutter — is fair game.',
  },
];

export function JunkRemoval({ onNavigate }: JunkRemovalProps) {
  useEffect(() => {
    setSEO({
      title: 'Junk Removal in Halifax & HRM | BudgetWorks',
      description: 'Fast junk removal in Halifax, Dartmouth, Bedford, and across the HRM. Furniture, appliances, estate cleanouts, renovation debris. Honest pricing. BudgetWorks.',
      canonicalPath: '/junk-removal',
    });

    const cleanup = setFAQSchema('json-ld-faq-junk-removal', faqs);
    return cleanup;
  }, []);

  return (
    <PublicLayout currentPage="junk-removal" onNavigate={onNavigate}>

      {/* Hero */}
      <section className="relative text-white overflow-hidden min-h-[580px] flex items-center">
        <img
          src="/Screenshot_2026-03-26_224617.png"
          alt="Junk removal skip bin loaded with scrap"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/92 via-gray-950/75 to-gray-950/30" />
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 w-full">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-medium px-4 py-2 rounded-full mb-8 tracking-wide uppercase">
              <MapPin className="w-4 h-4" />
              Halifax &amp; HRM
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.05] mb-6 tracking-tight">
              Junk Removal<br />
              <span className="text-orange-500">in Halifax.</span>
            </h1>
            <p className="text-xl text-gray-300 mb-10 leading-relaxed max-w-xl">
              If it needs to go, we haul it. Furniture, appliances, renovation debris, full cleanouts — we load it up and take it off your hands.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => onNavigate('quote')}
                className="group bg-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-all shadow-2xl shadow-orange-500/20 flex items-center justify-center gap-2"
              >
                Get a Removal Quote
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="tel:+18444041240"
                className="bg-white/10 border border-white/30 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
              >
                Call Us
              </a>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* What we take */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-start">
            <div>
              <p className="text-orange-500 font-semibold uppercase tracking-widest text-sm mb-3">What we take</p>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">
                Most things you<br />want gone, gone.
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                Point us at it and we handle the rest. We load everything ourselves — you don't need to drag anything to the curb. Just let us know what's going and we'll take care of it.
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
            <h2 className="text-4xl md:text-5xl font-bold mb-4">What affects<br />your removal cost.</h2>
            <p className="text-gray-400 text-lg max-w-xl">
              Every job is different. Here's what goes into calculating a fair price.
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

      {/* Related services */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-orange-500 font-semibold uppercase tracking-widest text-sm mb-6">Also from BudgetWorks</p>
          <div className="grid sm:grid-cols-2 gap-5">
            <button
              onClick={() => onNavigate('moving')}
              className="text-left bg-gray-50 border border-gray-200 rounded-2xl p-6 hover:border-orange-300 hover:bg-orange-50/40 transition-all group"
            >
              <p className="font-bold text-gray-900 text-lg group-hover:text-orange-600 transition-colors mb-1">
                Moving Services
              </p>
              <p className="text-gray-500 text-sm leading-relaxed">
                Need to relocate too? We handle the full move — truck, crew, loading, and unloading included.
              </p>
              <span className="inline-flex items-center gap-1 text-orange-500 font-semibold text-sm mt-4">
                Learn more <ArrowRight className="w-4 h-4" />
              </span>
            </button>
            <button
              onClick={() => onNavigate('light-demo')}
              className="text-left bg-gray-50 border border-gray-200 rounded-2xl p-6 hover:border-orange-300 hover:bg-orange-50/40 transition-all group"
            >
              <p className="font-bold text-gray-900 text-lg group-hover:text-orange-600 transition-colors mb-1">
                Light Demolition
              </p>
              <p className="text-gray-500 text-sm leading-relaxed">
                Gutting a space before the cleanout? We handle tear-downs too — walls, decks, fixtures, and floors.
              </p>
              <span className="inline-flex items-center gap-1 text-orange-500 font-semibold text-sm mt-4">
                Learn more <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-28 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-orange-500 font-semibold uppercase tracking-widest text-sm mb-3">FAQ</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">Junk removal<br />questions, answered.</h2>
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
              Book a Pickup
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
