import { useState, useEffect, ReactNode } from 'react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { supabase } from '../../lib/supabase';
import { setSEO } from '../../lib/seo';
import {
  Truck, Trash2, HardHat, ChevronRight, ChevronLeft,
  MapPin, Calendar, Clock, User, Mail, Phone, MessageSquare,
  CheckCircle, Loader2, AlertCircle
} from 'lucide-react';

import { PublicPage } from '../../types/public';

interface QuoteWizardProps {
  onNavigate: (page: PublicPage) => void;
  onLogin: () => void;
  onSignup: () => void;
}

type ServiceType = 'moving' | 'junk_removal' | 'demolition';

interface WizardState {
  service: ServiceType | null;
  // Location / timing
  pickupAddress: string;
  dropoffAddress: string;
  address: string;
  preferredDate: string;
  flexibility: string;
  timeWindow: string;
  // Moving specifics
  loadSize: string;
  access: string;
  packingHelp: string;
  specialItems: string[];
  // Junk specifics
  volume: string;
  junkTypes: string[];
  junkAccess: string;
  junkExtras: string[];
  junkPreference: string;
  // Demo specifics
  demoType: string;
  demoProperty: string;
  demoSize: string;
  demoSafety: string[];
  // Contact
  contactName: string;
  contactEmail: string;
  contactMethod: string;
  contactPhone: string;
  notes: string;
}

const INITIAL_STATE: WizardState = {
  service: null,
  pickupAddress: '', dropoffAddress: '', address: '',
  preferredDate: '', flexibility: '', timeWindow: '',
  loadSize: '', access: '', packingHelp: '', specialItems: [],
  volume: '', junkTypes: [], junkAccess: '', junkExtras: [], junkPreference: '',
  demoType: '', demoProperty: '', demoSize: '', demoSafety: [],
  contactName: '', contactEmail: '', contactMethod: '', contactPhone: '', notes: '',
};

