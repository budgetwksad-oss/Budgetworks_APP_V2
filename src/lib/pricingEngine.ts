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

export type MovingAddon =
  | 'heavy_item'
  | 'stairs_3plus'
  | 'parking_tight'
  | 'packing'
  | 'assembly'
  | 'overnight_storage'
  | 'elevator_booking';

export type MovingSpecialItem = 'piano' | 'safe' | 'hot_tub' | 'pool_table';

export type BuildingType = 'house' | 'apartment' | 'condo' | 'office' | 'storage';

export interface MovingLocation {
  building_type?: BuildingType;
  floor_level?: number;
  has_elevator?: boolean;
}

export interface MovingInputs {
  load_tier: 'Small' | 'Medium' | 'Large' | 'XL';
  distance_km: number;
  extra_movers?: number;
  profit_margin_pct?: number;
  addons?: Partial<Record<MovingAddon, boolean>>;
  trip_type?: 'one_way' | 'round_trip';
  truck_provider_override?: string;
  is_weekend?: boolean;
  origin?: MovingLocation;
  destination?: MovingLocation;
  special_items?: Partial<Record<MovingSpecialItem, boolean>>;
}

export type JunkAddon = 'heavy_item' | 'stairs_3plus' | 'mattress' | 'appliance' | 'extra_trip';

export type JunkItemCategory =
  | 'general'
  | 'appliance_no_freon'
  | 'appliance_freon'
  | 'electronics'
  | 'mattress'
  | 'tires'
  | 'construction_debris'
  | 'paint_hazmat';

export type JunkAccessType = 'ground_floor' | 'stairs' | 'elevator' | 'attic_basement';

export interface JunkInputs {
  load_tier: '1/8 Load' | '1/4 Load' | '1/2 Load' | '3/4 Load' | 'Full Load';
  addons?: Partial<Record<JunkAddon, boolean>>;
  item_categories?: Partial<Record<JunkItemCategory, boolean>>;
  access_type?: JunkAccessType;
}

export type DemoAddon = 'flooring' | 'tile' | 'cabinets' | 'drywall';

export type DemoStructureType =
  | 'interior_wall'
  | 'deck_fence'
  | 'shed_garage'
  | 'flooring'
  | 'kitchen_bath'
  | 'mixed';

export type DemoMaterialType = 'wood' | 'drywall_plaster' | 'concrete_masonry' | 'mixed';

export type DemoDebrisClass = 'clean_wood' | 'drywall' | 'concrete' | 'mixed';

export interface DemoInputs {
  scope_tier: 'Small' | 'Medium' | 'Large';
  extra_workers?: number;
  addons?: Partial<Record<DemoAddon, boolean>>;
  structure_type?: DemoStructureType;
  material_type?: DemoMaterialType;
  build_year?: number;
  debris_class?: DemoDebrisClass;
  needs_permit?: boolean;
}

export type QuoteInputs = MovingInputs | JunkInputs | DemoInputs;

// ─── Output shape ─────────────────────────────────────────────────────────────

export interface PricingBreakdownLine {
  label: string;
  low: number;
  high: number;
  is_advisory?: boolean;
}

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
  breakdown_lines?: PricingBreakdownLine[];
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
  advisory_notes: string[];
  scope_summary?: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _applyTax(amount: number, taxRate: number): number {
  return amount * (1 + taxRate);
}

function midpoint(low: number, high: number): number {
  return Math.round((low + high) / 2);
}

// ─── Halifax Default Settings ─────────────────────────────────────────────────

export const HALIFAX_MOVING_DEFAULTS = {
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
  truck_provider: 'Ryder',
  flat_truck_cost: 200,
  truck_daily_fee: 120,
  truck_per_km_mileage: 0.28,
  truck_liters_per_100km: 14,
  truck_insurance_fee: 30,
  floor_premium_per_level: 25,
  elevator_booking_fee: 60,
  weekend_surcharge_per_mover: 40,
  special_items: {
    piano: 200,
    safe: 150,
    hot_tub: 250,
    pool_table: 175,
  },
  addons: {
    heavy_item: 60,
    stairs_3plus: 40,
    parking_tight: 30,
    packing: 75,
    assembly: 50,
    overnight_storage: 120,
    elevator_booking: 60,
  },
};

