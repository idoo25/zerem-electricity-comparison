import sampleTemporal from "@/data/sample-temporal.json";
import { TemporalRecommendations } from "@/components/temporal-recommendations";
import type { TemporalAnalysis } from "@/lib/types";

export function InsightsDashboard() {
  return (
    <div className="mt-10">
      <TemporalRecommendations analysis={sampleTemporal as TemporalAnalysis} />
    </div>
  );
}
