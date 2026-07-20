import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpLeft,
  CalendarClock,
  Check,
  Clock3,
  Code2,
  Database,
  ExternalLink,
  FileCheck2,
  FlaskConical,
  Scale,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "איך אנחנו מחשבים",
  description: "מתודולוגיית השוואת תוכניות החשמל: כללי הכללה, זמן, מע״מ, עמלות, שלמות נתונים וסימולציות.",
};

const steps = [
  { icon: FileCheck2, title: "קליטת פעימות", text: "זיהוי אוטומטי של שורת הכותרת, התאריך, השעה והצריכה; ייצור עצמי מסונן החוצה." },
  { icon: CalendarClock, title: "העשרת זמן", text: "יום בשבוע, דקה ביום, חודש, חלונות שחוצים חצות וגבולות זמן חצי־פתוחים." },
  { icon: Zap, title: "חישוב תוכנית", text: "הנחה רק על הפעימות המזכות, מדרגה חודשית כשנדרש, עמלה והוצאות מפוקחות." },
  { icon: Scale, title: "דירוג נטו", text: "עלות כוללת כולל מע״מ, ולא אחוז הפרסום לבדו. התוכנית הזולה ביותר מוצגת ראשונה." },
];

export default function MethodologyPage() {
  return (
    <div className="page-shell py-12">
      <div className="mx-auto max-w-4xl text-center">
        <span className="eyebrow"><Code2 className="size-3.5" /> שקיפות היא חלק מהמוצר</span>
        <h1 className="page-title mt-5">כדי לסמוך על התוצאה, צריך להבין איך היא נבנתה.</h1>
        <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-muted">המספר הסופי הוא רק השורה התחתונה. כאן נמצאים כללי ההכללה, לוגיקת הזמן, החיובים והמגבלות.</p>
      </div>

      <section className="defer-render mt-14 grid gap-4 md:grid-cols-2">
        <div className="card border-brand/20 p-7">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-brand"><Check className="size-5" /></span><h2 className="text-xl font-black">מה נכנס לקטלוג</h2></div>
          <ul className="mt-6 grid gap-3 text-sm">
            {["תוכנית ציבורית שניתן להצטרף אליה", "המחיר והחיסכון כוללים מע״מ", "אין חובה להיות לקוח של שירות נוסף", "ההנחה מתקבלת בכסף רגיל", "קיים מקור ציבורי ותאריך אימות"].map((item) => <li key={item} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand" />{item}</li>)}
          </ul>
        </div>
        <div className="card border-red-100 p-7">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-red-50 text-red-600"><X className="size-5" /></span><h2 className="text-xl font-black">מה נשאר בחוץ</h2></div>
          <ul className="mt-6 grid gap-3 text-sm">
            {["שוברים, BuyMe, נקודות או צבירה", "מבצע שמחייב אינטרנט, סלולר או גז", "הטבה פרטית שאינה מפורסמת לציבור", "מחיר ללא מע״מ או ללא מקור שניתן לבדוק", "הבטחה שיווקית ללא תנאי זמן מוגדרים"].map((item) => <li key={item} className="flex items-start gap-2"><X className="mt-0.5 size-4 shrink-0 text-red-500" />{item}</li>)}
          </ul>
        </div>
      </section>

      <section className="defer-render mt-14">
        <div className="max-w-2xl"><span className="eyebrow">צינור החישוב</span><h2 className="mt-5 text-3xl font-black tracking-normal sm:text-4xl">מהקובץ ועד להמלצה</h2></div>
        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <article key={title} className="card relative p-6">
              <span className="font-mono text-xs text-muted">0{index + 1}</span>
              <span className="mt-5 grid size-11 place-items-center rounded-2xl bg-surface-soft text-brand"><Icon className="size-5" /></span>
              <h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="defer-render mt-14 overflow-hidden rounded-3xl bg-[#10271f] text-white">
        <div className="grid lg:grid-cols-[.8fr_1.2fr]">
          <div className="p-8 sm:p-10"><span className="eyebrow bg-white/10 text-accent"><Clock3 className="size-3.5" /> זמן הוא נתון, לא פרט טכני</span><h2 className="mt-6 text-3xl font-black">23:00 עד 07:00 לא שייך לשני ימים שונים.</h2><p className="mt-4 leading-7 text-white/75">חלון שחוצה חצות מיוחס ליום שבו התחיל. 06:45 כלולה, 07:00 כבר בחוץ. אותו כלל נשמר גם במעבר חודש ושנה.</p></div>
          <div className="noise-grid border-t border-white/10 p-8 sm:p-10 lg:border-r lg:border-t-0">
            <div className="flex items-center justify-between text-xs text-white/75"><span>חמישי</span><span>שישי</span></div>
            <div className="relative mt-6 h-16 rounded-2xl bg-white/8 p-2">
              <div className="absolute right-[12.5%] top-2 h-12 w-[66.6%] rounded-xl bg-accent text-center text-xs font-bold leading-[3rem] text-brand-strong">חלון הנחת לילה</div>
              <span className="absolute right-[12.5%] top-[4.7rem] text-xs text-white/75">23:00</span><span className="absolute left-[20.9%] top-[4.7rem] text-xs text-white/75">07:00</span>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {["תחילת פעימה כלולה", "סיום פעימה אינו כלול", "תוקף תוכנית חצי־פתוח", "96 slots נשמרים ב־DST"].map((item) => <span key={item} className="flex items-center gap-2 text-xs text-white/75"><Check className="size-3.5 text-accent" />{item}</span>)}
            </div>
          </div>
        </div>
      </section>

      <section className="defer-render mt-14 grid gap-6 lg:grid-cols-2">
        <div className="card p-7 sm:p-8"><div className="flex items-center gap-3"><Database className="size-5 text-brand" /><h2 className="text-2xl font-black">מה כלול בעלות</h2></div><div className="mt-6 divide-y">{[["רכיב אנרגיה", "תעריף הבסיס כפול קוט״ש בכל פעימה"], ["הנחת ספק", "רק בשעות ובימים המזכים"], ["קבועי חלוקה ואספקה", "נכללים בכל תוכנית לפי סיווג החשבונית שסופקה: תעריף אחיד תלת־פאזי; לא הונחה קריאה יומית"], ["קיבולת", "חיוב חובה לפי גודל החיבור מהחשבונית: ‎3×25A = 17.32 KVA"], ["עמלת תוכנית", "נכללת רק אם פורסמה ומופחתת מהנחת התוכנית בפועל"]].map(([title, text]) => <div key={title} className="grid gap-1 py-4 sm:grid-cols-[150px_1fr]"><strong className="text-sm">{title}</strong><span className="text-sm text-muted">{text}</span></div>)}</div></div>
        <div className="card p-7 sm:p-8"><div className="flex items-center gap-3"><FlaskConical className="size-5 text-brand" /><h2 className="text-2xl font-black">שלושה סוגי תוצאה</h2></div><div className="mt-6 space-y-4">{[["תוכנית יחידה", "ההמלצה המעשית: מה הייתה העלות אילו הקטלוג הנוכחי חל על פרופיל הצריכה."], ["בדיקה לפי נתוני עבר", "בחירה לפי מידע שהיה ידוע לפני חודש הבדיקה ומדידת חרטה בשקלים."], ["תחזית עונתית ותאריכים חופשיים", "ארבע עונות קבועות וחיפוש חלונות משתלמים בני 85 יום לפחות. מעבר נבחר רק אם הוא חוסך לפחות 5%; אחרת נשארים בתוכנית השנתית הזולה."]].map(([title, text], index) => <div key={title} className="rounded-2xl bg-surface-soft p-4"><div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-brand text-xs font-bold text-white">{index + 1}</span><strong>{title}</strong></div><p className="mt-2 text-sm leading-6 text-muted">{text}</p></div>)}</div></div>
      </section>

      <section className="card defer-render mt-14 p-7 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div><div className="flex items-center gap-3"><ShieldCheck className="size-6 text-brand" /><h2 className="text-2xl font-black">בקרות ואימות</h2></div><p className="mt-4 max-w-3xl leading-7 text-muted">המנוע נבדק על חצות, סוף חלון, מעבר שנה, שנה מעוברת, תאריך תפוגה, חודש חלקי, יום חסר, כפילויות שעון חורף ותוצאה זהה בין תוכנית יחידה לאופטימייזר. תחזיות ההחלפה ננעלות לעלות התוכנית השנתית הזולה, ולכן אינן יכולות להציג אסטרטגיה יקרה ממנה.</p><div className="mt-5 flex flex-wrap gap-2">{["4 עונות בלבד", "85 ימים לפחות", "סף חיסכון 5%", "לעולם לא יקר מהקבועה", "בדיקות אוטומטיות", "חישוב דטרמיניסטי"].map((item) => <span key={item} className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold text-brand-strong">{item}</span>)}</div></div>
          <Link href="/compare" className="flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 font-bold text-white hover:bg-brand-strong">השוואה אישית <ArrowUpLeft className="size-4" /></Link>
        </div>
      </section>

      <section className="mt-12 text-sm text-muted">
        <h2 className="font-bold text-foreground">מקורות זמן ומתודולוגיה</h2>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          <a href="https://data.iana.org/time-zones/tzdb/asia" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">IANA Asia/Jerusalem <ExternalLink className="size-3" /></a>
          <a href="https://www.gov.il/BlobFolder/generalpage/tarriffbook/he/sefer_tariff_07_2026.pdf" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">ספר התעריפים הרשמי · יולי 2026 <ExternalLink className="size-3" /></a>
          <a href="https://otexts.com/fpp3/tscv.html" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">Time-series cross-validation <ExternalLink className="size-3" /></a>
        </div>
      </section>
    </div>
  );
}