function Chip({
  label, selected, onClick, icon
}: { label: string; selected: boolean; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-medium text-sm transition-all duration-150 select-none
        ${selected
          ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
        }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MultiChip({
  label, selected, onClick
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-medium text-sm transition-all duration-150 select-none
        ${selected
          ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
        }`}
    >
      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
        {selected && <CheckCircle className="w-3 h-3 text-white" />}
      </span>
      {label}
    </button>
  );
}

function StepHeading({ step, total, title, subtitle }: { step: number; total: number; title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <p className="text-sm font-medium text-orange-500 mb-1">Step {step} of {total}</p>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="mt-2 text-gray-500">{subtitle}</p>}
    </div>
  );
}

function TextInput({
  label, value, onChange, placeholder, required, type = 'text', icon: _icon
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string; icon?: ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400 transition-colors"
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{children}</p>;
}

function buildDescription(s: WizardState): string {
  if (!s.service) return '';
  const parts: string[] = [];
  if (s.service === 'moving') {
    if (s.loadSize) parts.push(`Load: ${s.loadSize}`);
    if (s.access) parts.push(`Access: ${s.access}`);
    if (s.packingHelp) parts.push(`Packing: ${s.packingHelp}`);
    if (s.specialItems.length) parts.push(`Special items: ${s.specialItems.join(', ')}`);
  } else if (s.service === 'junk_removal') {
    if (s.volume) parts.push(`Volume: ${s.volume}`);
    if (s.junkTypes.length) parts.push(`Types: ${s.junkTypes.join(', ')}`);
    if (s.junkAccess) parts.push(`Access: ${s.junkAccess}`);
    if (s.junkExtras.length) parts.push(s.junkExtras.join(', '));
    if (s.junkPreference) parts.push(s.junkPreference);
  } else {
    if (s.demoType) parts.push(`Type: ${s.demoType}`);
    if (s.demoProperty) parts.push(`Property: ${s.demoProperty}`);
    if (s.demoSize) parts.push(`Size: ${s.demoSize}`);
    if (s.demoSafety.length) parts.push(`Safety: ${s.demoSafety.join(', ')}`);
  }
  if (s.flexibility) parts.push(`Timing: ${s.flexibility}`);
  if (s.timeWindow) parts.push(`Time: ${s.timeWindow}`);
  if (s.notes) parts.push(`Notes: ${s.notes}`);
  return parts.join(' | ');
}

function buildDetails(s: WizardState) {
  const base = {
    flexibility: s.flexibility,
    time_window: s.timeWindow,
  };
  if (s.service === 'moving') {
    return {
      ...base,
      pickup_address: s.pickupAddress,
      dropoff_address: s.dropoffAddress,
      load_size: s.loadSize,
      access: s.access,
      packing_help: s.packingHelp,
      special_items: s.specialItems,
    };
  }
  if (s.service === 'junk_removal') {
    return {
      ...base,
      volume: s.volume,
      junk_types: s.junkTypes,
      access: s.junkAccess,
      extras: s.junkExtras,
      preference: s.junkPreference,
    };
  }
  return {
    ...base,
    demo_type: s.demoType,
    property: s.demoProperty,
    size: s.demoSize,
    safety_notes: s.demoSafety,
  };
}

const TOTAL_STEPS = 5;

export function QuoteWizard({ onNavigate, onLogin, onSignup }: QuoteWizardProps) {
  useEffect(() => {
    setSEO({
      title: 'Get a Quote | BudgetWorks Halifax',
      description: 'Request a free quote for moving, junk removal, or light demolition in Halifax and the HRM. Takes just two minutes.',
      canonicalPath: '/quote',
    });
  }, []);

  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (patch: Partial<WizardState>) => setState(prev => ({ ...prev, ...patch }));

  const toggleMulti = (key: keyof WizardState, value: string) => {
    const arr = state[key] as string[];
    const next = arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value];
    set({ [key]: next } as Partial<WizardState>);
  };

  const canAdvance = (): boolean => {
    if (step === 1) return !!state.service;
    if (step === 2) {
      if (state.service === 'moving') return !!state.pickupAddress && !!state.dropoffAddress;
      return !!state.address;
    }
    if (step === 3) return true;
    if (step === 4) {
      if (!state.contactName.trim() || !state.contactEmail.trim()) return false;
      if ((state.contactMethod === 'sms' || state.contactMethod === 'call') && !state.contactPhone.trim()) return false;
      return true;
    }
    return true;
  };

  const next = () => { if (canAdvance()) setStep(s => s + 1); };
  const back = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const locationAddress = state.service === 'moving' ? state.pickupAddress : state.address;
      const serviceLabel = state.service === 'moving' ? 'Moving' : state.service === 'junk_removal' ? 'Junk Removal' : 'Light Demolition';
      const { error: err } = await supabase.from('public_quote_requests').insert({
        service_type: state.service,
        contact_name: state.contactName.trim(),
        contact_email: state.contactEmail.trim().toLowerCase(),
        contact_phone: state.contactPhone.trim() || null,
        preferred_contact_method: state.contactMethod || 'email',
        location_address: locationAddress,
        preferred_date: state.preferredDate || null,
        description: `${serviceLabel}: ${buildDescription(state)}`,
        details: buildDetails(state),
        status: 'new',
      });
      if (err) throw err;
      onNavigate('quote-success');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const progressPct = Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100);

  return (
    <PublicLayout currentPage="quote" onNavigate={onNavigate} onLogin={onLogin}>
      <section className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">Get a Free Quote</h1>
            <p className="mt-2 text-gray-500">Answer a few quick questions — no typing essays required.</p>
          </div>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>Start</span>
              <span>Step {step} of {TOTAL_STEPS}</span>
              <span>Done</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">

            {/* ---- STEP 1: Service ---- */}
            {step === 1 && (
              <div>
                <StepHeading step={1} total={TOTAL_STEPS} title="What service do you need?" />
                <div className="grid gap-4">
                  {[
                    { id: 'moving' as ServiceType, label: 'Moving', sub: 'Local & long-distance residential moves', icon: <Truck className="w-6 h-6 text-orange-500" /> },
                    { id: 'junk_removal' as ServiceType, label: 'Junk Removal', sub: 'Furniture, appliances, debris & more', icon: <Trash2 className="w-6 h-6 text-orange-500" /> },
                    { id: 'demolition' as ServiceType, label: 'Light Demolition', sub: 'Interior tear-out, small structures', icon: <HardHat className="w-6 h-6 text-orange-500" /> },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => set({ service: opt.id })}
                      className={`flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all duration-150
                        ${state.service === opt.id
                          ? 'border-orange-500 bg-orange-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                        {opt.icon}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{opt.label}</p>
                        <p className="text-sm text-gray-500">{opt.sub}</p>
                      </div>
                      {state.service === opt.id && (
                        <CheckCircle className="w-5 h-5 text-orange-500 ml-auto flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ---- STEP 2: Location + Timing ---- */}
            {step === 2 && (
              <div className="space-y-6">
                <StepHeading step={2} total={TOTAL_STEPS} title="Where & when?" />

                {state.service === 'moving' ? (
                  <>
                    <TextInput
                      label="Pickup address" required
                      value={state.pickupAddress}
                      onChange={v => set({ pickupAddress: v })}
                      placeholder="123 Main St, Halifax, NS"
                      icon={<MapPin />}
                    />
                    <TextInput
                      label="Dropoff address" required
                      value={state.dropoffAddress}
                      onChange={v => set({ dropoffAddress: v })}
                      placeholder="456 Oak Ave, Dartmouth, NS"
                    />
                  </>
                ) : (
                  <TextInput
                    label="Service address" required
                    value={state.address}
                    onChange={v => set({ address: v })}
                    placeholder="123 Main St, Halifax, NS"
                  />
                )}

                <TextInput
                  label="Preferred date (optional)"
                  type="date"
                  value={state.preferredDate}
                  onChange={v => set({ preferredDate: v })}
                />

                <div>
                  <SectionLabel>Scheduling flexibility</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {['Exact date', '± 3 days', 'This week', 'This month'].map(opt => (
                      <Chip key={opt} label={opt} selected={state.flexibility === opt} onClick={() => set({ flexibility: state.flexibility === opt ? '' : opt })} />
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>Preferred time (optional)</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {['Morning', 'Afternoon', 'Evening'].map(opt => (
                      <Chip key={opt} label={opt} selected={state.timeWindow === opt} onClick={() => set({ timeWindow: state.timeWindow === opt ? '' : opt })} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ---- STEP 3: Service specifics ---- */}
            {step === 3 && state.service === 'moving' && (
              <div className="space-y-6">
                <StepHeading step={3} total={TOTAL_STEPS} title="Tell us about your move" subtitle="Pick what applies — no essays needed." />

                <div>
                  <SectionLabel>Home size</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {['Studio', '1 BR', '2 BR', '3+ BR'].map(opt => (
                      <Chip key={opt} label={opt} selected={state.loadSize === opt} onClick={() => set({ loadSize: state.loadSize === opt ? '' : opt })} />
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>Access type</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {['Ground floor', 'Elevator', 'Stairs'].map(opt => (
                      <Chip key={opt} label={opt} selected={state.access === opt} onClick={() => set({ access: state.access === opt ? '' : opt })} />
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>Packing help needed?</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {['Yes please', 'No thanks'].map(opt => (
                      <Chip key={opt} label={opt} selected={state.packingHelp === opt} onClick={() => set({ packingHelp: state.packingHelp === opt ? '' : opt })} />
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>Special items (select all that apply)</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {['Piano', 'Safe', 'Glass / Art', 'Hot tub'].map(opt => (
                      <MultiChip key={opt} label={opt} selected={state.specialItems.includes(opt)} onClick={() => toggleMulti('specialItems', opt)} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && state.service === 'junk_removal' && (
              <div className="space-y-6">
                <StepHeading step={3} total={TOTAL_STEPS} title="About your junk removal" subtitle="Pick what applies." />

                <div>
                  <SectionLabel>Estimated volume</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {['¼ truck', '½ truck', '¾ truck', 'Full truck'].map(opt => (
                      <Chip key={opt} label={opt} selected={state.volume === opt} onClick={() => set({ volume: state.volume === opt ? '' : opt })} />
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>What's being removed? (select all)</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {['Furniture', 'Appliances', 'Renovation debris', 'Yard waste', 'Mattress'].map(opt => (
                      <MultiChip key={opt} label={opt} selected={state.junkTypes.includes(opt)} onClick={() => toggleMulti('junkTypes', opt)} />
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>Item location</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {['Ground floor', 'Basement', 'Upstairs', 'Garage'].map(opt => (
                      <Chip key={opt} label={opt} selected={state.junkAccess === opt} onClick={() => set({ junkAccess: state.junkAccess === opt ? '' : opt })} />
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>Any extras? (select all)</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {['Heavy / bulky items', 'Disassembly needed'].map(opt => (
                      <MultiChip key={opt} label={opt} selected={state.junkExtras.includes(opt)} onClick={() => toggleMulti('junkExtras', opt)} />
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>Disposal preference</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {['Try to donate first', 'Disposal is fine'].map(opt => (
                      <Chip key={opt} label={opt} selected={state.junkPreference === opt} onClick={() => set({ junkPreference: state.junkPreference === opt ? '' : opt })} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && state.service === 'demolition' && (
              <div className="space-y-6">
                <StepHeading step={3} total={TOTAL_STEPS} title="About the demolition" subtitle="Pick what applies." />

                <div>
                  <SectionLabel>Demo type</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {['Interior', 'Exterior', 'Small structure'].map(opt => (
                      <Chip key={opt} label={opt} selected={state.demoType === opt} onClick={() => set({ demoType: state.demoType === opt ? '' : opt })} />
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>Property type</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {['House', 'Apartment', 'Commercial'].map(opt => (
                      <Chip key={opt} label={opt} selected={state.demoProperty === opt} onClick={() => set({ demoProperty: state.demoProperty === opt ? '' : opt })} />
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>Scope / size</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {['Small (1 room)', 'Medium (2–4 rooms)', 'Large (5+ rooms)'].map(opt => (
                      <Chip key={opt} label={opt} selected={state.demoSize === opt} onClick={() => set({ demoSize: state.demoSize === opt ? '' : opt })} />
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>Safety & compliance (select all that apply)</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {['Utilities disconnected', 'Permit may be required', 'No known hazards'].map(opt => (
                      <MultiChip key={opt} label={opt} selected={state.demoSafety.includes(opt)} onClick={() => toggleMulti('demoSafety', opt)} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ---- STEP 4: Contact ---- */}
            {step === 4 && (
              <div className="space-y-6">
                <StepHeading step={4} total={TOTAL_STEPS} title="Your contact details" />

                <TextInput
                  label="Full name" required
                  value={state.contactName}
                  onChange={v => set({ contactName: v })}
                  placeholder="Jane Smith"
                />

                <TextInput
                  label="Email address" required type="email"
                  value={state.contactEmail}
                  onChange={v => set({ contactEmail: v })}
                  placeholder="jane@example.com"
                />

                <div>
                  <SectionLabel>How should we reach you?</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
                      { id: 'sms', label: 'SMS', icon: <MessageSquare className="w-4 h-4" /> },
                      { id: 'call', label: 'Phone call', icon: <Phone className="w-4 h-4" /> },
                    ].map(opt => (
                      <Chip
                        key={opt.id}
                        label={opt.label}
                        selected={state.contactMethod === opt.id}
                        onClick={() => set({ contactMethod: state.contactMethod === opt.id ? '' : opt.id })}
                        icon={opt.icon}
                      />
                    ))}
                  </div>
                </div>

                {(state.contactMethod === 'sms' || state.contactMethod === 'call') && (
                  <TextInput
                    label="Phone number" required type="tel"
                    value={state.contactPhone}
                    onChange={v => set({ contactPhone: v })}
                    placeholder="(902) 555-0000"
                  />
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Anything else? <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea
                    value={state.notes}
                    onChange={e => set({ notes: e.target.value })}
                    rows={3}
                    placeholder="Tight parking, fragile items, specific concerns..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400 transition-colors resize-none"
                  />
                </div>
              </div>
            )}

            {/* ---- STEP 5: Review ---- */}
            {step === 5 && (
              <div className="space-y-6">
                <StepHeading step={5} total={TOTAL_STEPS} title="Review & submit" subtitle="Double-check everything before we send it off." />

                <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200 overflow-hidden">
                  <ReviewRow icon={<Truck className="w-4 h-4" />} label="Service"
                    value={state.service === 'moving' ? 'Moving' : state.service === 'junk_removal' ? 'Junk Removal' : 'Light Demolition'} />

                  {state.service === 'moving' ? (
                    <>
                      <ReviewRow icon={<MapPin className="w-4 h-4" />} label="Pickup" value={state.pickupAddress} />
                      <ReviewRow icon={<MapPin className="w-4 h-4" />} label="Dropoff" value={state.dropoffAddress} />
                    </>
                  ) : (
                    <ReviewRow icon={<MapPin className="w-4 h-4" />} label="Address" value={state.address} />
                  )}

                  {state.preferredDate && (
                    <ReviewRow icon={<Calendar className="w-4 h-4" />} label="Preferred date" value={state.preferredDate} />
                  )}
                  {state.flexibility && (
                    <ReviewRow icon={<Clock className="w-4 h-4" />} label="Flexibility" value={state.flexibility} />
                  )}

                  {/* Service specifics summary */}
                  {state.service === 'moving' && (
                    <>
                      {state.loadSize && <ReviewRow label="Home size" value={state.loadSize} />}
                      {state.access && <ReviewRow label="Access" value={state.access} />}
                      {state.packingHelp && <ReviewRow label="Packing" value={state.packingHelp} />}
                      {state.specialItems.length > 0 && <ReviewRow label="Special items" value={state.specialItems.join(', ')} />}
                    </>
                  )}
                  {state.service === 'junk_removal' && (
                    <>
                      {state.volume && <ReviewRow label="Volume" value={state.volume} />}
                      {state.junkTypes.length > 0 && <ReviewRow label="Items" value={state.junkTypes.join(', ')} />}
                      {state.junkAccess && <ReviewRow label="Location" value={state.junkAccess} />}
                      {state.junkPreference && <ReviewRow label="Preference" value={state.junkPreference} />}
                    </>
                  )}
                  {state.service === 'demolition' && (
                    <>
                      {state.demoType && <ReviewRow label="Type" value={state.demoType} />}
                      {state.demoProperty && <ReviewRow label="Property" value={state.demoProperty} />}
                      {state.demoSize && <ReviewRow label="Size" value={state.demoSize} />}
                    </>
                  )}

                  <ReviewRow icon={<User className="w-4 h-4" />} label="Name" value={state.contactName} />
                  <ReviewRow icon={<Mail className="w-4 h-4" />} label="Email" value={state.contactEmail} />
                  {state.contactPhone && <ReviewRow icon={<Phone className="w-4 h-4" />} label="Phone" value={state.contactPhone} />}
                  <ReviewRow label="Contact via" value={state.contactMethod || 'email'} />
                  {state.notes && <ReviewRow label="Notes" value={state.notes} />}
                </div>

                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={back}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <div />
              )}

              {step < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={next}
                  disabled={!canAdvance()}
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all duration-150
                    ${canAdvance()
                      ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-500/25'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-8 py-2.5 rounded-xl font-semibold bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-500/25 transition-all duration-150 disabled:opacity-60"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><CheckCircle className="w-4 h-4" /> Submit Request</>}
                </button>
              )}
            </div>
          </div>

          {/* Bottom note */}
          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <button onClick={onLogin} className="text-orange-500 hover:text-orange-600 font-medium">Sign in</button>
            {' · '}
            <button onClick={onSignup} className="text-orange-500 hover:text-orange-600 font-medium">Create account</button>
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}

function ReviewRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {icon && <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>}
      <span className="text-sm text-gray-500 w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-gray-900 flex-1">{value}</span>
    </div>
  );
}
