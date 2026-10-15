import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Shadow used by every raised landing card. */
export const CARD_SHADOW = "shadow-[0_14px_34px_-14px_rgba(14,26,18,0.18)]";

/** Green-to-lime gradient for highlighted cards. */
export const FEATURED_GRADIENT =
  "bg-[linear-gradient(160deg,#1F5F1F_0%,#2C7A26_60%,#57B53A_100%)] text-white shadow-[0_22px_40px_-18px_rgba(31,95,31,0.6)] ring-0";

export function SectionTag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "h-auto rounded-full bg-primary-light px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.08em] text-primary",
        className
      )}
    >
      {children}
    </Badge>
  );
}

/** Round arrow badge used at the end of pill buttons and "Learn more" links. */
export function ArrowDot({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full", className)}>
      <ArrowRight className={cn("size-4", iconClassName)} strokeWidth={2.4} />
    </span>
  );
}

const PILL_TONES = {
  solid: {
    button: "bg-primary text-primary-foreground shadow-[0_10px_22px_-10px_var(--primary)] hover:bg-primary-hover",
    dot: "bg-primary-foreground text-primary",
    variant: "default",
  },
  outline: {
    button: "border-[1.5px] border-primary bg-transparent text-primary hover:bg-primary-light hover:text-primary dark:bg-transparent",
    dot: "border-[1.5px] border-primary",
    variant: "outline",
  },
  white: {
    button: "bg-white text-[#173E17] hover:bg-white/90",
    dot: "bg-[#1F5F1F] text-white",
    variant: "default",
  },
} as const;

/** Template pill button: text plus a round arrow, rendered as a Next link through shadcn Button. */
export function PillLink({
  href,
  children,
  tone = "solid",
  className,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  tone?: keyof typeof PILL_TONES;
  className?: string;
  onClick?: () => void;
}) {
  const style = PILL_TONES[tone];
  return (
    <Button
      variant={style.variant}
      nativeButton={false}
      render={<Link href={href} onClick={onClick} />}
      className={cn(
        "h-[50px] gap-3 rounded-full pr-2 pl-[22px] text-[14.5px] font-bold hover:-translate-y-px",
        style.button,
        className
      )}
    >
      {children}
      <ArrowDot className={cn("size-[34px]", style.dot)} />
    </Button>
  );
}

/** "Learn more"-style text link with a small solid arrow dot. */
export function ArrowLink({
  href,
  children,
  className,
  dotClassName,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  dotClassName?: string;
}) {
  return (
    <Button
      variant="link"
      nativeButton={false}
      render={<Link href={href} />}
      className={cn("h-auto gap-2 px-0 text-sm font-bold text-primary hover:no-underline", className)}
    >
      {children}
      <ArrowDot className={cn("size-6 bg-primary text-primary-foreground", dotClassName)} iconClassName="size-[13px]" />
    </Button>
  );
}

/** shadcn Card with the template's radius, padding and shadow. */
export function LandingCard({
  className,
  raised = false,
  ...props
}: React.ComponentProps<typeof Card> & { raised?: boolean }) {
  return (
    <Card
      className={cn("gap-4 rounded-[20px] p-6 py-6 text-[15px] ring-border", raised && CARD_SHADOW, className)}
      {...props}
    />
  );
}

export function SectionHeader({
  tag,
  title,
  description,
  className,
}: {
  tag: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-9 grid justify-items-center gap-3 text-center", className)}>
      <SectionTag>{tag}</SectionTag>
      <h2 className="text-[26px] font-extrabold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {description && <p className="max-w-[36em] text-muted-foreground">{description}</p>}
    </div>
  );
}

export function CheckItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <li className={cn("flex items-start gap-2.5", className)}>
      <CircleCheck className="mt-0.5 size-[18px] shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  );
}
