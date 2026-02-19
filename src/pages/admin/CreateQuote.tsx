import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, fetchPricingSettings, PricingServiceType } from '../../lib/supabase';
import { logActivity } from '../../lib/activityLogger';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { MenuSection } from '../../components/layout/Sidebar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  calculateEstimate,
  formatCurrency,
  getServiceLabel,
  MovingInputs,
  JunkInputs,
  DemoInputs,
  EstimateResult,
} from '../../lib/pricingEngine';
import {
  ArrowLeft,
  Copy,
  CheckCircle,
  MapPin,
  Calendar,
  Mail,
  Phone,
  User,
  Calculator,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Pencil,
  Download,
} from 'lucide-react';
import { downloadQuotePDF } from '../../lib/quotePDF';

export type UnifiedRequest = {
  id: string;
  type: 'service_request' | 'public_quote_request';
  service_type: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  location_address: string;
  preferred_date: string | null;
  description: string | null;
  status: string;
  created_at: string;
  customer_id?: string;
  preferred_contact_method?: string;
};

interface CreateQuoteProps {
  lead?: UnifiedRequest | null;
  onBack: () => void;
  onSuccess: () => void;
  sidebarSections?: MenuSection[];
}

// ─── Phone Quote Contact Form ──────────────────────────────────────────────

type PhoneContact = {
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  preferred_contact_method: 'sms' | 'email' | 'call';
  location_address: string;
  preferred_date: string;
  description: string;
  service_type: PricingServiceType;
};

