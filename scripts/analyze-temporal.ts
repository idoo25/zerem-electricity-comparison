import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { analyzeTemporalStrategies, parseMeterFile } from "../src/lib/meter-engine";

async function main() {
  const input = process.argv[2];
  const output = process.argv[3];
  if (!input) throw new Error("Usage: tsx scripts/analyze-temporal.ts <meter.csv>");
  const bytes = await readFile(input);
  const parsed = await parseMeterFile(new File([bytes], basename(input), { type: "text/csv" }));
  const analysis = analyzeTemporalStrategies(parsed.readings, {
    meterType: "smart",
    phase: "three",
    capacityKva: 17.32,
    tenureYear: 1,
  });
  const json = `${JSON.stringify(analysis, null, 2)}\n`;
  if (output) await writeFile(output, json, "utf8");
  else console.log(json);
}

void main();
