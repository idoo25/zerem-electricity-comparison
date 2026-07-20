export type MeterType = "smart" | "basic";
export type Phase = "single" | "three";

export type ScheduleRule = {
  days: number[];
  start: string;
  end: string;
};

export type DiscountTier = {
  lower?: number;
  upper?: number;
  percent: number;
};

export type DiscountModel =
  | { type: "flat"; percent: number }
  | { type: "tenure_tiered"; tiers: DiscountTier[] }
  | { type: "monthly_baseline_tiered"; tiers: DiscountTier[] };

export type Plan = {
  id: string;
  provider: string;
  name: string;
  category: string;
  valid_from: string;
  valid_to: string | null;
  vat_included: boolean;
  ordinary_money_only: boolean;
  requires_other_service: boolean;
  meter_types: MeterType[];
  discount_model: DiscountModel;
  schedule: ScheduleRule[];
  monthly_fee_ils: number;
  excludes_holidays: boolean;
  source_url: string;
  verified_at: string;
};

export type Catalog = {
  catalog_version: string;
  verified_at: string;
  next_review_on: string;
  currency: "ILS";
  billing: {
    vat_rate_percent: number;
    baseline_energy_agorot_per_kwh: number;
    fixed_monthly_ils: Record<Phase, number>;
    fixed_monthly_components_ils: Record<Phase, { distribution: number; supply: number }>;
    private_supplier_fixed_monthly_components_ils: Record<Phase, { distribution: number; supply: number }>;
    capacity_ils_per_kva_year: number;
  };
  plans: Plan[];
};

export type Reading = {
  timestamp: string;
  dateKey: string;
  monthKey: string;
  year: number;
  month: number;
  day: number;
  weekday: number;
  minuteOfDay: number;
  consumptionKwh: number;
};

export type Profile = {
  meterType: MeterType;
  phase: Phase;
  tenureYear: number;
  capacityKva?: number;
};

export type ComparisonResult = {
  planId: string;
  provider: string;
  plan: string;
  category: string;
  totalCostIls: number;
  netSavingsIls: number;
  netSavingsPercent: number;
  discountedKwh: number;
  discountedConsumptionPercent: number;
  planFeeIls: number;
  discountIls: number;
  energyDiscountPercent: number;
  effectiveBillDiscountIls: number;
  effectiveBillDiscountPercent: number;
  fixedChargeSavingsIls: number;
  warnings: string[];
  meterTypes: MeterType[];
  sourceUrl: string;
  verifiedAt: string;
};

export type ParsedMeterFile = {
  readings: Reading[];
  rows: number;
  totalKwh: number;
  start: string;
  end: string;
  intervalMinutes: number;
  coverageRatio: number;
  duplicateSlots: number;
  missingSlots: number;
};

export type MonthlyInvoiceEstimate = {
  planId: string;
  provider: string;
  plan: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  calendarDays: number;
  observedDays: number;
  source: "meter-full-month" | "sample-bill";
  consumptionKwh: number;
  discountedKwh: number;
  baselineEnergyInclVatIls: number;
  supplierDiscountInclVatIls: number;
  regulatedFixedInclVatIls: number;
  distributionFixedInclVatIls: number;
  supplyFixedInclVatIls: number;
  capacityChargeInclVatIls: number;
  supplierFeeInclVatIls: number;
  totalInclVatIls: number;
  baselineTotalInclVatIls: number;
  vatIncludedIls: number;
  savingsInclVatIls: number;
  savingsPercent: number;
  energyDiscountPercent: number;
  effectiveBillDiscountInclVatIls: number;
  effectiveBillDiscountPercent: number;
  fixedChargeSavingsInclVatIls: number;
  firstYearDiscountLabel: string;
  phase: Phase;
  rateAgorotInclVat: number;
  vatRatePercent: number;
  billingYearDays: number;
  distributionMonthlyRateInclVatIls: number;
  supplyMonthlyRateInclVatIls: number;
  baselineDistributionMonthlyRateInclVatIls: number;
  baselineSupplyMonthlyRateInclVatIls: number;
  capacityAnnualRateInclVatIls: number;
  capacityKva?: number;
  supplierMonthlyFeeInclVatIls: number;
  verifiedAt: string;
  sourceUrl: string;
  warnings: string[];
  assumptions: string[];
};

export type PeriodPlanResult = {
  planId: string;
  provider: string;
  plan: string;
  costIls: number;
  savingsIls: number;
  savingsPercent: number;
  effectiveBillDiscountIls: number;
  effectiveBillDiscountPercent: number;
  fixedChargeSavingsIls: number;
};

export type PeriodRecommendation = {
  id: string;
  label: string;
  start: string;
  end: string;
  calendarDays: number;
  observedDays: number;
  consumptionKwh: number;
  baselineCostIls: number;
  winner: PeriodPlanResult;
  alternatives: PeriodPlanResult[];
  gapToSecondIls: number;
  rangeLabel?: string;
};

export type SeasonalRecommendation = PeriodRecommendation & {
  fixedPlanCostIls: number;
  incrementalSavingsIls: number;
  incrementalSavingsPercent: number;
  usesAnnualFixedPlan: boolean;
};

export type AnnualStrategySummary = {
  baselineCostIls: number;
  fixedPlan: PeriodPlanResult;
  fixedPlanCostIls: number;
  strategyCostIls: number;
  savingsVsBaselineIls: number;
  savingsVsBaselinePercent: number;
  effectiveBillDiscountIls: number;
  effectiveBillDiscountPercent: number;
  savingsVsFixedIls: number;
  savingsVsFixedPercent: number;
};

export type OptimizedWindow = PeriodRecommendation & {
  fixedPlanCostIls: number;
  incrementalSavingsIls: number;
  incrementalSavingsPercent: number;
  qualifiesForSwitch: boolean;
};

export type SwitchSegment = {
  start: string;
  end: string;
  calendarDays: number;
  planId: string;
  provider: string;
  plan: string;
  costIls: number;
  effectiveBillDiscountIls: number;
  savingsVsFixedIls: number;
  savingsVsFixedPercent: number;
};

export type SwitchingStrategy = {
  minimumStayDays: number;
  minimumImprovementPercent: number;
  fixedPlan: PeriodPlanResult;
  fixedPlanCostIls: number;
  strategyCostIls: number;
  incrementalSavingsIls: number;
  incrementalSavingsPercent: number;
  baselineCostIls: number;
  savingsVsBaselineIls: number;
  savingsVsBaselinePercent: number;
  effectiveBillDiscountIls: number;
  effectiveBillDiscountPercent: number;
  projectionRangeLabel: string;
  switchCount: number;
  recommended: boolean;
  explanation: string;
  segments: SwitchSegment[];
};

export type TemporalAnalysis = {
  months: PeriodRecommendation[];
  seasons: SeasonalRecommendation[];
  seasonalAnnual: AnnualStrategySummary;
  optimizedWindows: OptimizedWindow[];
  switching: SwitchingStrategy;
};
