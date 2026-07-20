import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Brand } from "@/components/site-header";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t bg-white">
      <div className="page-shell grid gap-8 py-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <Brand />
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
            השוואת תוכניות חשמל לפי הצריכה האמיתית. הקובץ מעובד במכשיר שלכם, והקטלוג כולל רק תוכניות ציבוריות עם מע״מ, תשלום כספי רגיל וללא חובת שירות נוסף.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-muted">
          <Link href="/plans" className="hover:text-brand">קטלוג התוכניות</Link>
          <Link href="/methodology" className="hover:text-brand">איך מחשבים</Link>
          <span className="inline-flex items-center gap-1.5 text-brand"><ShieldCheck className="size-4" />אומת 19.07.2026</span>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted">
        כלי תומך החלטה; התוצאות אינן התחייבות של ספק חשמל.
      </div>
    </footer>
  );
}
