import { useState, useEffect, useRef, FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, fetchPricingSettings, PricingServiceType, logAudit } from '../../lib/supabase';
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
  MovingLocation,
  BuildingType,
  MovingSpecialItem,
  JunkInputs,
  JunkItemCategory,
  JunkAccessType,
  DemoInputs,
  DemoStructureType,
  DemoMaterialType,
  DemoDebrisClass,
  EstimateResult,
  PricingBreakdownLine,
  QuoteInputs,
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
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Pencil,
  Download,
  Info,
  Loader2,
  Truck,
  Trash2,
  Hammer,
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
            onChange={(e) => set('preferred_contact_method', e.target.value as 'sms' | 'email' | 'call')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-sm"
          >
            <option value="sms">SMS</option>
            <option value="email">Email</option>
            <option value="call">Call</option>
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
            placeholder="123 Main St, Halifax, NS"
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

// ─── Shared primitives ────────────────────────────────────────────────────

function AddonToggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 mt-0.5 rounded border-gray-300 accent-orange-500 shrink-0"
      />
      <div>
        <span className="text-sm text-gray-700">{label}</span>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-sm"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function SubSectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 mt-4">{children}</p>;
}

// ─── Service Type Selector ─────────────────────────────────────────────────

const SERVICE_OPTIONS: { value: PricingServiceType; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'moving', label: 'Moving', icon: Truck, description: 'Local & long-distance moving' },
  { value: 'junk_removal', label: 'Junk Removal', icon: Trash2, description: 'Furniture, appliances & debris' },
  { value: 'demolition', label: 'Light Demo', icon: Hammer, description: 'Interior demolition & removal' },
];

