import type { ComparisonResult, MonthlyInvoiceEstimate, ParsedMeterFile, Profile, TemporalAnalysis } from "@/lib/types";

export type MeterSummary = Omit<ParsedMeterFile, "readings"> & {
  customerPeriodStart: string;
  customerPeriodEnd: string;
};

export type ProfilePoint = Record<string, string | number>;

export type MeterAnalysis = {
  parsed: MeterSummary;
  results: ComparisonResult[];
  temporal: TemporalAnalysis;
  hourly: ProfilePoint[];
  monthly: ProfilePoint[];
  monthlyInvoices: MonthlyInvoiceEstimate[];
};

export type AnalysisWorkerRequest = {
  file: File;
  profile: Profile;
};

export type AnalysisWorkerResponse =
  | { ok: true; analysis: MeterAnalysis }
  | { ok: false; error: string };