export const HALIFAX_JUNK_DEFAULTS = {
  load_tiers: [
    { label: '1/8 Load', min_total: 100, max_total: 150 },
    { label: '1/4 Load', min_total: 150, max_total: 225 },
    { label: '1/2 Load', min_total: 225, max_total: 325 },
    { label: '3/4 Load', min_total: 325, max_total: 425 },
    { label: 'Full Load', min_total: 425, max_total: 550 },
  ],
  min_charge: 175,
  hrm_disposal_fees: {
    general: 0,
    appliance_no_freon: 35,
    appliance_freon: 60,
    electronics: 30,
    mattress: 35,
    tires: 8,
    construction_debris: 80,
    paint_hazmat: 50,
  },
  access_surcharges: {
    ground_floor: 0,
    stairs: 30,
    elevator: 20,
    attic_basement: 45,
  },
  addons: {
    heavy_item: 40,
    stairs_3plus: 30,
    mattress: 25,
    appliance: 35,
    extra_trip: 100,
  },
  default_crew: { drivers: 1, helpers: 1 },
};

export const HALIFAX_DEMO_DEFAULTS = {
  scope_tiers: [
    { label: 'Small', min_hours: 2, max_hours: 4 },
    { label: 'Medium', min_hours: 4, max_hours: 8 },
    { label: 'Large', min_hours: 8, max_hours: 16 },
  ],
  hourly_rate_per_worker: 50,
  default_crew: { drivers: 1, helpers: 1 },
  debris_class_rates: {
    clean_wood: { min: 80, max: 140 },
    drywall: { min: 100, max: 175 },
    concrete: { min: 130, max: 220 },
    mixed: { min: 150, max: 260 },
  },
  permit_estimate_range: { min: 150, max: 350 },
  asbestos_reserve: 450,
  addons: {
    flooring: 150,
    tile: 180,
    cabinets: 200,
    drywall: 120,
  },
};

// ─── Moving Engine ────────────────────────────────────────────────────────────