function ServiceTypeSelector({
  value,
  onChange,
}: {
  value: PricingServiceType;
  onChange: (v: PricingServiceType) => void;
}) {
  return (
    <div className="mb-6">
      <p className="text-sm font-semibold text-gray-700 mb-3">Select Service Type</p>
      <div className="grid grid-cols-3 gap-3">
        {SERVICE_OPTIONS.map(({ value: v, label, icon: Icon, description }) => {
          const active = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`relative flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 transition-all duration-150 text-center cursor-pointer focus:outline-none ${
                active
                  ? 'border-orange-500 bg-orange-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/40'
              }`}
            >
              <div className={`p-2.5 rounded-lg ${active ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className={`text-sm font-semibold ${active ? 'text-orange-700' : 'text-gray-800'}`}>{label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-tight">{description}</p>
              </div>
              {active && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Moving Location Sub-form ─────────────────────────────────────────────

function LocationSubForm({
  label,
  value,
  onChange,
}: {
  label: string;
  value: MovingLocation;
  onChange: (v: MovingLocation) => void;
}) {
  const BUILDING_OPTIONS = [
    { value: 'house', label: 'House / Townhouse' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'condo', label: 'Condo' },
    { value: 'office', label: 'Office / Commercial' },
    { value: 'storage', label: 'Storage Unit' },
  ];

  const needsFloor = value.building_type === 'apartment' || value.building_type === 'condo' || value.building_type === 'office';

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      <SelectField
        label="Building type"
        value={value.building_type ?? 'house'}
        onChange={(v) => onChange({ ...value, building_type: v as BuildingType })}
        options={BUILDING_OPTIONS}
      />
      {needsFloor && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Floor level</label>
            <input
              type="number"
              min="0"
              max="40"
              value={value.floor_level ?? 0}
              onChange={(e) => onChange({ ...value, floor_level: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-sm"
            />
          </div>
          <div className="flex items-end pb-2">
            <AddonToggle
              label="Elevator available"
              checked={!!value.has_elevator}
              onChange={(v) => onChange({ ...value, has_elevator: v })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Moving Input Panel ───────────────────────────────────────────────────

function MovingInputPanel({
  value,
  onChange,
}: {
  value: MovingInputs;
  onChange: (v: MovingInputs) => void;
}) {
  const set = (k: keyof MovingInputs, v: MovingInputs[keyof MovingInputs]) => onChange({ ...value, [k]: v });
  const addons = value.addons ?? {};
  const setAddon = (k: string, v: boolean) => onChange({ ...value, addons: { ...addons, [k]: v } });
  const specialItems = value.special_items ?? {};
  const setSpecialItem = (k: MovingSpecialItem, v: boolean) => onChange({ ...value, special_items: { ...specialItems, [k]: v } });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          label="Load size"
          value={value.load_tier}
          onChange={(v) => set('load_tier', v)}
          options={[
            { value: 'Small', label: 'Small (studio / 1 bedroom)' },
            { value: 'Medium', label: 'Medium (2–3 bedrooms)' },
            { value: 'Large', label: 'Large (4 bedrooms)' },
            { value: 'XL', label: 'XL (5+ bedrooms / commercial)' },
          ]}
        />
        <SelectField
          label="Trip type"
          value={value.trip_type ?? 'one_way'}
          onChange={(v) => set('trip_type', v as 'one_way' | 'round_trip')}
          options={[
            { value: 'one_way', label: 'One Way' },
            { value: 'round_trip', label: 'Round Trip' },
          ]}
        />
        <div>
          <Input
            label="Distance (km)"
            type="number"
            min="0"
            value={String(value.distance_km ?? '')}
            onChange={(e) => set('distance_km', parseFloat(e.target.value) || 0)}
            placeholder="e.g. 25"
          />
          {(!value.distance_km || value.distance_km === 0) && (
            <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
              <span>Distance is required for accurate truck and fuel cost estimates.</span>
            </p>
          )}
        </div>
        <SelectField
          label="Extra movers (0–4)"
          value={String(value.extra_movers ?? 0)}
          onChange={(v) => set('extra_movers', parseInt(v))}
          options={[0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))}
        />
        <SelectField
          label="Truck provider"
          value={value.truck_provider_override ?? ''}
          onChange={(v) => set('truck_provider_override', v || undefined)}
          options={[
            { value: '', label: 'Use default' },
            { value: 'Ryder', label: 'Ryder' },
            { value: 'U-Haul', label: 'U-Haul' },
            { value: 'Flat Fee', label: 'Flat Fee' },
          ]}
        />
        <Input
          label="Profit margin override (%)"
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
        <SubSectionLabel>Weekend / Holiday</SubSectionLabel>
        <AddonToggle
          label="Weekend or holiday move"
          checked={!!value.is_weekend}
          onChange={(v) => set('is_weekend', v)}
          hint="Applies a per-mover surcharge"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LocationSubForm
          label="Origin"
          value={value.origin ?? {}}
          onChange={(v) => set('origin', v)}
        />
        <LocationSubForm
          label="Destination"
          value={value.destination ?? {}}
          onChange={(v) => set('destination', v)}
        />
      </div>

      <div>
        <SubSectionLabel>Special Items</SubSectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['piano', 'safe', 'hot_tub', 'pool_table'] as MovingSpecialItem[]).map((item) => (
            <AddonToggle
              key={item}
              label={item.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              checked={!!specialItems[item]}
              onChange={(v) => setSpecialItem(item, v)}
            />
          ))}
        </div>
      </div>

      <div>
        <SubSectionLabel>Add-ons</SubSectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <AddonToggle label="Heavy item" checked={!!addons.heavy_item} onChange={(v) => setAddon('heavy_item', v)} />
          <AddonToggle label="Stairs (3+ flights)" checked={!!addons.stairs_3plus} onChange={(v) => setAddon('stairs_3plus', v)} />
          <AddonToggle label="Tight parking" checked={!!addons.parking_tight} onChange={(v) => setAddon('parking_tight', v)} />
          <AddonToggle label="Packing service" checked={!!addons.packing} onChange={(v) => setAddon('packing', v)} />
          <AddonToggle label="Assembly / disassembly" checked={!!addons.assembly} onChange={(v) => setAddon('assembly', v)} />
          <AddonToggle label="Overnight storage" checked={!!addons.overnight_storage} onChange={(v) => setAddon('overnight_storage', v)} />
          <AddonToggle label="Elevator booking" checked={!!addons.elevator_booking} onChange={(v) => setAddon('elevator_booking', v)} hint="Book elevator in advance for apt/condo" />
        </div>
      </div>
    </div>
  );
}

// ─── Junk Input Panel ─────────────────────────────────────────────────────

const JUNK_CATEGORY_OPTIONS: { key: JunkItemCategory; label: string; hint?: string }[] = [
  { key: 'general', label: 'General household / furniture' },
  { key: 'appliance_no_freon', label: 'Appliances (no refrigerant)', hint: 'Washer, dryer, stove, dishwasher' },
  { key: 'appliance_freon', label: 'Appliances with refrigerant', hint: 'Fridge, AC unit, freezer' },
  { key: 'electronics', label: 'Electronics / WEEE', hint: 'TVs, computers, monitors' },
  { key: 'mattress', label: 'Mattresses' },
  { key: 'tires', label: 'Tires', hint: 'Charged per unit at job site' },
  { key: 'construction_debris', label: 'Construction / renovation debris', hint: 'Drywall, wood, flooring' },
  { key: 'paint_hazmat', label: 'Paint / hazardous materials', hint: 'May require separate HRM drop-off' },
];

function JunkInputPanel({
  value,
  onChange,
}: {
  value: JunkInputs;
  onChange: (v: JunkInputs) => void;
}) {
  const set = (k: keyof JunkInputs, v: JunkInputs[keyof JunkInputs]) => onChange({ ...value, [k]: v } as JunkInputs);
  const addons = value.addons ?? {};
  const setAddon = (k: string, v: boolean) => onChange({ ...value, addons: { ...addons, [k]: v } } as JunkInputs);
  const categories = value.item_categories ?? {};
  const setCategory = (k: JunkItemCategory, v: boolean) => onChange({ ...value, item_categories: { ...categories, [k]: v } } as JunkInputs);

  return (
    <div className="space-y-5">
      <div>
        <SubSectionLabel>What are we picking up?</SubSectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {JUNK_CATEGORY_OPTIONS.map(({ key, label, hint }) => (
            <AddonToggle
              key={key}
              label={label}
              hint={hint}
              checked={!!categories[key]}
              onChange={(v) => setCategory(key, v)}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          label="Estimated load size"
          value={value.load_tier}
          onChange={(v) => set('load_tier', v)}
          options={[
            { value: '1/8 Load', label: '1/8 Load — a few small items' },
            { value: '1/4 Load', label: '1/4 Load — small room worth' },
            { value: '1/2 Load', label: '1/2 Load — partial truck' },
            { value: '3/4 Load', label: '3/4 Load — large room worth' },
            { value: 'Full Load', label: 'Full Load — entire truck' },
          ]}
        />
        <SelectField
          label="Access type"
          value={value.access_type ?? 'ground_floor'}
          onChange={(v) => set('access_type', v as JunkAccessType)}
          options={[
            { value: 'ground_floor', label: 'Ground floor / easy access' },
            { value: 'stairs', label: 'Stairs required' },
            { value: 'elevator', label: 'Elevator building' },
            { value: 'attic_basement', label: 'Attic or basement' },
          ]}
        />
      </div>

      <div>
        <SubSectionLabel>Add-ons</SubSectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <AddonToggle label="Heavy item" checked={!!addons.heavy_item} onChange={(v) => setAddon('heavy_item', v)} />
          <AddonToggle label="Stairs (3+ flights)" checked={!!addons.stairs_3plus} onChange={(v) => setAddon('stairs_3plus', v)} />
          <AddonToggle label="Extra trip" checked={!!addons.extra_trip} onChange={(v) => setAddon('extra_trip', v)} />
        </div>
      </div>
    </div>
  );
}

// ─── Demo Input Panel ─────────────────────────────────────────────────────

function DemoInputPanel({
  value,
  onChange,
}: {
  value: DemoInputs;
  onChange: (v: DemoInputs) => void;
}) {
  const set = (k: keyof DemoInputs, v: DemoInputs[keyof DemoInputs]) => onChange({ ...value, [k]: v } as DemoInputs);
  const addons = value.addons ?? {};
  const setAddon = (k: string, v: boolean) => onChange({ ...value, addons: { ...addons, [k]: v } } as DemoInputs);

  const materialToDebris: Record<DemoMaterialType, DemoDebrisClass> = {
    wood: 'clean_wood',
    drywall_plaster: 'drywall',
    concrete_masonry: 'concrete',
    mixed: 'mixed',
  };

  const handleMaterialChange = (mat: DemoMaterialType) => {
    onChange({ ...value, material_type: mat, debris_class: materialToDebris[mat] });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          label="Scope"
          value={value.scope_tier}
          onChange={(v) => set('scope_tier', v)}
          options={[
            { value: 'Small', label: 'Small (bathroom / closet)' },
            { value: 'Medium', label: 'Medium (kitchen / 1–2 rooms)' },
            { value: 'Large', label: 'Large (multi-room / whole floor)' },
          ]}
        />
        <SelectField
          label="Extra workers (0–4)"
          value={String(value.extra_workers ?? 0)}
          onChange={(v) => set('extra_workers', parseInt(v))}
          options={[0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))}
        />
        <SelectField
          label="Structure type"
          value={value.structure_type ?? 'mixed'}
          onChange={(v) => set('structure_type', v as DemoStructureType)}
          options={[
            { value: 'interior_wall', label: 'Interior wall' },
            { value: 'deck_fence', label: 'Deck / fence' },
            { value: 'shed_garage', label: 'Shed or garage' },
            { value: 'flooring', label: 'Flooring' },
            { value: 'kitchen_bath', label: 'Kitchen or bathroom' },
            { value: 'mixed', label: 'Mixed / general' },
          ]}
        />
        <SelectField
          label="Primary material"
          value={value.material_type ?? 'mixed'}
          onChange={(v) => handleMaterialChange(v as DemoMaterialType)}
          options={[
            { value: 'wood', label: 'Wood / framing' },
            { value: 'drywall_plaster', label: 'Drywall / plaster' },
            { value: 'concrete_masonry', label: 'Concrete / masonry' },
            { value: 'mixed', label: 'Mixed' },
          ]}
          hint="Auto-selects debris class"
        />
        <SelectField
          label="Debris class"
          value={value.debris_class ?? 'mixed'}
          onChange={(v) => set('debris_class', v as DemoDebrisClass)}
          options={[
            { value: 'clean_wood', label: 'Clean wood' },
            { value: 'drywall', label: 'Drywall / plaster' },
            { value: 'concrete', label: 'Concrete / masonry' },
            { value: 'mixed', label: 'Mixed / general' },
          ]}
          hint="Determines HRM disposal rate"
        />
        <Input
          label="Build year"
          type="number"
          min="1800"
          max={new Date().getFullYear()}
          value={value.build_year != null ? String(value.build_year) : ''}
          onChange={(e) => set('build_year', e.target.value === '' ? undefined : parseInt(e.target.value))}
          placeholder="e.g. 1985"
        />
      </div>

      <div>
        <SubSectionLabel>Permit & Safety</SubSectionLabel>
        <AddonToggle
          label="Halifax permit required"
          checked={!!value.needs_permit}
          onChange={(v) => set('needs_permit', v)}
          hint="Adds permit cost estimate to the quote"
        />
        {value.build_year && value.build_year < 1990 && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">Pre-1990 build — asbestos/lead reserve will be included in the estimate.</p>
          </div>
        )}
      </div>

      <div>
        <SubSectionLabel>Add-ons</SubSectionLabel>
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

// ─── Estimate Display ─────────────────────────────────────────────────────

function EstimateDisplay({
  result,
  isCalculating,
  usingDefaults,
  manualOverride,
  onToggleOverride,
  estimateLow,
  estimateHigh,
  onChangeLow,
  onChangeHigh,
}: {
  result: EstimateResult;
  isCalculating: boolean;
  usingDefaults: boolean;
  manualOverride: boolean;
  onToggleOverride: () => void;
  estimateLow: string;
  estimateHigh: string;
  onChangeLow: (v: string) => void;
  onChangeHigh: (v: string) => void;
}) {
  const [showBreakdown, setShowBreakdown] = useState(true);
  const snap = result.snapshot;
  const lines: PricingBreakdownLine[] = snap.breakdown_lines ?? [];

  return (
    <div className="space-y-4">
      {result.advisory_notes.length > 0 && (
        <div className="space-y-2">
          {result.advisory_notes.map((note, i) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">{note}</p>
            </div>
          ))}
        </div>
      )}

      <div className={`border rounded-xl p-5 transition-opacity ${isCalculating ? 'opacity-60' : 'opacity-100'} bg-green-50 border-green-200`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-green-800">Live Estimate</h4>
            {isCalculating && <Loader2 className="w-4 h-4 text-green-600 animate-spin" />}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${usingDefaults ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
            {usingDefaults ? 'Using Halifax defaults' : 'Using your saved rates'}
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

        {showBreakdown && lines.length > 0 && (
          <div className="mt-3 pt-3 border-t border-green-200">
            <div className="space-y-1.5">
              {lines.map((line, i) => {
                const isLast = i === lines.length - 1;
                return (
                  <div key={i} className={`flex justify-between items-center text-xs ${isLast ? 'pt-2 border-t border-green-300 font-semibold text-green-900' : 'text-gray-700'} ${line.is_advisory ? 'text-amber-700' : ''}`}>
                    <span className={line.is_advisory ? 'text-amber-700' : ''}>{line.label}</span>
                    <span>
                      {line.low === line.high
                        ? formatCurrency(line.low)
                        : `${formatCurrency(line.low)} – ${formatCurrency(line.high)}`}
                    </span>
                  </div>
                );
              })}
              <div className="flex justify-between items-center text-sm font-bold text-gray-900 pt-2 border-t border-green-300">
                <span>Total (incl. HST)</span>
                <span>
                  {result.estimate_low === result.estimate_high
                    ? formatCurrency(result.estimate_low)
                    : `${formatCurrency(result.estimate_low)} – ${formatCurrency(result.estimate_high)}`}
                </span>
              </div>
            </div>
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

  const [serviceTypeOverride, setServiceTypeOverride] = useState<PricingServiceType | ''>('');

  const activeLead: UnifiedRequest | null = lead ?? null;
  const serviceType: PricingServiceType = isPhoneMode
    ? phoneContact.service_type
    : serviceTypeOverride || ((lead?.service_type as PricingServiceType) ?? 'moving');

  const [pricingSettings, setPricingSettings] = useState<Record<string, unknown> | null>(null);
  const [pricingConfigured, setPricingConfigured] = useState(false);
  const [taxRate, setTaxRate] = useState(0.15);
  const [loadingSettings, setLoadingSettings] = useState(false);

  const [movingInputs, setMovingInputs] = useState<MovingInputs>({
    load_tier: 'Medium',
    distance_km: 0,
    trip_type: 'one_way',
    extra_movers: 0,
    origin: { building_type: 'house' },
    destination: { building_type: 'house' },
  });
  const [junkInputs, setJunkInputs] = useState<JunkInputs>({
    load_tier: '1/4 Load',
    access_type: 'ground_floor',
    item_categories: { general: true },
  });
  const [demoInputs, setDemoInputs] = useState<DemoInputs>({
    scope_tier: 'Small',
    extra_workers: 0,
    material_type: 'mixed',
    debris_class: 'mixed',
  });

  const [estimateResult, setEstimateResult] = useState<EstimateResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);
  const [estimateLow, setEstimateLow] = useState('');
  const [estimateHigh, setEstimateHigh] = useState('');
  const [capAmount, setCapAmount] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadPricingAndTax();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (taxRes.data?.tax_rate) {
        setTaxRate(taxRes.data.tax_rate);
      }
    } catch (err) {
      console.error('Error loading pricing settings', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const buildQuoteInputs = (): MovingInputs | JunkInputs | DemoInputs => {
    if (serviceType === 'moving') {
      const km = (movingInputs.trip_type === 'round_trip')
        ? (movingInputs.distance_km ?? 0) * 2
        : (movingInputs.distance_km ?? 0);
      return { ...movingInputs, distance_km: km };
    }
    if (serviceType === 'junk_removal') return junkInputs;
    return demoInputs;
  };

  const runCalculation = () => {
    const inputs = buildQuoteInputs();
    setIsCalculating(true);
    try {
      const result = calculateEstimate(serviceType, inputs as QuoteInputs, pricingSettings, taxRate);
      setEstimateResult(result);
      if (!manualOverride) {
        setEstimateLow(String(result.estimate_low));
        setEstimateHigh(String(result.estimate_high));
      }
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    if (loadingSettings) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runCalculation();
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movingInputs, junkInputs, demoInputs, serviceType, pricingSettings, taxRate, loadingSettings]);

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
    } catch {
      // non-fatal: use default company info
    }

    const contact = resolvedLead();
    const low = manualOverride && estimateLow ? parseFloat(estimateLow) : estimateResult?.estimate_low ?? parseFloat(estimateLow) ?? 0;
    const high = manualOverride && estimateHigh ? parseFloat(estimateHigh) : estimateResult?.estimate_high ?? parseFloat(estimateHigh) ?? 0;

    const scopeSummary = serviceType === 'junk_removal' ? estimateResult?.scope_summary ?? null : null;
    const advisoryNotes = estimateResult?.advisory_notes ?? [];
    const breakdownLines = estimateResult?.snapshot.breakdown_lines ?? [];

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
      scopeSummary,
      advisoryNotes: advisoryNotes.length > 0 ? advisoryNotes : undefined,
      breakdownLines: breakdownLines.length > 0 ? breakdownLines : undefined,
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
    const email = phoneContact.contact_email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
    const method = phoneContact.preferred_contact_method;
    if ((method === 'sms' || method === 'call') && !phoneContact.contact_phone.trim()) {
      return 'Phone number is required for SMS/call contact method';
    }
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

    if (!low && !high) throw new Error('Please wait for the estimate to calculate or enter values manually');

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

    const payload: Record<string, unknown> = {
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

      logAudit({
        action_key: 'quote_created',
        entity_type: 'quote',
        entity_id: savedQuoteId ?? undefined,
        quote_id: savedQuoteId ?? null,
        message: `Quote ${payload.quote_number} created`,
        metadata: { estimate_low: payload.estimate_low, estimate_high: payload.estimate_high, lead_type: leadType },
        actor_role: 'admin',
      });

      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quote');
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

      logAudit({
        action_key: 'quote_sent',
        entity_type: 'quote',
        entity_id: currentQuoteId ?? undefined,
        quote_id: currentQuoteId ?? null,
        message: `Quote sent to ${currentContact.contact_name}`,
        metadata: {
          lead_id: leadId,
          lead_type: leadType,
          recipient_email: currentContact.contact_email,
          recipient_phone: currentContact.contact_phone,
          estimate_low: estimateResult?.estimate_low ?? null,
          estimate_high: estimateResult?.estimate_high ?? null,
        },
        actor_role: 'admin',
      });

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
      } catch {
        // non-fatal: notification enqueue failure
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send quote');
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
        activeItemId={isPhoneMode ? 'create-quote' : 'service-requests'}
        breadcrumbs={[
          isPhoneMode
            ? { label: 'Quote Studio', onClick: onSuccess }
            : { label: 'Leads', onClick: onSuccess },
          { label: 'Create Quote' },
        ]}
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
      activeItemId={isPhoneMode ? 'create-quote' : 'service-requests'}
      breadcrumbs={[
        isPhoneMode
          ? { label: 'Quote Studio', onClick: onBack }
          : { label: 'Leads', onClick: onBack },
        { label: isPhoneMode ? 'New Phone Quote' : 'Create Quote' },
      ]}
    >
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Leads
        </Button>

        <ServiceTypeSelector
          value={serviceType}
          onChange={(v) => {
            if (isPhoneMode) {
              setPhoneContact((prev) => ({ ...prev, service_type: v }));
            } else {
              setServiceTypeOverride(v);
            }
          }}
        />

        {isPhoneMode && (
          <PhoneContactForm value={phoneContact} onChange={setPhoneContact} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {!isPhoneMode && activeLead && (
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Summary</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
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
                    ? 'Enter customer details above, then fill out the job details below. The estimate updates automatically.'
                    : `Estimate for this ${getServiceLabel(serviceType).toLowerCase()} job — updates as you fill in the details.`}
                </p>
              </div>

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
                  <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b">Estimate</h3>
                  {estimateResult ? (
                    <EstimateDisplay
                      result={estimateResult}
                      isCalculating={isCalculating}
                      usingDefaults={!pricingConfigured}
                      manualOverride={manualOverride}
                      onToggleOverride={() => setManualOverride((v) => !v)}
                      estimateLow={estimateLow}
                      estimateHigh={estimateHigh}
                      onChangeLow={setEstimateLow}
                      onChangeHigh={setEstimateHigh}
                    />
                  ) : (
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
                </div>

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

                {draftSaved && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">Quote saved as draft.</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t flex-wrap">
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
