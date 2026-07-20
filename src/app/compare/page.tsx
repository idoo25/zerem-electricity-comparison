import type { Metadata } from "next";
import { ComparisonWorkspace } from "@/components/comparison-workspace";

export const metadata: Metadata = {
  title: "השוואה אישית",
  description: "העלאת קובץ פעימות מונה והשוואת כל תוכניות החשמל המתאימות לפרופיל הצריכה.",
};

export default function ComparePage() {
  return (
    <div className="page-shell py-8 sm:py-11">
      <div className="grid gap-6 border-b pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-4xl">
        <span className="eyebrow">ההשוואה האישית שלכם</span>
        <h1 className="page-title mt-5">מהקובץ שלכם לתוכנית הנכונה.</h1>
        <p className="reading-width mt-4 text-lg leading-8 text-muted">מעלים קובץ פעימות, בוחרים את פרטי המונה ומקבלים דירוג מלא. החישוב מתבצע ברקע כדי שהמסך יישאר מהיר.</p>
        </div>
        <div className="hidden gap-2 lg:flex">
          {["העלאה", "העדפות", "תוצאה"].map((step, index) => <span key={step} className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-2 text-xs font-bold"><span className="grid size-5 place-items-center rounded-full bg-brand text-white">{index + 1}</span>{step}</span>)}
        </div>
      </div>
      <ComparisonWorkspace />
    </div>
  );
}
