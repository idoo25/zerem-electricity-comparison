import Papa from "papaparse";
import { catalog, firstYearDiscountLabel } from "@/lib/catalog";
import type {
  ComparisonResult,
  DiscountTier,
  MonthlyInvoiceEstimate,
  OptimizedWindow,
  ParsedMeterFile,
  Plan,
  PeriodPlanResult,
  PeriodRecommendation,
  Profile,
  Reading,
  SeasonalRecommendation,
  SwitchSegment,
  TemporalAnalysis,
} from "@/lib/types";

const DATE_HINTS = ["תאריך", "date"];
const TIME_HINTS = ["שעה", "מועד תחילת", "פעימה", "time"];
const CONSUMPTION_HINTS = ["צריכה", "קוט", "consumption", "kwh"];
const TYPE_HINTS = ["סוג מונה", "record type", "meter type"];

function containsHint(value: unknown, hints: string[]) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return hints.some((hint) => normalized.includes(hint));
}

function numeric(value: unknown) {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseDateTime(dateValue: unknown, timeValue: unknown): Reading | null {
  const dateText = String(dateValue ?? "").trim();
  const timeText = String(timeValue ?? "00:00").trim();
  const dateMatch = dateText.match(/^(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{1,4})$/);
  const timeMatch = timeText.match(/^(\d{1,2}):(\d{2})/);
  if (!dateMatch || !timeMatch) return null;

  let year: number;
  let month: number;
  let day: number;
  if (dateMatch[1].length === 4) {
    year = Number(dateMatch[1]);
    month = Number(dateMatch[2]);
    day = Number(dateMatch[3]);
  } else {
    day = Number(dateMatch[1]);
    month = Number(dateMatch[2]);
    year = Number(dateMatch[3]);
  }
  if (year < 100) year += 2000;
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (
    month < 1 || month > 12 || day < 1 || day > 31 ||
    hour < 0 || hour > 23 || minute < 0 || minute > 59
  ) return null;

  const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return {
    timestamp: `${dateKey}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    dateKey,
    monthKey: dateKey.slice(0, 7),
    year,
    month,
    day,
    weekday,
    minuteOfDay: hour * 60 + minute,
    consumptionKwh: 0,
  };
}

async function decodeFile(file: File) {
  const buffer = await file.arrayBuffer();
  let text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  if ((text.match(/�/g) ?? []).length > 3) {
    text = new TextDecoder("windows-1255").decode(buffer);
  }
  return text.replace(/^\uFEFF/, "");
}

export async function parseMeterFile(file: File): Promise<ParsedMeterFile> {
  const text = await decodeFile(file);
  const parsed = Papa.parse<string[]>(text, {
    skipEmptyLines: "greedy",
  });
  const rows = parsed.data;
  let headerIndex = -1;
  let dateColumn = -1;
  let timeColumn = -1;
  let consumptionColumn = -1;
  let typeColumn = -1;

  for (let rowIndex = 0; rowIndex < Math.min(50, rows.length); rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const date = row.findIndex((value) => containsHint(value, DATE_HINTS));
    const time = row.findIndex((value) => containsHint(value, TIME_HINTS));
    const consumption = row.findIndex((value) => containsHint(value, CONSUMPTION_HINTS));
    if (date >= 0 && time >= 0 && consumption >= 0) {
      headerIndex = rowIndex;
      dateColumn = date;
      timeColumn = time;
      consumptionColumn = consumption;
      typeColumn = row.findIndex((value) => containsHint(value, TYPE_HINTS));
      break;
    }
  }
  if (headerIndex < 0) {
    throw new Error("לא נמצאה שורת כותרת עם תאריך, שעה וצריכה. יש לייצא קובץ CSV של פעימות המונה.");
  }

  const readings: Reading[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    if (typeColumn >= 0) {
      const kind = String(row[typeColumn] ?? "").toLowerCase();
      if (kind && !kind.includes("צריכה") && !kind.includes("consumption")) continue;
    }
    const reading = parseDateTime(row[dateColumn], row[timeColumn]);
    const consumption = numeric(row[consumptionColumn]);
    if (!reading || !Number.isFinite(consumption)) continue;
    if (consumption < 0) throw new Error("הקובץ מכיל צריכה שלילית שאינה נתמכת כרגע.");
    reading.consumptionKwh = consumption;
    readings.push(reading);
  }
  if (readings.length === 0) throw new Error("לא נמצאו פעימות צריכה תקינות בקובץ.");
  readings.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const unique = new Set(readings.map((reading) => reading.timestamp));
  const duplicateSlots = readings.length - unique.size;
  const minutes = readings.map((reading) => reading.minuteOfDay);
  let intervalMinutes = 15;
  const differences = new Map<number, number>();
  for (let index = 1; index < readings.length; index += 1) {
    const previous = Date.parse(`${readings[index - 1].timestamp}:00Z`);
    const current = Date.parse(`${readings[index].timestamp}:00Z`);
    const difference = Math.round((current - previous) / 60_000);
    if (difference > 0 && difference <= 180) {
      differences.set(difference, (differences.get(difference) ?? 0) + 1);
    }
  }
  if (differences.size) {
    intervalMinutes = [...differences.entries()].sort((a, b) => b[1] - a[1])[0][0];
  } else if (minutes.length < 2) {
    intervalMinutes = 0;
  }
  const startMs = Date.parse(`${readings[0].timestamp}:00Z`);
  const endMs = Date.parse(`${readings.at(-1)!.timestamp}:00Z`);
  const expected = intervalMinutes > 0 ? Math.round((endMs - startMs) / 60_000 / intervalMinutes) + 1 : readings.length;
  const missingSlots = Math.max(0, expected - unique.size);

  return {
    readings,
    rows: readings.length,
    totalKwh: readings.reduce((sum, reading) => sum + reading.consumptionKwh, 0),
    start: readings[0].timestamp,
    end: readings.at(-1)!.timestamp,
    intervalMinutes,
    coverageRatio: expected ? Math.min(1, unique.size / expected) : 0,
    duplicateSlots,
    missingSlots,
  };
}

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function scheduleMatches(reading: Reading, plan: Plan) {
  return plan.schedule.some((rule) => {
    const start = minutes(rule.start);
    const end = minutes(rule.end);
    if (start === end) return rule.days.includes(reading.weekday);
    if (start < end) {
      return rule.days.includes(reading.weekday) && reading.minuteOfDay >= start && reading.minuteOfDay < end;
    }
    const previousDay = (reading.weekday + 6) % 7;
    return (
      (rule.days.includes(reading.weekday) && reading.minuteOfDay >= start) ||
      (rule.days.includes(previousDay) && reading.minuteOfDay < end)
    );
  });
}

export function tierValue(value: number, tiers: DiscountTier[]) {
  const tier = tiers.find((item) => value >= (item.lower ?? -Infinity) && value < (item.upper ?? Infinity));
  if (!tier) throw new Error(`לא נמצאה מדרגת הנחה לערך ${value}`);
  return tier.percent;
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function daysInYear(year: number) {
  return new Date(Date.UTC(year, 1, 29)).getUTCDate() === 29 ? 366 : 365;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function normalizeProfile(profile: Profile): Profile {
  if (profile.capacityKva && Number.isFinite(profile.capacityKva)) return profile;
  return { ...profile, phase: "three", capacityKva: 17.32 };
}

function monthlyBillingFraction(dates: Iterable<Reading>) {
  let fraction = 0;
  for (const reading of dates) fraction += 12 / daysInYear(reading.year);
  return fraction;
}

function annualBillingFraction(dates: Iterable<Reading>) {
  let fraction = 0;
  for (const reading of dates) fraction += 1 / daysInYear(reading.year);
  return fraction;
}

export function comparePlans(readings: Reading[], profile: Profile): ComparisonResult[] {
  profile = normalizeProfile(profile);
  const baselineRate = catalog.billing.baseline_energy_agorot_per_kwh / 100;
  const monthlyBaseline = new Map<string, number>();
  for (const reading of readings) {
    monthlyBaseline.set(
      reading.monthKey,
      (monthlyBaseline.get(reading.monthKey) ?? 0) + reading.consumptionKwh * baselineRate,
    );
  }
  const uniqueDates = new Map<string, Reading>();
  for (const reading of readings) uniqueDates.set(reading.dateKey, reading);
  const monthFraction = monthlyBillingFraction(uniqueDates.values());
  const yearFraction = annualBillingFraction(uniqueDates.values());
  const regulatedFixed = catalog.billing.fixed_monthly_ils[profile.phase] * monthFraction;
  const privateFixedComponents = catalog.billing.private_supplier_fixed_monthly_components_ils[profile.phase];
  const privateRegulatedFixed = (privateFixedComponents.distribution + privateFixedComponents.supply) * monthFraction;
  const capacityCharge = profile.capacityKva
    ? catalog.billing.capacity_ils_per_kva_year * profile.capacityKva * yearFraction
    : 0;
  const baselineVariable = readings.reduce(
    (sum, reading) => sum + reading.consumptionKwh * baselineRate,
    0,
  );
  const baselineTotal = roundMoney(baselineVariable + regulatedFixed + capacityCharge);

  return catalog.plans
    .filter((plan) => plan.meter_types.includes(profile.meterType))
    .filter((plan) => plan.vat_included && plan.ordinary_money_only && !plan.requires_other_service)
    .map((plan) => {
      let discountIls = 0;
      let discountedKwh = 0;
      for (const reading of readings) {
        if (!scheduleMatches(reading, plan)) continue;
        const model = plan.discount_model;
        let percent = 0;
        if (model.type === "flat") percent = model.percent;
        if (model.type === "tenure_tiered") percent = tierValue(profile.tenureYear, model.tiers);
        if (model.type === "monthly_baseline_tiered") {
          percent = tierValue(monthlyBaseline.get(reading.monthKey) ?? 0, model.tiers);
        }
        discountedKwh += reading.consumptionKwh;
        discountIls += reading.consumptionKwh * baselineRate * percent / 100;
      }
      const energyDiscountPercent = baselineVariable ? discountIls / baselineVariable * 100 : 0;
      const planFeeIls = roundMoney(plan.monthly_fee_ils * monthFraction);
      discountIls = roundMoney(discountIls);
      const totalCostIls = roundMoney(baselineVariable - discountIls + privateRegulatedFixed + capacityCharge + planFeeIls);
      const netSavingsIls = roundMoney(baselineTotal - totalCostIls);
      const effectiveBillDiscountIls = roundMoney(discountIls - planFeeIls);
      const fixedChargeSavingsIls = roundMoney(netSavingsIls - effectiveBillDiscountIls);
      const warnings: string[] = [];
      if (plan.excludes_holidays) warnings.push("נדרשת רשימת חגים לחישוב מדויק לחלוטין");
      if (!profile.capacityKva) warnings.push("רכיב הקיבולת לא נכלל ללא גודל חיבור");
      return {
        planId: plan.id,
        provider: plan.provider,
        plan: plan.name,
        category: plan.category,
        totalCostIls,
        netSavingsIls,
        netSavingsPercent: baselineTotal ? netSavingsIls / baselineTotal * 100 : 0,
        discountedKwh,
        discountedConsumptionPercent: readings.length && baselineVariable
          ? discountedKwh / readings.reduce((sum, reading) => sum + reading.consumptionKwh, 0) * 100
          : 0,
        planFeeIls,
        discountIls,
        energyDiscountPercent,
        effectiveBillDiscountIls,
        effectiveBillDiscountPercent: baselineTotal ? effectiveBillDiscountIls / baselineTotal * 100 : 0,
        fixedChargeSavingsIls,
        warnings,
        meterTypes: plan.meter_types,
        sourceUrl: plan.source_url,
        verifiedAt: plan.verified_at,
      } satisfies ComparisonResult;
    })
    .sort((a, b) => a.totalCostIls - b.totalCostIls || a.provider.localeCompare(b.provider, "he"));
}

function sampleBillReadings(): Reading[] {
  const readings: Reading[] = [];
  const start = Date.UTC(2026, 5, 18);
  const slotConsumption = 2717 / (28 * 96);
  for (let dayIndex = 0; dayIndex < 28; dayIndex += 1) {
    const date = new Date(start + dayIndex * 86_400_000);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    for (let slot = 0; slot < 96; slot += 1) {
      const minuteOfDay = slot * 15;
      const hour = Math.floor(minuteOfDay / 60);
      const minute = minuteOfDay % 60;
      readings.push({
        timestamp: `${dateKey}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        dateKey,
        monthKey: dateKey.slice(0, 7),
        year,
        month,
        day,
        weekday: date.getUTCDay(),
        minuteOfDay,
        consumptionKwh: slotConsumption,
      });
    }
  }
  return readings;
}

