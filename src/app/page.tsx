import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Check,
  Clock3,
  FileUp,
  LockKeyhole,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { ProviderLogo } from "@/components/provider-logo";
import sampleTemporal from "@/data/sample-temporal.json";
import { decimalIls } from "@/lib/utils";

const promises = ["כולל מע״מ", "ללא שירות נוסף", "כסף רגיל בלבד", "עיבוד מקומי"];

const steps = [
  { icon: FileUp, number: "01", title: "מעלים את קובץ המונה", text: "קובץ ה־CSV נשאר במכשיר ונקרא אוטומטית — בלי הרשמה ובלי הזנת חשבונות ידנית." },
  { icon: SearchCheck, number: "02", title: "כל רבע שעה נבדקת", text: "שעות, ימים, חצות, עמלות ומדרגות הנחה מחושבים מול כל תוכנית מתאימה." },
  { icon: BarChart3, number: "03", title: "מקבלים החלטה ברורה", text: "תוכנית מומלצת, עלות בפועל, חלופות ויציבות לאורך זמן — בלי להסתיר את ההנחות." },
];

export default function Home() {
  return (
    <>
      <section className="page-shell grid gap-10 py-12 lg:min-h-[680px] lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-16">
        <div className="max-w-3xl">
          <span className="eyebrow"><Sparkles className="size-3.5" />השוואה לפי הצריכה שלכם, לא לפי ממוצע</span>
          <h1 className="hero-title mt-6">מוצאים את תוכנית החשמל הזולה לכם.</h1>
          <p className="reading-width mt-6 text-lg leading-8 text-muted sm:text-xl">
            מעלים קובץ מונה ומקבלים השוואה מלאה של כל התוכניות הציבוריות — לפי הזמן שבו באמת צרכתם, כולל מע״מ ועמלות.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/compare" className="button-primary min-h-14 px-7 text-base"><FileUp className="size-5" />העלאת קובץ והשוואה</Link>
            <Link href="/plans" className="button-secondary min-h-14 px-7 text-base">צפייה בכל התוכניות <ArrowLeft className="size-4" /></Link>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-muted">
            {promises.map((item) => <span key={item} className="inline-flex items-center gap-1.5"><Check className="size-4 text-brand" />{item}</span>)}
          </div>
        </div>

        <div className="card overflow-hidden border-brand/20">
          <div className="flex items-center justify-between gap-4 border-b bg-surface-soft/70 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <ProviderLogo provider="Super Power" size="md" />
              <div><p className="text-xs font-bold text-muted">תוצאה מפרופיל לדוגמה</p><h2 className="mt-0.5 text-xl font-black">POWER · Super Power</h2></div>
            </div>
            <span className="rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white">מקום 1</span>
          </div>
          <div className="p-5 sm:p-7">
            <p className="text-sm font-semibold text-muted">הנחה בפועל אחרי חיובי חובה</p>
            <p className="metric-number mt-1 text-5xl font-black text-brand sm:text-6xl">{decimalIls.format(sampleTemporal.seasonalAnnual.effectiveBillDiscountIls)}</p>
            <p className="mt-2 text-sm font-bold text-brand">{sampleTemporal.seasonalAnnual.effectiveBillDiscountPercent.toFixed(2)}% מחשבון הבסיס המלא</p>
            <p className="mt-1 text-sm text-muted">19.07.2025–18.07.2026 · מתוך 23 תוכניות</p>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-accent-soft p-4"><p className="text-xs font-bold text-brand-strong">תעריף הנחת אנרגיה</p><strong className="metric-number mt-1 block text-2xl">6.5%</strong><span className="text-xs text-muted">לפני דילול החיובים הקבועים</span></div>
              <div className="rounded-2xl bg-surface-soft p-4"><p className="text-xs font-bold text-muted">מנצחת בחודשים</p><strong className="metric-number mt-1 block text-2xl">11 / 19</strong><span className="text-xs text-muted">בפרופיל שנבדק</span></div>
            </div>

            <div className="mt-6 flex items-center gap-2 border-t pt-5 text-sm text-muted">
              <ShieldCheck className="size-4.5 text-brand" />הקטלוג נבדק ואומת ב־19.07.2026
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-white">
        <div className="page-shell grid grid-cols-2 divide-x divide-x-reverse md:grid-cols-4" dir="rtl">
          {[["23", "תוכניות"], ["7", "ספקים"], ["52,642", "פעימות בדוגמה"], ["25", "בדיקות לוגיקה"]].map(([value, label]) => (
            <div key={label} className="px-4 py-5 text-center"><strong className="metric-number block text-2xl font-black">{value}</strong><span className="text-xs font-medium text-muted">{label}</span></div>
          ))}
        </div>
      </section>

      <section className="page-shell defer-render py-20">
        <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
          <div><span className="eyebrow"><Zap className="size-3.5" />איך זה עובד</span><h2 className="section-title mt-5">מסלול קצר מקובץ להחלטה</h2></div>
          <p className="max-w-2xl text-lg leading-8 text-muted lg:justify-self-end">המערכת מפרידה בין מידע שיווקי לבין העלות שהייתם משלמים בפועל, ומציגה קודם את מה שחשוב לקבלת החלטה.</p>
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {steps.map(({ icon: Icon, number, title, text }) => (
            <article key={title} className="card lift p-6 sm:p-7">
              <div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-brand"><Icon className="size-5" /></span><span className="font-mono text-xs font-semibold text-muted">{number}</span></div>
              <h3 className="mt-6 text-xl font-black">{title}</h3><p className="mt-3 text-sm leading-7 text-muted">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-shell defer-render">
        <div className="grid overflow-hidden rounded-3xl bg-brand-strong text-white lg:grid-cols-[1.1fr_.9fr]">
          <div className="p-7 sm:p-10 lg:p-12">
            <span className="eyebrow bg-white/10 text-accent"><LockKeyhole className="size-3.5" />פרטיות וביצועים</span>
            <h2 className="section-title mt-6">הקובץ נשאר במכשיר. החישוב לא תוקע את המסך.</h2>
            <p className="mt-5 max-w-2xl leading-8 text-white/80">העיבוד מתבצע מקומית בתהליך רקע נפרד. אפשר להמשיך לגלול ולהשתמש באתר בזמן שהמודל בודק את כל התוכניות.</p>
            <Link href="/methodology" className="mt-7 inline-flex items-center gap-2 font-bold text-accent">למתודולוגיה המלאה <ArrowLeft className="size-4" /></Link>
          </div>
          <div className="grid border-t border-white/10 sm:grid-cols-2 lg:border-r lg:border-t-0">
            {[
              { icon: LockKeyhole, title: "בלי העלאה לשרת", text: "הקובץ מעובד בדפדפן בלבד" },
              { icon: Clock3, title: "נשמר לשבוע", text: "רק במכשיר וניתן למחיקה" },
              { icon: ShieldCheck, title: "כללים קשיחים", text: "מע״מ, כסף רגיל וללא שירות נוסף" },
              { icon: BarChart3, title: "חישוב מלא", text: "כל הנתונים למודל, עד שנה לתצוגת חיסכון" },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="border-b border-white/10 p-6 last:border-b-0 sm:border-l sm:p-7"><Icon className="size-5 text-accent" /><strong className="mt-4 block">{title}</strong><span className="mt-1 block text-sm text-white/70">{text}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell defer-render py-20">
        <div className="card flex flex-col gap-6 p-7 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="section-title">מוכנים לבדוק את החשבון שלכם?</h2><p className="mt-2 text-muted">קובץ CSV אחד, בלי הרשמה ובלי להזין מידע ידנית.</p></div>
          <Link href="/compare" className="button-primary shrink-0 px-7"><FileUp className="size-5" />התחלת השוואה</Link>
        </div>
      </section>
    </>
  );
}
