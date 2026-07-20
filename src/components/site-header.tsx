import Link from "next/link";
import { BarChart3, FileUp, House, ListFilter, ShieldCheck, Zap } from "lucide-react";

const navigation = [
  { href: "/compare", label: "השוואה אישית", mobileLabel: "השוואה", icon: FileUp },
  { href: "/plans", label: "כל התוכניות", mobileLabel: "תוכניות", icon: ListFilter },
  { href: "/insights", label: "תובנות וסימולציות", mobileLabel: "תובנות", icon: BarChart3 },
  { href: "/methodology", label: "איך מחשבים", mobileLabel: "שקיפות", icon: ShieldCheck },
];

export function Brand() {
  return (
    <Link href="/" className="group flex min-h-11 items-center gap-2.5" aria-label="זרם — דף הבית">
      <span className="grid size-9 place-items-center rounded-xl bg-brand text-accent">
        <Zap className="size-5" fill="currentColor" aria-hidden="true" />
      </span>
      <span className="text-xl font-black">זרם</span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-lg">
        <div className="page-shell flex h-16 items-center justify-between gap-5">
          <Brand />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="ניווט ראשי">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-xl px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-white hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/compare" className="button-primary min-h-10 rounded-xl px-4 text-sm">
            <FileUp className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">בדיקת קובץ המונה</span>
            <span className="sm:hidden">השוואה</span>
          </Link>
        </div>
      </header>

      <nav className="fixed inset-x-2 bottom-2 z-50 grid grid-cols-5 rounded-2xl border bg-white/96 p-1.5 shadow-[0_12px_38px_rgba(12,49,37,.18)] backdrop-blur-lg lg:hidden" aria-label="ניווט מהיר">
        <Link href="/" className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold text-muted hover:bg-surface-soft hover:text-foreground">
          <House className="size-4.5" aria-hidden="true" />בית
        </Link>
        {navigation.map(({ href, mobileLabel, icon: Icon }) => (
          <Link key={href} href={href} className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold text-muted hover:bg-surface-soft hover:text-foreground">
            <Icon className="size-4.5" aria-hidden="true" />{mobileLabel}
          </Link>
        ))}
      </nav>
    </>
  );
}
