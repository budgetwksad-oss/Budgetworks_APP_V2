import type { PricingServiceType } from './supabase';

// ─── Formatters ──────────────────────────────────────────────────────────────

export function formatCurrency(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-CA');
}

export function getServiceLabel(service_type: PricingServiceType): string {
  switch (service_type) {
    case 'moving': return 'Moving';
    case 'junk_removal': return 'Junk Removal';
    case 'demolition': return 'Light Demo';
  }
}

// ─── Input shapes ─────────────────────────────────────────────────────────────

export interface MovingInputs {
  load_tier: 'Small' | 'Medium' | 'Large' | 'XL';
  distance_km: number;
  extra_movers?: number;
  profit_margin_pct?: number;
  addons?: Partial<Record<MovingAddon, boolean>>;
}

export type MovingAddon = 'heavy_item' | 'stairs_3plus' | 'parking_tight' | 'packing' | 'assembly' | 'overnight_storage';

export interface JunkInputs {
  load_tier: '1/8 Load' | '1/4 Load' | '1/2 Load' | '3/4 Load' | 'Full Load';
  addons?: Partial<Record<JunkAddon, boolean>>;
}

export type JunkAddon = 'heavy_item' | 'stairs_3plus' | 'mattress' | 'appliance' | 'extra_trip';

export interface DemoInputs {
  scope_tier: 'Small' | 'Medium' | 'Large';
  extra_workers?: number;
  addons?: Partial<Record<DemoAddon, boolean>>;
}

export type DemoAddon = 'flooring' | 'tile' | 'cabinets' | 'drywall';

export type QuoteInputs = MovingInputs | JunkInputs | DemoInputs;

// ─── Output shape ─────────────────────────────────────────────────────────────

export interface PricingBreakdown {
  [key: string]: number | string;
}

export interface PricingSnapshot {
  subtotal_low: number;
  subtotal_high: number;
  tax_low: number;
  tax_high: number;
  total_low: number;
  total_high: number;
  breakdown: PricingBreakdown;
  inputs: QuoteInputs;
}

export interface StaffingDefaults {
  drivers: number;
  helpers: number;
}

