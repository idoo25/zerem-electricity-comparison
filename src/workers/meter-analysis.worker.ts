import {
  analyzeTemporalStrategies,
  buildMonthlyInvoiceEstimates,
  comparePlans,
  hourlyProfile,
  monthlyProfile,
  parseMeterFile,
} from "@/lib/meter-engine";
import type { AnalysisWorkerRequest, AnalysisWorkerResponse } from "@/lib/analysis-worker-types";

const maximumCustomerDisplayDays = 365;

function customerDisplayReadings<T extends { dateKey: string }>(readings: T[]) {
  const lastDate = readings.at(-1)?.dateKey;
  if (!lastDate) return readings;
  const cutoff = Date.parse(`${lastDate}T00:00:00Z`) - (maximumCustomerDisplayDays - 1) * 86_400_000;
  return readings.filter((reading) => Date.parse(`${reading.dateKey}T00:00:00Z`) >= cutoff);
}

self.onmessage = async (event: MessageEvent<AnalysisWorkerRequest>) => {
  try {
    const parsed = await parseMeterFile(event.data.file);
    const customerReadings = customerDisplayReadings(parsed.readings);
    const firstCustomerReading = customerReadings[0];
    const lastCustomerReading = customerReadings.at(-1);
    const response: AnalysisWorkerResponse = {
      ok: true,
      analysis: {
        parsed: {
          rows: parsed.rows,
          totalKwh: parsed.totalKwh,
          start: parsed.start,
          end: parsed.end,
          intervalMinutes: parsed.intervalMinutes,
          coverageRatio: parsed.coverageRatio,
          duplicateSlots: parsed.duplicateSlots,
          missingSlots: parsed.missingSlots,
          customerPeriodStart: firstCustomerReading?.dateKey ?? "",
          customerPeriodEnd: lastCustomerReading?.dateKey ?? "",
        },
        results: comparePlans(customerReadings, event.data.profile),
        temporal: analyzeTemporalStrategies(parsed.readings, event.data.profile),
        hourly: hourlyProfile(parsed.readings),
        monthly: monthlyProfile(parsed.readings),
        monthlyInvoices: buildMonthlyInvoiceEstimates(parsed.readings, event.data.profile),
      },
    };
    self.postMessage(response);
  } catch (reason) {
    const response: AnalysisWorkerResponse = {
      ok: false,
      error: reason instanceof Error ? reason.message : "אירעה שגיאה בקריאת הקובץ.",
    };
    self.postMessage(response);
  }
};

export {};