export function buildMonthlyInvoiceEstimates(readings: Reading[], profile: Profile): MonthlyInvoiceEstimate[] {
  profile = normalizeProfile(profile);
  const readingsByMonth = new Map<string, Reading[]>();
  for (const reading of readings) {
    const group = readingsByMonth.get(reading.monthKey) ?? [];
    group.push(reading);
    readingsByMonth.set(reading.monthKey, group);
  }
  const completeMonth = [...readingsByMonth.entries()]
    .filter(([, monthReadings]) => {
      const uniqueDays = new Set(monthReadings.map((reading) => reading.dateKey)).size;
      const uniqueSlots = new Set(monthReadings.map((reading) => reading.timestamp)).size;
      const first = monthReadings[0];
      return Boolean(first)
        && uniqueDays === daysInMonth(first.year, first.month)
        && uniqueSlots >= uniqueDays * 96 * 0.98;
    })
    .sort(([left], [right]) => right.localeCompare(left))[0];

  const source: MonthlyInvoiceEstimate["source"] = completeMonth ? "meter-full-month" : "sample-bill";
  const periodReadings = completeMonth?.[1] ?? sampleBillReadings();
  const uniqueDates = new Map<string, Reading>();
  for (const reading of periodReadings) uniqueDates.set(reading.dateKey, reading);
  const firstReading = periodReadings[0];
  const lastReading = periodReadings.at(-1)!;
  const monthFraction = monthlyBillingFraction(uniqueDates.values());
  const yearFraction = annualBillingFraction(uniqueDates.values());
  const effectiveProfile = profile;
  const results = comparePlans(periodReadings, effectiveProfile);
  const consumptionKwh = periodReadings.reduce((sum, reading) => sum + reading.consumptionKwh, 0);
  const baselineEnergyInclVatIls = roundMoney(consumptionKwh * catalog.billing.baseline_energy_agorot_per_kwh / 100);
  const baselineFixedComponents = catalog.billing.fixed_monthly_components_ils[effectiveProfile.phase];
  const fixedComponents = catalog.billing.private_supplier_fixed_monthly_components_ils[effectiveProfile.phase];
  const distributionFixedInclVatIls = roundMoney(fixedComponents.distribution * monthFraction);
  const supplyFixedInclVatIls = roundMoney(fixedComponents.supply * monthFraction);
  const regulatedFixedInclVatIls = roundMoney(distributionFixedInclVatIls + supplyFixedInclVatIls);
  const capacityChargeInclVatIls = effectiveProfile.capacityKva
    ? roundMoney(catalog.billing.capacity_ils_per_kva_year * effectiveProfile.capacityKva * yearFraction)
    : 0;
  const baselineDistributionFixedInclVatIls = roundMoney(baselineFixedComponents.distribution * monthFraction);
  const baselineSupplyFixedInclVatIls = roundMoney(baselineFixedComponents.supply * monthFraction);
  const periodLabel = source === "meter-full-month"
    ? new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "UTC" })
      .format(new Date(`${firstReading.dateKey}T00:00:00Z`))
    : "תקופת דוגמה מהחשבון שסופק";
  const baseAssumptions = [
    "כל הסכומים כוללים מע״מ.",
    "לא נכלל זיכוי התלוי באמצעי תשלום או בהוראת קבע.",
    "התשלומים הקבועים מחושבים באופן יומי על בסיס התעריף השנתי ובהתאם למספר הימים בכל שנה.",
  ];
  if (source === "sample-bill") {
    baseAssumptions.push("אין בקובץ חודש קלנדרי מלא; נעשה שימוש בתרחיש דוגמה של 2,717 קוט״ש ל-28 ימים בפריסה אחידה.");
  }
  baseAssumptions.unshift("גודל החיבור נלקח מהחשבון האמיתי שסופק: 3×25A, שהם 17.32 KVA.");
  baseAssumptions.push("זו סימולציה בתעריפי יולי 2026 על פרופיל הצריכה, ולא שחזור תעריפים היסטוריים.");

  return results.map((result) => {
    const plan = catalog.plans.find((item) => item.id === result.planId)!;
    const supplierDiscountInclVatIls = roundMoney(result.discountIls);
    const supplierFeeInclVatIls = roundMoney(result.planFeeIls);
    const totalInclVatIls = roundMoney(
      baselineEnergyInclVatIls - supplierDiscountInclVatIls + regulatedFixedInclVatIls
        + capacityChargeInclVatIls + supplierFeeInclVatIls,
    );
    const baselineTotalInclVatIls = roundMoney(
      baselineEnergyInclVatIls + baselineDistributionFixedInclVatIls
        + baselineSupplyFixedInclVatIls + capacityChargeInclVatIls,
    );
    const effectiveBillDiscountInclVatIls = roundMoney(supplierDiscountInclVatIls - supplierFeeInclVatIls);
    const fixedChargeSavingsInclVatIls = roundMoney(
      baselineDistributionFixedInclVatIls + baselineSupplyFixedInclVatIls - regulatedFixedInclVatIls,
    );
    const savingsInclVatIls = roundMoney(baselineTotalInclVatIls - totalInclVatIls);
    const vatIncludedIls = roundMoney(totalInclVatIls * catalog.billing.vat_rate_percent / (100 + catalog.billing.vat_rate_percent));
    return {
      planId: result.planId,
      provider: result.provider,
      plan: result.plan,
      periodLabel,
      periodStart: firstReading.dateKey,
      periodEnd: lastReading.dateKey,
      calendarDays: uniqueDates.size,
      observedDays: uniqueDates.size,
      source,
      consumptionKwh,
      discountedKwh: result.discountedKwh,
      baselineEnergyInclVatIls,
      supplierDiscountInclVatIls,
      regulatedFixedInclVatIls,
      distributionFixedInclVatIls,
      supplyFixedInclVatIls,
      capacityChargeInclVatIls,
      supplierFeeInclVatIls,
      totalInclVatIls,
      baselineTotalInclVatIls,
      vatIncludedIls,
      savingsInclVatIls,
      savingsPercent: baselineTotalInclVatIls ? savingsInclVatIls / baselineTotalInclVatIls * 100 : 0,
      energyDiscountPercent: result.energyDiscountPercent,
      effectiveBillDiscountInclVatIls,
      effectiveBillDiscountPercent: baselineTotalInclVatIls ? effectiveBillDiscountInclVatIls / baselineTotalInclVatIls * 100 : 0,
      fixedChargeSavingsInclVatIls,
      firstYearDiscountLabel: firstYearDiscountLabel(plan),
      phase: effectiveProfile.phase,
      rateAgorotInclVat: catalog.billing.baseline_energy_agorot_per_kwh,
      vatRatePercent: catalog.billing.vat_rate_percent,
      billingYearDays: daysInYear(firstReading.year),
      distributionMonthlyRateInclVatIls: fixedComponents.distribution,
      supplyMonthlyRateInclVatIls: fixedComponents.supply,
      baselineDistributionMonthlyRateInclVatIls: baselineFixedComponents.distribution,
      baselineSupplyMonthlyRateInclVatIls: baselineFixedComponents.supply,
      capacityAnnualRateInclVatIls: catalog.billing.capacity_ils_per_kva_year,
      capacityKva: effectiveProfile.capacityKva,
      supplierMonthlyFeeInclVatIls: plan.monthly_fee_ils,
      verifiedAt: result.verifiedAt,
      sourceUrl: result.sourceUrl,
      warnings: result.warnings,
      assumptions: [...baseAssumptions],
    };
  });
}