export interface EstimateResult {
  estimate_low: number;
  estimate_high: number;
  expected_price: number;
  cap_amount: number | null;
  staffing_defaults: StaffingDefaults;
  snapshot: PricingSnapshot;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _applyTax(amount: number, taxRate: number): number {
  return amount * (1 + taxRate);
}

function midpoint(low: number, high: number): number {
  return Math.round((low + high) / 2);
}

// ─── Moving Engine ────────────────────────────────────────────────────────────

function calcMoving(
  inputs: MovingInputs,
  settings: Record<string, any>,
  taxRate: number
): EstimateResult {
  const s = settings;

  const loadTier = (s.load_tiers as Array<{ label: string; min_hours: number; max_hours: number }>)
    .find((t) => t.label === inputs.load_tier) ?? s.load_tiers[0];

  const distanceBands = s.distance_bands as Array<{
    label: string;
    add_hours_min: number;
    add_hours_max: number;
  }>;

  const km = inputs.distance_km ?? 0;
  let bandAdd = distanceBands[0];
  if (km <= 30) bandAdd = distanceBands[0];
  else if (km <= 60) bandAdd = distanceBands[1];
  else if (km <= 150) bandAdd = distanceBands[2];
  else if (km <= 300) bandAdd = distanceBands[3];
  else bandAdd = distanceBands[4];

  const minHours = loadTier.min_hours + (bandAdd?.add_hours_min ?? 0);
  const maxHours = loadTier.max_hours + (bandAdd?.add_hours_max ?? 0);

  const movers = (s.base_movers as number) + (inputs.extra_movers ?? 0);
  const hourlyRate = s.mover_hourly_rate as number;

  const laborLow = minHours * hourlyRate * movers;
  const laborHigh = maxHours * hourlyRate * movers;

  let truckCostLow: number;
  let truckCostHigh: number;
  const provider = (s.truck_provider as string).toLowerCase();

  if (provider === 'flat fee') {
    truckCostLow = s.flat_truck_cost as number;
    truckCostHigh = s.flat_truck_cost as number;
  } else {
    const fuelCost = (km / 100) * (s.truck_liters_per_100km as number) * (s.fuel_price_per_liter as number);
    const truckBase = (s.truck_daily_fee as number) + km * (s.truck_per_km_mileage as number) + fuelCost + (s.truck_insurance_fee as number);
    truckCostLow = truckBase;
    truckCostHigh = truckBase;
  }

  const addons = s.addons as Record<MovingAddon, number>;
  let addonTotal = 0;
  if (inputs.addons) {
    for (const [key, active] of Object.entries(inputs.addons)) {
      if (active && addons[key as MovingAddon] != null) {
        addonTotal += addons[key as MovingAddon];
      }
    }
  }

  const marginPct = inputs.profit_margin_pct ?? (s.profit_margin_pct as number);
  const marginFactor = 1 + marginPct / 100;

  const subtotalLow = (laborLow + truckCostLow + addonTotal) * marginFactor;
  const subtotalHigh = (laborHigh + truckCostHigh + addonTotal) * marginFactor;

  const taxLow = subtotalLow * taxRate;
  const taxHigh = subtotalHigh * taxRate;

  const totalLow = subtotalLow + taxLow;
  const totalHigh = subtotalHigh + taxHigh;

  const helpers = Math.max(1, movers - 1);

  return {
    estimate_low: Math.round(totalLow),
    estimate_high: Math.round(totalHigh),
    expected_price: midpoint(totalLow, totalHigh),
    cap_amount: null,
    staffing_defaults: { drivers: 1, helpers },
    snapshot: {
      subtotal_low: Math.round(subtotalLow),
      subtotal_high: Math.round(subtotalHigh),
      tax_low: Math.round(taxLow),
      tax_high: Math.round(taxHigh),
      total_low: Math.round(totalLow),
      total_high: Math.round(totalHigh),
      breakdown: {
        labor_low: Math.round(laborLow),
        labor_high: Math.round(laborHigh),
        truck_cost: Math.round(truckCostLow),
        addons: Math.round(addonTotal),
        profit_margin_pct: marginPct,
        movers,
        min_hours: minHours,
        max_hours: maxHours,
        distance_km: km,
        load_tier: inputs.load_tier,
      },
      inputs,
    },
  };
}

// ─── Junk Removal Engine ──────────────────────────────────────────────────────

function calcJunk(
  inputs: JunkInputs,
  settings: Record<string, any>,
  taxRate: number
): EstimateResult {
  const s = settings;

  const loadTier = (s.load_tiers as Array<{ label: string; min_total: number; max_total: number }>)
    .find((t) => t.label === inputs.load_tier) ?? s.load_tiers[0];

  const addons = s.addons as Record<JunkAddon, number>;
  let addonTotal = 0;
  if (inputs.addons) {
    for (const [key, active] of Object.entries(inputs.addons)) {
      if (active && addons[key as JunkAddon] != null) {
        addonTotal += addons[key as JunkAddon];
      }
    }
  }

  const subtotalLow = loadTier.min_total + addonTotal;
  const subtotalHigh = loadTier.max_total + addonTotal;

  const taxLow = subtotalLow * taxRate;
  const taxHigh = subtotalHigh * taxRate;

  const totalLow = subtotalLow + taxLow;
  const totalHigh = subtotalHigh + taxHigh;

  const crew = s.default_crew as { drivers: number; helpers: number };

  return {
    estimate_low: Math.round(totalLow),
    estimate_high: Math.round(totalHigh),
    expected_price: midpoint(totalLow, totalHigh),
    cap_amount: null,
    staffing_defaults: { drivers: crew?.drivers ?? 1, helpers: crew?.helpers ?? 1 },
    snapshot: {
      subtotal_low: Math.round(subtotalLow),
      subtotal_high: Math.round(subtotalHigh),
      tax_low: Math.round(taxLow),
      tax_high: Math.round(taxHigh),
      total_low: Math.round(totalLow),
      total_high: Math.round(totalHigh),
      breakdown: {
        base_low: loadTier.min_total,
        base_high: loadTier.max_total,
        addons: Math.round(addonTotal),
        load_tier: inputs.load_tier,
      },
      inputs,
    },
  };
}

// ─── Light Demo Engine ────────────────────────────────────────────────────────

function calcDemo(
  inputs: DemoInputs,
  settings: Record<string, any>,
  taxRate: number
): EstimateResult {
  const s = settings;

  const scopeTier = (s.scope_tiers as Array<{ label: string; min_hours: number; max_hours: number }>)
    .find((t) => t.label === inputs.scope_tier) ?? s.scope_tiers[0];

  const crew = s.default_crew as { drivers: number; helpers: number };
  const totalWorkers = (crew?.drivers ?? 1) + (crew?.helpers ?? 1) + (inputs.extra_workers ?? 0);
  const hourlyRate = s.hourly_rate_per_worker as number;

  const laborLow = scopeTier.min_hours * hourlyRate * totalWorkers;
  const laborHigh = scopeTier.max_hours * hourlyRate * totalWorkers;

  const disposalLow = s.debris_disposal_min as number;
  const disposalHigh = s.debris_disposal_max as number;

  const addons = s.addons as Record<DemoAddon, number>;
  let addonTotal = 0;
  if (inputs.addons) {
    for (const [key, active] of Object.entries(inputs.addons)) {
      if (active && addons[key as DemoAddon] != null) {
        addonTotal += addons[key as DemoAddon];
      }
    }
  }

  const subtotalLow = laborLow + disposalLow + addonTotal;
  const subtotalHigh = laborHigh + disposalHigh + addonTotal;

  const taxLow = subtotalLow * taxRate;
  const taxHigh = subtotalHigh * taxRate;

  const totalLow = subtotalLow + taxLow;
  const totalHigh = subtotalHigh + taxHigh;

  return {
    estimate_low: Math.round(totalLow),
    estimate_high: Math.round(totalHigh),
    expected_price: midpoint(totalLow, totalHigh),
    cap_amount: null,
    staffing_defaults: { drivers: crew?.drivers ?? 1, helpers: crew?.helpers ?? 1 },
    snapshot: {
      subtotal_low: Math.round(subtotalLow),
      subtotal_high: Math.round(subtotalHigh),
      tax_low: Math.round(taxLow),
      tax_high: Math.round(taxHigh),
      total_low: Math.round(totalLow),
      total_high: Math.round(totalHigh),
      breakdown: {
        labor_low: Math.round(laborLow),
        labor_high: Math.round(laborHigh),
        disposal_low: disposalLow,
        disposal_high: disposalHigh,
        addons: Math.round(addonTotal),
        total_workers: totalWorkers,
        min_hours: scopeTier.min_hours,
        max_hours: scopeTier.max_hours,
        scope_tier: inputs.scope_tier,
      },
      inputs,
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function calculateEstimate(
  service_type: PricingServiceType,
  inputs: QuoteInputs,
  pricingSettings: Record<string, any>,
  taxRateFraction: number
): EstimateResult {
  switch (service_type) {
    case 'moving':
      return calcMoving(inputs as MovingInputs, pricingSettings, taxRateFraction);
    case 'junk_removal':
      return calcJunk(inputs as JunkInputs, pricingSettings, taxRateFraction);
    case 'demolition':
      return calcDemo(inputs as DemoInputs, pricingSettings, taxRateFraction);
  }
}
