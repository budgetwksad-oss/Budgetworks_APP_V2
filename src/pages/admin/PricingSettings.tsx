import { useState, useEffect, useCallback } from 'react';
import { Save, CheckCircle, Circle, Truck, Trash2, Hammer, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { fetchPricingSettings, upsertPricingSettings, PricingServiceType } from '../../lib/supabase';
import { HALIFAX_MOVING_DEFAULTS, HALIFAX_JUNK_DEFAULTS, HALIFAX_DEMO_DEFAULTS } from '../../lib/pricingEngine';

// --------------- Helpers ---------------
function numVal(v: any, fallback = 0): number {
  const n = parseFloat(String(v));
  return isNaN(n) ? fallback : n;
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-56 shrink-0 pt-1.5">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
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
  return <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mt-6 mb-3">{children}</p>;
}

// ================================================================
// Moving Settings Form
// ================================================================
type MovingData = typeof HALIFAX_MOVING_DEFAULTS;

function MovingForm({ data, onChange }: { data: MovingData; onChange: (d: MovingData) => void }) {
  const set = <K extends keyof MovingData>(key: K, val: MovingData[K]) =>
    onChange({ ...data, [key]: val });

  const setAddon = (key: keyof typeof data.addons, val: number) =>
    onChange({ ...data, addons: { ...data.addons, [key]: val } });

  const setSpecialItem = (key: keyof typeof data.special_items, val: number) =>
    onChange({ ...data, special_items: { ...data.special_items, [key]: val } });

  const setTier = (i: number, field: 'min_hours' | 'max_hours', val: number) => {
    const tiers = data.load_tiers.map((t, idx) => (idx === i ? { ...t, [field]: val } : t));
    onChange({ ...data, load_tiers: tiers });
  };

  const setBand = (i: number, field: 'add_hours_min' | 'add_hours_max', val: number) => {
    const bands = data.distance_bands.map((b, idx) => (idx === i ? { ...b, [field]: val } : b));
    onChange({ ...data, distance_bands: bands });
  };

  const isFlatFee = data.truck_provider === 'Flat Fee';

  const ADDON_LABELS: Record<keyof typeof data.addons, string> = {
    heavy_item: 'Heavy item',
    stairs_3plus: 'Stairs (3+ flights)',
    parking_tight: 'Tight parking',
    packing: 'Packing service',
    assembly: 'Assembly / disassembly',
    overnight_storage: 'Overnight storage',
    elevator_booking: 'Elevator booking fee',
  };

  const SPECIAL_LABELS: Record<keyof typeof data.special_items, string> = {
    piano: 'Piano',
    safe: 'Safe',
    hot_tub: 'Hot tub',
    pool_table: 'Pool table',
  };

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

      <SectionHeader>Floor & Building Premiums</SectionHeader>
      <FieldRow label="Floor premium per level" hint="Per stair floor (no elevator)">
        <NumInput value={data.floor_premium_per_level} onChange={(v) => set('floor_premium_per_level', v)} step="5" prefix="$" suffix="/floor" />
      </FieldRow>
      <FieldRow label="Elevator booking fee" hint="When booking required by building">
        <NumInput value={data.elevator_booking_fee} onChange={(v) => set('elevator_booking_fee', v)} step="5" prefix="$" />
      </FieldRow>
      <FieldRow label="Weekend surcharge" hint="Per mover, for weekend/holiday moves">
        <NumInput value={data.weekend_surcharge_per_mover} onChange={(v) => set('weekend_surcharge_per_mover', v)} step="5" prefix="$" suffix="/mover" />
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
          <tbody>
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
          onChange={(e) => set('truck_provider', e.target.value as MovingData['truck_provider'])}
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

      <SectionHeader>Special Item Prices</SectionHeader>
      <p className="text-xs text-gray-500 mb-2">Flat surcharges for oversized or specialty items</p>
      {(Object.keys(data.special_items) as Array<keyof typeof data.special_items>).map((key) => (
        <FieldRow key={key} label={SPECIAL_LABELS[key]}>
          <NumInput value={data.special_items[key]} onChange={(v) => setSpecialItem(key, v)} step="25" prefix="$" />
        </FieldRow>
      ))}

      <SectionHeader>Add-on Prices</SectionHeader>
      {(Object.keys(data.addons) as Array<keyof typeof data.addons>).map((key) => (
        <FieldRow key={key} label={ADDON_LABELS[key] ?? key.replace(/_/g, ' ')}>
          <NumInput value={data.addons[key]} onChange={(v) => setAddon(key, v)} step="5" prefix="$" />
        </FieldRow>
      ))}
    </div>
  );
}