const MINIMUM_STAY_DAYS = 85;
const MINIMUM_SWITCH_IMPROVEMENT = 5;

type DailyPlanCosts = {
  dateKey: string;
  monthKey: string;
  year: number;
  month: number;
  consumptionKwh: number;
  baselineCostIls: number;
  planCostsIls: number[];
  discountsIls: number[];
};

type WindowCandidate = {
  startIndex: number;
  endIndex: number;
  planIndex: number;
  fixedCostIls: number;
  planCostIls: number;
  savingsIls: number;
  savingsPercent: number;
  qualifies: boolean;
};

function eligiblePlans(profile: Profile) {
  return catalog.plans
    .filter((plan) => plan.meter_types.includes(profile.meterType))
    .filter((plan) => plan.vat_included && plan.ordinary_money_only && !plan.requires_other_service);
}

function discountPercent(plan: Plan, reading: Reading, profile: Profile, monthlyBaseline: Map<string, number>) {
  const model = plan.discount_model;
  if (model.type === "flat") return model.percent;
  if (model.type === "tenure_tiered") return tierValue(profile.tenureYear, model.tiers);
  return tierValue(monthlyBaseline.get(reading.monthKey) ?? 0, model.tiers);
}

function buildDailyPlanCosts(readings: Reading[], profile: Profile, plans: Plan[]) {
  const baselineRate = catalog.billing.baseline_energy_agorot_per_kwh / 100;
  const monthlyBaseline = new Map<string, number>();
  for (const reading of readings) {
    monthlyBaseline.set(reading.monthKey, (monthlyBaseline.get(reading.monthKey) ?? 0) + reading.consumptionKwh * baselineRate);
  }

  const days = new Map<string, DailyPlanCosts>();
  for (const reading of readings) {
    let day = days.get(reading.dateKey);
    if (!day) {
      day = {
        dateKey: reading.dateKey,
        monthKey: reading.monthKey,
        year: reading.year,
        month: reading.month,
        consumptionKwh: 0,
        baselineCostIls: 0,
        planCostsIls: [],
        discountsIls: Array.from({ length: plans.length }, () => 0),
      };
      days.set(reading.dateKey, day);
    }
    const energyCost = reading.consumptionKwh * baselineRate;
    day.consumptionKwh += reading.consumptionKwh;
    day.baselineCostIls += energyCost;
    plans.forEach((plan, planIndex) => {
      if (!scheduleMatches(reading, plan)) return;
      day!.discountsIls[planIndex] += energyCost * discountPercent(plan, reading, profile, monthlyBaseline) / 100;
    });
  }

  return [...days.values()]
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .map((day) => {
      const yearDays = daysInYear(day.year);
      const baselineFixedComponents = catalog.billing.fixed_monthly_components_ils[profile.phase];
      const privateFixedComponents = catalog.billing.private_supplier_fixed_monthly_components_ils[profile.phase];
      const regulatedFixed = (baselineFixedComponents.distribution + baselineFixedComponents.supply) * 12 / yearDays;
      const privateRegulatedFixed = (privateFixedComponents.distribution + privateFixedComponents.supply) * 12 / yearDays;
      const capacityCharge = profile.capacityKva
        ? catalog.billing.capacity_ils_per_kva_year * profile.capacityKva / yearDays
        : 0;
      day.baselineCostIls += regulatedFixed + capacityCharge;
      day.planCostsIls = plans.map((plan, planIndex) => (
        day.baselineCostIls - regulatedFixed + privateRegulatedFixed
          - day.discountsIls[planIndex] + plan.monthly_fee_ils * 12 / yearDays
      ));
      return day;
    });
}