function calcMoving(
  inputs: MovingInputs,
  settings: Record<string, any>,
  taxRate: number
): EstimateResult {
  const s = { ...HALIFAX_MOVING_DEFAULTS, ...settings };

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
  const providerRaw = inputs.truck_provider_override || (s.truck_provider as string);
  const provider = providerRaw.toLowerCase();

  if (provider === 'flat fee') {
    truckCostLow = s.flat_truck_cost as number;
    truckCostHigh = s.flat_truck_cost as number;
  } else {
    const fuelCost = (km / 100) * (s.truck_liters_per_100km as number) * (s.fuel_price_per_liter as number);
    const truckBase = (s.truck_daily_fee as number) + km * (s.truck_per_km_mileage as number) + fuelCost + (s.truck_insurance_fee as number);
    truckCostLow = truckBase;
    truckCostHigh = truckBase;
  }

  // Floor premium
  const floorPremiumPerLevel = (s.floor_premium_per_level as number) ?? 25;
  let floorPremium = 0;
  const advisory_notes: string[] = [];

  const origin = inputs.origin;
  const destination = inputs.destination;

  if (origin && (origin.floor_level ?? 0) > 0 && !origin.has_elevator) {
    floorPremium += (origin.floor_level ?? 0) * floorPremiumPerLevel;
  }
  if (destination && (destination.floor_level ?? 0) > 0 && !destination.has_elevator) {
    floorPremium += (destination.floor_level ?? 0) * floorPremiumPerLevel;
  }

  // Elevator booking fee
  const elevatorBookingFee = (s.elevator_booking_fee as number) ?? 60;
  let elevatorCost = 0;
  if (inputs.addons?.elevator_booking) {
    elevatorCost = elevatorBookingFee;
  } else {
    const needsElevator =
      (origin?.building_type === 'apartment' || origin?.building_type === 'condo') ||
      (destination?.building_type === 'apartment' || destination?.building_type === 'condo');
    if (needsElevator) {
      advisory_notes.push('Elevator booking may be required — confirm with building management.');
    }
  }

  // Weekend surcharge
  const weekendSurcharge = inputs.is_weekend
    ? ((s.weekend_surcharge_per_mover as number) ?? 40) * movers
    : 0;

  // Special items
  const specialItemRates = s.special_items as Record<MovingSpecialItem, number> ?? HALIFAX_MOVING_DEFAULTS.special_items;
  let specialItemsCost = 0;
  const specialItemLabels: string[] = [];
  if (inputs.special_items) {
    for (const [key, active] of Object.entries(inputs.special_items)) {
      if (active && specialItemRates[key as MovingSpecialItem] != null) {
        specialItemsCost += specialItemRates[key as MovingSpecialItem];
        specialItemLabels.push(key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
      }
    }
  }

  // Standard addons
  const addons = s.addons as Record<MovingAddon, number>;
  let addonTotal = 0;
  if (inputs.addons) {
    for (const [key, active] of Object.entries(inputs.addons)) {
      if (key === 'elevator_booking') continue;
      if (active && addons[key as MovingAddon] != null) {
        addonTotal += addons[key as MovingAddon];
      }
    }
  }

  const marginPct = inputs.profit_margin_pct ?? (s.profit_margin_pct as number);
  const marginFactor = 1 + marginPct / 100;

  const extrasTotal = floorPremium + elevatorCost + weekendSurcharge + specialItemsCost + addonTotal;

  const subtotalLow = (laborLow + truckCostLow + extrasTotal) * marginFactor;
  const subtotalHigh = (laborHigh + truckCostHigh + extrasTotal) * marginFactor;

  const taxLow = subtotalLow * taxRate;
  const taxHigh = subtotalHigh * taxRate;

  const totalLow = subtotalLow + taxLow;
  const totalHigh = subtotalHigh + taxHigh;

  const helpers = Math.max(1, movers - 1);

  const breakdown_lines: PricingBreakdownLine[] = [
    { label: 'Labour', low: Math.round(laborLow), high: Math.round(laborHigh) },
    { label: `Truck (${providerRaw})`, low: Math.round(truckCostLow), high: Math.round(truckCostHigh) },
  ];
  if (floorPremium > 0) breakdown_lines.push({ label: 'Floor/Stairs Premium', low: floorPremium, high: floorPremium });
  if (elevatorCost > 0) breakdown_lines.push({ label: 'Elevator Booking', low: elevatorCost, high: elevatorCost });
  if (weekendSurcharge > 0) breakdown_lines.push({ label: 'Weekend Surcharge', low: weekendSurcharge, high: weekendSurcharge });
  if (specialItemsCost > 0) breakdown_lines.push({ label: `Special Items (${specialItemLabels.join(', ')})`, low: specialItemsCost, high: specialItemsCost });
  if (addonTotal > 0) breakdown_lines.push({ label: 'Add-ons', low: addonTotal, high: addonTotal });
  breakdown_lines.push({ label: `Nova Scotia HST (${(taxRate * 100).toFixed(0)}%)`, low: Math.round(taxLow), high: Math.round(taxHigh) });

  return {
    estimate_low: Math.round(totalLow),
    estimate_high: Math.round(totalHigh),
    expected_price: midpoint(totalLow, totalHigh),
    cap_amount: null,
    staffing_defaults: { drivers: 1, helpers },
    advisory_notes,
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
        floor_premium: floorPremium,
        elevator_cost: elevatorCost,
        weekend_surcharge: weekendSurcharge,
        special_items: specialItemsCost,
        addons: Math.round(addonTotal),
        profit_margin_pct: marginPct,
        movers,
        min_hours: minHours,
        max_hours: maxHours,
        distance_km: km,
        load_tier: inputs.load_tier,
      },
      breakdown_lines,
      inputs,
    },
  };
}