function PhoneContactForm({
  value,
  onChange,
}: {
  value: PhoneContact;
  onChange: (v: PhoneContact) => void;
}) {
  const set = (k: keyof PhoneContact, v: string) => onChange({ ...value, [k]: v });
  return (
    <Card className="p-6 mb-6 border-2 border-blue-200 bg-blue-50">
      <h3 className="text-base font-semibold text-blue-800 mb-4">Phone Quote — Contact Info</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Full Name *"
          value={value.contact_name}
          onChange={(e) => set('contact_name', e.target.value)}
          placeholder="John Smith"
        />
        <Input
          label="Email"
          type="email"
          value={value.contact_email}
          onChange={(e) => set('contact_email', e.target.value)}
          placeholder="john@example.com"
        />
        <Input
          label="Phone"
          value={value.contact_phone}
          onChange={(e) => set('contact_phone', e.target.value)}
          placeholder="555-123-4567"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred Contact</label>
          <select
            value={value.preferred_contact_method}
            onChange={(e) => set('preferred_contact_method', e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-sm"
          >
            <option value="sms">SMS</option>
            <option value="email">Email</option>
            <option value="call">Call</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Type *</label>
          <select
            value={value.service_type}
            onChange={(e) => set('service_type', e.target.value as PricingServiceType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-sm"
          >
            <option value="moving">Moving</option>
            <option value="junk_removal">Junk Removal</option>
            <option value="demolition">Light Demo</option>
          </select>
        </div>
        <Input
          label="Preferred Date"
          type="date"
          value={value.preferred_date}
          onChange={(e) => set('preferred_date', e.target.value)}
        />
        <div className="md:col-span-2">
          <Input
            label="Location / Address *"
            value={value.location_address}
            onChange={(e) => set('location_address', e.target.value)}
            placeholder="123 Main St, City, Province"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optional)</label>
          <textarea
            value={value.description}
            onChange={(e) => set('description', e.target.value)}
            rows={2}
            placeholder="Brief job description..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-colors text-sm"
          />
        </div>
      </div>
    </Card>
  );
}

// ─── Toggle Checkbox ──────────────────────────────────────────────────────

function AddonToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 accent-orange-500"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

// ─── Service Input Panels ─────────────────────────────────────────────────

function MovingInputPanel({
  value,
  onChange,
}: {
  value: MovingInputs & { trip_type: 'one_way' | 'round_trip'; truck_provider_override?: string };
  onChange: (v: any) => void;
}) {
  const set = (k: string, v: any) => onChange({ ...value, [k]: v });
  const addons = value.addons ?? {};
  const setAddon = (k: string, v: boolean) => onChange({ ...value, addons: { ...addons, [k]: v } });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Load Size</label>
          <select
            value={value.load_tier}
            onChange={(e) => set('load_tier', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-sm"
          >
            <option value="Small">Small (studio / 1 bedroom)</option>
            <option value="Medium">Medium (2–3 bedrooms)</option>
            <option value="Large">Large (4 bedrooms)</option>
            <option value="XL">XL (5+ bedrooms / commercial)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Trip Type</label>
          <select
            value={value.trip_type}
            onChange={(e) => set('trip_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-sm"
          >
            <option value="one_way">One Way</option>
            <option value="round_trip">Round Trip</option>
          </select>
        </div>
        <Input
          label="Distance (km)"
          type="number"
          min="0"
          value={String(value.distance_km ?? '')}
          onChange={(e) => set('distance_km', parseFloat(e.target.value) || 0)}
          placeholder="e.g. 25"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Extra Movers (0–4)</label>
          <select
            value={value.extra_movers ?? 0}
            onChange={(e) => set('extra_movers', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-sm"
          >
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Truck Provider</label>
          <select
            value={value.truck_provider_override ?? ''}
            onChange={(e) => set('truck_provider_override', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-sm"
          >
            <option value="">Use default</option>
            <option value="Ryder">Ryder</option>
            <option value="U-Haul">U-Haul</option>
            <option value="Flat Fee">Flat Fee</option>
          </select>
        </div>
        <Input
          label="Profit Margin Override (%)"
          type="number"
          min="0"
          max="100"
          step="1"
          value={value.profit_margin_pct != null ? String(value.profit_margin_pct) : ''}
          onChange={(e) => set('profit_margin_pct', e.target.value === '' ? undefined : parseFloat(e.target.value))}
          placeholder="Leave blank for default"
        />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Add-ons</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <AddonToggle label="Heavy item (+)" checked={!!addons.heavy_item} onChange={(v) => setAddon('heavy_item', v)} />
          <AddonToggle label="Stairs (3+ flights)" checked={!!addons.stairs_3plus} onChange={(v) => setAddon('stairs_3plus', v)} />
          <AddonToggle label="Tight parking" checked={!!addons.parking_tight} onChange={(v) => setAddon('parking_tight', v)} />
          <AddonToggle label="Packing service" checked={!!addons.packing} onChange={(v) => setAddon('packing', v)} />
          <AddonToggle label="Assembly / disassembly" checked={!!addons.assembly} onChange={(v) => setAddon('assembly', v)} />
          <AddonToggle label="Overnight storage" checked={!!addons.overnight_storage} onChange={(v) => setAddon('overnight_storage', v)} />
        </div>
      </div>
    </div>
  );
}

function JunkInputPanel({
  value,
  onChange,
}: {
  value: JunkInputs;
  onChange: (v: JunkInputs) => void;
}) {
  const set = (k: string, v: any) => onChange({ ...value, [k]: v } as JunkInputs);
  const addons = value.addons ?? {};
  const setAddon = (k: string, v: boolean) => onChange({ ...value, addons: { ...addons, [k]: v } } as JunkInputs);

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Load Size</label>
        <select
          value={value.load_tier}
          onChange={(e) => set('load_tier', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-sm"
        >
          <option value="1/8 Load">1/8 Load</option>
          <option value="1/4 Load">1/4 Load</option>
          <option value="1/2 Load">1/2 Load</option>
          <option value="3/4 Load">3/4 Load</option>
          <option value="Full Load">Full Load</option>
        </select>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Add-ons</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <AddonToggle label="Heavy item" checked={!!addons.heavy_item} onChange={(v) => setAddon('heavy_item', v)} />
          <AddonToggle label="Stairs (3+ flights)" checked={!!addons.stairs_3plus} onChange={(v) => setAddon('stairs_3plus', v)} />
          <AddonToggle label="Mattress" checked={!!addons.mattress} onChange={(v) => setAddon('mattress', v)} />
          <AddonToggle label="Appliance" checked={!!addons.appliance} onChange={(v) => setAddon('appliance', v)} />
          <AddonToggle label="Extra trip" checked={!!addons.extra_trip} onChange={(v) => setAddon('extra_trip', v)} />
        </div>
      </div>
    </div>
  );
}

function DemoInputPanel({
  value,
  onChange,
}: {
  value: DemoInputs;
  onChange: (v: DemoInputs) => void;
}) {
  const set = (k: string, v: any) => onChange({ ...value, [k]: v } as DemoInputs);
  const addons = value.addons ?? {};
  const setAddon = (k: string, v: boolean) => onChange({ ...value, addons: { ...addons, [k]: v } } as DemoInputs);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Scope</label>
          <select
            value={value.scope_tier}
            onChange={(e) => set('scope_tier', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-sm"
          >
            <option value="Small">Small (bathroom / closet)</option>
            <option value="Medium">Medium (kitchen / 1–2 rooms)</option>
            <option value="Large">Large (multi-room / whole floor)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Extra Workers (0–4)</label>
          <select
            value={value.extra_workers ?? 0}
            onChange={(e) => set('extra_workers', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-sm"
          >
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Add-ons</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <AddonToggle label="Flooring removal" checked={!!addons.flooring} onChange={(v) => setAddon('flooring', v)} />
          <AddonToggle label="Tile removal" checked={!!addons.tile} onChange={(v) => setAddon('tile', v)} />
          <AddonToggle label="Cabinet removal" checked={!!addons.cabinets} onChange={(v) => setAddon('cabinets', v)} />
          <AddonToggle label="Drywall removal" checked={!!addons.drywall} onChange={(v) => setAddon('drywall', v)} />
        </div>
      </div>
    </div>
  );
}

// ─── Estimate Results Display ─────────────────────────────────────────────

function EstimateDisplay({
  result,
  manualOverride,
  onToggleOverride,
  estimateLow,
  estimateHigh,
  onChangeLow,
  onChangeHigh,
}: {
  result: EstimateResult;
  manualOverride: boolean;
  onToggleOverride: () => void;
  estimateLow: string;
  estimateHigh: string;
  onChangeLow: (v: string) => void;
  onChangeHigh: (v: string) => void;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const snap = result.snapshot;

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-green-800">Calculated Estimate</h4>
          <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
            Staffing: {result.staffing_defaults.drivers}d / {result.staffing_defaults.helpers}h
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-0.5">Low</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(result.estimate_low)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-0.5">Expected</p>
            <p className="text-xl font-bold text-green-700">{formatCurrency(result.expected_price)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-0.5">High</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(result.estimate_high)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowBreakdown((v) => !v)}
          className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 transition-colors"
        >
          {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
        </button>
        {showBreakdown && (
          <div className="mt-3 pt-3 border-t border-green-200 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-700">
            <div className="flex justify-between"><span>Subtotal (low)</span><span>{formatCurrency(snap.subtotal_low)}</span></div>
            <div className="flex justify-between"><span>Subtotal (high)</span><span>{formatCurrency(snap.subtotal_high)}</span></div>
            <div className="flex justify-between"><span>Tax (low)</span><span>{formatCurrency(snap.tax_low)}</span></div>
            <div className="flex justify-between"><span>Tax (high)</span><span>{formatCurrency(snap.tax_high)}</span></div>
            {Object.entries(snap.breakdown).map(([k, v]) => (
              <div key={k} className="flex justify-between col-span-2">
                <span className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}</span>
                <span>{typeof v === 'number' ? (k.includes('pct') ? `${v}%` : formatCurrency(v)) : String(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleOverride}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          {manualOverride ? 'Use calculated values' : 'Adjust estimate manually'}
        </button>
      </div>

      {manualOverride && (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Override Low ($)"
            type="number"
            min="0"
            value={estimateLow}
            onChange={(e) => onChangeLow(e.target.value)}
          />
          <Input
            label="Override High ($)"
            type="number"
            min="0"
            value={estimateHigh}
            onChange={(e) => onChangeHigh(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export function CreateQuote({ lead, onBack, onSuccess, sidebarSections }: CreateQuoteProps) {
  const { user } = useAuth();
  const isPhoneMode = !lead;

  const [phoneContact, setPhoneContact] = useState<PhoneContact>({
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    preferred_contact_method: 'sms',
    location_address: '',
    preferred_date: '',
    description: '',
    service_type: 'moving',
  });

  const activeLead: UnifiedRequest | null = lead ?? null;
  const serviceType: PricingServiceType = isPhoneMode
    ? phoneContact.service_type
    : (lead?.service_type as PricingServiceType) ?? 'moving';

  const [pricingSettings, setPricingSettings] = useState<Record<string, any> | null>(null);
  const [pricingConfigured, setPricingConfigured] = useState(true);
  const [taxRate, setTaxRate] = useState(0);
  const [loadingSettings, setLoadingSettings] = useState(false);

  const [movingInputs, setMovingInputs] = useState<MovingInputs & { trip_type: 'one_way' | 'round_trip'; truck_provider_override?: string }>({
    load_tier: 'Medium',
    distance_km: 0,
    trip_type: 'one_way',
    extra_movers: 0,
  });
  const [junkInputs, setJunkInputs] = useState<JunkInputs>({ load_tier: '1/4 Load' });
  const [demoInputs, setDemoInputs] = useState<DemoInputs>({ scope_tier: 'Small', extra_workers: 0 });

  const [estimateResult, setEstimateResult] = useState<EstimateResult | null>(null);
  const [manualOverride, setManualOverride] = useState(false);
  const [estimateLow, setEstimateLow] = useState('');
  const [estimateHigh, setEstimateHigh] = useState('');
  const [capAmount, setCapAmount] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadPricingAndTax();
  }, [serviceType]);

  const loadPricingAndTax = async () => {
    setLoadingSettings(true);
    try {
      const [pricingRes, taxRes] = await Promise.all([
        fetchPricingSettings(serviceType),
        supabase.from('company_settings').select('tax_rate').order('created_at', { ascending: true }).limit(1).maybeSingle(),
      ]);
      if (pricingRes.data) {
        setPricingSettings(pricingRes.data.settings);
        setPricingConfigured(pricingRes.data.is_configured);
      } else {
        setPricingSettings(null);
        setPricingConfigured(false);
      }
      if (taxRes.data) {
        setTaxRate((taxRes.data.tax_rate ?? 0) / 100);
      }
    } catch (err) {
      console.error('Error loading pricing settings', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const buildQuoteInputs = () => {
    if (serviceType === 'moving') {
      const km = movingInputs.trip_type === 'round_trip'
        ? (movingInputs.distance_km ?? 0) * 2
        : (movingInputs.distance_km ?? 0);
      const inputs: MovingInputs = {
        load_tier: movingInputs.load_tier,
        distance_km: km,
        extra_movers: movingInputs.extra_movers,
        addons: movingInputs.addons,
      };
      if (movingInputs.profit_margin_pct != null) inputs.profit_margin_pct = movingInputs.profit_margin_pct;
      if (movingInputs.truck_provider_override) {
        return { ...inputs, _truck_provider_override: movingInputs.truck_provider_override };
      }
      return inputs;
    }
    if (serviceType === 'junk_removal') return junkInputs;
    return demoInputs;
  };

  const handleCalculate = () => {
    if (!pricingSettings || !pricingConfigured) return;
    const inputs = buildQuoteInputs();

    let settingsToUse = { ...pricingSettings };
    if (serviceType === 'moving' && (inputs as any)._truck_provider_override) {
      settingsToUse = { ...settingsToUse, truck_provider: (inputs as any)._truck_provider_override };
    }

    const result = calculateEstimate(serviceType, inputs as any, settingsToUse, taxRate);
    setEstimateResult(result);
    setManualOverride(false);
    setEstimateLow(String(result.estimate_low));
    setEstimateHigh(String(result.estimate_high));
  };

  const handleDownloadPDF = async () => {
    let companyName = 'BudgetWorks';
    let companyPhone: string | null = null;
    let companyEmail: string | null = null;
    let companyAddress: string | null = null;
    try {
      const { data } = await supabase
        .from('company_settings')
        .select('business_name,phone,email,address,tax_rate')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data) {
        companyName = data.business_name || companyName;
        companyPhone = data.phone;
        companyEmail = data.email;
        companyAddress = data.address;
      }
    } catch (_) {}

    const contact = resolvedLead();
    const low = manualOverride && estimateLow ? parseFloat(estimateLow) : estimateResult?.estimate_low ?? parseFloat(estimateLow) ?? 0;
    const high = manualOverride && estimateHigh ? parseFloat(estimateHigh) : estimateResult?.estimate_high ?? parseFloat(estimateHigh) ?? 0;

    downloadQuotePDF({
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      customerName: contact.contact_name || 'Customer',
      customerEmail: contact.contact_email || null,
      customerPhone: contact.contact_phone || null,
      serviceLabel: getServiceLabel(serviceType),
      location: contact.location_address,
      preferredDate: contact.preferred_date,
      estimateLow: low,
      estimateHigh: high,
      expectedPrice: estimateResult?.expected_price ?? null,
      capAmount: capAmount ? parseFloat(capAmount) : null,
      taxRate: taxRate,
      notes: notes || null,
      companyName,
      companyPhone,
      companyEmail,
      companyAddress,
    });
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const resolvedLead = (): UnifiedRequest => {
    if (activeLead) return activeLead;
    return {
      id: createdLeadId ?? '',
      type: 'public_quote_request',
      service_type: phoneContact.service_type,
      contact_name: phoneContact.contact_name,
      contact_email: phoneContact.contact_email,
      contact_phone: phoneContact.contact_phone || null,
      location_address: phoneContact.location_address,
      preferred_date: phoneContact.preferred_date || null,
      description: phoneContact.description || null,
      status: 'in_review',
      created_at: new Date().toISOString(),
      preferred_contact_method: phoneContact.preferred_contact_method,
    };
  };

  const validatePhoneContact = () => {
    if (!phoneContact.contact_name.trim()) return 'Contact name is required';
    if (!phoneContact.location_address.trim()) return 'Location address is required';
    return null;
  };

  const ensureLead = async (): Promise<string> => {
    if (activeLead) return activeLead.id;
    if (createdLeadId) return createdLeadId;

    const validationError = validatePhoneContact();
    if (validationError) throw new Error(validationError);

    const { data, error: insertError } = await supabase
      .from('public_quote_requests')
      .insert({
        service_type: phoneContact.service_type,
        contact_name: phoneContact.contact_name,
        contact_email: phoneContact.contact_email || '',
        contact_phone: phoneContact.contact_phone || null,
        preferred_contact_method: phoneContact.preferred_contact_method,
        location_address: phoneContact.location_address,
        preferred_date: phoneContact.preferred_date || null,
        description: phoneContact.description || null,
        status: 'in_review',
      })
      .select()
      .single();

    if (insertError) throw insertError;
    setCreatedLeadId(data.id);
    return data.id;
  };

  const buildQuotePayload = (status: 'draft' | 'sent', leadId: string, leadType: 'service_request' | 'public_quote_request') => {
    const low = manualOverride && estimateLow ? parseFloat(estimateLow) : estimateResult?.estimate_low ?? null;
    const high = manualOverride && estimateHigh ? parseFloat(estimateHigh) : estimateResult?.estimate_high ?? null;
    const cap = capAmount ? parseFloat(capAmount) : null;

    if (!low && !high) throw new Error('Please calculate or enter an estimate range');

    const quoteInputs = buildQuoteInputs();
    const pricingSnap = estimateResult
      ? {
          ...estimateResult.snapshot,
          service_type: serviceType,
          location: activeLead?.location_address ?? phoneContact.location_address,
          preferred_date: activeLead?.preferred_date ?? phoneContact.preferred_date,
          description: activeLead?.description ?? phoneContact.description,
        }
      : {
          service_type: serviceType,
          location: activeLead?.location_address ?? phoneContact.location_address,
          preferred_date: activeLead?.preferred_date ?? phoneContact.preferred_date,
          description: activeLead?.description ?? phoneContact.description,
        };

    const payload: any = {
      quote_number: null,
      line_items: [],
      subtotal: 0,
      tax_rate: 0,
      tax_amount: 0,
      total_amount: 0,
      estimate_low: low,
      estimate_high: high,
      expected_price: estimateResult?.expected_price ?? high ?? low,
      cap_amount: cap,
      valid_until: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d.toISOString().split('T')[0];
      })(),
      notes: notes || null,
      status,
      created_by: user?.id,
      pricing_snapshot: pricingSnap,
      quote_inputs: quoteInputs,
      staffing_defaults: estimateResult?.staffing_defaults ?? null,
    };

    if (leadType === 'public_quote_request') {
      payload.public_quote_request_id = leadId;
    } else {
      payload.service_request_id = leadId;
    }

    return payload;
  };

  const handleSaveDraft = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const leadId = await ensureLead();
      const leadType = activeLead?.type ?? 'public_quote_request';

      const { data: quoteNumberData, error: qnError } = await supabase.rpc('generate_quote_number');
      if (qnError) throw qnError;

      const payload = { ...buildQuotePayload('draft', leadId, leadType), quote_number: quoteNumberData };

      let savedQuoteId = quoteId;
      if (savedQuoteId) {
        const { error: upErr } = await supabase.from('quotes').update(payload).eq('id', savedQuoteId);
        if (upErr) throw upErr;
      } else {
        const { data: quote, error: insErr } = await supabase.from('quotes').insert(payload).select().single();
        if (insErr) throw insErr;
        savedQuoteId = quote.id;
        setQuoteId(savedQuoteId);
      }

      await logActivity({
        action: 'created',
        resourceType: leadType,
        resourceId: leadId,
        description: `Quote ${payload.quote_number} saved as draft`,
        metadata: { quote_id: savedQuoteId, estimate_low: payload.estimate_low, estimate_high: payload.estimate_high },
      });

      alert('Quote saved as draft');
    } catch (err: any) {
      setError(err.message || 'Failed to save quote');
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuote = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const leadId = await ensureLead();
      const leadType = activeLead?.type ?? 'public_quote_request';

      let currentQuoteId = quoteId;

      if (!currentQuoteId) {
        const { data: quoteNumberData, error: qnError } = await supabase.rpc('generate_quote_number');
        if (qnError) throw qnError;
        const payload = { ...buildQuotePayload('sent', leadId, leadType), quote_number: quoteNumberData };
        const { data: quote, error: insErr } = await supabase.from('quotes').insert(payload).select().single();
        if (insErr) throw insErr;
        currentQuoteId = quote.id;
        setQuoteId(currentQuoteId);
      } else {
        const payload = buildQuotePayload('sent', leadId, leadType);
        delete payload.quote_number;
        const { error: upErr } = await supabase.from('quotes').update(payload).eq('id', currentQuoteId);
        if (upErr) throw upErr;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14);

      const { data: linkData, error: linkError } = await supabase.rpc('create_quote_magic_link', {
        p_quote_id: currentQuoteId,
        p_expires_at: expiresAt.toISOString(),
      });
      if (linkError) throw linkError;

      const fullLink = `${window.location.origin}/q/${linkData.token}`;
      setMagicLink(fullLink);

      const tableName = leadType === 'public_quote_request' ? 'public_quote_requests' : 'service_requests';
      await supabase.from(tableName).update({ status: 'quoted' }).eq('id', leadId);

      const currentContact = resolvedLead();

      await logActivity({
        action: 'sent',
        resourceType: leadType,
        resourceId: leadId,
        description: `Quote sent via magic link to ${currentContact.contact_name}`,
        metadata: {
          quote_id: currentQuoteId,
          magic_link: fullLink,
          estimate_low: estimateResult?.estimate_low,
          estimate_high: estimateResult?.estimate_high,
          recipient_email: currentContact.contact_email,
          recipient_phone: currentContact.contact_phone,
        },
      });

      try {
        const { data: settingsData } = await supabase
          .from('company_settings')
          .select('phone')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        const companyPhone = settingsData?.phone || '';
        const low = manualOverride && estimateLow ? parseFloat(estimateLow) : estimateResult?.estimate_low ?? null;
        const high = manualOverride && estimateHigh ? parseFloat(estimateHigh) : estimateResult?.estimate_high ?? null;

        const rangeStr =
          low && high ? `${formatCurrency(low)}–${formatCurrency(high)}` :
          high ? formatCurrency(high) :
          low ? formatCurrency(low) : '';

        const serviceLabel = getServiceLabel(serviceType);
        let channel = 'email';
        let toEmail = '';
        let toPhone = '';

        if (currentContact.preferred_contact_method === 'sms' && currentContact.contact_phone) {
          channel = 'sms';
          toPhone = currentContact.contact_phone;
        } else if (currentContact.contact_email) {
          channel = 'email';
          toEmail = currentContact.contact_email;
        } else if (currentContact.contact_phone) {
          channel = 'sms';
          toPhone = currentContact.contact_phone;
        }

        if (toEmail || toPhone) {
          await supabase.rpc('enqueue_notification', {
            p_event_key: 'quote_sent',
            p_audience: 'customer',
            p_channel: channel,
            p_service_type: serviceType,
            p_to_email: toEmail,
            p_to_phone: toPhone,
            p_payload: {
              customer_name: currentContact.contact_name,
              service_label: serviceLabel,
              range: rangeStr,
              quote_link: fullLink,
              company_phone: companyPhone,
            },
          });
        }
      } catch (_enqueueErr) {
        // Non-fatal
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send quote');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (magicLink) {
    const currentContact = resolvedLead();
    const smsTemplate = `BudgetWorks quote: ${magicLink} Reply here if you have questions.`;
    const emailSubject = `Your Quote from BudgetWorks`;
    const emailBody = `Hi ${currentContact.contact_name},\n\nThank you for requesting a quote from BudgetWorks. Please review your quote at the link below:\n\n${magicLink}\n\nThis quote is valid for 14 days. If you have any questions, please don't hesitate to reach out.\n\nBest regards,\nBudgetWorks Team`;

    return (
      <PortalLayout
        portalName="Admin Portal"
        sidebarSections={sidebarSections}
        activeItemId="service-requests"
        breadcrumbs={[{ label: 'Leads', onClick: onSuccess }, { label: 'Create Quote' }]}
      >
        <div className="min-h-[60vh] flex items-center justify-center">
          <Card className="w-full max-w-2xl p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-green-100 p-4 rounded-full">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Quote Link Created!</h2>
            <p className="text-gray-600 mb-6 text-center">
              Share this link with {currentContact.contact_name}
              {currentContact.preferred_contact_method ? ` via their preferred method: ${currentContact.preferred_contact_method}` : ''}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quote Link</label>
                <div className="flex gap-2">
                  <Input value={magicLink} readOnly className="flex-1 font-mono text-sm" />
                  <Button variant="secondary" onClick={() => handleCopy(magicLink, 'link')} className="flex items-center gap-2">
                    {copied === 'link' ? <><CheckCircle className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />Copy</>}
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMS Template</label>
                <div className="flex gap-2">
                  <textarea value={smsTemplate} readOnly rows={2} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50" />
                  <Button variant="secondary" onClick={() => handleCopy(smsTemplate, 'sms')} className="flex items-center gap-2">
                    {copied === 'sms' ? <><CheckCircle className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />Copy SMS</>}
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Template</label>
                <div className="space-y-2">
                  <Input value={emailSubject} readOnly className="flex-1 text-sm bg-gray-50" placeholder="Subject" />
                  <div className="flex gap-2">
                    <textarea value={emailBody} readOnly rows={6} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50" />
                    <Button variant="secondary" onClick={() => handleCopy(`Subject: ${emailSubject}\n\n${emailBody}`, 'email')} className="flex items-center gap-2">
                      {copied === 'email' ? <><CheckCircle className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />Copy Email</>}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-6 border-t">
              <Button variant="secondary" className="flex-1" onClick={onBack}>Back to Lead</Button>
              <Button variant="primary" className="flex-1" onClick={onSuccess}>Done</Button>
            </div>
          </Card>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      portalName="Admin Portal"
      sidebarSections={sidebarSections}
      activeItemId="service-requests"
      breadcrumbs={[{ label: 'Leads', onClick: onBack }, { label: isPhoneMode ? 'New Phone Quote' : 'Create Quote' }]}
    >
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Leads
        </Button>

        {isPhoneMode && (
          <PhoneContactForm value={phoneContact} onChange={setPhoneContact} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {!isPhoneMode && activeLead && (
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Summary</h3>
                <div className="space-y-4">
                  <div>
                    <span className="px-3 py-1.5 text-sm font-semibold bg-orange-100 text-orange-700 rounded-full">
                      {getServiceLabel(serviceType)}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Contact</h4>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{activeLead.contact_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-xs">{activeLead.contact_email}</span>
                      </div>
                      {activeLead.contact_phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{activeLead.contact_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {activeLead.preferred_contact_method && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">Preferred Contact</h4>
                      <p className="text-sm text-gray-900 capitalize">{activeLead.preferred_contact_method}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Location</h4>
                    <div className="flex items-start gap-2 text-sm text-gray-900">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span>{activeLead.location_address}</span>
                    </div>
                  </div>
                  {activeLead.preferred_date && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">Preferred Date</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatDate(activeLead.preferred_date)}</span>
                      </div>
                    </div>
                  )}
                  {activeLead.description && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">Description</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{activeLead.description}</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          <div className={!isPhoneMode && activeLead ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <Card className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {isPhoneMode ? 'New Phone Quote' : 'Create Quote'}
                </h2>
                <p className="text-gray-500 text-sm">
                  {isPhoneMode
                    ? 'Enter customer details above, then calculate an estimate below.'
                    : `Provide an estimate range for this ${getServiceLabel(serviceType).toLowerCase()} job`}
                </p>
              </div>

              {!pricingConfigured && !loadingSettings && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
                  <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Pricing not configured for {getServiceLabel(serviceType)}</p>
                    <p className="text-xs mt-0.5">Go to Settings &rarr; Pricing to configure before using the estimate calculator.</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSendQuote} className="space-y-8">
                <div>
                  <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b">
                    Job Details — {getServiceLabel(serviceType)}
                  </h3>
                  {serviceType === 'moving' && (
                    <MovingInputPanel value={movingInputs} onChange={setMovingInputs} />
                  )}
                  {serviceType === 'junk_removal' && (
                    <JunkInputPanel value={junkInputs} onChange={setJunkInputs} />
                  )}
                  {serviceType === 'demolition' && (
                    <DemoInputPanel value={demoInputs} onChange={setDemoInputs} />
                  )}
                </div>

                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCalculate}
                    disabled={!pricingConfigured || loadingSettings}
                    className="flex items-center gap-2"
                  >
                    <Calculator className="w-4 h-4" />
                    {loadingSettings ? 'Loading settings...' : 'Calculate Estimate'}
                  </Button>
                </div>

                {estimateResult && (
                  <EstimateDisplay
                    result={estimateResult}
                    manualOverride={manualOverride}
                    onToggleOverride={() => setManualOverride((v) => !v)}
                    estimateLow={estimateLow}
                    estimateHigh={estimateHigh}
                    onChangeLow={setEstimateLow}
                    onChangeHigh={setEstimateHigh}
                  />
                )}

                {!estimateResult && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Estimate Low ($)"
                      type="number"
                      value={estimateLow}
                      onChange={(e) => setEstimateLow(e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="Minimum estimate"
                    />
                    <Input
                      label="Estimate High ($)"
                      type="number"
                      value={estimateHigh}
                      onChange={(e) => setEstimateHigh(e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="Maximum estimate"
                    />
                  </div>
                )}

                <Input
                  label="Cap Amount (Not-to-Exceed) — Optional"
                  type="number"
                  value={capAmount}
                  onChange={(e) => setCapAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="Maximum amount (optional)"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Internal Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Internal notes about pricing, considerations, etc..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-colors duration-200 text-sm"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t">
                  <Button type="button" variant="ghost" onClick={onBack} disabled={loading}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleDownloadPDF}
                    disabled={!estimateResult && !estimateLow && !estimateHigh}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleSaveDraft} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Draft'}
                  </Button>
                  <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Quote Link'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