function dateMs(dateKey: string) {
  return Date.parse(`${dateKey}T00:00:00Z`);
}

function inclusiveDays(start: string, end: string) {
  return Math.round((dateMs(end) - dateMs(start)) / 86_400_000) + 1;
}

const seasonDefinitions = [
  { key: "winter", label: "חורף", rangeLabel: "01.12–28.02", months: [12, 1, 2], expectedDays: 90 },
  { key: "spring", label: "אביב", rangeLabel: "01.03–31.05", months: [3, 4, 5], expectedDays: 92 },
  { key: "summer", label: "קיץ", rangeLabel: "01.06–31.08", months: [6, 7, 8], expectedDays: 92 },
  { key: "autumn", label: "סתיו", rangeLabel: "01.09–30.11", months: [9, 10, 11], expectedDays: 91 },
] as const;

function dayMonth(dateKey: string) {
  const [, month, day] = dateKey.split("-");
  return `${day}.${month}`;
}

export function analyzeTemporalStrategies(readings: Reading[], profile: Profile): TemporalAnalysis {
  profile = normalizeProfile(profile);
  const plans = eligiblePlans(profile);
  const days = buildDailyPlanCosts(readings, profile, plans);
  if (!days.length || !plans.length) throw new Error("אין מספיק נתונים לניתוח תקופות.");

  const baselinePrefix = [0];
  const consumptionPrefix = [0];
  const planPrefixes = plans.map(() => [0]);
  const effectiveDiscountPrefixes = plans.map(() => [0]);
  days.forEach((day) => {
    baselinePrefix.push(baselinePrefix.at(-1)! + day.baselineCostIls);
    consumptionPrefix.push(consumptionPrefix.at(-1)! + day.consumptionKwh);
    planPrefixes.forEach((prefix, planIndex) => prefix.push(prefix.at(-1)! + day.planCostsIls[planIndex]));
    effectiveDiscountPrefixes.forEach((prefix, planIndex) => {
      const dailyPlanFee = plans[planIndex].monthly_fee_ils * 12 / daysInYear(day.year);
      prefix.push(prefix.at(-1)! + day.discountsIls[planIndex] - dailyPlanFee);
    });
  });
  const range = (prefix: number[], start: number, end: number) => prefix[end + 1] - prefix[start];

  const period = (id: string, label: string, startIndex: number, endIndex: number): PeriodRecommendation => {
    const baselineCostIls = roundMoney(range(baselinePrefix, startIndex, endIndex));
    const ranked = plans
      .map((plan, planIndex) => {
        const costIls = roundMoney(range(planPrefixes[planIndex], startIndex, endIndex));
        const savingsIls = roundMoney(baselineCostIls - costIls);
        const effectiveBillDiscountIls = roundMoney(range(effectiveDiscountPrefixes[planIndex], startIndex, endIndex));
        return {
          planId: plan.id,
          provider: plan.provider,
          plan: plan.name,
          costIls,
          savingsIls,
          savingsPercent: baselineCostIls ? savingsIls / baselineCostIls * 100 : 0,
          effectiveBillDiscountIls,
          effectiveBillDiscountPercent: baselineCostIls ? effectiveBillDiscountIls / baselineCostIls * 100 : 0,
          fixedChargeSavingsIls: roundMoney(savingsIls - effectiveBillDiscountIls),
        } satisfies PeriodPlanResult;
      })
      .sort((a, b) => a.costIls - b.costIls || a.provider.localeCompare(b.provider, "he"));
    return {
      id,
      label,
      start: days[startIndex].dateKey,
      end: days[endIndex].dateKey,
      calendarDays: inclusiveDays(days[startIndex].dateKey, days[endIndex].dateKey),
      observedDays: endIndex - startIndex + 1,
      consumptionKwh: range(consumptionPrefix, startIndex, endIndex),
      baselineCostIls,
      winner: ranked[0],
      alternatives: ranked.slice(1, 4),
      gapToSecondIls: ranked[1] ? ranked[1].costIls - ranked[0].costIls : 0,
    };
  };

  const groupedPeriods = (keyForDay: (day: DailyPlanCosts) => { key: string; label: string }) => {
    const groups = new Map<string, { label: string; start: number; end: number }>();
    days.forEach((day, index) => {
      const item = keyForDay(day);
      const current = groups.get(item.key);
      if (current) current.end = index;
      else groups.set(item.key, { label: item.label, start: index, end: index });
    });
    return [...groups.entries()].map(([id, item]) => period(id, item.label, item.start, item.end));
  };

  const months = groupedPeriods((day) => ({
    key: day.monthKey,
    label: new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${day.monthKey}-01T00:00:00Z`)),
  }));
  const projectionEndIndex = days.length - 1;
  const projectionCutoff = dateMs(days[projectionEndIndex].dateKey) - 364 * 86_400_000;
  const firstProjectionIndex = days.findIndex((day) => dateMs(day.dateKey) >= projectionCutoff);
  const projectionStartIndex = Math.max(0, firstProjectionIndex);
  const projectionIndices = Array.from(
    { length: projectionEndIndex - projectionStartIndex + 1 },
    (_, offset) => projectionStartIndex + offset,
  );

  const sumIndices = (indices: number[], value: (day: DailyPlanCosts) => number) => (
    indices.reduce((sum, index) => sum + value(days[index]), 0)
  );
  const seasonCalculations = seasonDefinitions.map((definition) => {
    const matching = projectionIndices.filter((index) => definition.months.includes(days[index].month as never));
    const source = matching.length ? matching : projectionIndices;
    const factor = definition.expectedDays / Math.max(source.length, 1);
    const baselineCostIls = sumIndices(source, (day) => day.baselineCostIls) * factor;
    const consumptionKwh = sumIndices(source, (day) => day.consumptionKwh) * factor;
    const planCostsIls = plans.map((_, planIndex) => (
      sumIndices(source, (day) => day.planCostsIls[planIndex]) * factor
    ));
    const effectiveBillDiscountsIls = plans.map((plan, planIndex) => (
      sumIndices(source, (day) => day.discountsIls[planIndex] - plan.monthly_fee_ils * 12 / daysInYear(day.year)) * factor
    ));
    return { definition, source, baselineCostIls, consumptionKwh, planCostsIls, effectiveBillDiscountsIls };
  });
  const annualBaselineCostIls = seasonCalculations.reduce((sum, season) => sum + season.baselineCostIls, 0);
  const annualPlanCosts = plans.map((_, planIndex) => (
    seasonCalculations.reduce((sum, season) => sum + season.planCostsIls[planIndex], 0)
  ));
  const annualEffectiveBillDiscounts = plans.map((_, planIndex) => (
    seasonCalculations.reduce((sum, season) => sum + season.effectiveBillDiscountsIls[planIndex], 0)
  ));
  const fixedPlanIndex = annualPlanCosts.reduce((best, cost, index) => cost < annualPlanCosts[best] ? index : best, 0);
  const planResult = (planIndex: number, costIls: number, baselineCostIls: number, effectiveDiscountIls: number): PeriodPlanResult => {
    const plan = plans[planIndex];
    costIls = roundMoney(costIls);
    baselineCostIls = roundMoney(baselineCostIls);
    const savingsIls = roundMoney(baselineCostIls - costIls);
    const effectiveBillDiscountIls = roundMoney(effectiveDiscountIls);
    return {
      planId: plan.id,
      provider: plan.provider,
      plan: plan.name,
      costIls,
      savingsIls,
      savingsPercent: baselineCostIls ? savingsIls / baselineCostIls * 100 : 0,
      effectiveBillDiscountIls,
      effectiveBillDiscountPercent: baselineCostIls ? effectiveBillDiscountIls / baselineCostIls * 100 : 0,
      fixedChargeSavingsIls: roundMoney(savingsIls - effectiveBillDiscountIls),
    };
  };
  const fixedPlan = planResult(fixedPlanIndex, annualPlanCosts[fixedPlanIndex], annualBaselineCostIls, annualEffectiveBillDiscounts[fixedPlanIndex]);
  const seasons: SeasonalRecommendation[] = seasonCalculations.map((season) => {
    const ranked = plans
      .map((_, planIndex) => planResult(planIndex, season.planCostsIls[planIndex], season.baselineCostIls, season.effectiveBillDiscountsIls[planIndex]))
      .sort((a, b) => a.costIls - b.costIls || a.provider.localeCompare(b.provider, "he"));
    const cheapest = ranked[0];
    const fixedSeasonCost = season.planCostsIls[fixedPlanIndex];
    const cheapestImprovement = fixedSeasonCost
      ? (fixedSeasonCost - cheapest.costIls) / fixedSeasonCost * 100
      : 0;
    const selected = cheapestImprovement >= MINIMUM_SWITCH_IMPROVEMENT
      ? cheapest
      : planResult(fixedPlanIndex, fixedSeasonCost, season.baselineCostIls, season.effectiveBillDiscountsIls[fixedPlanIndex]);
    const alternatives = ranked.filter((item) => item.planId !== selected.planId).slice(0, 3);
    const fixedPlanCostIls = fixedSeasonCost;
    const incrementalSavingsIls = Math.max(0, fixedPlanCostIls - selected.costIls);
    return {
      id: season.definition.key,
      label: season.definition.label,
      rangeLabel: season.definition.rangeLabel,
      start: days[season.source[0]].dateKey,
      end: days[season.source.at(-1)!].dateKey,
      calendarDays: season.definition.expectedDays,
      observedDays: season.source.length,
      consumptionKwh: season.consumptionKwh,
      baselineCostIls: season.baselineCostIls,
      winner: selected,
      alternatives,
      gapToSecondIls: alternatives[0] ? alternatives[0].costIls - selected.costIls : 0,
      fixedPlanCostIls,
      incrementalSavingsIls,
      incrementalSavingsPercent: fixedPlanCostIls ? incrementalSavingsIls / fixedPlanCostIls * 100 : 0,
      usesAnnualFixedPlan: selected.planId === fixedPlan.planId,
    };
  });
  const seasonalStrategyCostIls = seasons.reduce((sum, season) => sum + season.winner.costIls, 0);
  const seasonalSavingsVsFixedIls = Math.max(0, fixedPlan.costIls - seasonalStrategyCostIls);
  const seasonalSavingsVsBaselineIls = annualBaselineCostIls - seasonalStrategyCostIls;
  const seasonalEffectiveBillDiscountIls = roundMoney(seasons.reduce((sum, season) => sum + season.winner.effectiveBillDiscountIls, 0));
  const seasonalAnnual = {
    baselineCostIls: annualBaselineCostIls,
    fixedPlan,
    fixedPlanCostIls: fixedPlan.costIls,
    strategyCostIls: Math.min(seasonalStrategyCostIls, fixedPlan.costIls),
    savingsVsBaselineIls: seasonalSavingsVsBaselineIls,
    savingsVsBaselinePercent: annualBaselineCostIls ? seasonalSavingsVsBaselineIls / annualBaselineCostIls * 100 : 0,
    effectiveBillDiscountIls: seasonalEffectiveBillDiscountIls,
    effectiveBillDiscountPercent: annualBaselineCostIls ? seasonalEffectiveBillDiscountIls / annualBaselineCostIls * 100 : 0,
    savingsVsFixedIls: seasonalSavingsVsFixedIls,
    savingsVsFixedPercent: fixedPlan.costIls ? seasonalSavingsVsFixedIls / fixedPlan.costIls * 100 : 0,
  };

  const candidateBoundaries = new Set<number>([projectionStartIndex, projectionEndIndex]);
  days.forEach((day, index) => {
    if (index < projectionStartIndex || index > projectionEndIndex) return;
    if (
      (index - projectionStartIndex) % 7 === 0 ||
      index === projectionStartIndex ||
      day.monthKey !== days[index - 1]?.monthKey ||
      day.monthKey !== days[index + 1]?.monthKey
    ) candidateBoundaries.add(index);
  });
  const boundaries = [...candidateBoundaries].sort((a, b) => a - b);
  const candidates: WindowCandidate[] = [];
  for (let startOffset = 0; startOffset < boundaries.length; startOffset += 1) {
    const startIndex = boundaries[startOffset];
    for (let endOffset = startOffset + 1; endOffset < boundaries.length; endOffset += 1) {
      const endIndex = boundaries[endOffset];
      const calendarDays = inclusiveDays(days[startIndex].dateKey, days[endIndex].dateKey);
      if (calendarDays < MINIMUM_STAY_DAYS) continue;
      if (calendarDays > 210) break;
      const fixedCostIls = range(planPrefixes[fixedPlanIndex], startIndex, endIndex);
      let planIndex = -1;
      let planCostIls = Number.POSITIVE_INFINITY;
      plans.forEach((_, index) => {
        if (index === fixedPlanIndex) return;
        const cost = range(planPrefixes[index], startIndex, endIndex);
        if (cost < planCostIls) {
          planCostIls = cost;
          planIndex = index;
        }
      });
      const savingsIls = fixedCostIls - planCostIls;
      if (planIndex < 0 || savingsIls <= 0) continue;
      const savingsPercent = fixedCostIls ? savingsIls / fixedCostIls * 100 : 0;
      candidates.push({
        startIndex,
        endIndex,
        planIndex,
        fixedCostIls,
        planCostIls,
        savingsIls,
        savingsPercent,
        qualifies: savingsPercent >= MINIMUM_SWITCH_IMPROVEMENT,
      });
    }
  }

  const diverseCandidates: WindowCandidate[] = [];
  for (const candidate of [...candidates].sort((a, b) => (
    Number(b.qualifies) - Number(a.qualifies) ||
    b.savingsPercent - a.savingsPercent ||
    b.savingsIls - a.savingsIls
  ))) {
    if (diverseCandidates.some((other) => (
      candidate.planIndex === other.planIndex &&
      Math.abs(candidate.startIndex - other.startIndex) <= 21 &&
      Math.abs(candidate.endIndex - other.endIndex) <= 21
    ))) continue;
    diverseCandidates.push(candidate);
    if (diverseCandidates.length === 5) break;
  }
  const optimizedWindows: OptimizedWindow[] = diverseCandidates.map((candidate, index) => ({
    ...period(`optimized-${index + 1}`, `חלון חופשי ${index + 1}`, candidate.startIndex, candidate.endIndex),
    rangeLabel: `${dayMonth(days[candidate.startIndex].dateKey)}–${dayMonth(days[candidate.endIndex].dateKey)}`,
    fixedPlanCostIls: candidate.fixedCostIls,
    incrementalSavingsIls: candidate.savingsIls,
    incrementalSavingsPercent: candidate.savingsPercent,
    qualifiesForSwitch: candidate.qualifies,
  }));

  const fullStart = days[projectionStartIndex].dateKey;
  const fullEnd = days[projectionEndIndex].dateKey;
  const qualifying = candidates
    .filter((candidate) => candidate.qualifies)
    .filter((candidate) => (
      (candidate.startIndex === projectionStartIndex || inclusiveDays(fullStart, days[candidate.startIndex - 1].dateKey) >= MINIMUM_STAY_DAYS) &&
      (candidate.endIndex === projectionEndIndex || inclusiveDays(days[candidate.endIndex + 1].dateKey, fullEnd) >= MINIMUM_STAY_DAYS)
    ))
    .sort((a, b) => a.endIndex - b.endIndex || b.savingsIls - a.savingsIls);

  const bestSets: Array<{ savings: number; picks: WindowCandidate[] }> = [{ savings: 0, picks: [] }];
  qualifying.forEach((candidate, index) => {
    let compatible = -1;
    for (let previous = index - 1; previous >= 0; previous -= 1) {
      const gapStart = qualifying[previous].endIndex + 1;
      const gapEnd = candidate.startIndex - 1;
      if (gapStart <= gapEnd && inclusiveDays(days[gapStart].dateKey, days[gapEnd].dateKey) >= MINIMUM_STAY_DAYS) {
        compatible = previous;
        break;
      }
    }
    const takeBase = compatible >= 0 ? bestSets[compatible + 1] : bestSets[0];
    const take = { savings: takeBase.savings + candidate.savingsIls, picks: [...takeBase.picks, candidate] };
    const skip = bestSets[index];
    bestSets.push(take.savings > skip.savings ? take : skip);
  });
  const selected = bestSets.at(-1)!.picks.sort((a, b) => a.startIndex - b.startIndex);

  const segments: SwitchSegment[] = [];
  const appendSegment = (startIndex: number, endIndex: number, planIndex: number, savingsVsFixedIls = 0, savingsVsFixedPercent = 0) => {
    if (startIndex > endIndex) return;
    const plan = plans[planIndex];
    segments.push({
      start: days[startIndex].dateKey,
      end: days[endIndex].dateKey,
      calendarDays: inclusiveDays(days[startIndex].dateKey, days[endIndex].dateKey),
      planId: plan.id,
      provider: plan.provider,
      plan: plan.name,
      costIls: range(planPrefixes[planIndex], startIndex, endIndex),
      effectiveBillDiscountIls: range(effectiveDiscountPrefixes[planIndex], startIndex, endIndex),
      savingsVsFixedIls,
      savingsVsFixedPercent,
    });
  };
  let cursor = projectionStartIndex;
  selected.forEach((candidate) => {
    appendSegment(cursor, candidate.startIndex - 1, fixedPlanIndex);
    appendSegment(candidate.startIndex, candidate.endIndex, candidate.planIndex, candidate.savingsIls, candidate.savingsPercent);
    cursor = candidate.endIndex + 1;
  });
  appendSegment(cursor, projectionEndIndex, fixedPlanIndex);
  if (!segments.length) appendSegment(projectionStartIndex, projectionEndIndex, fixedPlanIndex);
  const switchCount = segments.reduce((count, segment, index) => (
    index > 0 && segment.planId !== segments[index - 1].planId ? count + 1 : count
  ), 0);
  const rawStrategyCostIls = segments.reduce((sum, segment) => sum + segment.costIls, 0);
  const rawFixedPlanCostIls = range(planPrefixes[fixedPlanIndex], projectionStartIndex, projectionEndIndex);
  const annualizationFactor = rawFixedPlanCostIls ? fixedPlan.costIls / rawFixedPlanCostIls : 1;
  const fixedPlanCostIls = fixedPlan.costIls;
  const strategyCostIls = Math.min(fixedPlanCostIls, rawStrategyCostIls * annualizationFactor);
  const incrementalSavingsIls = Math.max(0, fixedPlanCostIls - strategyCostIls);
  const incrementalSavingsPercent = fixedPlanCostIls ? incrementalSavingsIls / fixedPlanCostIls * 100 : 0;
  const savingsVsBaselineIls = annualBaselineCostIls - strategyCostIls;
  const savingsVsBaselinePercent = annualBaselineCostIls ? savingsVsBaselineIls / annualBaselineCostIls * 100 : 0;
  const effectiveBillDiscountIls = roundMoney(segments.reduce((sum, segment) => sum + segment.effectiveBillDiscountIls, 0) * annualizationFactor);
  const effectiveBillDiscountPercent = annualBaselineCostIls ? effectiveBillDiscountIls / annualBaselineCostIls * 100 : 0;
  const recommended = selected.length > 0;

  return {
    months,
    seasons,
    seasonalAnnual,
    optimizedWindows,
    switching: {
      minimumStayDays: MINIMUM_STAY_DAYS,
      minimumImprovementPercent: MINIMUM_SWITCH_IMPROVEMENT,
      fixedPlan,
      fixedPlanCostIls,
      strategyCostIls,
      incrementalSavingsIls,
      incrementalSavingsPercent,
      baselineCostIls: annualBaselineCostIls,
      savingsVsBaselineIls,
      savingsVsBaselinePercent,
      effectiveBillDiscountIls,
      effectiveBillDiscountPercent,
      projectionRangeLabel: `${dayMonth(fullStart)}–${dayMonth(fullEnd)}`,
      switchCount,
      recommended,
      explanation: recommended
        ? `נמצאו ${selected.length} תקופות שעוברות בנפרד את סף ${MINIMUM_SWITCH_IMPROVEMENT}% ושומרות על ${MINIMUM_STAY_DAYS} ימים לפחות בין מעברים.`
        : `לא נמצאה תקופה שחוסכת לפחות ${MINIMUM_SWITCH_IMPROVEMENT}% מול התוכנית הקבועה תוך שהייה של ${MINIMUM_STAY_DAYS} ימים לפחות. לכן לא מומלץ לעבור באמצע התקופה.`,
      segments,
    },
  };
}

export function hourlyProfile(readings: Reading[]) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour: `${String(hour).padStart(2, "0")}:00`, kwh: 0 }));
  for (const reading of readings) buckets[Math.floor(reading.minuteOfDay / 60)].kwh += reading.consumptionKwh;
  return buckets;
}

export function monthlyProfile(readings: Reading[]) {
  const buckets = new Map<string, number>();
  for (const reading of readings) buckets.set(reading.monthKey, (buckets.get(reading.monthKey) ?? 0) + reading.consumptionKwh);
  return [...buckets.entries()].map(([month, kwh]) => ({ month, kwh }));
}