// ─── Junk Removal Engine ──────────────────────────────────────────────────────

const JUNK_ITEM_LABELS: Record<JunkItemCategory, string> = {
  general: 'General / Furniture',
  appliance_no_freon: 'Appliances (no refrigerant)',
  appliance_freon: 'Appliances with refrigerant',
  electronics: 'Electronics / WEEE',
  mattress: 'Mattresses',
  tires: 'Tires',
  construction_debris: 'Construction debris',
  paint_hazmat: 'Paint / Hazardous materials',
};

function calcJunk(
  inputs: JunkInputs,
  settings: Record<string, any>,
  taxRate: number
): EstimateResult {
  const s = { ...HALIFAX_JUNK_DEFAULTS, ...settings };

  const loadTier = (s.load_tiers as Array<{ label: string; min_total: number; max_total: number }>)
    .find((t) => t.label === inputs.load_tier) ?? s.load_tiers[0];

  // HRM disposal fees per category
  const disposalFees = s.hrm_disposal_fees as Record<JunkItemCategory, number> ?? HALIFAX_JUNK_DEFAULTS.hrm_disposal_fees;
  let disposalTotal = 0;
  const selectedCategoryLabels: string[] = [];
  const advisory_notes: string[] = [];

  if (inputs.item_categories) {
    for (const [key, active] of Object.entries(inputs.item_categories)) {
      if (active) {
        const fee = disposalFees[key as JunkItemCategory] ?? 0;
        disposalTotal += fee;
        selectedCategoryLabels.push(JUNK_ITEM_LABELS[key as JunkItemCategory] ?? key);
        if (key === 'appliance_freon') {
          advisory_notes.push('Refrigerant removal requires certified disposal — confirm at booking.');
        }
        if (key === 'paint_hazmat') {
          advisory_notes.push('Hazardous materials may require a separate drop-off — confirm with HRM.');
        }
        if (key === 'tires') {
          advisory_notes.push('Tire disposal charged per unit — confirm count at job site.');
        }
      }
    }
  }

  // Access surcharge
  const accessSurcharges = s.access_surcharges as Record<JunkAccessType, number> ?? HALIFAX_JUNK_DEFAULTS.access_surcharges;
  const accessType = inputs.access_type ?? 'ground_floor';
  const accessSurcharge = accessSurcharges[accessType] ?? 0;

  // Standard addons
  const addons = s.addons as Record<JunkAddon, number>;
  let addonTotal = 0;
  if (inputs.addons) {
    for (const [key, active] of Object.entries(inputs.addons)) {
      if (active && addons[key as JunkAddon] != null) {
        addonTotal += addons[key as JunkAddon];
      }
    }
  }

  const minCharge = (s.min_charge as number) ?? 175;

  let subtotalLow = loadTier.min_total + disposalTotal + accessSurcharge + addonTotal;
  let subtotalHigh = loadTier.max_total + disposalTotal + accessSurcharge + addonTotal;

  subtotalLow = Math.max(minCharge, subtotalLow);
  subtotalHigh = Math.max(minCharge, subtotalHigh);

  const taxLow = subtotalLow * taxRate;
  const taxHigh = subtotalHigh * taxRate;

  const totalLow = subtotalLow + taxLow;
  const totalHigh = subtotalHigh + taxHigh;

  const crew = s.default_crew as { drivers: number; helpers: number };

  const scopeSummary = selectedCategoryLabels.length > 0
    ? `Approx. ${inputs.load_tier} — ${selectedCategoryLabels.join(', ')}`
    : `Approx. ${inputs.load_tier}`;

  const breakdown_lines: PricingBreakdownLine[] = [
    { label: `Load (${inputs.load_tier})`, low: loadTier.min_total, high: loadTier.max_total },
  ];
  if (disposalTotal > 0) breakdown_lines.push({ label: 'HRM Disposal Fees', low: disposalTotal, high: disposalTotal });
  if (accessSurcharge > 0) breakdown_lines.push({ label: `Access Surcharge (${accessType.replace(/_/g, ' ')})`, low: accessSurcharge, high: accessSurcharge });
  if (addonTotal > 0) breakdown_lines.push({ label: 'Add-ons', low: addonTotal, high: addonTotal });
  breakdown_lines.push({ label: `Nova Scotia HST (${(taxRate * 100).toFixed(0)}%)`, low: Math.round(taxLow), high: Math.round(taxHigh) });

  return {
    estimate_low: Math.round(totalLow),
    estimate_high: Math.round(totalHigh),
    expected_price: midpoint(totalLow, totalHigh),
    cap_amount: null,
    staffing_defaults: { drivers: crew?.drivers ?? 1, helpers: crew?.helpers ?? 1 },
    advisory_notes,
    scope_summary: scopeSummary,
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
        disposal_fees: disposalTotal,
        access_surcharge: accessSurcharge,
        addons: Math.round(addonTotal),
        load_tier: inputs.load_tier,
      },
      breakdown_lines,
      inputs,
    },
  };
}

