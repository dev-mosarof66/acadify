import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { SectionTag } from "@/components/landing/shared";

/** Header band shared by About and the legal pages: breadcrumb, tag, title and lead text. */
export function PageHero({
  homeLabel,
  tag,
  title,
  highlight,
  description,
  children,
}: {
  homeLabel: string;
  tag: string;
  title: string;
  /** Part of `title` to colour green and underline, if it appears in the title. */
  highlight?: string;
  description: string;
  children?: React.ReactNode;
}) {
  const parts = highlight && title.includes(highlight) ? title.split(highlight) : null;

  return (
    <section className="px-4 pt-6 sm:px-6 lg:px-14">
      <div className="relative overflow-hidden rounded-[28px] bg-secondary px-6 py-14 text-center sm:px-10 sm:py-20">
        <div
          aria-hidden
          className="absolute -top-24 -right-24 size-72 rounded-full bg-[radial-gradient(circle,var(--primary-light)_0%,transparent_70%)]"
        />
        <div
          aria-hidden
          className="absolute bottom-6 left-6 hidden h-12 w-[74px] sm:block bg-[radial-gradient(var(--primary-bright)_1.6px,transparent_1.6px)] [background-size:12px_12px] opacity-55"
        />

        <nav aria-label="Breadcrumb" className="relative mb-6 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            {homeLabel}
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">{tag}</span>
        </nav>

        <div className="relative mx-auto grid max-w-3xl justify-items-center gap-4">
          <SectionTag>{tag}</SectionTag>
          <h1 className="text-[2.2rem] leading-[1.1] font-extrabold tracking-[-0.03em] text-balance sm:text-5xl">
            {parts ? (
              <>
                {parts[0]}
                <span className="relative inline-block text-primary">
                  {highlight}
                  <svg viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden className="absolute inset-x-0 -bottom-3 h-3.5 w-full text-primary-bright">
                    <path d="M3 11C70 4 180 2 297 8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
                {parts[1]}
              </>
            ) : (
              title
            )}
          </h1>
          <p className="mt-2 max-w-[38em] text-base leading-relaxed text-muted-foreground sm:text-[16.5px]">{description}</p>
          {children}
        </div>
      </div>
    </section>
  );
}
