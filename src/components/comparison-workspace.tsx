"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Check,
  CheckCircle2,
  CircleGauge,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  FileUp,
  Gauge,
  Info,
  LoaderCircle,
  LockKeyhole,
  MoonStar,
  RefreshCw,
  Sparkles,
  SunMedium,
  Trash2,
  WalletCards,
  Zap,
} from "lucide-react";
import { catalog, categoryLabels, firstYearDiscountLabel, providerAccent } from "@/lib/catalog";
import { ProviderLogo } from "@/components/provider-logo";
import { clearLocalComparison, loadMeterFile, loadProfile, saveMeterFile, saveProfile } from "@/lib/local-meter-cache";
import type { AnalysisWorkerResponse, MeterSummary, ProfilePoint } from "@/lib/analysis-worker-types";
import type { ComparisonResult, MonthlyInvoiceEstimate, Phase, Profile, TemporalAnalysis } from "@/lib/types";
import { cn, decimalIls, ils, number } from "@/lib/utils";

const TemporalRecommendations = dynamic(
  () => import("@/components/temporal-recommendations").then((module) => module.TemporalRecommendations),
  { ssr: false, loading: () => <div className="card h-56 animate-pulse bg-surface-soft" aria-label="טוען המלצות תקופתיות" /> },
);

type Status = "idle" | "loading" | "ready" | "error";

const inputClass = "h-11 w-full rounded-xl border bg-white px-3 text-sm font-medium outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10";
const defaultProfile: Profile = { meterType: "smart", phase: "three", capacityKva: 17.32, tenureYear: 1 };