// ─── Light Demo Engine ────────────────────────────────────────────────────────

const DEBRIS_CLASS_AUTO_MAP: Record<DemoMaterialType, DemoDebrisClass> = {
  wood: 'clean_wood',
  drywall_plaster: 'drywall',
  concrete_masonry: 'concrete',
  mixed: 'mixed',
};

function calcDemo(
  inputs: DemoInputs,
  settings: Record<string, any>,
  taxRate: number
): EstimateResult {
  const s = { ...HALIFAX_DEMO_DEFAULTS, ...settings };

  const scopeTier = (s.scope_tiers as Array<{ label: string; min_hours: number; max_hours: number }>)
    .find((t) => t.label === inputs.scope_tier) ?? s.scope_tiers[0];

  const crew = s.default_crew as { drivers: number; helpers: number };
  const totalWorkers = (crew?.drivers ?? 1) + (crew?.helpers ?? 1) + (inputs.extra_workers ?? 0);
  const hourlyRate = s.hourly_rate_per_worker as number;

  const laborLow = scopeTier.min_hours * hourlyRate * totalWorkers;
  const laborHigh = scopeTier.max_hours * hourlyRate * totalWorkers;

  // Debris class disposal
  const debrisClassRates = s.debris_class_rates as Record<DemoDebrisClass, { min: number; max: number }>
    ?? HALIFAX_DEMO_DEFAULTS.debris_class_rates;

  const debrisClass = inputs.debris_class
    ?? (inputs.material_type ? DEBRIS_CLASS_AUTO_MAP[inputs.material_type] : 'mixed');

  const debrisRates = debrisClassRates[debrisClass] ?? debrisClassRates.mixed;
  const disposalLow = debrisRates.min;
  const disposalHigh = debrisRates.max;

  const advisory_notes: string[] = [];

  // Permit advisory
  let permitLow = 0;
  let permitHigh = 0;
  if (inputs.needs_permit) {
    const permitRange = s.permit_estimate_range as { min: number; max: number } ?? HALIFAX_DEMO_DEFAULTS.permit_estimate_range;
    permitLow = permitRange.min;
    permitHigh = permitRange.max;
    advisory_notes.push(`Halifax permit required — estimated $${permitRange.min}–$${permitRange.max}. Confirm with HRM Planning & Development.`);
  }

  // Asbestos/lead reserve
  let asbestosReserve = 0;
  if (inputs.build_year && inputs.build_year < 1990) {
    asbestosReserve = (s.asbestos_reserve as number) ?? HALIFAX_DEMO_DEFAULTS.asbestos_reserve;
    advisory_notes.push(`Pre-1990 build — asbestos/lead pre-inspection strongly advised. Reserve of ${formatCurrency(asbestosReserve)} included.`);
  }

  // Standard addons
  const addons = s.addons as Record<DemoAddon, number>;
  let addonTotal = 0;
  if (inputs.addons) {
    for (const [key, active] of Object.entries(inputs.addons)) {
      if (active && addons[key as DemoAddon] != null) {
        addonTotal += addons[key as DemoAddon];
      }
    }
  }

  const subtotalLow = laborLow + disposalLow + permitLow + asbestosReserve + addonTotal;
  const subtotalHigh = laborHigh + disposalHigh + permitHigh + asbestosReserve + addonTotal;

  const taxLow = subtotalLow * taxRate;
  const taxHigh = subtotalHigh * taxRate;

  const totalLow = subtotalLow + taxLow;
  const totalHigh = subtotalHigh + taxHigh;

  const debrisLabel = debrisClass.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const breakdown_lines: PricingBreakdownLine[] = [
    { label: 'Labour', low: Math.round(laborLow), high: Math.round(laborHigh) },
    { label: `Disposal (${debrisLabel})`, low: disposalLow, high: disposalHigh },
  ];
  if (permitLow > 0) breakdown_lines.push({ label: 'Permit Estimate', low: permitLow, high: permitHigh });
  if (asbestosReserve > 0) breakdown_lines.push({ label: 'Asbestos/Lead Reserve', low: asbestosReserve, high: asbestosReserve, is_advisory: true });
  if (addonTotal > 0) breakdown_lines.push({ label: 'Add-ons', low: addonTotal, high: addonTotal });
  breakdown_lines.push({ label: `Nova Scotia HST (${(taxRate * 100).toFixed(0)}%)`, low: Math.round(taxLow), high: Math.round(taxHigh) });

  return {
    estimate_low: Math.round(totalLow),
    estimate_high: Math.round(totalHigh),
    expected_price: midpoint(totalLow, totalHigh),
    cap_amount: null,
    staffing_defaults: { drivers: crew?.drivers ?? 1, helpers: crew?.helpers ?? 1 },
    advisory_notes,
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
        debris_class: debrisClass,
        permit_low: permitLow,
        permit_high: permitHigh,
        asbestos_reserve: asbestosReserve,
        addons: Math.round(addonTotal),
        total_workers: totalWorkers,
        min_hours: scopeTier.min_hours,
        max_hours: scopeTier.max_hours,
        scope_tier: inputs.scope_tier,
      },
      breakdown_lines,
      inputs,
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function calculateEstimate(
  service_type: PricingServiceType,
  inputs: QuoteInputs,
  pricingSettings: Record<string, any> | null,
  taxRateFraction: number
): EstimateResult {
  const effectiveSettings = pricingSettings ?? {};
  const effectiveTax = taxRateFraction > 0 ? taxRateFraction : 0.15;

  switch (service_type) {
    case 'moving':
      return calcMoving(inputs as MovingInputs, effectiveSettings, effectiveTax);
    case 'junk_removal':
      return calcJunk(inputs as JunkInputs, effectiveSettings, effectiveTax);
    case 'demolition':
      return calcDemo(inputs as DemoInputs, effectiveSettings, effectiveTax);
  }
}

export function buildJunkScopeSummary(inputs: JunkInputs): string {
  const selectedLabels: string[] = [];
  if (inputs.item_categories) {
    for (const [key, active] of Object.entries(inputs.item_categories)) {
      if (active) selectedLabels.push(JUNK_ITEM_LABELS[key as JunkItemCategory] ?? key);
    }
  }
  return selectedLabels.length > 0
    ? `Approx. ${inputs.load_tier} — ${selectedLabels.join(', ')}`
    : `Approx. ${inputs.load_tier}`;
}
