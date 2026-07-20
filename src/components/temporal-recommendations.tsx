"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  BadgeCheck,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Search,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";
import { providerAccent } from "@/lib/catalog";
import { ProviderLogo } from "@/components/provider-logo";
import type { PeriodRecommendation, TemporalAnalysis } from "@/lib/types";
import { cn, decimalIls, ils, number } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`));
}

function dayMonthLabel(value: string) {
  const [, month, day] = value.split("-");
  return `${day}.${month}`;
}

function monthShort(label: string) {
  return label.replace(" 20", " ’");
}

export function TemporalRecommendations({
  analysis,
  title = "המלצות לפי תקופה",
}: {
  analysis: TemporalAnalysis;
  title?: string;
}) {
  const [selectedMonthId, setSelectedMonthId] = useState(analysis.months.at(-1)?.id ?? "");
  const selectedMonth = analysis.months.find((month) => month.id === selectedMonthId) ?? analysis.months.at(-1);
  const maximumSavings = Math.max(...analysis.months.map((month) => month.winner.effectiveBillDiscountIls), 1);
  const winners = (() => {
    const unique = new Map<string, { label: string; color: string; provider: string }>();
    analysis.months.forEach((month) => unique.set(month.winner.planId, {
      label: `${month.winner.provider} · ${month.winner.plan}`,
      color: providerAccent[month.winner.provider] ?? "#0b7159",
      provider: month.winner.provider,
    }));
    return [...unique.values()];
  })();

  return (
    <div className="space-y-6">
      <section className="card p-5 sm:p-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <span className="text-xs font-bold text-brand">השוואה חודשית</span>
            <h2 className="mt-2 text-2xl font-black">התוכנית הזולה בכל חודש</h2>
            <p className="mt-2 text-sm text-muted">לחצו על חודש כדי לראות עלות, הנחת תוכנית בפועל אחרי חיובי חובה ודירוג חלופות מלא.</p>
          </div>
          <div className="flex max-w-2xl flex-wrap gap-x-4 gap-y-2 text-xs">
            {winners.map((winner) => (
              <span key={winner.label} className="flex items-center gap-1.5">
                <ProviderLogo provider={winner.provider} size="xs" />{winner.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-7 overflow-x-auto pb-2">
          <div className="flex min-w-max items-end gap-2 border-b border-line px-2 pt-6" dir="ltr">
            {analysis.months.map((month) => {
              const selected = month.id === selectedMonth?.id;
              const color = providerAccent[month.winner.provider] ?? "#0b7159";
              const height = Math.max(30, month.winner.effectiveBillDiscountIls / maximumSavings * 150);
              return (
                <button
                  key={month.id}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${month.label}: ${month.winner.provider}, ${month.winner.plan}`}
                  onClick={() => setSelectedMonthId(month.id)}
                  className="group flex w-14 shrink-0 flex-col items-center justify-end outline-none"
                >
                  <span className={cn(
                    "mb-2 rounded-full px-2 py-1 text-xs font-bold text-foreground opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100",
                    selected && "opacity-100",
                  )} style={{ background: `${color}18` }}>
                    {month.winner.effectiveBillDiscountPercent.toFixed(1)}%
                  </span>
                  <span
                    className={cn(
                      "w-9 rounded-t-xl transition-all group-hover:w-11 group-focus-visible:ring-4 group-focus-visible:ring-brand/20",
                      selected && "w-11 shadow-[0_8px_25px_rgba(11,113,89,.22)]",
                    )}
                    style={{ height, background: color }}
                  />
                  <span className={cn("mt-2 pb-3 text-xs text-muted", selected && "font-bold text-foreground")}>{monthShort(month.label)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedMonth && <PeriodDetails period={selectedMonth} />}
      </section>

      <section className="card defer-render p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div><span className="text-xs font-bold text-brand">המלצות לפי ארבע עונות</span><h2 className="mt-2 text-2xl font-black">{title} — 4 עונות</h2><p className="mt-2 text-sm leading-6 text-muted">ארבע המלצות שנתיות בלבד, ללא שכפול לפי שנים. חלופה עונתית נבחרת רק אם היא זולה ב־5% לפחות מהתוכנית השנתית הקבועה.</p></div>
          <CalendarDays className="size-6 shrink-0 text-brand" />
        </div>
        <AnnualComparison
          baselineCost={analysis.seasonalAnnual.baselineCostIls}
          strategyCost={analysis.seasonalAnnual.strategyCostIls}
          fixedCost={analysis.seasonalAnnual.fixedPlanCostIls}
          savingsBaseline={analysis.seasonalAnnual.savingsVsBaselineIls}
          savingsBaselinePercent={analysis.seasonalAnnual.savingsVsBaselinePercent}
          savingsFixed={analysis.seasonalAnnual.savingsVsFixedIls}
          savingsFixedPercent={analysis.seasonalAnnual.savingsVsFixedPercent}
          effectiveDiscount={analysis.seasonalAnnual.effectiveBillDiscountIls}
          effectiveDiscountPercent={analysis.seasonalAnnual.effectiveBillDiscountPercent}
        />
        <div className="adaptive-seasons mt-7 grid gap-5">
          {analysis.seasons.map((season) => (
            <article key={season.id} className="rounded-2xl border bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-bold text-brand">{season.label} · {season.rangeLabel}</p><h3 className="mt-2 text-lg font-black">{season.winner.plan}</h3><p className="text-xs text-muted">{season.winner.provider}</p></div>
                <ProviderLogo provider={season.winner.provider} size="sm" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-surface-soft p-4"><span className="block text-xs text-muted">עלות צפויה בעונה</span><strong className="metric-number mt-1 block text-lg">{decimalIls.format(season.winner.costIls)}</strong></div>
                <div className="rounded-xl bg-accent-soft p-4"><span className="block text-xs text-muted">הנחה בפועל אחרי חיובי חובה</span><strong className="metric-number mt-1 block text-lg text-brand">{season.winner.effectiveBillDiscountPercent.toFixed(2)}%</strong></div>
              </div>
              <CostBars fixed={season.fixedPlanCostIls} strategy={season.usesAnnualFixedPlan && season.alternatives[0] ? season.alternatives[0].costIls : season.winner.costIls} strategyLabel={season.usesAnnualFixedPlan ? "חלופה שנבדקה" : "המלצה"} compact />
              <p className="mt-4 text-sm leading-6 text-muted">{season.usesAnnualFixedPlan ? (season.alternatives[0] && season.alternatives[0].costIls < season.fixedPlanCostIls ? `החלופה הזולה חוסכת רק ${((season.fixedPlanCostIls - season.alternatives[0].costIls) / season.fixedPlanCostIls * 100).toFixed(2)}% — נשארים בתוכנית השנתית.` : "אין חלופה זולה יותר בעונה הזו — נשארים בתוכנית השנתית.") : `תוספת חיסכון מול התוכנית הקבועה: ${decimalIls.format(season.incrementalSavingsIls)} · ${season.incrementalSavingsPercent.toFixed(2)}%`}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card defer-render overflow-hidden">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <span className="text-xs font-bold text-brand">המלצה על מעברים</span>
            <div className="mt-2 flex items-center gap-3">
              <span className={cn("grid size-11 place-items-center rounded-2xl", analysis.switching.recommended ? "bg-accent-soft text-brand" : "bg-surface-soft text-muted")}>
                {analysis.switching.recommended ? <CheckCircle2 className="size-5" /> : <Ban className="size-5" />}
              </span>
              <div><h2 className="text-2xl font-black">{analysis.switching.recommended ? "נמצאה אסטרטגיית מעבר כדאית" : "לא מומלץ להחליף תוכנית בתקופה הזו"}</h2><p className="mt-1 text-sm text-muted">{analysis.switching.explanation}</p></div>
            </div>
          </div>
          <div className="flex gap-3">
            <Threshold icon={Clock3} value={`${analysis.switching.minimumStayDays}`} label="ימים לפחות" />
            <Threshold icon={ShieldCheck} value={`${analysis.switching.minimumImprovementPercent}%`} label="סף חיסכון" />
          </div>
        </div>
        <div className="px-6 pb-7 sm:px-8">
          <AnnualComparison
            baselineCost={analysis.switching.baselineCostIls}
            strategyCost={analysis.switching.strategyCostIls}
            fixedCost={analysis.switching.fixedPlanCostIls}
            savingsBaseline={analysis.switching.savingsVsBaselineIls}
            savingsBaselinePercent={analysis.switching.savingsVsBaselinePercent}
            savingsFixed={analysis.switching.incrementalSavingsIls}
            savingsFixedPercent={analysis.switching.incrementalSavingsPercent}
            effectiveDiscount={analysis.switching.effectiveBillDiscountIls}
            effectiveDiscountPercent={analysis.switching.effectiveBillDiscountPercent}
          />
        </div>
        <div className="border-t bg-surface-soft/45 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><ProviderLogo provider={analysis.switching.fixedPlan.provider} size="sm" /><div><p className="text-xs font-bold text-muted">התוכנית השנתית הקבועה הטובה ביותר</p><p className="mt-1 font-black">{analysis.switching.fixedPlan.provider} · {analysis.switching.fixedPlan.plan}</p></div></div><div className="text-end"><p className="metric-number text-xl font-black">{decimalIls.format(analysis.switching.fixedPlanCostIls)}</p><p className="text-xs text-muted">עלות שנתית צפויה · {analysis.switching.projectionRangeLabel}</p></div></div>
          <div className="mt-6 flex min-h-32 overflow-x-auto rounded-2xl border bg-white">
            {analysis.switching.segments.map((segment, index) => (
              <div key={`${segment.start}-${segment.planId}`} className="relative flex min-w-40 flex-col justify-between border-l p-4 last:border-l-0" style={{ flex: segment.calendarDays }}>
                {index > 0 && <ArrowLeftRight className="absolute -right-5 top-1/2 hidden size-4 -translate-y-1/2 text-brand lg:block" />}
                <p className="text-xs font-bold text-muted">{dayMonthLabel(segment.start)}–{dayMonthLabel(segment.end)} · {segment.calendarDays} ימים</p>
                <div className="mt-3 flex items-center gap-2"><ProviderLogo provider={segment.provider} size="xs" /><div><p className="font-black">{segment.plan}</p><p className="text-xs text-muted">{segment.provider}</p></div></div>
                {segment.savingsVsFixedPercent > 0 && <p className="mt-3 text-xs font-bold text-brand">תוספת חיסכון: {segment.savingsVsFixedPercent.toFixed(2)}%</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card defer-render p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4"><div><span className="text-xs font-bold text-brand">חיפוש תקופות משתלמות</span><h2 className="mt-2 text-2xl font-black">חלונות זולים שאינם עונות קבועות</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted">המודל סורק נקודות מעבר שבועיות וחלונות של 85–210 ימים. חלון מוצג כהזדמנות, אך אינו הופך להמלצה אם החיסכון מול התוכנית הקבועה נמוך מ־5%.</p></div><Search className="size-6 shrink-0 text-brand" /></div>
        {analysis.optimizedWindows.length ? (
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            {analysis.optimizedWindows.map((window) => (
              <article key={window.id} className="rounded-2xl border p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xs font-bold text-brand">{window.rangeLabel} · {window.calendarDays} ימים</p><div className="mt-3 flex items-center gap-3"><ProviderLogo provider={window.winner.provider} size="sm" /><div><h3 className="text-lg font-black">{window.winner.plan}</h3><p className="text-xs text-muted">{window.winner.provider}</p></div></div></div>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-bold", window.qualifiesForSwitch ? "bg-accent text-brand-strong" : "bg-amber-50 text-amber-800")}>{window.qualifiesForSwitch ? "כדאי לעבור" : "מתחת לסף"}</span>
                </div>
                <CostBars fixed={window.fixedPlanCostIls} strategy={window.winner.costIls} strategyLabel="חלופה שנבדקה" />
                <div className="mt-5 flex items-end justify-between gap-4"><div><span className="block text-xs text-muted">הפרש מול התוכנית הקבועה</span><strong className="metric-number mt-1 block text-2xl text-brand">{ils.format(window.incrementalSavingsIls)}</strong></div><strong className="metric-number text-xl">{window.incrementalSavingsPercent.toFixed(2)}%</strong></div>
                {!window.qualifiesForSwitch && <p className="mt-3 rounded-xl bg-surface-soft p-3 text-xs leading-5 text-muted">לא נבחר למעבר. בתקופה הזו האסטרטגיה נשארת עם {analysis.switching.fixedPlan.plan}.</p>}
              </article>
            ))}
          </div>
        ) : <p className="mt-7 rounded-2xl bg-surface-soft p-5 text-sm text-muted">לא נמצא אפילו חלון זול יותר מהתוכנית הקבועה בטווחים שנבדקו.</p>}
      </section>
    </div>
  );
}

function PeriodDetails({ period }: { period: PeriodRecommendation }) {
  const ranking = [period.winner, ...period.alternatives];
  return (
    <div className="mt-6 rounded-3xl bg-surface-soft p-5 sm:p-6" aria-live="polite">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div><p className="text-xs font-bold text-brand">{period.label} · {formatDate(period.start)}–{formatDate(period.end)}</p><div className="mt-3 flex items-center gap-3"><ProviderLogo provider={period.winner.provider} size="md" /><div><h3 className="text-2xl font-black">{period.winner.plan}</h3><p className="text-xs text-muted">{period.winner.provider}</p></div></div><p className="mt-2 text-sm text-muted">{number.format(period.consumptionKwh)} קוט״ש · {period.observedDays} ימי מדידה</p></div>
        <div className="rounded-2xl bg-brand-strong p-4 text-white"><span className="text-xs text-white/75">העלות הזולה בחודש</span><strong className="metric-number mt-1 block text-2xl">{decimalIls.format(period.winner.costIls)}</strong><span className="mt-1 block text-xs font-bold text-accent">הנחה בפועל אחרי חיובי חובה {period.winner.effectiveBillDiscountPercent.toFixed(2)}%</span></div>
      </div>
      <div className="mt-5 grid gap-3 sm:hidden">{ranking.map((item, index) => <article key={item.planId} className="rounded-2xl border bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><ProviderLogo provider={item.provider} size="xs" /><div><strong className="block">{item.plan}</strong><span className="text-xs text-muted">{item.provider}</span></div></div><span className="font-mono text-xs text-muted">#{index + 1}</span></div><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><span className="block text-xs text-muted">עלות</span><strong>{decimalIls.format(item.costIls)}</strong></div><div><span className="block text-xs text-muted">הנחה בפועל אחרי חיובי חובה</span><strong className="text-brand">{decimalIls.format(item.effectiveBillDiscountIls)} · {item.effectiveBillDiscountPercent.toFixed(2)}%</strong></div></div></article>)}</div>
      <div className="mt-5 hidden overflow-x-auto sm:block"><table className="w-full min-w-[700px] text-sm"><thead className="text-right text-xs text-muted"><tr><th className="pb-3 font-medium">דירוג</th><th className="pb-3 font-medium">ספק ותוכנית</th><th className="pb-3 font-medium">עלות</th><th className="pb-3 font-medium">הנחה בפועל אחרי חיובי חובה</th><th className="pb-3 font-medium">פער מהזוכה</th></tr></thead><tbody className="divide-y divide-line">{ranking.map((item, index) => <tr key={item.planId}><td className="py-3 font-mono">{index + 1}</td><td className="py-3"><div className="flex items-center gap-2"><ProviderLogo provider={item.provider} size="xs" /><div><strong>{item.plan}</strong><span className="mr-2 text-xs text-muted">{item.provider}</span></div>{index === 0 && <BadgeCheck className="mr-1 inline size-4 text-brand" />}</div></td><td className="py-3 font-bold">{decimalIls.format(item.costIls)}</td><td className="py-3 text-brand">{decimalIls.format(item.effectiveBillDiscountIls)} · {item.effectiveBillDiscountPercent.toFixed(2)}%</td><td className="py-3 text-muted">{index === 0 ? "—" : decimalIls.format(item.costIls - period.winner.costIls)}</td></tr>)}</tbody></table></div>
    </div>
  );
}

function AnnualComparison({
  baselineCost,
  strategyCost,
  fixedCost,
  savingsBaseline,
  savingsBaselinePercent,
  savingsFixed,
  savingsFixedPercent,
  effectiveDiscount,
  effectiveDiscountPercent,
}: {
  baselineCost: number;
  strategyCost: number;
  fixedCost: number;
  savingsBaseline: number;
  savingsBaselinePercent: number;
  savingsFixed: number;
  savingsFixedPercent: number;
  effectiveDiscount: number;
  effectiveDiscountPercent: number;
}) {
  return (
    <div className="mt-7 overflow-hidden rounded-3xl border bg-surface-soft/55">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4">
        <div className="p-6 sm:border-l"><span className="text-xs font-bold text-muted">עלות שנתית צפויה</span><strong className="metric-number mt-2 block text-2xl">{decimalIls.format(strategyCost)}</strong><span className="mt-1 block text-xs text-muted">תעריף בסיס: {decimalIls.format(baselineCost)}</span></div>
        <div className="border-t p-6 sm:border-l sm:border-t-0"><span className="text-xs font-bold text-muted">הנחה בפועל אחרי חיובי חובה</span><strong className="metric-number mt-2 block text-2xl text-brand">{decimalIls.format(Math.max(0, effectiveDiscount))}</strong><span className="mt-1 block text-xs font-bold text-brand">{Math.max(0, effectiveDiscountPercent).toFixed(2)}%</span></div>
        <div className="border-t p-6 sm:border-l xl:border-t-0"><span className="text-xs font-bold text-muted">חיסכון כולל במחיר</span><strong className="metric-number mt-2 block text-2xl text-brand">{decimalIls.format(Math.max(0, savingsBaseline))}</strong><span className="mt-1 block text-xs font-bold text-brand">{Math.max(0, savingsBaselinePercent).toFixed(2)}% · לאחר כל החיובים הקבועים</span></div>
        <div className="border-t p-6 sm:border-t-0"><span className="text-xs font-bold text-muted">תוספת מול התוכנית הקבועה הזולה</span><strong className="metric-number mt-2 block text-2xl">{decimalIls.format(Math.max(0, savingsFixed))}</strong><span className="mt-1 block text-xs font-bold">{Math.max(0, savingsFixedPercent).toFixed(2)}% · לעולם לא יקר יותר</span></div>
      </div>
      <div className="border-t bg-white p-5"><CostBars fixed={fixedCost} strategy={strategyCost} /></div>
    </div>
  );
}

function CostBars({ fixed, strategy, strategyLabel = "אסטרטגיה", compact = false }: { fixed: number; strategy: number; strategyLabel?: string; compact?: boolean }) {
  const maximum = Math.max(fixed, strategy, 1);
  return (
    <div className={compact ? "mt-4 space-y-2" : "space-y-3"}>
      <CostBarRow label="תוכנית קבועה" value={fixed} maximum={maximum} />
      <CostBarRow label={strategyLabel} value={strategy} maximum={maximum} highlighted />
    </div>
  );
}

function CostBarRow({ label, value, maximum, highlighted = false }: { label: string; value: number; maximum: number; highlighted?: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 text-xs sm:grid-cols-[110px_1fr_auto]">
      <span className={highlighted ? "font-bold text-brand" : "text-muted"}>{label}</span>
      <span className="col-span-2 h-2.5 overflow-hidden rounded-full bg-surface-soft sm:col-span-1 sm:col-start-2 sm:row-start-1">
        <span className={cn("block h-full rounded-full", highlighted ? "bg-brand" : "bg-[#9cad9f]")} style={{ width: `${value / maximum * 100}%` }} />
      </span>
      <strong className={cn("metric-number col-start-2 row-start-1 sm:col-start-3", highlighted && "text-brand")}>{decimalIls.format(value)}</strong>
    </div>
  );
}

function Threshold({ icon: Icon, value, label }: { icon: typeof TrendingDown; value: string; label: string }) {
  return <div className="min-w-28 rounded-2xl bg-surface-soft p-4 text-center"><Icon className="mx-auto size-5 text-brand" /><strong className="metric-number mt-1 block text-xl">{value}</strong><span className="text-xs text-muted">{label}</span></div>;
}
