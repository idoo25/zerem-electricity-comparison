import { describe, expect, it } from "vitest";
import { analyzeTemporalStrategies, buildMonthlyInvoiceEstimates, comparePlans, daysInYear, parseMeterFile, roundMoney } from "@/lib/meter-engine";
import type { Reading } from "@/lib/types";

describe("meter engine", () => {
  it("finds an IEC header, filters generation and preserves duplicate local slots", async () => {
    const csv = `שם לקוח,כתובת
Private,Private
קוד מונה,סוג מונה,תאריך,מועד תחילת הפעימה,צריכה/ייצור בקוט״ש,הזרמה
meter,צריכה,16/07/2026,23:00,1,0
meter,צריכה,17/07/2026,01:00,1,0
meter,צריכה,17/07/2026,01:00,0.5,0
meter,ייצור,17/07/2026,01:15,9,0
meter,צריכה,19/07/2026,01:00,1,0`;
    const file = new File([csv], "meter.csv", { type: "text/csv" });
    const parsed = await parseMeterFile(file);

    expect(parsed.rows).toBe(4);
    expect(parsed.totalKwh).toBe(3.5);
    expect(parsed.duplicateSlots).toBe(1);
  });

  it("attributes after-midnight consumption to the weekday where the window began", async () => {
    const csv = `תאריך,שעה,צריכה
16/07/2026,23:00,1
17/07/2026,01:00,1
19/07/2026,01:00,1`;
    const parsed = await parseMeterFile(new File([csv], "meter.csv"));
    const results = comparePlans(parsed.readings, {
      meterType: "smart",
      phase: "single",
      tenureYear: 1,
    });
    const night = results.find((result) => result.planId === "super-power-night");

    expect(night).toBeDefined();
    expect(night!.discountedKwh).toBe(2);
    expect(night!.discountIls).toBe(roundMoney(2 * 0.635194 * 0.21));
  });

  it("returns all eligible smart-meter plans ordered by total cost", async () => {
    const csv = `תאריך,שעה,צריכה
01/07/2026,00:00,1
01/07/2026,00:15,1`;
    const parsed = await parseMeterFile(new File([csv], "meter.csv"));
    const results = comparePlans(parsed.readings, {
      meterType: "smart",
      phase: "single",
      tenureYear: 1,
    });

    expect(results).toHaveLength(23);
    expect(results.every((result, index) => index === 0 || results[index - 1].totalCostIls <= result.totalCostIls)).toBe(true);
  });

  it("uses the latest complete calendar month for every mock invoice and reconciles all charges", () => {
    const readings: Reading[] = [];
    for (let day = 1; day <= 30; day += 1) {
      const dateKey = `2026-06-${String(day).padStart(2, "0")}`;
      for (let slot = 0; slot < 96; slot += 1) {
        const minuteOfDay = slot * 15;
        readings.push({
          timestamp: `${dateKey}T${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(minuteOfDay % 60).padStart(2, "0")}`,
          dateKey, monthKey: "2026-06", year: 2026, month: 6, day,
          weekday: new Date(`${dateKey}T00:00:00Z`).getUTCDay(), minuteOfDay, consumptionKwh: 1 / 96,
        });
      }
    }
    for (let day = 1; day <= 18; day += 1) {
      const dateKey = `2026-07-${String(day).padStart(2, "0")}`;
      readings.push({
        timestamp: `${dateKey}T12:00`, dateKey, monthKey: "2026-07", year: 2026, month: 7, day,
        weekday: new Date(`${dateKey}T00:00:00Z`).getUTCDay(), minuteOfDay: 720, consumptionKwh: 10,
      });
    }

    const invoices = buildMonthlyInvoiceEstimates(readings, { meterType: "smart", phase: "single", tenureYear: 1 });

    expect(invoices).toHaveLength(23);
    expect(invoices[0].source).toBe("meter-full-month");
    expect(invoices[0].periodStart).toBe("2026-06-01");
    expect(invoices[0].periodEnd).toBe("2026-06-30");
    expect(invoices[0].consumptionKwh).toBeCloseTo(30, 9);
    expect(invoices[0].billingYearDays).toBe(365);
    expect(invoices[0].phase).toBe("three");
    expect(invoices[0].capacityKva).toBe(17.32);
    expect(invoices[0].distributionFixedInclVatIls).toBe(roundMoney(13.6408 * 12 * 30 / 365));
    expect(invoices[0].supplyFixedInclVatIls).toBe(roundMoney(18.3254 * 12 * 30 / 365));
    expect(invoices[0].baselineDistributionMonthlyRateInclVatIls).toBe(13.6408);
    expect(invoices[0].baselineSupplyMonthlyRateInclVatIls).toBe(18.3254);
    expect(invoices[0].capacityChargeInclVatIls).toBe(roundMoney(7.2924 * 17.32 * 30 / 365));
    for (const invoice of invoices) {
      const reconciled = roundMoney(invoice.baselineEnergyInclVatIls
        - invoice.supplierDiscountInclVatIls
        + invoice.regulatedFixedInclVatIls
        + invoice.capacityChargeInclVatIls
        + invoice.supplierFeeInclVatIls);
      expect(invoice.totalInclVatIls).toBe(reconciled);
      expect(invoice.distributionFixedInclVatIls + invoice.supplyFixedInclVatIls)
        .toBe(invoice.regulatedFixedInclVatIls);
      expect(invoice.vatIncludedIls).toBe(roundMoney(invoice.totalInclVatIls * 18 / 118));
      expect(roundMoney(invoice.baselineTotalInclVatIls - invoice.totalInclVatIls)).toBe(invoice.savingsInclVatIls);
    }
  });

  it("uses the correct day count for annualized fixed charges", () => {
    expect(daysInYear(2024)).toBe(366);
    expect(daysInYear(2026)).toBe(365);
  });

  it("dilutes the POWER energy discount after all mandatory fixed charges", async () => {
    const parsed = await parseMeterFile(new File([`תאריך,שעה,צריכה
01/07/2026,00:00,100`], "meter.csv"));
    const power = comparePlans(parsed.readings, {
      meterType: "smart", phase: "three", capacityKva: 17.32, tenureYear: 1,
    }).find((result) => result.planId === "super-power-fixed")!;

    expect(power.energyDiscountPercent).toBeCloseTo(6.5, 8);
    expect(power.effectiveBillDiscountPercent).toBeLessThan(power.energyDiscountPercent);
    expect(power.netSavingsPercent).toBeCloseTo(power.effectiveBillDiscountPercent, 8);
    expect(power.fixedChargeSavingsIls).toBe(0);
  });

  it("uses the clearly marked bill sample when no complete calendar month exists", () => {
    const readings: Reading[] = [{
      timestamp: "2026-07-01T12:00", dateKey: "2026-07-01", monthKey: "2026-07", year: 2026,
      month: 7, day: 1, weekday: 3, minuteOfDay: 720, consumptionKwh: 1,
    }];
    const invoices = buildMonthlyInvoiceEstimates(readings, { meterType: "smart", phase: "three", tenureYear: 1 });

    expect(invoices[0].source).toBe("sample-bill");
    expect(invoices[0].consumptionKwh).toBeCloseTo(2717, 8);
    expect(invoices[0].assumptions.join(" ")).toContain("2,717");
    expect(invoices[0].assumptions.join(" ")).toContain("17.32 KVA");
  });

  it("finds non-seasonal switch windows only when they clear 85 days and 5 percent", () => {
    const readings: Reading[] = Array.from({ length: 300 }, (_, index) => {
      const date = new Date(Date.UTC(2025, 0, 1 + index));
      const dateKey = date.toISOString().slice(0, 10);
      const daytime = index >= 100 && index < 200;
      const minuteOfDay = daytime ? 12 * 60 : 2 * 60;
      return {
        timestamp: `${dateKey}T${daytime ? "12:00" : "02:00"}`,
        dateKey,
        monthKey: dateKey.slice(0, 7),
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        weekday: date.getUTCDay(),
        minuteOfDay,
        consumptionKwh: 10,
      };
    });

    const analysis = analyzeTemporalStrategies(readings, {
      meterType: "smart",
      phase: "single",
      tenureYear: 1,
    });

    expect(analysis.months).toHaveLength(10);
    expect(analysis.seasons).toHaveLength(4);
    expect(analysis.seasonalAnnual.strategyCostIls).toBeLessThanOrEqual(analysis.seasonalAnnual.fixedPlanCostIls);
    expect(analysis.switching.strategyCostIls).toBeLessThanOrEqual(analysis.switching.fixedPlanCostIls);
    expect(analysis.switching.recommended).toBe(true);
    expect(analysis.switching.switchCount).toBe(2);
    expect(analysis.switching.segments.every((segment) => segment.calendarDays >= 85)).toBe(true);
    expect(analysis.switching.segments.filter((segment) => segment.savingsVsFixedPercent > 0)
      .every((segment) => segment.savingsVsFixedPercent >= 5)).toBe(true);
  });
});
