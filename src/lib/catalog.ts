import rawCatalog from "@/data/catalog.json";
import type { Catalog, Plan } from "@/lib/types";

export const catalog = rawCatalog as Catalog;

export const categoryLabels: Record<string, string> = {
  fixed: "קבועה 24/7",
  day: "שעות יום",
  night: "שעות לילה",
  family: "משפחה",
  "extended-day": "יום מורחב",
  tiered: "לפי גובה חשבון",
  green: "אנרגיה ירוקה",
};

export const providerAccent: Record<string, string> = {
  "בזק energy": "#5B53E8",
  "Partner Power": "#6A35D4",
  "סלקום Energy": "#7838E8",
  "HOT energy": "#D73055",
  "Super Power": "#0A7A64",
  "אמישראגז חשמל": "#E05B31",
  "פזגז חשמל": "#1277A8",
};

export function scheduleLabel(plan: Plan): string {
  const rule = plan.schedule[0];
  if (!rule) return "ללא חלון מוגדר";
  if (rule.start === rule.end) return "כל שעות היממה";
  const days = rule.days.length === 7 ? "כל השבוע" : "לפי ימי המסלול";
  return `${rule.start}–${rule.end} · ${days}`;
}

export function firstYearDiscountLabel(plan: Plan): string {
  const model = plan.discount_model;
  if (model.type === "flat") return `${model.percent}%`;
  if (model.type === "tenure_tiered") {
    const firstYearTier = model.tiers.find((tier) => (
      (tier.lower === undefined || 1 >= tier.lower) &&
      (tier.upper === undefined || 1 < tier.upper)
    ));
    return `${firstYearTier?.percent ?? model.tiers[0]?.percent ?? 0}%`;
  }
  const rates = model.tiers.map((tier) => tier.percent);
  return `${Math.min(...rates)}%–${Math.max(...rates)}%`;
}

export function firstYearDiscountCaption(plan: Plan): string {
  return plan.discount_model.type === "monthly_baseline_tiered"
    ? "לפי מדרגת החשבון"
    : "הנחה בשנה הראשונה";
}