function displayDate(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

export function ComparisonWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const restorationStarted = useRef(false);
  const currentFile = useRef<File | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const workerRejectRef = useRef<((reason?: unknown) => void) | null>(null);
  const requestSequence = useRef(0);
  const [status, setStatus] = useState<Status>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<MeterSummary | null>(null);
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [temporal, setTemporal] = useState<TemporalAnalysis | null>(null);
  const [hourly, setHourly] = useState<ProfilePoint[]>([]);
  const [monthly, setMonthly] = useState<ProfilePoint[]>([]);
  const [monthlyInvoices, setMonthlyInvoices] = useState<MonthlyInvoiceEstimate[]>([]);
  const [activeView, setActiveView] = useState<"ranking" | "profile">("ranking");
  const [profile, setProfile] = useState<Profile>(defaultProfile);

  const processFile = useCallback(async (file: File, nextProfile: Profile, persist: boolean) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("יש להעלות קובץ CSV של פעימות המונה.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError("");
    setFileName(file.name);
    currentFile.current = file;
    const requestId = ++requestSequence.current;
    workerRejectRef.current?.(new Error("ANALYSIS_CANCELLED"));
    workerRejectRef.current = null;
    workerRef.current?.terminate();
    try {
      const response = await new Promise<AnalysisWorkerResponse>((resolve, reject) => {
        workerRejectRef.current = reject;
        const worker = new Worker(new URL("../workers/meter-analysis.worker.js", import.meta.url), { type: "module" });
        workerRef.current = worker;
        worker.onmessage = (event: MessageEvent<AnalysisWorkerResponse>) => {
          workerRejectRef.current = null;
          resolve(event.data);
        };
        worker.onerror = () => reject(new Error("מנוע החישוב לא הצליח להיטען."));
        worker.postMessage({ file, profile: nextProfile });
      });
      if (requestId !== requestSequence.current) return;
      workerRef.current?.terminate();
      workerRef.current = null;
      if (!response.ok) throw new Error(response.error);
      setParsed(response.analysis.parsed);
      setResults(response.analysis.results);
      setTemporal(response.analysis.temporal);
      setHourly(response.analysis.hourly);
      setMonthly(response.analysis.monthly);
      setMonthlyInvoices(response.analysis.monthlyInvoices);
      setStatus("ready");
      if (persist) void saveMeterFile(file).catch(() => undefined);
    } catch (reason) {
      if (reason instanceof Error && reason.message === "ANALYSIS_CANCELLED") return;
      workerRef.current?.terminate();
      workerRef.current = null;
      setError(reason instanceof Error ? reason.message : "אירעה שגיאה בקריאת הקובץ.");
      setStatus("error");
    }
  }, []);

  const handleFile = useCallback((file?: File) => {
    if (file) void processFile(file, profile, true);
  }, [processFile, profile]);

  useEffect(() => {
    if (restorationStarted.current) return;
    restorationStarted.current = true;
    const savedProfile = loadProfile() ?? defaultProfile;
    saveProfile(savedProfile);
    setProfile(savedProfile);
    void loadMeterFile()
      .then((file) => {
        if (file) return processFile(file, savedProfile, false);
      })
      .catch(() => undefined);
    return () => {
      workerRejectRef.current?.(new Error("ANALYSIS_CANCELLED"));
      workerRejectRef.current = null;
      workerRef.current?.terminate();
    };
  }, [processFile]);

  const updateProfile = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    const next = { ...profile, [key]: value };
    setProfile(next);
    saveProfile(next);
    if (currentFile.current) void processFile(currentFile.current, next, false);
  };

  const handleClearHistory = async () => {
    await clearLocalComparison().catch(() => undefined);
    setStatus("idle");
    setError("");
    setFileName("");
    setParsed(null);
    setResults([]);
    setTemporal(null);
    setHourly([]);
    setMonthly([]);
    setMonthlyInvoices([]);
    currentFile.current = null;
    workerRejectRef.current?.(new Error("ANALYSIS_CANCELLED"));
    workerRejectRef.current = null;
    workerRef.current?.terminate();
    setProfile(defaultProfile);
    setActiveView("ranking");
    if (inputRef.current) inputRef.current.value = "";
  };

  const best = results[0];
  const baselineCost = best ? best.totalCostIls + best.netSavingsIls : 0;
  const chartData = results.slice(0, 8).map((result, index) => ({
    name: result.plan.length > 17 ? `${result.plan.slice(0, 16)}…` : result.plan,
    provider: result.provider,
    savings: Math.round(result.effectiveBillDiscountIls),
    color: index === 0 ? "#0b7159" : providerAccent[result.provider] ?? "#87a094",
  }));
  const customerPeriodLabel = parsed?.customerPeriodStart
    ? `${displayDate(parsed.customerPeriodStart)}–${displayDate(parsed.customerPeriodEnd)}`
    : "";
  const peakHour = hourly.length ? hourly.reduce((bestHour, item) => Number(item.kwh) > Number(bestHour.kwh) ? item : bestHour) : null;
  const nightShare = parsed ? hourly.slice(23).concat(hourly.slice(0, 7)).reduce((sum, item) => sum + Number(item.kwh), 0) / parsed.totalKwh * 100 : 0;
  const dayShare = parsed ? hourly.slice(7, 17).reduce((sum, item) => sum + Number(item.kwh), 0) / parsed.totalKwh * 100 : 0;

  return (
    <div className="mt-10">
      <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="border-b p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-brand"><FileSpreadsheet className="size-5" /></span>
            <div><h2 className="font-bold">נתוני המונה</h2><p className="text-xs text-muted">CSV פעימות רבע־שעתיות</p></div>
          </div>
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(260px,.7fr)_minmax(0,1.3fr)] lg:items-start">
          <input ref={inputRef} type="file" accept=".csv,text/csv" aria-label="בחירת קובץ CSV של פעימות המונה" className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => { event.preventDefault(); setIsDragging(false); handleFile(event.dataTransfer.files[0]); }}
            className={cn(
              "flex min-h-40 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition lg:col-start-1 lg:row-start-1 lg:row-span-2",
              isDragging ? "border-brand bg-accent-soft" : "border-line bg-surface-soft/60 hover:border-brand/50 hover:bg-accent-soft/40",
            )}
          >
            {status === "loading" ? (
              <><LoaderCircle className="size-8 animate-spin text-brand" /><strong className="mt-3 text-sm">קוראים את הפעימות…</strong></>
            ) : status === "ready" ? (
              <><FileCheck2 className="size-8 text-brand" /><strong className="mt-3 max-w-full truncate text-sm">{fileName}</strong><span className="mt-1 text-xs text-muted">לחצו להחלפת הקובץ</span></>
            ) : (
              <><FileUp className="size-8 text-brand" /><strong className="mt-3 text-sm">גררו לכאן או בחרו קובץ</strong><span className="mt-1 text-xs text-muted">עדיף יצוא מלא מחברת החשמל</span></>
            )}
          </button>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted lg:col-start-1 lg:row-start-3"><LockKeyhole className="size-3.5" />הקובץ אינו נשלח לשום שרת</div>
          {status === "ready" && (
            <div className="rounded-xl bg-surface-soft p-3 text-xs leading-5 text-muted lg:col-start-1 lg:row-start-4">
              <p>הקובץ וההעדפות נשמרים רק במכשיר הזה למשך שבוע.</p>
              <button type="button" onClick={handleClearHistory} className="mt-2 inline-flex items-center gap-1.5 font-bold text-red-700 hover:text-red-900">
                <Trash2 className="size-3.5" /> ניקוי / מחיקת היסטוריה
              </button>
            </div>
          )}

          <div className="my-2 h-px bg-line lg:hidden" />
          <div className="grid gap-4 md:grid-cols-2 lg:col-start-2 lg:row-start-1 lg:row-span-4 xl:grid-cols-4">
            <label className="block"><span className="mb-1.5 block text-xs font-bold">סוג מונה</span>
              <select value={profile.meterType} onChange={(event) => updateProfile("meterType", event.target.value as Profile["meterType"])} className={inputClass}>
                <option value="smart">מונה חכם</option><option value="basic">מונה בסיסי</option>
              </select>
            </label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold">סוג חיבור</span>
              <select value={profile.phase} onChange={(event) => updateProfile("phase", event.target.value as Phase)} className={inputClass}>
                <option value="single">חד־פאזי</option><option value="three">תלת־פאזי</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3 md:col-span-2 xl:col-span-2">
              <label><span className="mb-1.5 block text-xs font-bold">שנת לקוח</span>
                <select value={profile.tenureYear} onChange={(event) => updateProfile("tenureYear", Number(event.target.value))} className={inputClass}>
                  <option value={1}>ראשונה</option><option value={2}>שנייה</option><option value={3}>שלישית+</option>
                </select>
              </label>
              <label><span className="mb-1.5 block text-xs font-bold">קיבולת KVA</span>
                <input type="number" min="0" step="0.01" value={profile.capacityKva ?? 17.32} onChange={(event) => updateProfile("capacityKva", event.target.value ? Number(event.target.value) : 17.32)} className={inputClass} />
                <span className="mt-1 block text-[11px] text-muted">מהחשבונית: 3×25A = 17.32 KVA</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="min-w-0">
        {status === "idle" && <EmptyState onSelect={() => inputRef.current?.click()} />}
        {status === "loading" && <LoadingState />}
        {status === "error" && (
          <div className="card p-8 text-center sm:p-12">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600"><AlertCircle className="size-7" /></span>
            <h2 className="mt-5 text-2xl font-bold">לא הצלחנו לקרוא את הקובץ</h2>
            <p className="mx-auto mt-3 max-w-xl leading-7 text-muted">{error}</p>
            <button onClick={() => inputRef.current?.click()} className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 font-bold text-white"><RefreshCw className="size-4" />בחירת קובץ אחר</button>
          </div>
        )}
        {status === "ready" && parsed && best && (
          <>
            <div className="overflow-hidden rounded-[1.75rem] bg-brand-strong text-white shadow-[0_25px_70px_rgba(7,84,67,.2)]">
              <div className="grid gap-6 p-6 sm:p-8 xl:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-brand-strong"><Sparkles className="ml-1 inline size-3" />ההתאמה הטובה ביותר</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/75">{categoryLabels[best.category] ?? best.category}</span>
                  </div>
                  <div className="mt-6 flex items-center gap-3"><ProviderLogo provider={best.provider} size="md" /><div><p className="text-sm text-white/75">{best.provider}</p><h2 className="mt-1 text-4xl font-black tracking-normal">{best.plan}</h2></div></div>
                  <p className="mt-4 max-w-3xl leading-7 text-white/75">מבין {results.length} תוכניות שמתאימות למונה שלכם, זו התוכנית עם העלות הכוללת הנמוכה ביותר. הדירוג והחיסכון הכספי מוצגים עבור התקופה הזמינה ועד 365 הימים האחרונים; המודלים וסטטיסטיקות הצריכה ממשיכים להשתמש בכל הקובץ.</p>
                </div>
                <div className="min-w-48 rounded-3xl bg-accent p-5 text-brand-strong">
                  <p className="text-xs font-bold">הנחה בפועל אחרי חיובי חובה · עד שנה</p>
                  <p className="metric-number mt-2 text-4xl font-black">{ils.format(best.effectiveBillDiscountIls)}</p>
                  <p className="mt-2 text-sm font-bold">{best.effectiveBillDiscountPercent.toFixed(2)}% מחשבון הבסיס המלא</p>
                  <p className="mt-1 text-xs opacity-80">תעריף האנרגיה האפקטיבי בפרופיל: {best.energyDiscountPercent.toFixed(2)}%</p>
                  <p className="mt-2 border-t border-brand-strong/15 pt-2 text-xs opacity-85">חיסכון כולל במחיר לאחר כל החיובים הקבועים: {decimalIls.format(best.netSavingsIls)} · {best.netSavingsPercent.toFixed(2)}%</p>
                  <p className="mt-2 text-xs opacity-80">{customerPeriodLabel}</p>
                </div>
              </div>
              <div className="grid border-t border-white/10 sm:grid-cols-3">
                {[
                  [decimalIls.format(best.totalCostIls), "עלות בתוכנית"],
                  [decimalIls.format(baselineCost), "עלות בסיס להשוואה"],
                  [`${best.discountedConsumptionPercent.toFixed(1)}%`, "מהצריכה קיבלה הנחה"],
                ].map(([value, label]) => (
                  <div key={label} className="border-white/10 p-5 sm:border-l last:border-l-0"><strong className="metric-number block text-xl">{value}</strong><span className="mt-1 block text-xs text-white/75">{label}</span></div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
      </div>

      {status === "ready" && parsed && best && (
        <section className="mt-6 space-y-6">

            <div className="adaptive-metrics grid gap-4">
              <Metric icon={Gauge} label="שלמות הנתונים" value={`${(parsed.coverageRatio * 100).toFixed(1)}%`} note={parsed.missingSlots ? `${parsed.missingSlots} פעימות חסרות` : "ללא פעימות חסרות"} positive={!parsed.missingSlots} />
              <Metric icon={Zap} label="צריכה כוללת" value={`${number.format(parsed.totalKwh)} קוט״ש`} note={`${parsed.rows.toLocaleString("he-IL")} פעימות`} />
              <Metric icon={Clock3} label="שעת שיא" value={peakHour ? String(peakHour.hour) : "—"} note="לפי פרופיל מצטבר" />
              <Metric icon={WalletCards} label="פער ממקום שני" value={results[1] ? decimalIls.format(results[1].totalCostIls - best.totalCostIls) : "—"} note={(results[1] && results[1].totalCostIls - best.totalCostIls <= 5) ? "תיקו מעשי" : "יתרון לתוכנית המובילה"} />
            </div>

            <div className="flex gap-1 rounded-2xl border bg-white p-1.5" role="tablist" aria-label="תצוגת תוצאות">
              <button role="tab" aria-selected={activeView === "ranking"} onClick={() => setActiveView("ranking")} className={cn("flex-1 rounded-xl px-4 py-2.5 text-sm font-bold", activeView === "ranking" ? "bg-brand text-white" : "text-muted hover:bg-surface-soft")}>דירוג תוכניות</button>
              <button role="tab" aria-selected={activeView === "profile"} onClick={() => setActiveView("profile")} className={cn("flex-1 rounded-xl px-4 py-2.5 text-sm font-bold", activeView === "profile" ? "bg-brand text-white" : "text-muted hover:bg-surface-soft")}>פרופיל הצריכה</button>
            </div>

            {activeView === "ranking" ? (
              <>
                <div className="card p-5 sm:p-7">
                  <div className="flex items-center justify-between gap-4"><div><h3 className="text-lg font-bold">הנחת התוכנית בפועל לאחר חיובי חובה</h3><p className="mt-1 text-sm text-muted">{customerPeriodLabel} · עד 365 ימים · הנחת אנרגיה פחות עמלות, חלקי חשבון בסיס מלא</p></div><CircleGauge className="size-5 text-brand" /></div>
                  <SavingsChart data={chartData} />
                </div>
                <RankingTable results={results} periodLabel={customerPeriodLabel} invoices={monthlyInvoices} />
              </>
            ) : (
              <div className="grid gap-6 xl:grid-cols-2">
                <ProfileChart title="צריכה לפי שעה" data={hourly} dataKey="kwh" labelKey="hour" />
                <ProfileChart title="צריכה לפי חודש" data={monthly} dataKey="kwh" labelKey="month" />
                <div className="card grid gap-4 p-6 sm:grid-cols-2 xl:col-span-2">
                  <ShareCard icon={SunMedium} title="צריכת יום" value={`${dayShare.toFixed(1)}%`} note="07:00–17:00" />
                  <ShareCard icon={MoonStar} title="צריכת לילה" value={`${nightShare.toFixed(1)}%`} note="23:00–07:00" />
                </div>
              </div>
            )}

            {temporal && <TemporalRecommendations analysis={temporal} title="ההמלצות האישיות שלכם" />}

            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <Info className="mt-0.5 size-5 shrink-0" />
              <p className="leading-6">זהו replay של הקטלוג הנוכחי על פרופיל העבר, לא שחזור של חשבונות היסטוריים. תוכניות שמחריגות חגים מסומנות באזהרה, ויש לאמת תנאי הצטרפות לפני מעבר.</p>
            </div>
        </section>
        )}
    </div>
  );
}

function EmptyState({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="card overflow-hidden">
      <div className="grid min-h-[500px] place-items-center p-8 text-center">
        <div className="max-w-xl">
          <div className="mx-auto grid size-20 place-items-center rounded-[1.75rem] bg-brand-strong text-accent shadow-xl"><Zap className="size-9" fill="currentColor" /></div>
          <h2 className="mt-7 text-3xl font-black tracking-normal">הקובץ שלכם הופך להחלטה ברורה</h2>
          <p className="mt-4 leading-7 text-muted">לאחר ההעלאה יוצגו התוכנית הזולה ביותר, כל החלופות, פרופיל שעות הצריכה ואיכות הנתונים.</p>
          <button onClick={onSelect} className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-brand px-6 font-bold text-white hover:bg-brand-strong"><FileUp className="size-5" />בחירת קובץ CSV</button>
          <div className="mt-9 grid gap-3 text-right sm:grid-cols-3">
            {["מע״מ כלול", "עמלות נלקחות בחשבון", "23 תוכניות נבדקות"].map((item) => <span key={item} className="flex items-center gap-2 rounded-xl bg-surface-soft p-3 text-xs font-medium"><Check className="size-4 text-brand" />{item}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return <div className="card grid min-h-[500px] place-items-center p-8 text-center"><div><LoaderCircle className="mx-auto size-11 animate-spin text-brand" /><h2 className="mt-5 text-2xl font-bold">מחשבים את כל התוכניות</h2><p className="mt-2 text-muted">קוראים פעימות, בונים חלונות זמן ומדרגים עלות נטו…</p></div></div>;
}

function Metric({ icon: Icon, label, value, note, positive }: { icon: typeof Gauge; label: string; value: string; note: string; positive?: boolean }) {
  return <div className="card p-6"><div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-surface-soft text-brand"><Icon className="size-5" /></span>{positive && <CheckCircle2 className="size-5 text-brand" />}</div><p className="metric-number mt-5 text-2xl font-black">{value}</p><p className="mt-1 text-sm font-bold">{label}</p><p className="mt-1 text-xs text-muted">{note}</p></div>;
}

function RankingTable({
  results,
  periodLabel,
  invoices,
}: {
  results: ComparisonResult[];
  periodLabel: string;
  invoices: MonthlyInvoiceEstimate[];
}) {
  const [downloadingPlanId, setDownloadingPlanId] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState("");
  const invoiceByPlanId = new Map(invoices.map((invoice) => [invoice.planId, invoice]));
  const planById = new Map(catalog.plans.map((plan) => [plan.id, plan]));
  const invoicePeriod = invoices[0];

  const downloadInvoice = async (invoice: MonthlyInvoiceEstimate) => {
    setDownloadingPlanId(invoice.planId);
    setInvoiceError("");
    try {
      const { downloadMockInvoice } = await import("@/lib/invoice-pdf");
      await downloadMockInvoice(invoice);
    } catch {
      setInvoiceError("לא הצלחנו להפיק את החשבונית. נסו שוב בעוד רגע.");
    } finally {
      setDownloadingPlanId(null);
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b p-5 sm:p-6">
        <div>
          <h3 className="text-lg font-bold">כל התוכניות המתאימות</h3>
          <p className="mt-1 text-sm text-muted">מסודרות לפי עלות כוללת לתקופה {periodLabel} — לכל היותר שנה</p>
          {invoicePeriod && (
            <p className="mt-2 text-xs leading-5 text-muted">
              חשבונית הדמה מחושבת עבור {invoicePeriod.periodLabel}: {number.format(invoicePeriod.consumptionKwh)} קוט״ש, כולל מע״מ וכל הרכיבים הידועים.
            </p>
          )}
          {invoiceError && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{invoiceError}</p>}
        </div>
        <BadgeCheck className="mt-0.5 size-5 shrink-0 text-brand" />
      </div>
      <div className="grid gap-3 p-4 sm:hidden">
        {results.map((result, index) => {
          const invoice = invoiceByPlanId.get(result.planId);
          const isDownloading = downloadingPlanId === result.planId;
          return (
          <article key={result.planId} className={cn("rounded-2xl border bg-white p-4", index === 0 && "border-brand/30 bg-accent-soft/35")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3"><ProviderLogo provider={result.provider} size="sm" /><div><strong className="block text-base">{result.plan}</strong><span className="text-sm text-muted">{result.provider}</span></div></div>
              <span className="font-mono text-xs text-muted">#{index + 1}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div><span className="block text-xs text-muted">עלות כוללת</span><strong className="metric-number mt-1 block">{decimalIls.format(result.totalCostIls)}</strong></div>
              <div><span className="block text-xs text-muted">הנחה בפועל אחרי קבועים</span><strong className="metric-number mt-1 block text-brand">{decimalIls.format(result.effectiveBillDiscountIls)}</strong></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-xs"><span><span className="block text-muted">תעריף הנחה שנה 1</span><strong>{firstYearDiscountLabel(planById.get(result.planId)!)}</strong></span><span><span className="block text-muted">הנחה בפועל אחרי חיובי חובה</span><strong>{result.effectiveBillDiscountPercent.toFixed(2)}%</strong></span></div>
            <p className="mt-2 text-xs text-muted">חיסכון כולל במחיר לאחר כל החיובים הקבועים: {decimalIls.format(result.netSavingsIls)}</p>
            <div className="mt-3 flex items-center justify-between text-xs"><span className="text-muted">{categoryLabels[result.category] ?? result.category}</span><a href={result.sourceUrl} target="_blank" rel="noreferrer" className="font-bold text-brand">מקור רשמי</a></div>
            <button
              type="button"
              disabled={!invoice || isDownloading}
              onClick={() => invoice && void downloadInvoice(invoice)}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand/25 bg-white px-4 text-sm font-bold text-brand transition hover:border-brand hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-55"
              aria-label={`הורדת חשבונית דמה עבור ${result.provider}, ${result.plan}`}
            >
              {isDownloading ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
              {isDownloading ? "מכינים את החשבונית…" : "הורדת חשבונית דמה"}
            </button>
          </article>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="bg-surface-soft/70 text-right text-xs text-muted"><tr><th className="p-4 font-medium">#</th><th className="p-4 font-medium">ספק ותוכנית</th><th className="p-4 font-medium">סוג</th><th className="p-4 font-medium">תעריף הנחה שנה 1</th><th className="p-4 font-medium">עלות כוללת</th><th className="p-4 font-medium">הנחה בפועל אחרי חיובי חובה</th><th className="p-4 font-medium">כיסוי הנחה</th><th className="p-4 font-medium">חשבונית דמה</th><th className="p-4" /></tr></thead>
          <tbody className="divide-y">
            {results.map((result, index) => {
              const invoice = invoiceByPlanId.get(result.planId);
              const isDownloading = downloadingPlanId === result.planId;
              return (
              <tr key={result.planId} className={cn("hover:bg-surface-soft/45", index === 0 && "bg-accent-soft/35")}>
                <td className="p-4 font-mono text-xs text-muted">{index + 1}</td>
                <td className="p-4"><div className="flex items-center gap-3"><ProviderLogo provider={result.provider} size="xs" /><div><strong className="block">{result.plan}</strong><span className="text-xs text-muted">{result.provider}</span></div>{index === 0 && <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">מומלצת</span>}</div></td>
                <td className="p-4 text-sm text-muted">{categoryLabels[result.category] ?? result.category}</td>
                <td className="p-4"><strong className="text-base text-ink">{firstYearDiscountLabel(planById.get(result.planId)!)}</strong><span className="block text-xs text-muted">על רכיב האנרגיה</span></td>
                <td className="p-4 font-bold tabular-nums">{decimalIls.format(result.totalCostIls)}</td>
                <td className="p-4"><strong className="text-brand">{decimalIls.format(result.effectiveBillDiscountIls)}</strong><span className="block text-xs font-bold text-brand">{result.effectiveBillDiscountPercent.toFixed(2)}% מחשבון הבסיס</span><span className="mt-1 block text-[11px] text-muted">חיסכון כולל במחיר: {decimalIls.format(result.netSavingsIls)}</span></td>
                <td className="p-4 tabular-nums">{result.discountedConsumptionPercent.toFixed(1)}%</td>
                <td className="p-4">
                  <button
                    type="button"
                    disabled={!invoice || isDownloading}
                    onClick={() => invoice && void downloadInvoice(invoice)}
                    className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl border border-brand/25 bg-white px-3 text-xs font-bold text-brand transition hover:border-brand hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-55"
                    aria-label={`הורדת חשבונית דמה עבור ${result.provider}, ${result.plan}`}
                  >
                    {isDownloading ? <LoaderCircle className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                    {isDownloading ? "מכינים את החשבונית…" : "הורדת חשבונית דמה"}
                  </button>
                </td>
                <td className="p-4"><a href={result.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-brand">מקור <ExternalLink className="size-3" /></a></td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SavingsChart({ data }: { data: { name: string; provider: string; savings: number; color: string }[] }) {
  const maximum = Math.max(...data.map((item) => item.savings), 1);
  return (
    <div className="mt-6 space-y-4">
      {data.map((item) => (
        <div key={`${item.provider}-${item.name}`} className="grid gap-2 sm:grid-cols-[minmax(120px,190px)_minmax(0,1fr)_90px] sm:items-center">
          <span className="truncate text-sm font-semibold" title={`${item.provider} · ${item.name}`}>{item.name}</span>
          <div className="h-3 overflow-hidden rounded-full bg-surface-soft" role="img" aria-label={`הנחה בפועל ${ils.format(item.savings)}`}>
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, item.savings / maximum * 100)}%`, backgroundColor: item.color }} />
          </div>
          <strong className="metric-number text-sm text-brand sm:text-left">{ils.format(item.savings)}</strong>
        </div>
      ))}
    </div>
  );
}

function ProfileChart({ title, data, dataKey, labelKey }: { title: string; data: ProfilePoint[]; dataKey: string; labelKey: string }) {
  const maximum = Math.max(...data.map((item) => Number(item[dataKey])), 1);
  const minimumWidth = Math.max(420, data.length * 34);
  return (
    <div className="card min-w-0 p-5 sm:p-7">
      <h3 className="text-lg font-bold">{title}</h3>
      <div className="mt-6 overflow-x-auto pb-2">
        <div className="flex h-64 items-end gap-1.5 border-b border-line px-1" style={{ minWidth: minimumWidth }} dir="ltr">
          {data.map((item, index) => {
            const value = Number(item[dataKey]);
            const label = String(item[labelKey]);
            const showLabel = data.length <= 14 || index % Math.ceil(data.length / 10) === 0 || index === data.length - 1;
            return (
              <div key={`${label}-${index}`} className="group relative flex h-full min-w-5 flex-1 items-end" title={`${label}: ${number.format(value)} קוט״ש`}>
                <div className="w-full rounded-t-md bg-brand/80 transition-colors group-hover:bg-brand" style={{ height: `${Math.max(2, value / maximum * 100)}%` }} />
                {showLabel && <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-muted">{label}</span>}
              </div>
            );
          })}
        </div>
        <div className="h-7" />
      </div>
    </div>
  );
}

function ShareCard({ icon: Icon, title, value, note }: { icon: typeof SunMedium; title: string; value: string; note: string }) {
  return <div className="flex items-center gap-4 rounded-2xl bg-surface-soft p-5"><span className="grid size-12 place-items-center rounded-2xl bg-white text-brand"><Icon className="size-5" /></span><div><p className="text-xs font-bold text-muted">{title}</p><p className="metric-number mt-1 text-2xl font-black">{value}</p><p className="text-xs text-muted">{note}</p></div></div>;
}