// ================================================================
// Junk Removal Settings Form
// ================================================================
type JunkData = typeof HALIFAX_JUNK_DEFAULTS;

function JunkForm({ data, onChange }: { data: JunkData; onChange: (d: JunkData) => void }) {
  const setTier = (i: number, field: 'min_total' | 'max_total', val: number) => {
    const tiers = data.load_tiers.map((t, idx) => (idx === i ? { ...t, [field]: val } : t));
    onChange({ ...data, load_tiers: tiers });
  };

  const setAddon = (key: keyof typeof data.addons, val: number) =>
    onChange({ ...data, addons: { ...data.addons, [key]: val } });

  const setCrew = (field: 'drivers' | 'helpers', val: number) =>
    onChange({ ...data, default_crew: { ...data.default_crew, [field]: val } });

  const setDisposalFee = (key: keyof typeof data.hrm_disposal_fees, val: number) =>
    onChange({ ...data, hrm_disposal_fees: { ...data.hrm_disposal_fees, [key]: val } });

  const setAccessSurcharge = (key: keyof typeof data.access_surcharges, val: number) =>
    onChange({ ...data, access_surcharges: { ...data.access_surcharges, [key]: val } });

  const DISPOSAL_LABELS: Record<keyof typeof data.hrm_disposal_fees, string> = {
    general: 'General household / furniture',
    appliance_no_freon: 'Appliances (no refrigerant)',
    appliance_freon: 'Appliances with refrigerant',
    electronics: 'Electronics / WEEE',
    mattress: 'Mattresses',
    tires: 'Tires (per unit)',
    construction_debris: 'Construction / renovation debris',
    paint_hazmat: 'Paint / hazardous materials',
  };

  const ACCESS_LABELS: Record<keyof typeof data.access_surcharges, string> = {
    ground_floor: 'Ground floor / easy access',
    stairs: 'Stairs required',
    elevator: 'Elevator building',
    attic_basement: 'Attic or basement',
  };

  const ADDON_LABELS: Record<keyof typeof data.addons, string> = {
    heavy_item: 'Heavy item',
    stairs_3plus: 'Stairs (3+ flights)',
    mattress: 'Mattress surcharge',
    appliance: 'Appliance surcharge',
    extra_trip: 'Extra trip',
  };

  return (
    <div className="space-y-2">
      <SectionHeader>Minimum Charge</SectionHeader>
      <FieldRow label="Minimum job charge" hint="Applied even if load tier total is lower">
        <NumInput value={data.min_charge} onChange={(v) => onChange({ ...data, min_charge: v })} step="5" prefix="$" />
      </FieldRow>

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

      <SectionHeader>HRM Disposal Fees</SectionHeader>
      <p className="text-xs text-gray-500 mb-2">Per-category surcharges based on Halifax Regional Municipality disposal rates</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 text-xs">
              <th className="pb-1 pr-4 font-medium">Category</th>
              <th className="pb-1 font-medium">Surcharge</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(data.hrm_disposal_fees) as Array<keyof typeof data.hrm_disposal_fees>).map((key) => (
              <tr key={key}>
                <td className="pr-4 py-1.5 text-gray-700">{DISPOSAL_LABELS[key]}</td>
                <td className="py-1.5">
                  <NumInput value={data.hrm_disposal_fees[key]} onChange={(v) => setDisposalFee(key, v)} step="5" prefix="$" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHeader>Access Surcharges</SectionHeader>
      {(Object.keys(data.access_surcharges) as Array<keyof typeof data.access_surcharges>).map((key) => (
        <FieldRow key={key} label={ACCESS_LABELS[key]}>
          <NumInput value={data.access_surcharges[key]} onChange={(v) => setAccessSurcharge(key, v)} step="5" prefix="$" />
        </FieldRow>
      ))}

      <SectionHeader>Add-on Prices</SectionHeader>
      {(Object.keys(data.addons) as Array<keyof typeof data.addons>).map((key) => (
        <FieldRow key={key} label={ADDON_LABELS[key] ?? key.replace(/_/g, ' ')}>
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
type DemoData = typeof HALIFAX_DEMO_DEFAULTS;

function DemoForm({ data, onChange }: { data: DemoData; onChange: (d: DemoData) => void }) {
  const setTier = (i: number, field: 'min_hours' | 'max_hours', val: number) => {
    const tiers = data.scope_tiers.map((t, idx) => (idx === i ? { ...t, [field]: val } : t));
    onChange({ ...data, scope_tiers: tiers });
  };

  const setAddon = (key: keyof typeof data.addons, val: number) =>
    onChange({ ...data, addons: { ...data.addons, [key]: val } });

  const setCrew = (field: 'drivers' | 'helpers', val: number) =>
    onChange({ ...data, default_crew: { ...data.default_crew, [field]: val } });

  const setDebrisRate = (cls: keyof typeof data.debris_class_rates, field: 'min' | 'max', val: number) =>
    onChange({ ...data, debris_class_rates: { ...data.debris_class_rates, [cls]: { ...data.debris_class_rates[cls], [field]: val } } });

  const DEBRIS_LABELS: Record<keyof typeof data.debris_class_rates, string> = {
    clean_wood: 'Clean wood / framing',
    drywall: 'Drywall / plaster',
    concrete: 'Concrete / masonry',
    mixed: 'Mixed / general demo',
  };

  const ADDON_LABELS: Record<keyof typeof data.addons, string> = {
    flooring: 'Flooring removal',
    tile: 'Tile removal',
    cabinets: 'Cabinet removal',
    drywall: 'Drywall removal',
  };

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

      <SectionHeader>Debris Class Disposal Rates</SectionHeader>
      <p className="text-xs text-gray-500 mb-2">HRM Otter Lake tipping fees by debris type</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 text-xs">
              <th className="pb-1 pr-4 font-medium">Debris Class</th>
              <th className="pb-1 pr-4 font-medium">Min $</th>
              <th className="pb-1 font-medium">Max $</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(data.debris_class_rates) as Array<keyof typeof data.debris_class_rates>).map((cls) => (
              <tr key={cls}>
                <td className="pr-4 py-1.5 text-gray-700">{DEBRIS_LABELS[cls]}</td>
                <td className="pr-4 py-1.5">
                  <NumInput value={data.debris_class_rates[cls].min} onChange={(v) => setDebrisRate(cls, 'min', v)} step="10" prefix="$" />
                </td>
                <td className="py-1.5">
                  <NumInput value={data.debris_class_rates[cls].max} onChange={(v) => setDebrisRate(cls, 'max', v)} step="10" prefix="$" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHeader>Permit & Safety Reserves</SectionHeader>
      <FieldRow label="Permit estimate (min)" hint="Shown as advisory on quote">
        <NumInput value={data.permit_estimate_range.min} onChange={(v) => onChange({ ...data, permit_estimate_range: { ...data.permit_estimate_range, min: v } })} step="25" prefix="$" />
      </FieldRow>
      <FieldRow label="Permit estimate (max)">
        <NumInput value={data.permit_estimate_range.max} onChange={(v) => onChange({ ...data, permit_estimate_range: { ...data.permit_estimate_range, max: v } })} step="25" prefix="$" />
      </FieldRow>
      <FieldRow label="Asbestos/lead reserve" hint="Added when build year is pre-1990">
        <NumInput value={data.asbestos_reserve} onChange={(v) => onChange({ ...data, asbestos_reserve: v })} step="50" prefix="$" />
      </FieldRow>

      <SectionHeader>Add-on Flat Adders</SectionHeader>
      {(Object.keys(data.addons) as Array<keyof typeof data.addons>).map((key) => (
        <FieldRow key={key} label={ADDON_LABELS[key] ?? key.replace(/_/g, ' ')}>
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
              {loading ? 'Loading…' : isConfigured ? 'Configured' : 'Using Halifax defaults'}
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
              <Circle className="w-3.5 h-3.5" /> Using defaults
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
      defaults: HALIFAX_MOVING_DEFAULTS,
      renderForm: (data, onChange) => <MovingForm data={data as MovingData} onChange={onChange} />,
    },
    {
      key: 'junk_removal',
      label: 'Junk Removal',
      icon: <Trash2 className="w-5 h-5" />,
      defaults: HALIFAX_JUNK_DEFAULTS,
      renderForm: (data, onChange) => <JunkForm data={data as JunkData} onChange={onChange} />,
    },
    {
      key: 'demolition',
      label: 'Light Demo',
      icon: <Hammer className="w-5 h-5" />,
      defaults: HALIFAX_DEMO_DEFAULTS,
      renderForm: (data, onChange) => <DemoForm data={data as DemoData} onChange={onChange} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <p className="text-sm text-gray-600">
          Configure pricing for each service type. All services use Halifax-calibrated defaults — no configuration needed to start calculating quotes.
          Toggle "Mark as configured" once you have reviewed and customized the values.
        </p>
      </div>
      {services.map((s) => (
        <ServiceCard key={s.key} config={s} />
      ))}
    </div>
  );
}
