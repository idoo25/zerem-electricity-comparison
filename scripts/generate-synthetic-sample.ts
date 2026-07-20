import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeTemporalStrategies } from "../src/lib/meter-engine";
import type { Reading } from "../src/lib/types";

const start = Date.UTC(2025, 6, 19);
const days = 365;
const readings: Reading[] = [];

for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
  const date = new Date(start + dayIndex * 86_400_000);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const weekday = date.getUTCDay();
  const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const seasonal = 1 + 0.28 * Math.cos((month - 8) / 12 * Math.PI * 2);
  const weekend = weekday === 5 || weekday === 6 ? 1.12 : 1;

  for (let slot = 0; slot < 96; slot += 1) {
    const minuteOfDay = slot * 15;
    const hour = minuteOfDay / 60;
    const morning = Math.exp(-((hour - 7.5) ** 2) / 4.5);
    const evening = Math.exp(-((hour - 19.5) ** 2) / 7);
    const daytime = Math.exp(-((hour - 13) ** 2) / 22);
    const deterministicVariation = 1 + 0.06 * Math.sin(dayIndex * 1.7 + slot * 0.31);
    const consumptionKwh = (0.065 + 0.12 * morning + 0.25 * evening + 0.055 * daytime)
      * seasonal * weekend * deterministicVariation;

    readings.push({
      timestamp: `${dateKey}T${String(Math.floor(hour)).padStart(2, "0")}:${String(minuteOfDay % 60).padStart(2, "0")}`,
      dateKey,
      monthKey: dateKey.slice(0, 7),
      year,
      month,
      day,
      weekday,
      minuteOfDay,
      consumptionKwh,
    });
  }
}

const analysis = analyzeTemporalStrategies(readings, {
  meterType: "smart",
  phase: "three",
  capacityKva: 17.32,
  tenureYear: 1,
});

writeFileSync(
  resolve(process.cwd(), "src/data/sample-temporal.json"),
  `${JSON.stringify(analysis, null, 2)}\n`,
  { encoding: "utf8" },
);
