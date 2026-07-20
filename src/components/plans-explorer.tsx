"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  ChevronDown,
  Clock3,
  ExternalLink,
  Gauge,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { categoryLabels, firstYearDiscountCaption, firstYearDiscountLabel, providerAccent, scheduleLabel } from "@/lib/catalog";
import { ProviderLogo } from "@/components/provider-logo";
import type { MeterType, Plan } from "@/lib/types";

export function PlansExplorer({ plans }: { plans: Plan[] }) {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("all");
  const [category, setCategory] = useState("all");
  const [meter, setMeter] = useState<"all" | MeterType>("all");
  const deferredQuery = useDeferredValue(query);
  const providers = [...new Set(plans.map((plan) => plan.provider))];
  const categories = [...new Set(plans.map((plan) => plan.category))];
  const filtered = useMemo(() => plans.filter((plan) => {
    const text = `${plan.provider} ${plan.name}`.toLowerCase();
    return (
      text.includes(deferredQuery.toLowerCase()) &&
      (provider === "all" || plan.provider === provider) &&
      (category === "all" || plan.category === category) &&
      (meter === "all" || plan.meter_types.includes(meter))
    );
  }), [plans, deferredQuery, provider, category, meter]);

  return (
    <div className="mt-10">
      <div className="card sticky top-18 z-30 grid gap-3 p-3 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <label className="relative">
          <Search className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש ספק או תוכנית" className="h-12 w-full rounded-xl bg-surface-soft pr-11 pl-4 text-sm outline-none focus:ring-4 focus:ring-brand/10" />
        </label>
        <FilterSelect value={provider} onChange={setProvider} label="כל הספקים" options={providers.map((item) => [item, item])} />
        <FilterSelect value={category} onChange={setCategory} label="כל סוגי התוכניות" options={categories.map((item) => [item, categoryLabels[item] ?? item])} />
        <FilterSelect value={meter} onChange={(value) => setMeter(value as typeof meter)} label="כל סוגי המונים" options={[["smart", "מונה חכם"], ["basic", "מונה בסיסי"]]} />
      </div>

      <div className="mt-5 flex items-center justify-between text-sm">
        <p className="font-medium"><strong>{filtered.length}</strong> תוכניות נמצאו</p>
        <p className="hidden items-center gap-2 text-xs text-muted sm:flex"><SlidersHorizontal className="size-3.5" />הסינון אינו משנה את כללי ההכללה</p>
      </div>

      <div className="adaptive-cards defer-render mt-5 grid gap-4">
        {filtered.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
      </div>
      {filtered.length === 0 && (
        <div className="card mt-5 p-12 text-center"><Search className="mx-auto size-8 text-muted" /><h2 className="mt-4 text-xl font-bold">לא נמצאו תוכניות מתאימות</h2><button className="mt-3 text-sm font-bold text-brand" onClick={() => { setQuery(""); setProvider("all"); setCategory("all"); setMeter("all"); }}>איפוס הסינון</button></div>
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: string[][] }) {
  return <label className="relative"><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full appearance-none rounded-xl bg-surface-soft px-4 pl-10 text-sm font-medium outline-none focus:ring-4 focus:ring-brand/10"><option value="all">{label}</option>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select><ChevronDown className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" /></label>;
}

function PlanCard({ plan }: { plan: Plan }) {
  const accent = providerAccent[plan.provider] ?? "#0b7159";
  return (
    <article className="card lift flex min-h-[320px] flex-col overflow-hidden">
      <div className="h-1.5" style={{ background: accent }} />
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3"><ProviderLogo provider={plan.provider} size="md" /><div><p className="text-sm font-bold text-muted">{plan.provider}</p><h2 className="mt-1 text-xl font-black">{plan.name}</h2></div></div>
          <span className="shrink-0 rounded-2xl bg-accent-soft px-3 py-2 text-center text-xs font-bold text-brand-strong">{firstYearDiscountCaption(plan)}<strong className="metric-number mt-1 block text-xl">{firstYearDiscountLabel(plan)}</strong></span>
        </div>
        <div className="mt-6 grid gap-3 text-sm">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-surface-soft text-brand"><Clock3 className="size-5" /></span><div><span className="block text-sm text-muted">חלון ההנחה</span><strong className="text-base">{scheduleLabel(plan)}</strong></div></div>
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-surface-soft text-brand"><Gauge className="size-5" /></span><div><span className="block text-sm text-muted">מתאים ל־</span><strong className="text-base">{plan.meter_types.includes("basic") ? "מונה בסיסי וחכם" : "מונה חכם"}</strong></div></div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-medium">{categoryLabels[plan.category] ?? plan.category}</span>
          {plan.monthly_fee_ils > 0 && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">עמלה ₪{plan.monthly_fee_ils}/חודש</span>}
          {plan.excludes_holidays && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">לא כולל חגים</span>}
        </div>
        <div className="mt-auto pt-7">
          <div className="flex items-center gap-4 border-t pt-5">
            <a href={plan.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand">מקור רשמי <ExternalLink className="size-3.5" /></a>
            <span className="mr-auto text-xs text-muted">אומת {plan.verified_at}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
