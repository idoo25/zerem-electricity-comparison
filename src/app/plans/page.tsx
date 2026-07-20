import type { Metadata } from "next";
import { catalog } from "@/lib/catalog";
import { PlansExplorer } from "@/components/plans-explorer";

export const metadata: Metadata = {
  title: "כל תוכניות החשמל",
  description: "קטלוג תוכניות חשמל ציבוריות בישראל שעומדות בתנאי מע״מ, תשלום כספי רגיל וללא שירות נוסף.",
};

export default function PlansPage() {
  const providerCount = new Set(catalog.plans.map((plan) => plan.provider)).size;
  return (
    <div className="page-shell py-9 sm:py-12">
      <div className="grid gap-7 border-b pb-9 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-4xl">
          <span className="eyebrow">קטלוג מאומת · {catalog.verified_at}</span>
          <h1 className="page-title mt-5">כל תוכניות החשמל, במקום אחד ברור.</h1>
          <p className="reading-width mt-4 text-lg leading-8 text-muted">רק תוכניות ציבוריות עם מע״מ, תשלום כספי רגיל וללא חובת שירות נוסף. סננו לפי ספק, מונה וסוג הנחה.</p>
        </div>
        <div className="flex gap-3 text-center">
          <div className="card-flat min-w-24 px-5 py-3"><strong className="metric-number block text-2xl">{catalog.plans.length}</strong><span className="text-xs text-muted">תוכניות</span></div>
          <div className="card-flat min-w-24 px-5 py-3"><strong className="metric-number block text-2xl">{providerCount}</strong><span className="text-xs text-muted">ספקים</span></div>
        </div>
      </div>
      <PlansExplorer plans={catalog.plans} />
    </div>
  );
}
