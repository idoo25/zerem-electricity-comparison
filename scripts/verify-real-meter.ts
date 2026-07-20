import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { comparePlans, parseMeterFile } from "../src/lib/meter-engine";

async function main() {
  const input = process.argv[2];
  if (!input) throw new Error("Usage: tsx scripts/verify-real-meter.ts <meter.csv>");

  const bytes = await readFile(input);
  const parsed = await parseMeterFile(new File([bytes], basename(input), { type: "text/csv" }));
  const results = comparePlans(parsed.readings, {
    meterType: "smart",
    phase: "single",
    tenureYear: 1,
  });

  console.log(JSON.stringify({
    rows: parsed.rows,
    totalKwh: Number(parsed.totalKwh.toFixed(3)),
    coverageRatio: parsed.coverageRatio,
    eligiblePlans: results.length,
    bestPlanId: results[0]?.planId,
    bestSavingsIls: Number(results[0]?.netSavingsIls.toFixed(2)),
  }));
}

void main();
