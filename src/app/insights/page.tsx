import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpLeft, FlaskConical, Info } from "lucide-react";
import { InsightsDashboard } from "@/components/insights-dashboard";

export const metadata: Metadata = {
  title: "תובנות וסימולציות",
  description: "יציבות תוכניות החשמל לאורך חודשים ותרחישים, walk-forward וניתוח חרטה כספית.",
};

export default function InsightsPage() {
  return (
    <div className="page-shell py-9 sm:py-12">
      <div className="grid items-end gap-7 border-b pb-9 lg:grid-cols-[1fr_auto]">
        <div className="max-w-4xl">
          <span className="eyebrow"><FlaskConical className="size-3.5" /> בדיקת יציבות לפי נתוני עבר</span>
          <h1 className="page-title mt-5">האם התוכנית נשארת זולה לאורך זמן?</h1>
          <p className="reading-width mt-4 text-lg leading-8 text-muted">השוואה חודשית, ארבע המלצות עונתיות וחיפוש תקופות מעבר — עם מגבלת 85 יום וסף חיסכון של 5%.</p>
        </div>
        <Link href="/compare" className="button-primary">בדיקה עם הקובץ שלי <ArrowUpLeft className="size-4" /></Link>
      </div>
      <InsightsDashboard />
      <div className="mt-6 flex items-start gap-3 rounded-2xl border bg-white p-4 text-sm text-muted"><Info className="mt-0.5 size-5 shrink-0 text-brand" /><p className="leading-6">הנתונים כאן הם תוצאה אנונימית ומצטברת של פרופיל הדוגמה שנבדק. הם אינם כוללים שם, כתובת, מספר מונה או נתון אישי אחר, ואינם תחליף לחישוב עם הקובץ שלכם.</p></div>
    </div>
  );
}
