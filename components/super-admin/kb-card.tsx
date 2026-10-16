import Link from "next/link";
import { ArrowRight, BookOpenText } from "lucide-react";

import { Badge } from "@/components/ui/badge";

/** A clickable card for one level of the knowledge base (a class and version, or a subject). */
export function KbCard({ href, title, subtitle, stats }: { href: string; title: string; subtitle?: string; stats: { label: string; warn?: boolean }[] }) {
  return (
    <Link
      href={href}
      className="group flex min-h-40 flex-col justify-between gap-6 rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BookOpenText className="size-5" />
        </span>
        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <div className="grid gap-3">
        <div>
          <p className="text-[17px] font-extrabold leading-tight tracking-tight">{title}</p>
          {subtitle && <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {stats.map((s) => (
            <Badge key={s.label} variant={s.warn ? "outline" : "secondary"}>
              {s.label}
            </Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}
