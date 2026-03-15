import { useState, useEffect, useCallback } from 'react';
import { Save, CheckCircle, Circle, Truck, Trash2, Hammer, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { fetchPricingSettings, upsertPricingSettings, PricingServiceType } from '../../lib/supabase';

// --------------- Moving defaults ---------------
const MOVING_DEFAULTS = {
  base_movers: 2,
  mover_hourly_rate: 35,
  fuel_price_per_liter: 1.65,
  profit_margin_pct: 20,
  load_tiers: [
    { label: 'Small', min_hours: 2, max_hours: 4 },
    { label: 'Medium', min_hours: 4, max_hours: 6 },
    { label: 'Large', min_hours: 6, max_hours: 9 },
    { label: 'XL', min_hours: 9, max_hours: 14 },
  ],
  distance_bands: [
    { label: '0–30 km', add_hours_min: 0, add_hours_max: 0 },
    { label: '31–60 km', add_hours_min: 0.5, add_hours_max: 1 },
    { label: '61–150 km', add_hours_min: 1, add_hours_max: 2 },
    { label: '151–300 km', add_hours_min: 2, add_hours_max: 4 },
    { label: '301–600 km', add_hours_min: 4, add_hours_max: 7 },
  ],
  truck_provider: 'Ryder' as 'Ryder' | 'U-Haul' | 'Flat Fee',
  flat_truck_cost: 200,
  truck_daily_fee: 120,
  truck_per_km_mileage: 0.28,
  truck_liters_per_100km: 14,
  truck_insurance_fee: 30,
  addons: {
    heavy_item: 60,
    stairs_3plus: 40,
    parking_tight: 30,
    packing: 75,
    assembly: 50,
    overnight_storage: 120,
  },
};

// --------------- Junk Removal defaults ---------------
const JUNK_DEFAULTS = {
  load_tiers: [
    { label: '1/8 Load', min_total: 100, max_total: 150 },
    { label: '1/4 Load', min_total: 150, max_total: 225 },
    { label: '1/2 Load', min_total: 225, max_total: 325 },
    { label: '3/4 Load', min_total: 325, max_total: 425 },
    { label: 'Full Load', min_total: 425, max_total: 550 },
  ],
  addons: {
    heavy_item: 40,
    stairs_3plus: 30,
    mattress: 25,
    appliance: 35,
    extra_trip: 100,
  },
  default_crew: { drivers: 1, helpers: 1 },
};

// --------------- Light Demo defaults ---------------
const DEMO_DEFAULTS = {
  scope_tiers: [
    { label: 'Small', min_hours: 2, max_hours: 4 },
    { label: 'Medium', min_hours: 4, max_hours: 8 },
    { label: 'Large', min_hours: 8, max_hours: 16 },
  ],
  hourly_rate_per_worker: 50,
  default_crew: { drivers: 1, helpers: 1 },
  debris_disposal_min: 80,
  debris_disposal_max: 200,
  addons: {
    flooring: 150,
    tile: 180,
    cabinets: 200,
    drywall: 120,
  },
};

// --------------- Helpers ---------------
function numVal(v: any, fallback = 0): number {
  const n = parseFloat(String(v));
  return isNaN(n) ? fallback : n;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <label className="w-56 shrink-0 text-sm font-medium text-gray-700">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function NumInput({
  value,
  onChange,
  step = '1',
  min = '0',
  prefix,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: string;
  min?: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {prefix && <span className="text-sm text-gray-500 shrink-0">{prefix}</span>}
      <input
        type="number"
        step={step}
        min={min}
        value={value}
        onChange={(e) => onChange(numVal(e.target.value))}
        className="w-28 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {suffix && <span className="text-sm text-gray-500 shrink-0">{suffix}</span>}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mt-5 mb-2">{children}</p>;
}

// ================================================================
// Moving Settings Form
// ================================================================
function MovingForm({ data, onChange }: { data: typeof MOVING_DEFAULTS; onChange: (d: typeof MOVING_DEFAULTS) => void }) {
  const set = <K extends keyof typeof MOVING_DEFAULTS>(key: K, val: (typeof MOVING_DEFAULTS)[K]) =>
    onChange({ ...data, [key]: val });

  const setAddon = (key: keyof typeof data.addons, val: number) =>
    onChange({ ...data, addons: { ...data.addons, [key]: val } });

  const setTier = (i: number, field: 'min_hours' | 'max_hours', val: number) => {
    const tiers = data.load_tiers.map((t, idx) => (idx === i ? { ...t, [field]: val } : t));
    onChange({ ...data, load_tiers: tiers });
  };

  const setBand = (i: number, field: 'add_hours_min' | 'add_hours_max', val: number) => {
    const bands = data.distance_bands.map((b, idx) => (idx === i ? { ...b, [field]: val } : b));
    onChange({ ...data, distance_bands: bands });
  };

  const isFlatFee = data.truck_provider === 'Flat Fee';

  return (
    <div className="space-y-2">
      <SectionHeader>Crew & Rates</SectionHeader>
      <FieldRow label="Base movers">
        <NumInput value={data.base_movers} onChange={(v) => set('base_movers', v)} min="1" />
      </FieldRow>
      <FieldRow label="Per-mover hourly rate">
        <NumInput value={data.mover_hourly_rate} onChange={(v) => set('mover_hourly_rate', v)} step="0.5" prefix="$" suffix="/hr" />
      </FieldRow>
      <FieldRow label="Fuel price">
        <NumInput value={data.fuel_price_per_liter} onChange={(v) => set('fuel_price_per_liter', v)} step="0.01" prefix="$" suffix="/L" />
      </FieldRow>
      <FieldRow label="Default profit margin">
        <NumInput value={data.profit_margin_pct} onChange={(v) => set('profit_margin_pct', v)} step="1" suffix="%" />
      </FieldRow>

      <SectionHeader>Load Tiers (hours)</SectionHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 text-xs">
              <th className="pb-1 pr-4 font-medium">Size</th>
              <th className="pb-1 pr-4 font-medium">Min hrs</th>
              <th className="pb-1 font-medium">Max hrs</th>
            </tr>
          </thead>
          <tbody className="space-y-1">
            {data.load_tiers.map((t, i) => (
              <tr key={t.label}>
                <td className="pr-4 py-1 font-medium text-gray-700 whitespace-nowrap">{t.label}</td>
                <td className="pr-4 py-1">
                  <NumInput value={t.min_hours} onChange={(v) => setTier(i, 'min_hours', v)} step="0.5" />
                </td>
                <td className="py-1">
                  <NumInput value={t.max_hours} onChange={(v) => setTier(i, 'max_hours', v)} step="0.5" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHeader>Distance Bands (+hours)</SectionHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 text-xs">
              <th className="pb-1 pr-4 font-medium">Range</th>
              <th className="pb-1 pr-4 font-medium">+hrs min</th>
              <th className="pb-1 font-medium">+hrs max</th>
            </tr>
          </thead>
          <tbody>
            {data.distance_bands.map((b, i) => (
              <tr key={b.label}>
                <td className="pr-4 py-1 font-medium text-gray-700 whitespace-nowrap">{b.label}</td>
                <td className="pr-4 py-1">
                  <NumInput value={b.add_hours_min} onChange={(v) => setBand(i, 'add_hours_min', v)} step="0.5" />
                </td>
                <td className="py-1">
                  <NumInput value={b.add_hours_max} onChange={(v) => setBand(i, 'add_hours_max', v)} step="0.5" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHeader>Truck Rental</SectionHeader>
      <FieldRow label="Provider">
        <select
          value={data.truck_provider}
          onChange={(e) => set('truck_provider', e.target.value as typeof data.truck_provider)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option>Ryder</option>
          <option>U-Haul</option>
          <option>Flat Fee</option>
        </select>
      </FieldRow>
      {isFlatFee ? (
        <FieldRow label="Flat truck cost">
          <NumInput value={data.flat_truck_cost} onChange={(v) => set('flat_truck_cost', v)} step="5" prefix="$" />
        </FieldRow>
      ) : (
        <>
          <FieldRow label="Daily fee">
            <NumInput value={data.truck_daily_fee} onChange={(v) => set('truck_daily_fee', v)} step="5" prefix="$" suffix="/day" />
          </FieldRow>
          <FieldRow label="Per km mileage">
            <NumInput value={data.truck_per_km_mileage} onChange={(v) => set('truck_per_km_mileage', v)} step="0.01" prefix="$" suffix="/km" />
          </FieldRow>
          <FieldRow label="Fuel consumption">
            <NumInput value={data.truck_liters_per_100km} onChange={(v) => set('truck_liters_per_100km', v)} step="0.5" suffix="L/100km" />
          </FieldRow>
          <FieldRow label="Insurance fee">
            <NumInput value={data.truck_insurance_fee} onChange={(v) => set('truck_insurance_fee', v)} step="5" prefix="$" suffix="/day" />
          </FieldRow>
        </>
      )}

      <SectionHeader>Add-on Prices</SectionHeader>
      {(Object.keys(data.addons) as Array<keyof typeof data.addons>).map((key) => (
        <FieldRow key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}>
          <NumInput value={data.addons[key]} onChange={(v) => setAddon(key, v)} step="5" prefix="$" />
        </FieldRow>
      ))}
    </div>
  );
}

// ================================================================
// Junk Removal Settings Form
// ================================================================
function JunkForm({ data, onChange }: { data: typeof JUNK_DEFAULTS; onChange: (d: typeof JUNK_DEFAULTS) => void }) {
  const setTier = (i: number, field: 'min_total' | 'max_total', val: number) => {
    const tiers = data.load_tiers.map((t, idx) => (idx === i ? { ...t, [field]: val } : t));
    onChange({ ...data, load_tiers: tiers });
  };

  const setAddon = (key: keyof typeof data.addons, val: number) =>
    onChange({ ...data, addons: { ...data.addons, [key]: val } });

  const setCrew = (field: 'drivers' | 'helpers', val: number) =>
    onChange({ ...data, default_crew: { ...data.default_crew, [field]: val } });

  return (
    <div className="space-y-2">
      <SectionHeader>Load Tiers (price range)</SectionHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 text-xs">
              <th className="pb-1 pr-4 font-medium">Load</th>
              <th className="pb-1 pr-4 font-medium">Min $</th>
              <th className="pb-1 font-medium">Max $</th>
            </tr>
          </thead>
          <tbody>
            {data.load_tiers.map((t, i) => (
              <tr key={t.label}>
                <td className="pr-4 py-1 font-medium text-gray-700 whitespace-nowrap">{t.label}</td>
                <td className="pr-4 py-1">
                  <NumInput value={t.min_total} onChange={(v) => setTier(i, 'min_total', v)} step="5" prefix="$" />
                </td>
                <td className="py-1">
                  <NumInput value={t.max_total} onChange={(v) => setTier(i, 'max_total', v)} step="5" prefix="$" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHeader>Add-on Prices</SectionHeader>
      {(Object.keys(data.addons) as Array<keyof typeof data.addons>).map((key) => (
        <FieldRow key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}>
          <NumInput value={data.addons[key]} onChange={(v) => setAddon(key, v)} step="5" prefix="$" />
        </FieldRow>
      ))}

      <SectionHeader>Default Crew</SectionHeader>
      <FieldRow label="Drivers">
        <NumInput value={data.default_crew.drivers} onChange={(v) => setCrew('drivers', v)} min="0" />
      </FieldRow>
      <FieldRow label="Helpers">
        <NumInput value={data.default_crew.helpers} onChange={(v) => setCrew('helpers', v)} min="0" />
      </FieldRow>
    </div>
  );
}

// ================================================================
// Light Demo Settings Form
// ================================================================
function DemoForm({ data, onChange }: { data: typeof DEMO_DEFAULTS; onChange: (d: typeof DEMO_DEFAULTS) => void }) {
  const setTier = (i: number, field: 'min_hours' | 'max_hours', val: number) => {
    const tiers = data.scope_tiers.map((t, idx) => (idx === i ? { ...t, [field]: val } : t));
    onChange({ ...data, scope_tiers: tiers });
  };

  const setAddon = (key: keyof typeof data.addons, val: number) =>
    onChange({ ...data, addons: { ...data.addons, [key]: val } });

  const setCrew = (field: 'drivers' | 'helpers', val: number) =>
    onChange({ ...data, default_crew: { ...data.default_crew, [field]: val } });

  return (
    <div className="space-y-2">
      <SectionHeader>Scope Tiers (hours)</SectionHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 text-xs">
              <th className="pb-1 pr-4 font-medium">Scope</th>
              <th className="pb-1 pr-4 font-medium">Min hrs</th>
              <th className="pb-1 font-medium">Max hrs</th>
            </tr>
          </thead>
          <tbody>
            {data.scope_tiers.map((t, i) => (
              <tr key={t.label}>
                <td className="pr-4 py-1 font-medium text-gray-700 whitespace-nowrap">{t.label}</td>
                <td className="pr-4 py-1">
                  <NumInput value={t.min_hours} onChange={(v) => setTier(i, 'min_hours', v)} step="0.5" />
                </td>
                <td className="py-1">
                  <NumInput value={t.max_hours} onChange={(v) => setTier(i, 'max_hours', v)} step="0.5" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHeader>Labour Rate</SectionHeader>
      <FieldRow label="Hourly rate per worker">
        <NumInput value={data.hourly_rate_per_worker} onChange={(v) => onChange({ ...data, hourly_rate_per_worker: v })} step="2.5" prefix="$" suffix="/hr" />
      </FieldRow>

      <SectionHeader>Default Crew</SectionHeader>
      <FieldRow label="Drivers">
        <NumInput value={data.default_crew.drivers} onChange={(v) => setCrew('drivers', v)} min="0" />
      </FieldRow>
      <FieldRow label="Helpers">
        <NumInput value={data.default_crew.helpers} onChange={(v) => setCrew('helpers', v)} min="0" />
      </FieldRow>

      <SectionHeader>Debris / Disposal Allowance</SectionHeader>
      <FieldRow label="Min disposal cost">
        <NumInput value={data.debris_disposal_min} onChange={(v) => onChange({ ...data, debris_disposal_min: v })} step="10" prefix="$" />
      </FieldRow>
      <FieldRow label="Max disposal cost">
        <NumInput value={data.debris_disposal_max} onChange={(v) => onChange({ ...data, debris_disposal_max: v })} step="10" prefix="$" />
      </FieldRow>

      <SectionHeader>Add-on Flat Adders</SectionHeader>
      {(Object.keys(data.addons) as Array<keyof typeof data.addons>).map((key) => (
        <FieldRow key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}>
          <NumInput value={data.addons[key]} onChange={(v) => setAddon(key, v)} step="10" prefix="$" />
        </FieldRow>
      ))}
    </div>
  );
}

// ================================================================
// Service Card
// ================================================================
type ServiceConfig = {
  key: PricingServiceType;
  label: string;
  icon: React.ReactNode;
  defaults: Record<string, any>;
  renderForm: (data: any, onChange: (d: any) => void) => React.ReactNode;
};

function ServiceCard({ config }: { config: ServiceConfig }) {
  const [open, setOpen] = useState(false);
  const [localData, setLocalData] = useState<Record<string, any>>(config.defaults);
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'ok' | 'err'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchPricingSettings(config.key);
    if (data) {
      const merged = { ...config.defaults, ...data.settings };
      setLocalData(merged);
      setIsConfigured(data.is_configured);
    }
    setLoading(false);
  }, [config.key]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setSaveState('idle');
    const { error } = await upsertPricingSettings(config.key, localData, isConfigured);
    setSaving(false);
    if (error) {
      setSaveState('err');
      setErrMsg(error.message || 'Save failed');
    } else {
      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div
        className="flex items-center justify-between p-5 cursor-pointer select-none hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            {config.icon}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{config.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {loading ? 'Loading…' : isConfigured ? 'Configured' : 'Not yet configured'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isConfigured ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" /> Configured
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
              <Circle className="w-3.5 h-3.5" /> Draft
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 p-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {config.renderForm(localData, setLocalData)}

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setIsConfigured((v) => !v)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      isConfigured ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isConfigured ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm font-medium text-gray-700">Mark as configured</span>
                </label>

                <div className="flex items-center gap-3">
                  {saveState === 'ok' && (
                    <span className="text-sm text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Saved
                    </span>
                  )}
                  {saveState === 'err' && (
                    <span className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> {errMsg}
                    </span>
                  )}
                  <Button variant="primary" onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-1.5" />
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

// ================================================================
// Main export
// ================================================================
export function PricingSettings() {
  const services: ServiceConfig[] = [
    {
      key: 'moving',
      label: 'Moving',
      icon: <Truck className="w-5 h-5" />,
      defaults: MOVING_DEFAULTS,
      renderForm: (data, onChange) => <MovingForm data={data as typeof MOVING_DEFAULTS} onChange={onChange} />,
    },
    {
      key: 'junk_removal',
      label: 'Junk Removal',
      icon: <Trash2 className="w-5 h-5" />,
      defaults: JUNK_DEFAULTS,
      renderForm: (data, onChange) => <JunkForm data={data as typeof JUNK_DEFAULTS} onChange={onChange} />,
    },
    {
      key: 'demolition',
      label: 'Light Demo',
      icon: <Hammer className="w-5 h-5" />,
      defaults: DEMO_DEFAULTS,
      renderForm: (data, onChange) => <DemoForm data={data as typeof DEMO_DEFAULTS} onChange={onChange} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <p className="text-sm text-gray-600">
          Configure pricing defaults for each service type. These are used as starting points when building quotes.
          Toggle "Mark as configured" once you have reviewed and set the values.
        </p>
      </div>
      {services.map((s) => (
        <ServiceCard key={s.key} config={s} />
      ))}
    </div>
  );
}
