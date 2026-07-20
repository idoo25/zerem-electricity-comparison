import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

export default function NotFound() {
  return (
    <div className="page-shell grid min-h-[65vh] place-items-center py-20 text-center">
      <div>
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand text-accent"><Zap className="size-8" fill="currentColor" /></span>
        <p className="metric-number mt-6 text-7xl font-black text-brand">404</p>
        <h1 className="mt-3 text-3xl font-black">הזרם הגיע לכתובת הלא נכונה</h1>
        <p className="mt-3 text-muted">העמוד שחיפשתם לא קיים או עבר מקום.</p>
        <Link href="/" className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-brand px-6 font-bold text-white"><ArrowRight className="size-4" />חזרה לדף הבית</Link>
      </div>
    </div>
  );
}
